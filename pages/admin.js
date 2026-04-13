import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function Admin() {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);

  function handleAuth(e) {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === 'wavelength-admin') {
      setAuthed(true);
    } else {
      setError('Wrong password');
    }
  }

  useEffect(() => {
    if (!authed) return;
    fetch('/api/admin-searches')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setSearches(d.searches || []);
      })
      .catch(() => setError('Failed to load searches'))
      .finally(() => setLoading(false));
  }, [authed]);

  return (
    <>
      <Head><title>WAVELENGTH — Admin</title></Head>
      <div style={{ background: '#070709', minHeight: '100vh', color: '#eee', fontFamily: 'sans-serif', padding: '32px' }}>
        <h1 style={{ color: '#1DB954', marginBottom: '24px', fontSize: '1.4rem', letterSpacing: '0.1em' }}>
          WAVELENGTH / Admin
        </h1>

        {!authed ? (
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px' }}>
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#eee', fontSize: '1rem' }}
            />
            {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem' }}>{error}</p>}
            <button type="submit" style={{ padding: '10px', borderRadius: '8px', background: '#1DB954', color: '#000', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
              Enter
            </button>
          </form>
        ) : loading ? (
          <p style={{ color: '#888' }}>Loading searches...</p>
        ) : error ? (
          <p style={{ color: '#ff6b6b' }}>{error}</p>
        ) : (
          <>
            <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>
              {searches.length} total searches
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222', textAlign: 'left' }}>
                    {['Date', 'Song', 'Artist', 'Analyze By', 'Genre Mode', 'Language', 'Suggestions'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', color: '#1DB954', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searches.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #111', verticalAlign: 'top' }}>
                      <td style={{ padding: '10px 12px', color: '#888', whiteSpace: 'nowrap' }}>
                        {new Date(s.searched_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.input_song}</td>
                      <td style={{ padding: '10px 12px', color: '#aaa' }}>{s.input_artist}</td>
                      <td style={{ padding: '10px 12px', color: '#888' }}>{(s.analyze_by || []).join(', ')}</td>
                      <td style={{ padding: '10px 12px', color: '#888' }}>{s.genre_mode}</td>
                      <td style={{ padding: '10px 12px', color: '#888' }}>{s.language_filter || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#888', maxWidth: '260px' }}>
                        {(s.suggestions || []).map((sg) => `${sg.title} — ${sg.artist}`).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
