import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.spotifyId) return res.status(401).json({ error: 'Not authenticated' });

  const { otherSpotifyId } = req.body;
  if (!otherSpotifyId) return res.status(400).json({ error: 'No user specified' });

  // Canonical ordering so there's only one record per pair
  const userA = session.spotifyId < otherSpotifyId ? session.spotifyId : otherSpotifyId;
  const userB = session.spotifyId < otherSpotifyId ? otherSpotifyId : session.spotifyId;

  // Upsert match
  const { data: match, error } = await supabase
    .from('matches')
    .upsert({ user_a: userA, user_b: userB }, { onConflict: 'user_a,user_b' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ matchId: match.id });
}
