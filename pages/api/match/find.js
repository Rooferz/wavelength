import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.spotifyId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    // Get current user's profile
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('spotify_id', session.spotifyId)
      .single();

    if (!myProfile?.taste_fingerprint) {
      return res.status(400).json({
        error: 'You need to analyze a playlist first to get matched with others.',
      });
    }

    // Get all other profiles that have a taste fingerprint
    const { data: others } = await supabase
      .from('profiles')
      .select('spotify_id, display_name, avatar_url, taste_fingerprint, taste_genres, taste_headline, taste_summary')
      .neq('spotify_id', session.spotifyId)
      .not('taste_fingerprint', 'is', null)
      .limit(20);

    if (!others || others.length === 0) {
      return res.json({ matches: [] });
    }

    // AI compares fingerprints and scores compatibility
    const comparisons = others.map((o) => ({
      spotify_id: o.spotify_id,
      display_name: o.display_name,
      fingerprint: o.taste_fingerprint,
      genres: o.taste_genres,
      headline: o.taste_headline,
    }));

    const matchCall = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are a music taste compatibility engine. Compare a person's music taste fingerprint against other users and score compatibility 0-100. Look for genuine deep connections — shared emotional wavelengths, production aesthetics, lyrical sensibility — not just genre overlap.

Return ONLY valid JSON, no markdown.
Schema:
{
  "matches": [
    {
      "spotify_id": "...",
      "score": 85,
      "reason": "2 sentences explaining what musical DNA you two share — be specific and interesting",
      "sharedQualities": ["quality1", "quality2", "quality3"]
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `My taste fingerprint:
${JSON.stringify(myProfile.taste_fingerprint, null, 2)}

Other users to compare:
${JSON.stringify(comparisons, null, 2)}

Score each user's compatibility with me (0-100). Only include users with score >= 50. Sort by score descending.`,
        },
      ],
    });

    const matchRaw = matchCall.choices[0].message.content.trim();
    let matchResult;
    try { matchResult = JSON.parse(matchRaw); }
    catch { matchResult = JSON.parse(matchRaw.replace(/^```json|^```|```$/gm, '').trim()); }

    // Merge AI scores with profile data
    const enriched = (matchResult.matches || []).map((m) => {
      const profile = others.find((o) => o.spotify_id === m.spotify_id);
      return {
        ...m,
        display_name: profile?.display_name || 'Wavelength User',
        avatar_url: profile?.avatar_url || null,
        taste_headline: profile?.taste_headline || '',
        taste_summary: profile?.taste_summary || '',
        taste_genres: profile?.taste_genres || [],
      };
    });

    // Save matches to Supabase
    for (const match of enriched) {
      const userA = session.spotifyId < match.spotify_id ? session.spotifyId : match.spotify_id;
      const userB = session.spotifyId < match.spotify_id ? match.spotify_id : session.spotifyId;
      await supabase.from('matches').upsert(
        { user_a: userA, user_b: userB, compatibility_score: match.score },
        { onConflict: 'user_a,user_b' }
      );
    }

    return res.json({ matches: enriched, myHeadline: myProfile.taste_headline });
  } catch (err) {
    console.error('Match error:', err.message);
    return res.status(500).json({ error: 'Matching failed — try again.' });
  }
}
