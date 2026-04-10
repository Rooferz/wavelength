import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Spotify helpers ─────────────────────────────────────────────────────────

async function getSpotifyToken() {
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${creds}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get Spotify token. Check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
  return data.access_token;
}

async function searchSpotify(title, artist, token) {
  const q = encodeURIComponent(`track:${title} artist:${artist}`);
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const track = data?.tracks?.items?.[0];
  if (!track) return null;
  return {
    id: track.id,
    url: track.external_urls.spotify,
    embedUrl: `https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`,
    albumArt: track.album?.images?.[0]?.url || null,
    preview: track.preview_url || null,
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { song, spotifyUrl, analyzeBy, genreMode, languageFilter } = req.body;

  if (!song && !spotifyUrl) {
    return res.status(400).json({ error: 'Please provide a song name/artist or a Spotify link.' });
  }

  const songInput = song || spotifyUrl;

  const dimensions =
    analyzeBy?.length
      ? analyzeBy.join(', ')
      : 'lyrics & themes, mood & emotions, genre & style, tempo & energy';

  const genreInstruction =
    genreMode === 'same'
      ? 'Keep all 5 suggestions within the same genre as the input song.'
      : 'Feel free to cross genre boundaries — prioritize emotional and thematic match over genre similarity.';

  const langInstruction =
    languageFilter?.trim()
      ? `Prefer songs in: ${languageFilter.trim()}.`
      : 'Any language is fine.';

  try {
    // ── Step 1: GPT-4o analysis ──────────────────────────────────────────────
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are a world-class music analyst and recommendation engine with encyclopedic knowledge of music across all genres, eras, and cultures.
Analyze songs deeply and suggest exactly 5 songs that will genuinely resonate with a fan of the input.
Return ONLY a valid JSON object. No markdown. No backticks. No text outside the JSON.
Exact schema:
{
  "inputSong": { "title": "...", "artist": "..." },
  "analysis": {
    "summary": "2–3 sentence deep analysis covering the requested dimensions — be specific and insightful",
    "mood": ["mood1", "mood2", "mood3"],
    "themes": ["theme1", "theme2"]
  },
  "suggestions": [
    {
      "title": "Exact Song Title",
      "artist": "Exact Artist Name",
      "reason": "2 sentence explanation of why this song deeply matches the input based on the analyzed dimensions",
      "moodTags": ["tag1", "tag2", "tag3"]
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Song to analyze: ${songInput}
Analyze based on: ${dimensions}
Genre instruction: ${genreInstruction}
Language instruction: ${langInstruction}
Return exactly 5 suggestions.`,
        },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // strip any accidental markdown fences
      const clean = raw.replace(/^```json|^```|```$/gm, '').trim();
      parsed = JSON.parse(clean);
    }

    // ── Step 2: Spotify enrichment ───────────────────────────────────────────
    const token = await getSpotifyToken();

    const [inputSpotify, ...suggestionSpotify] = await Promise.all([
      searchSpotify(parsed.inputSong.title, parsed.inputSong.artist, token),
      ...parsed.suggestions.map((s) => searchSpotify(s.title, s.artist, token)),
    ]);

    return res.json({
      inputSong: { ...parsed.inputSong, spotify: inputSpotify },
      analysis: parsed.analysis,
      suggestions: parsed.suggestions.map((s, i) => ({
        ...s,
        spotify: suggestionSpotify[i],
      })),
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
    return res.status(500).json({
      error: err.message.includes('Spotify')
        ? err.message
        : 'Analysis failed — please try again or check your API keys.',
    });
  }
}
