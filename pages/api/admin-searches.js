import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { data, error } = await supabase
    .from('searches')
    .select('*')
    .order('searched_at', { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ searches: data });
}
