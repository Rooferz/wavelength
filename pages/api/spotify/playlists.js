import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.accessToken) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const r = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const data = await r.json();

    const playlists = (data.items || []).map((p) => ({
      id: p.id,
      name: p.name,
      trackCount: p.tracks?.total || 0,
      image: p.images?.[0]?.url || null,
      owner: p.owner?.display_name || '',
      isOwned: p.owner?.id === session.spotifyId,
    }));

    return res.json({ playlists });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
