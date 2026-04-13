import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── In-memory rate limiter ──────────────────────────────────────────────────
// Limits each IP to 8 analyses per 10 minutes.
// Resets on server restart — acceptable for this use case without Redis.
const rateLimitMap = new Map();
const RATE_LIMIT   = 8;
const RATE_WINDOW  = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const rec = rateLimitMap.get(ip);
  if (!rec || now > rec.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return false; // not limited
  }
  if (rec.count >= RATE_LIMIT) return true; // limited
  rec.count++;
  return false;
}

// Prune old entries occasionally to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of rateLimitMap.entries()) {
    if (now > rec.reset) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// ── Input validation ────────────────────────────────────────────────────────
const VALID_ANALYZE = new Set(['lyrics', 'mood', 'genre', 'tempo']);
const VALID_GENRE   = new Set(['same', 'explore']);

function sanitizeString(str, maxLen) {
  if (typeof str !== 'string') return '';
  // Remove control characters, limit length
  return str.replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, maxLen);
}

// ── Spotify helpers ─────────────────────────────────────────────────────────
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
  };
}

// ── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests — please wait a few minutes.' });
  }

  // Input validation
  const { song, spotifyUrl, analyzeBy, genreMode, languageFilter } = req.body;

  const cleanSong     = sanitizeString(song || '', 250);
  const cleanUrl      = sanitizeString(spotifyUrl || '', 250);
  const cleanLang     = sanitizeString(languageFilter || '', 60);
  const cleanGenre    = VALID_GENRE.has(genreMode) ? genreMode : 'explore';
  const cleanAnalyze  = Array.isArray(analyzeBy)
    ? analyzeBy.filter(x => VALID_ANALYZE.has(x)).slice(0, 4)
    : ['lyrics', 'mood', 'genre', 'tempo'];

  if (!cleanSong && !cleanUrl) {
    return res.status(400).json({ error: 'Please provide a song name or Spotify link.' });
  }
  if (cleanAnalyze.length === 0) {
    return res.status(400).json({ error: 'Select at least one analysis dimension.' });
  }

  const songInput  = cleanSong || cleanUrl;
  const dimensions = cleanAnalyze.join(', ');
  const genreInstr = cleanGenre === 'same'
    ? 'Suggestions must stay within the same genre.'
    : 'Cross genre boundaries freely — emotional and sonic match matters more than genre label.';
  const langInstr  = cleanLang ? `Prefer songs in: ${cleanLang}.` : 'Any language.';

  try {
    // ── Step 1: Extract musical fingerprint ──────────────────────────────
    const fpCall = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: `You are a music theorist and producer with encyclopedic knowledge of every song ever recorded. Extract the precise musical fingerprint of a song — its actual sonic and emotional DNA.

Return ONLY valid JSON, no markdown, no backticks.
Schema:
{
  "title": "corrected song title",
  "artist": "corrected artist name",
  "fingerprint": {
    "productionStyle": "...",
    "vocalStyle": "...",
    "harmonicLanguage": "...",
    "rhythmicFeel": "...",
    "lyricApproach": "...",
    "emotionalArc": "...",
    "uniqueQualities": ["3-5 things that make this song distinctly itself"],
    "avoidSuggesting": ["3-5 obvious songs always recommended alongside this one"]
  },
  "analysis": {
    "summary": "3-4 sentences analyzing the song based on: ${dimensions}. Be specific about musical elements.",
    "mood": ["evocative mood 1", "evocative mood 2", "evocative mood 3"],
    "themes": ["theme 1", "theme 2", "theme 3"]
  }
}`,
        },
        { role: 'user', content: `Extract the musical fingerprint of: ${songInput}` },
      ],
    });

    const fpRaw = fpCall.choices[0].message.content.trim();
    let fp;
    try { fp = JSON.parse(fpRaw); }
    catch { fp = JSON.parse(fpRaw.replace(/^```json|^```|```$/gm, '').trim()); }

    // ── Step 2: Find deep matches ─────────────────────────────────────────
    const recsCall = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are an elite music curator. Find songs that share a song's soul, not just its surface.

STRICT RULES:
1. NEVER suggest songs by the same artist as the input song.
2. NEVER suggest the songs listed in "avoidSuggesting".
3. At least 2 of 5 picks must be underrated or deep cuts.
4. Each pick must match the fingerprint on at least 3 specific dimensions.
5. Do NOT rely on genre association alone.
6. ${genreInstr}
7. ${langInstr}

Return ONLY valid JSON, no markdown.
Schema:
{
  "suggestions": [
    {
      "title": "exact song title",
      "artist": "exact artist name",
      "reason": "2-3 sentences citing SPECIFIC fingerprint dimensions this song shares. Be precise.",
      "moodTags": ["tag1", "tag2", "tag3"],
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

DO NOT suggest: ${fp.fingerprint?.avoidSuggesting?.join(', ')}

Find 5 songs with at least 2 underrated/deep-cut picks.`,
        },
      ],
    });

    const recsRaw = recsCall.choices[0].message.content.trim();
    let recs;
    try { recs = JSON.parse(recsRaw); }
    catch { recs = JSON.parse(recsRaw.replace(/^```json|^```|```$/gm, '').trim()); }

    // ── Spotify enrichment ────────────────────────────────────────────────
    const token = await getSpotifyToken();
    const [inputSpotify, ...suggestionSpotify] = await Promise.all([
      searchSpotify(fp.title, fp.artist, token),
      ...recs.suggestions.map(s => searchSpotify(s.title, s.artist, token)),
    ]);

    const finalResult = {
      inputSong:   { title: fp.title, artist: fp.artist, spotify: inputSpotify },
      analysis:    fp.analysis,
      suggestions: recs.suggestions.map((s, i) => ({ ...s, spotify: suggestionSpotify[i] })),
    };

    // ── Log to Supabase (fire & forget) ──────────────────────────────────
    supabase.from('searches').insert({
      input_song: fp.title, input_artist: fp.artist,
      analyze_by: cleanAnalyze, genre_mode: cleanGenre,
      language_filter: cleanLang || null,
      suggestions: recs.suggestions.map(s => ({ title: s.title, artist: s.artist })),
    }).then(() => {}).catch(e => console.warn('Supabase log failed:', e.message));

    return res.json(finalResult);

  } catch (err) {
    console.error('Analyze error:', err.message);
    return res.status(500).json({
      error: err.message.includes('Spotify')
        ? err.message
        : 'Analysis failed — please try again.',
    });
  }
}
