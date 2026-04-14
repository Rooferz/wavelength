import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Head from 'next/head';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [playlists, setPlaylists]             = useState([]);
  const [selected, setSelected]               = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [result, setResult]                   = useState(null);
  const [error, setError]                     = useState('');
  const [saveProfile, setSaveProfile]         = useState(true);

  useEffect(() => {
    if (session?.accessToken) fetchPlaylists();
  }, [session]);

  async function fetchPlaylists() {
    setLoadingPlaylists(true);
    try {
      const r = await fetch('/api/spotify/playlists');
      const d = await r.json();
      setPlaylists(d.playlists || []);
    } catch {
      setError('Failed to load playlists — check your connection.');
    } finally {
      setLoadingPlaylists(false);
    }
  }

  async function analyze() {
    if (!selected) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetch('/api/spotify/analyze-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: selected.id, saveProfile }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult(d);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Wavelength — My Playlists</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet" />
      </Head>

      <div className="page">
        <div className="mesh mesh-green" />
        <div className="mesh mesh-warm" />
        <div className="noise-layer" />

        <main className="content">

          {status === 'loading' && (
            <div className="loading-state"><p className="loading-title">Loading…</p></div>
          )}

          {/* ── NOT LOGGED IN ─────────────────────── */}
          {status === 'unauthenticated' && (
            <div className="empty-state">
              <span className="empty-icon">♫</span>
              <h1 className="empty-title">Your playlists, decoded.</h1>
              <p className="empty-sub">
                Connect Spotify to let our AI analyze your playlists and discover songs you'll love based on your actual taste.
              </p>
              <button className="btn-primary" style={{ display: 'inline-block', width: 'auto', padding: '14px 32px' }} onClick={() => signIn('spotify')}>
                Connect Spotify
              </button>
            </div>
          )}

          {/* ── LOGGED IN ─────────────────────────── */}
          {status === 'authenticated' && !result && (
            <>
              <section className="hero" style={{ paddingBottom: 36 }}>
                <div className="eyebrow">
                  <span className="eyebrow-pip" />
                  {session?.displayName || 'Your Library'}
                </div>
                <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
                  Pick a playlist.<br />
                  <em>We'll find what's next.</em>
                </h1>
                <p className="hero-sub">
                  Select any playlist — we'll read its DNA and recommend songs that perfectly match its vibe.
                </p>
              </section>

              {error && <div className="error-box">⚠ {error}</div>}

              {loadingPlaylists ? (
                <div className="loading-state" style={{ padding: '48px 0' }}>
                  <div className="eq">
                    {[0.1, 0.3, 0.05, 0.2, 0.15, 0.35, 0.08].map((d, i) => (
                      <div key={i} className="eq-bar" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                  <p className="loading-title">Loading your playlists…</p>
                </div>
              ) : (
                <>
                  <div className="section-head">
                    <div className="section-title">Your Playlists</div>
                    <div className="section-sub">{playlists.length} found — tap to select</div>
                  </div>

                  <div className="playlist-grid">
                    {playlists.map(pl => (
                      <button
                        key={pl.id}
                        className={`playlist-card${selected?.id === pl.id ? ' selected' : ''}`}
                        onClick={() => setSelected(selected?.id === pl.id ? null : pl)}
                      >
                      {pl.image
                        ? <img src={pl.image} alt={pl.name} className="playlist-thumb" />
                        : <div className="playlist-thumb-placeholder">♫</div>
                      }
                        <div className="playlist-name">{pl.name}</div>
                        <div className="playlist-count">{pl.trackCount ?? '—'} tracks</div>
                      </button>
                    ))}
                  </div>

                  {selected && (
                    <div className="selected-bar">
                      <div>
                        <div className="selected-label">Selected</div>
                        <div className="selected-name">{selected.name}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <div className={`toggle-check${saveProfile ? ' on' : ''}`} onClick={() => setSaveProfile(v => !v)}>
                            {saveProfile ? '✓' : ''}
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Save taste profile for matching</span>
                        </label>
                        <button className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }} onClick={analyze} disabled={loading}>
                          {loading ? 'Analyzing…' : '✦ Analyze Playlist'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {loading && (
                <div className="loading-state" style={{ marginTop: 32 }}>
                  <div className="eq">
                    {[0.1, 0.3, 0.05, 0.2, 0.15, 0.35, 0.08].map((d, i) => (
                      <div key={i} className="eq-bar" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                  <p className="loading-title">Decoding your playlist…</p>
                  <p className="loading-sub">This takes about 30 seconds</p>
                </div>
              )}
            </>
          )}

          {/* ── RESULTS ───────────────────────────── */}
          {result && !loading && (
            <div className="results">
              <div className="analysis-card">
                <div className="analysis-eyebrow">Playlist analyzed</div>
                <div className="analysis-title" style={{ marginBottom: 6 }}>{result.playlist?.name}</div>
                {result.tasteProfile && (
                  <>
                    <p className="analysis-summary">{result.tasteProfile.summary}</p>
                    <div className="tag-row" style={{ marginBottom: 8 }}>
                      {result.tasteProfile.genres?.map(g => <span key={g} className="tag tag-green">{g}</span>)}
                    </div>
                    <div className="tag-row">
                      {result.tasteProfile.moods?.map(m => <span key={m} className="tag tag-dim">{m}</span>)}
                    </div>
                  </>
                )}
              </div>

              <div className="recs-header">
                <h2 className="recs-title">New Songs for You</h2>
                <span className="recs-meta">Based on "{result.playlist?.name}"</span>
              </div>

              <div className="song-list">
                {result.suggestions?.map((s, i) => (
                  <div key={i} className="song-card">
                    <div className="card-top">
                      <div className="card-num">0{i + 1}</div>
                      <div className="card-meta">
                        <div className="card-title">{s.title}</div>
                        <div className="card-artist">{s.artist}</div>
                      </div>
                      {s.spotify?.url && (
                        <a className="card-open-btn" href={s.spotify.url} target="_blank" rel="noreferrer">▶ Open</a>
                      )}
                    </div>
                    <p className="card-reason">{s.reason}</p>
                    <div className="tag-row">
                      {s.moodTags?.map(t => <span key={t} className="tag tag-dim">{t}</span>)}
                    </div>
                    {s.spotify?.embedUrl
                      ? <iframe className="embed" src={s.spotify.embedUrl} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title={`${s.title} by ${s.artist}`} />
                      : (
                        <div className="no-preview">
                          <a className="search-spotify" href={`https://open.spotify.com/search/${encodeURIComponent(s.title + ' ' + s.artist)}`} target="_blank" rel="noreferrer">Search on Spotify ↗</a>
                        </div>
                      )
                    }
                  </div>
                ))}
              </div>

              <div className="reset-wrap" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-ghost" onClick={() => { setResult(null); setSelected(null); }}>← Try Another Playlist</button>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          Wavelength · Playlist Discovery
        </footer>
      </div>
    </>
  );
}
