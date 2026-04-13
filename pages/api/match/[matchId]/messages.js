import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.spotifyId) return res.status(401).json({ error: 'Not authenticated' });

  const { matchId } = req.query;

  // Verify user belongs to this match
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.user_a !== session.spotifyId && match.user_b !== session.spotifyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.method === 'GET') {
    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, sender_id, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .limit(100);

    return res.json({ messages: messages || [] });
  }

  if (req.method === 'POST') {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Empty message' });

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: session.spotifyId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: msg });
  }

  return res.status(405).end();
}
