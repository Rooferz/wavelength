import { useEffect, useState } from 'react';
import Head from 'next/head';

// Admin page — uses a server-side token check via Authorization header.
// The ADMIN_SECRET_TOKEN env var is NEVER exposed to the browser (no NEXT_PUBLIC_ prefix).
export default function Admin() {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [token, setToken]       = useState('');
  const [authed, setAuthed]     = useState(false);

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin-searches', {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Wrong token');
      setSearches(d.searches || []);
      setAuthed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Wavelength Admin</title>
        <meta name="robots" content="noindex,nofollow" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0C0A09', color: '#F0E8DF', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '40px 24px' }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, marginBottom: 32 }}>
          WAVELENGTH Admin
        </h1>

        {!authed ? (
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Admin secret token"
              style={{ background: '#1A1714', border: '1px solid rgba(255,235,210,0.1)', borderRadius: 10, padding: '12px 16px', color: '#F0E8DF', fontSize: '1rem', outline: 'none' }}
              required
            />
            {error && <p style={{ color: '#ff7070', fontSize: '0.88rem' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ background: '#1DB954', color: '#000', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif", cursor: 'pointer' }}>
              {loading ? 'Checking…' : 'Access Dashboard'}
            </button>
          </form>
        ) : (
          <div>
            <p style={{ color: '#8A7E74', marginBottom: 24 }}>{searches.length} searches total</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {searches.map((s, i) => (
                <div key={i} style={{ background: '#1A1714', border: '1px solid rgba(255,235,210,0.07)', borderRadius: 12, padding: '14px 18px' }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, marginBottom: 4 }}>
                    {s.input_song} — {s.input_artist}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#8A7E74' }}>
                    {new Date(s.searched_at).toLocaleString()} · {s.genre_mode} · {s.analyze_by?.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
