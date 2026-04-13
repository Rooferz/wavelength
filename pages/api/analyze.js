import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getSpotifyToken() {
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${creds}` },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get Spotify token.');
  return data.access_token;
}

async function searchSpotify(title, artist, token) {
  const q = encodeURIComponent(`track:${title} artist:${artist}`);
  const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { song, spotifyUrl, analyzeBy, genreMode, languageFilter } = req.body;
  if (!song && !spotifyUrl) return res.status(400).json({ error: 'Please provide a song name/artist or a Spotify link.' });

  const songInput = song || spotifyUrl;
  const dimensions = analyzeBy?.length ? analyzeBy.join(', ') : 'lyrics & themes, mood & emotions, genre & style, tempo & energy';
  const genreInstruction = genreMode === 'same'
    ? 'Suggestions must stay within the same genre.'
    : 'Cross genre boundaries freely — emotional and sonic match matters more than genre label.';
  const langInstruction = languageFilter?.trim() ? `Prefer songs in: ${languageFilter.trim()}.` : 'Any language.';

  try {
    // ── STEP 1: Extract musical fingerprint ─────────────────────────────────
    // First call: deeply analyze the song's DNA before we even think about recommendations.
    // This prevents the model from jumping to obvious "fans also like" associations.
    const fingerprintCall = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: `You are a music theorist and producer with encyclopedic knowledge of every song ever recorded. Your job is to extract the precise musical fingerprint of a song — not its genre label, but its actual sonic and emotional DNA.

Return ONLY valid JSON, no markdown, no backticks.
Schema:
{
  "title": "corrected song title",
  "artist": "corrected artist name",
  "fingerprint": {
    "productionStyle": "describe the production in precise terms — reverb levels, instrument textures, mixing choices, era of production, lo-fi vs hi-fi, etc.",
    "vocalStyle": "describe the vocal delivery, tone, range, technique, and emotional register",
    "harmonicLanguage": "describe the chord progressions, key, modal tendencies, harmonic tension/resolution patterns",
    "rhythmicFeel": "describe the tempo, groove, rhythmic complexity, swing, syncopation, percussion style",
    "lyricApproach": "describe the narrative voice, lyrical density, metaphor style, themes, POV",
    "emotionalArc": "describe how the song makes the listener feel and why — the emotional journey, tension, release",
    "uniqueQualities": ["the 3-5 things that make this song distinctly itself — what no other song does exactly the same way"],
    "avoidSuggesting": ["3-5 obvious/overplayed songs that people always recommend alongside this one — so we can actively avoid them"]
  },
  "analysis": {
    "summary": "3-4 sentences analyzing the song based on: ${dimensions}. Be specific about musical elements, not just vibes.",
    "mood": ["specific evocative mood 1", "specific evocative mood 2", "specific evocative mood 3"],
    "themes": ["specific theme 1", "specific theme 2", "specific theme 3"]
  }
}`,
        },
        { role: 'user', content: `Extract the musical fingerprint of: ${songInput}` },
      ],
    });

    const fpRaw = fingerprintCall.choices[0].message.content.trim();
    let fp;
    try { fp = JSON.parse(fpRaw); }
    catch { fp = JSON.parse(fpRaw.replace(/^```json|^```|```$/gm, '').trim()); }

    // ── STEP 2: Find songs that match the fingerprint ────────────────────────
    // Second call: armed with the fingerprint, find deep matches — not obvious ones.
    const recsCall = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are an elite music curator with an obsessive knowledge of deep cuts, hidden gems, and unexpected connections across all genres and eras. You find songs that share a song's soul, not just its surface.

You will receive a musical fingerprint. Your job: find 5 songs that genuinely match this fingerprint on a deep level.

STRICT RULES:
1. NEVER suggest songs by the same artist as the input song.
2. NEVER suggest the songs listed in "avoidSuggesting" — these are the boring obvious picks.
3. At least 2 of your 5 picks must be relatively obscure or underrated — songs that will genuinely surprise the listener.
4. Each pick must match the fingerprint on at least 3 specific dimensions. Explain exactly which ones and why.
5. Do NOT rely on genre association. A jazz song and a pop song can share the same emotional fingerprint.
6. ${genreInstruction}
7. ${langInstruction}

Return ONLY valid JSON, no markdown, no backticks.
Schema:
{
  "suggestions": [
    {
      "title": "exact song title",
      "artist": "exact artist name",
      "reason": "2-3 sentences citing SPECIFIC fingerprint dimensions this song shares with the input. Name the exact qualities — production style, vocal approach, harmonic language, emotional arc, etc. Be precise and surprising.",
      "moodTags": ["specific evocative tag 1", "specific evocative tag 2", "specific evocative tag 3"],
      "obscurityLevel": "well-known | underrated | deep cut"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Input song: "${fp.title}" by ${fp.artist}

Musical fingerprint:
- Production: ${fp.fingerprint?.productionStyle}
- Vocals: ${fp.fingerprint?.vocalStyle}
- Harmony: ${fp.fingerprint?.harmonicLanguage}
- Rhythm: ${fp.fingerprint?.rhythmicFeel}
- Lyrics: ${fp.fingerprint?.lyricApproach}
- Emotional arc: ${fp.fingerprint?.emotionalArc}
- What makes it unique: ${fp.fingerprint?.uniqueQualities?.join('; ')}

DO NOT suggest these obvious picks: ${fp.fingerprint?.avoidSuggesting?.join(', ')}

Find 5 songs that match this fingerprint on a deep level. Include at least 2 underrated or deep cut picks.`,
        },
      ],
    });

    const recsRaw = recsCall.choices[0].message.content.trim();
    let recs;
    try { recs = JSON.parse(recsRaw); }
    catch { recs = JSON.parse(recsRaw.replace(/^```json|^```|```$/gm, '').trim()); }

    // ── Spotify enrichment ──────────────────────────────────────────────────
    const token = await getSpotifyToken();
    const [inputSpotify, ...suggestionSpotify] = await Promise.all([
      searchSpotify(fp.title, fp.artist, token),
      ...recs.suggestions.map((s) => searchSpotify(s.title, s.artist, token)),
    ]);

    const finalResult = {
      inputSong: { title: fp.title, artist: fp.artist, spotify: inputSpotify },
      analysis: fp.analysis,
      suggestions: recs.suggestions.map((s, i) => ({ ...s, spotify: suggestionSpotify[i] })),
    };

    // ── Log to Supabase ─────────────────────────────────────────────────────
    supabase.from('searches').insert({
      input_song: fp.title,
      input_artist: fp.artist,
      analyze_by: analyzeBy || [],
      genre_mode: genreMode || 'explore',
      language_filter: languageFilter || null,
      suggestions: recs.suggestions.map((s) => ({ title: s.title, artist: s.artist })),
    }).then(() => {}).catch((e) => console.warn('Supabase log failed:', e.message));

    return res.json(finalResult);
  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({
      error: err.message.includes('Spotify') ? err.message : 'Analysis failed — please try again.',
    });
  }
}
