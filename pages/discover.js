import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function DiscoverPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading]           = useState(false);
  const [matches, setMatches]           = useState(null);
  const [myHeadline, setMyHeadline]     = useState('');
  const [error, setError]               = useState('');
  const [startingChat, setStartingChat] = useState(null);

  async function findMatches() {
    setLoading(true); setError(''); setMatches(null);
    try {
      const r = await fetch('/api/match/find');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMatches(d.matches || []);
      setMyHeadline(d.myHeadline || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function startChat(spotifyId) {
    setStartingChat(spotifyId);
    try {
      const r = await fetch('/api/match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherSpotifyId: spotifyId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push(`/chat/${d.matchId}`);
    } catch (err) {
      setError(err.message);
      setStartingChat(null);
    }
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  return (
    <>
      <Head>
        <title>Wavelength — Find Your People</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet" />
      </Head>

      <div className="page">
        <div className="mesh mesh-warm" style={{ opacity: 0.28 }} />
        <div className="mesh mesh-green" style={{ opacity: 0.15 }} />
        <div className="noise-layer" />

        <main className="content">

          {status === 'loading' && (
            <div className="loading-state"><p className="loading-title">Loading…</p></div>
          )}

          {/* ── NOT LOGGED IN ─────────────────────── */}
          {status === 'unauthenticated' && (
            <div className="empty-state">
              <span className="empty-icon" style={{ color: 'var(--warm)' }}>◎</span>
              <h1 className="empty-title">Meet your music people.</h1>
              <p className="empty-sub">
                Connect Spotify, analyze a playlist, and we'll match you with people who share your musical DNA — not just your genre.
              </p>
              <button
                className="btn-warm"
                style={{ display: 'inline-block' }}
                onClick={() => signIn('spotify')}
              >
                Connect Spotify to start
              </button>
            </div>
          )}

          {status === 'authenticated' && (
            <>
              <section className="hero" style={{ paddingBottom: 36 }}>
                <div className="eyebrow" style={{ color: 'var(--warm)' }}>
                  <span className="eyebrow-pip" style={{ background: 'var(--warm)' }} />
                  Music Matching
                </div>
                <h1 className="hero-title">
                  Find people on your<br />
                  <span className="warm">wavelength.</span>
                </h1>
                <p className="hero-sub">
                  We compare your musical fingerprint with others — production style, emotional arcs, harmonic language — and connect you with people who truly get it.
                </p>
                {myHeadline && (
                  <div style={{
                    display: 'inline-block', marginTop: 16,
                    background: 'var(--warm-dim)', border: '1px solid rgba(232,168,124,0.22)',
                    borderRadius: 100, padding: '8px 18px',
                    fontFamily: 'var(--font-display)', fontSize: '0.84rem', fontWeight: 600,
                    color: 'var(--warm)',
                  }}>
                    Your vibe: {myHeadline}
                  </div>
                )}
              </section>

              {error && <div className="error-box">⚠ {error}</div>}

              {!matches && !loading && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <button className="btn-warm" onClick={findMatches} style={{ display: 'inline-block', fontSize: '0.95rem', padding: '14px 36px' }}>
                    ◎ Find My Matches
                  </button>
                  <p style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--text-2)' }}>
                    You need to analyze a playlist first — go to{' '}
                    <Link href="/profile" style={{ color: 'var(--green)', fontWeight: 600 }}>Playlists</Link> if you haven't yet.
                  </p>
                </div>
              )}

              {loading && (
                <div className="loading-state">
                  <div className="eq">
                    {[0.1, 0.3, 0.05, 0.2, 0.15, 0.35, 0.08].map((d, i) => (
                      <div key={i} className="eq-bar" style={{ animationDelay: `${d}s`, background: 'var(--warm)' }} />
                    ))}
                  </div>
                  <p className="loading-title">Finding your matches…</p>
                  <p className="loading-sub">Comparing musical DNA</p>
                </div>
              )}

              {matches !== null && !loading && (
                <>
                  <div className="section-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div className="section-title">
                        {matches.length > 0 ? `${matches.length} Match${matches.length !== 1 ? 'es' : ''} Found` : 'No Matches Yet'}
                      </div>
                      <div className="section-sub">Sorted by compatibility score</div>
                    </div>
                    <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={findMatches}>Refresh ↻</button>
                  </div>

                  {matches.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                      <span className="empty-icon" style={{ fontSize: '2rem', opacity: 0.4 }}>◎</span>
                      <p className="empty-sub" style={{ marginBottom: 0 }}>
                        No one else has analyzed a playlist yet. Share Wavelength with friends and check back soon — matches appear as more people join.
                      </p>
                    </div>
                  ) : (
                    <div className="match-grid">
                      {matches.map((m, i) => (
                        <div key={m.spotify_id || i} className="match-card" style={{ animation: `fadeUp 0.4s ${i * 0.07}s ease both` }}>
                          <div className="match-avatar">
                            {m.avatar_url
                              ? <img src={m.avatar_url} alt={m.display_name} />
                              : initials(m.display_name)
                            }
                          </div>
                          <div className="match-body">
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                              <div className="match-name">{m.display_name || 'Wavelength User'}</div>
                              <div className="score-badge">
                                {m.score}% match
                              </div>
                            </div>
                            {m.taste_headline && (
                              <div className="match-headline">{m.taste_headline}</div>
                            )}
                            <p className="match-reason">{m.reason}</p>
                            {m.sharedQualities?.length > 0 && (
                              <div className="tag-row" style={{ marginBottom: 12 }}>
                                {m.sharedQualities.map(q => <span key={q} className="tag tag-warm">{q}</span>)}
                              </div>
                            )}
                            {m.taste_genres?.length > 0 && (
                              <div className="tag-row">
                                {m.taste_genres.slice(0, 4).map(g => <span key={g} className="tag tag-dim">{g}</span>)}
                              </div>
                            )}
                            <div className="match-actions">
                              <button
                                className="btn-chat"
                                onClick={() => startChat(m.spotify_id)}
                                disabled={startingChat === m.spotify_id}
                              >
                                {startingChat === m.spotify_id ? 'Starting…' : '↗ Start a conversation'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>

        <footer className="footer">
          Wavelength · Music Matching
        </footer>
      </div>
    </>
  );
}
