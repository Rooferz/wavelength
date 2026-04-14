import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${creds}` },
    body: 'grant_type=client_credentials',
  });
  const d = await r.json();
  return d.access_token;
}

async function searchSpotify(title, artist, token) {
  const q = encodeURIComponent(`track:${title} artist:${artist}`);
  const r = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const d = await r.json();
  const track = d?.tracks?.items?.[0];
  if (!track) return null;
  return {
    id: track.id,
    url: track.external_urls.spotify,
    embedUrl: `https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`,
    albumArt: track.album?.images?.[0]?.url || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { playlistId, saveProfile } = req.body;
  if (!playlistId) return res.status(400).json({ error: 'No playlist ID provided' });

  try {
    // 1. Fetch playlist tracks from Spotify (up to 50)
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
      { headers: { Authorization: `Bearer ${session.accessToken}` } }
    );
    if (!tracksRes.ok) {
      const spotifyErr = await tracksRes.json();
      console.error('Spotify tracks fetch failed:', spotifyErr);
      return res.status(502).json({ error: `Spotify error: ${spotifyErr?.error?.message || tracksRes.status}` });
    }
    const tracksData = await tracksRes.json();
    const tracks = (tracksData.items || [])
      .filter((i) => i.track?.name)
      .map((i) => ({
        title: i.track.name,
        artist: i.track.artists?.[0]?.name || 'Unknown',
        album: i.track.album?.name || '',
      }))
      .slice(0, 40); // Cap at 40 for prompt size

    if (tracks.length < 3) {
      return res.status(400).json({ error: 'Playlist needs at least 3 songs to analyze.' });
    }

    const trackList = tracks.map((t) => `"${t.title}" by ${t.artist}`).join('\n');
    const existingTitles = tracks.map((t) => t.title.toLowerCase());

    // 2. AI: Analyze playlist's collective taste fingerprint
    const fingerprintCall = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `You are a music theorist analyzing a person's music taste from their playlist. Extract the collective musical fingerprint — not what's obvious, but what connects these songs at a deep level.

Return ONLY valid JSON, no markdown, no backticks.
Schema:
{
  "fingerprint": {
    "dominantMoods": ["mood1", "mood2", "mood3"],
    "productionEra": "describe the era and production aesthetic that defines this collection",
    "vocalPreference": "describe the vocal styles this person seems drawn to",
    "rhythmicTendency": "describe the tempo and groove patterns across the playlist",
    "lyricDepth": "describe the lyrical complexity and themes this person gravitates toward",
    "emotionalRange": "describe the emotional spectrum — is this person consistent or varied?",
    "uniqueInsight": "one surprising observation about what truly connects these songs at a deep level",
    "genreDNA": ["genre1", "genre2", "genre3"],
    "avoidSuggesting": ["list 5 obvious songs people always suggest to fans of this collection — so we avoid them"]
  },
  "tasteProfile": {
    "headline": "A 1-sentence punchy description of this person's music taste",
    "summary": "3-4 sentences describing what drives this person's music choices, what they're clearly searching for in music, and what makes their taste distinctive"
  }
}`,
        },
        {
          role: 'user',
          content: `Analyze the collective taste fingerprint of this playlist:\n\n${trackList}`,
        },
      ],
    });

    const fpRaw = fingerprintCall.choices[0].message.content.trim();
    let fp;
    try { fp = JSON.parse(fpRaw); }
    catch { fp = JSON.parse(fpRaw.replace(/^```json|^```|```$/gm, '').trim()); }

    // 3. AI: Suggest new songs based on fingerprint (that aren't already in the playlist)
    const recsCall = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are an elite music curator who finds songs that feel like they were made for a specific person's taste. You find genuine discoveries — songs that match someone's musical DNA but they've likely never heard.

STRICT RULES:
1. NEVER suggest songs already in the playlist.
2. NEVER suggest the songs in "avoidSuggesting" — those are the boring obvious picks.
3. At least 3 of your 6 picks should be underrated or deep cuts — genuine discoveries.
4. Each pick must match the fingerprint on at least 3 specific dimensions. Be precise.
5. Find songs that feel inevitable for this person — like they were always supposed to find them.

Return ONLY valid JSON, no markdown, no backticks.
Schema:
{
  "suggestions": [
    {
      "title": "exact song title",
      "artist": "exact artist name",
      "reason": "2-3 sentences explaining why this song fits this specific person's taste profile — reference their actual fingerprint qualities",
      "moodTags": ["tag1", "tag2", "tag3"],
      "obscurityLevel": "well-known | underrated | deep cut",
      "whyTheyHaventHeardIt": "one sentence on why this is a genuine discovery for them"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `This person's taste fingerprint:
- Dominant moods: ${fp.fingerprint?.dominantMoods?.join(', ')}
- Production era: ${fp.fingerprint?.productionEra}
- Vocal preference: ${fp.fingerprint?.vocalPreference}
- Rhythmic tendency: ${fp.fingerprint?.rhythmicTendency}
- Lyric depth: ${fp.fingerprint?.lyricDepth}
- Emotional range: ${fp.fingerprint?.emotionalRange}
- Unique insight: ${fp.fingerprint?.uniqueInsight}
- Genre DNA: ${fp.fingerprint?.genreDNA?.join(', ')}

Songs ALREADY in their playlist (do NOT suggest these):
${trackList}

Do NOT suggest these obvious picks: ${fp.fingerprint?.avoidSuggesting?.join(', ')}

Find 6 songs that feel like inevitable discoveries for this person.`,
        },
      ],
    });

    const recsRaw = recsCall.choices[0].message.content.trim();
    let recs;
    try { recs = JSON.parse(recsRaw); }
    catch { recs = JSON.parse(recsRaw.replace(/^```json|^```|```$/gm, '').trim()); }

    // 4. Spotify enrichment for suggestions
    const appToken = await getSpotifyToken();
    const spotifyResults = await Promise.all(
      recs.suggestions.map((s) => searchSpotify(s.title, s.artist, appToken))
    );

    // 5. Optionally save taste profile to Supabase for matching
    if (saveProfile) {
      await supabase.from('profiles').upsert({
        spotify_id: session.spotifyId,
        display_name: session.displayName || 'Wavelength User',
        avatar_url: session.avatar || null,
        taste_fingerprint: fp.fingerprint,
        taste_genres: fp.fingerprint?.genreDNA || [],
        taste_headline: fp.tasteProfile?.headline || '',
        taste_summary: fp.tasteProfile?.summary || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'spotify_id' });
    }

    return res.json({
      tasteProfile: fp.tasteProfile,
      fingerprint: fp.fingerprint,
      suggestions: recs.suggestions.map((s, i) => ({ ...s, spotify: spotifyResults[i] })),
      tracksAnalyzed: tracks.length,
    });
  } catch (err) {
    console.error('Playlist analysis error:', err.message);
    return res.status(500).json({ error: 'Analysis failed — please try again.' });
  }
}
