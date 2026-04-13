import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `You are an elite music curator and analyst with deep expertise in music theory, production techniques, cultural context, and emotional psychology across all genres and eras worldwide.

Your job is to analyze a song with surgical precision and recommend 5 songs that share its DNA — not just its surface genre or artist popularity.

ANALYSIS RULES:
- Go beyond genre labels. Analyze actual musical elements: chord progressions, tempo feel, vocal delivery style, production texture, dynamic range, instrumentation, lyrical perspective and narrative voice, emotional arc.
- Identify what makes the song UNIQUE — the specific qualities that make it resonate deeply with listeners.
- Mood tags must be specific and evocative. Never use generic words like "sad" or "happy". Use phrases like "bittersweet nostalgia", "restless urgency", "melancholic defiance", "euphoric yearning", "quiet devastation".
- Themes should be specific narrative or emotional concepts, not just genres.

RECOMMENDATION RULES:
- NEVER suggest other songs by the same artist as the input song.
- Do NOT suggest the most obvious, overplayed choices. Avoid recommending songs that everyone already knows alongside the input — dig deeper.
- Mix 2-3 well-known tracks with 2-3 deeper cuts or hidden gems the user likely hasn't heard.
- Each suggestion must connect to the input on at least 2 specific musical or emotional dimensions — not just "same vibe."
- The reason must be precise and reference actual musical elements (e.g. "shares the same sparse, reverb-soaked production and confessional first-person lyricism" — NOT "similar mood" or "fans of X will enjoy Y").
- Aim for genuine diversity across the 5 picks — they should not all sound identical. Show range.
- Think like a music obsessive who loves finding unexpected connections between songs.

Return ONLY valid JSON. No markdown, no backticks, no text outside the JSON.
Schema:
{
  "inputSong": { "title": "...", "artist": "..." },
  "analysis": {
    "summary": "3-4 sentence deep analysis covering the requested dimensions. Reference actual musical elements, production choices, lyrical themes, and what makes this song emotionally and sonically distinct.",
    "mood": ["specific evocative mood 1", "specific evocative mood 2", "specific evocative mood 3"],
    "themes": ["specific theme 1", "specific theme 2", "specific theme 3"]
  },
  "suggestions": [
    {
      "title": "Exact Song Title",
      "artist": "Exact Artist Name",
      "reason": "2-3 sentences referencing specific musical and emotional elements that connect this song to the input. Be precise — not generic.",
      "moodTags": ["evocative tag 1", "evocative tag 2", "evocative tag 3"]
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
Return exactly 5 suggestions. Never suggest songs by the same artist as the input song.`,
        },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const clean = raw.replace(/^```json|^```|```$/gm, '').trim();
      parsed = JSON.parse(clean);
    }

    // Spotify enrichment
    const token = await getSpotifyToken();

    const [inputSpotify, ...suggestionSpotify] = await Promise.all([
      searchSpotify(parsed.inputSong.title, parsed.inputSong.artist, token),
      ...parsed.suggestions.map((s) => searchSpotify(s.title, s.artist, token)),
    ]);

    const finalResult = {
      inputSong: { ...parsed.inputSong, spotify: inputSpotify },
      analysis: parsed.analysis,
      suggestions: parsed.suggestions.map((s, i) => ({
        ...s,
        spotify: suggestionSpotify[i],
      })),
    };

    // Log to Supabase (non-blocking)
    supabase.from('searches').insert({
      input_song: parsed.inputSong.title,
      input_artist: parsed.inputSong.artist,
      analyze_by: analyzeBy || [],
      genre_mode: genreMode || 'explore',
      language_filter: languageFilter || null,
      suggestions: parsed.suggestions.map((s) => ({ title: s.title, artist: s.artist })),
    }).then(() => {}).catch((e) => console.warn('Supabase log failed:', e.message));

    return res.json(finalResult);
  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({
      error: err.message.includes('Spotify')
        ? err.message
        : 'Analysis failed — please try again or check your API keys.',
    });
  }
}
