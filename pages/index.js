import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession, signIn } from 'next-auth/react';

const GOOGLE_FORM_URL = 'https://forms.gle/YOUR_FORM_LINK_HERE';

const ANALYZE_OPTIONS = [
  { id: 'lyrics', label: 'Lyrics', icon: '✍' },
  { id: 'mood',   label: 'Mood',   icon: '◎' },
  { id: 'genre',  label: 'Genre',  icon: '◈' },
  { id: 'tempo',  label: 'Energy', icon: '⚡' },
];

const MAX_HISTORY = 20;

export default function Home() {
  const { data: session } = useSession();
  const [inputType, setInputType]     = useState('name');
  const [songInput, setSongInput]     = useState('');
  const [analyzeBy, setAnalyzeBy]     = useState(['lyrics', 'mood', 'genre', 'tempo']);
  const [genreMode, setGenreMode]     = useState('explore');
  const [langFilter, setLangFilter]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [result, setResult]           = useState(null);
  const [history, setHistory]         = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem('wl_history') || '[]')); } catch {}
  }, []);

  function saveToHistory(inputSong) {
    try {
      const entry = {
        title: inputSong.title, artist: inputSong.artist,
        albumArt: inputSong.spotify?.albumArt || null,
        searchedAt: new Date().toISOString(),
      };
      const updated = [entry, ...history.filter(h => !(h.title === entry.title && h.artist === entry.artist))].slice(0, MAX_HISTORY);
      setHistory(updated);
      localStorage.setItem('wl_history', JSON.stringify(updated));
    } catch {}
  }

  function toggleAnalyze(id) {
    setAnalyzeBy(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!songInput.trim() || analyzeBy.length === 0) return;
    setLoading(true); setError(''); setResult(null); setShowHistory(false);
    try {
      const body = { analyzeBy, genreMode, languageFilter: langFilter };
      if (inputType === 'link') body.spotifyUrl = songInput.trim();
      else body.song = songInput.trim();
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setResult(data);
      saveToHistory(data.inputSong);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null); setSongInput(''); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const { inputSong, analysis, suggestions } = result || {};

  return (
    <>
      <Head>
        <title>Wavelength — AI Music Discovery</title>
        <meta name="description" content="Decode any song's DNA. Discover music that truly resonates." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet" />
      </Head>

      <div className="page">
        <div className="mesh mesh-green" />
        <div className="mesh mesh-warm" />
        <div className="noise-layer" />

        {/* ── History panel ────────────────────── */}
        {showHistory && history.length > 0 && (
          <div className="history-panel" style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 150, maxWidth: '100%' }}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              <div className="history-header">
                <span className="history-title">Recent Searches</span>
                <button className="history-clear" onClick={() => { setHistory([]); localStorage.removeItem('wl_history'); }}>Clear all</button>
              </div>
              <div className="history-list">
                {history.map((h, i) => (
                  <button key={i} className="history-item" onClick={() => { setSongInput(`${h.title} — ${h.artist}`); setInputType('name'); setShowHistory(false); }}>
                    {h.albumArt
                      ? <img src={h.albumArt} alt={h.title} className="history-art" />
                      : <div className="history-art" style={{ background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: 'var(--text-3)', borderRadius: 5 }}>♪</div>
                    }
                    <div className="history-meta">
                      <div className="history-song">{h.title}</div>
                      <div className="history-artist">{h.artist}</div>
                    </div>
                    <span className="history-date">{new Date(h.searchedAt).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="content">

          {/* ── SEARCH STATE ──────────────────── */}
          {!result && !loading && (
            <>
              <section className="hero">
                <div className="eyebrow">
                  <span className="eyebrow-pip" />
                  AI Music Discovery
                </div>
                <h1 className="hero-title">
                  Decode any song.<br />
                  <em>Find your next obsession.</em>
                </h1>
                <p className="hero-sub">
                  Enter a song. Choose what to analyze. We map its exact sonic DNA and surface recommendations that truly resonate — not just "fans also liked."
                </p>
                {!session && (
                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => signIn('spotify')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'var(--green-dim)', border: '1px solid rgba(29,185,84,0.28)',
                        color: 'var(--green)', borderRadius: 100, padding: '9px 20px',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem',
                        letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Connect Spotify for playlist analysis
                    </button>
                  </div>
                )}
              </section>

              <div className="card">
                <form onSubmit={handleSubmit} className="form-stack">

                  <div>
                    <div className="pill-toggle">
                      <button type="button" className={`pill-btn${inputType === 'name' ? ' active' : ''}`} onClick={() => setInputType('name')}>Song Name</button>
                      <button type="button" className={`pill-btn${inputType === 'link' ? ' active' : ''}`} onClick={() => setInputType('link')}>Spotify Link</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input-field"
                      type="text"
                      value={songInput}
                      onChange={e => setSongInput(e.target.value)}
                      placeholder={inputType === 'name' ? 'e.g. Blinding Lights — The Weeknd' : 'Paste Spotify track URL…'}
                      maxLength={300}
                      autoFocus
                      required
                    />
                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowHistory(v => !v)}
                        style={{
                          flexShrink: 0, background: 'var(--surface-2)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)', padding: '0 14px',
                          color: showHistory ? 'var(--text)' : 'var(--text-2)',
                          fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 600,
                          transition: 'all 0.18s', whiteSpace: 'nowrap',
                        }}
                        title="Search history"
                      >
                        🕐
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="field-label">Analyze by</div>
                    <div className="chip-grid">
                      {ANALYZE_OPTIONS.map(opt => {
                        const checked = analyzeBy.includes(opt.id);
                        return (
                          <label key={opt.id} className={`chip${checked ? ' active' : ''}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleAnalyze(opt.id)} hidden />
                            <span className="chip-check">{checked ? '✓' : ''}</span>
                            <span className="chip-icon">{opt.icon}</span>
                            <span className="chip-label">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="filters-row">
                    <div className="filter-col">
                      <div className="field-label">Genre mode</div>
                      <div className="pill-toggle" style={{ display: 'flex' }}>
                        <button type="button" className={`pill-btn${genreMode === 'same' ? ' active' : ''}`} onClick={() => setGenreMode('same')} style={{ flex: 1, textAlign: 'center' }}>Same genre</button>
                        <button type="button" className={`pill-btn${genreMode === 'explore' ? ' active' : ''}`} onClick={() => setGenreMode('explore')} style={{ flex: 1, textAlign: 'center' }}>Explore</button>
                      </div>
                    </div>
                    <div className="filter-col">
                      <div className="field-label">Language <span className="opt">(optional)</span></div>
                      <input className="lang-input" type="text" value={langFilter} onChange={e => setLangFilter(e.target.value)} placeholder="e.g. Spanish, Korean…" maxLength={50} />
                    </div>
                  </div>

                  {analyzeBy.length === 0 && <p className="warn">Select at least one dimension to analyze.</p>}

                  <button type="submit" className="btn-primary" disabled={loading || !songInput.trim() || analyzeBy.length === 0}>
                    ✦ Analyze & Discover
                  </button>
                </form>
              </div>
            </>
          )}

          {/* ── LOADING ─────────────────────────── */}
          {loading && (
            <div className="loading-state">
              <div className="eq">
                {[0.1, 0.3, 0.05, 0.2, 0.15, 0.35, 0.08].map((d, i) => (
                  <div key={i} className="eq-bar" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
              <p className="loading-title">Reading the music…</p>
              <p className="loading-sub">Analyzing {analyzeBy.join(', ')}</p>
            </div>
          )}

          {/* ── ERROR ───────────────────────────── */}
          {error && <div className="error-box">⚠ {error}</div>}

          {/* ── RESULTS ─────────────────────────── */}
          {result && !loading && (
            <div className="results">
              {/* Analysis card */}
              <div className="analysis-card">
                <div className="analysis-inner">
                  {inputSong?.spotify?.albumArt
                    ? <img className="art" src={inputSong.spotify.albumArt} alt={inputSong.title} />
                    : <div className="art-placeholder">♪</div>
                  }
                  <div>
                    <div className="analysis-eyebrow">Analyzed</div>
                    <div className="analysis-title">{inputSong?.title}</div>
                    <div className="analysis-artist">{inputSong?.artist}</div>
                    {inputSong?.spotify?.url && (
                      <a className="open-spotify" href={inputSong.spotify.url} target="_blank" rel="noreferrer">Open in Spotify ↗</a>
                    )}
                  </div>
                </div>

                <p className="analysis-summary">{analysis?.summary}</p>

                <div className="tag-row">
                  {analysis?.mood?.map(m => <span key={m} className="tag tag-green">{m}</span>)}
                  {analysis?.themes?.map(t => <span key={t} className="tag tag-dim">{t}</span>)}
                </div>

                <div className="rate-wrap">
                  <a className="rate-btn" href={GOOGLE_FORM_URL} target="_blank" rel="noreferrer">★ Rate these results</a>
                </div>
              </div>

              {/* Recommendations */}
              <div className="recs-header">
                <h2 className="recs-title">5 Recommendations</h2>
                <span className="recs-meta">{genreMode === 'same' ? 'Same genre' : 'Cross-genre'} · deep cuts included</span>
              </div>

              <div className="song-list">
                {suggestions?.map((s, i) => (
                  <div key={i} className="song-card">
                    <div className="card-top">
                      <div className="card-num">0{i + 1}</div>
                      <div className="card-meta">
                        <div className="card-title">{s.title}</div>
                        <div className="card-artist">{s.artist}</div>
                      </div>
                      {s.obscurityLevel && s.obscurityLevel !== 'well-known' && (
                        <span className="obscurity-badge">{s.obscurityLevel === 'deep cut' ? '💎 deep cut' : '↗ underrated'}</span>
                      )}
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
                          Preview unavailable —{' '}
                          <a className="search-spotify" href={`https://open.spotify.com/search/${encodeURIComponent(s.title + ' ' + s.artist)}`} target="_blank" rel="noreferrer">Search on Spotify ↗</a>
                        </div>
                      )
                    }
                  </div>
                ))}
              </div>

              <div className="reset-wrap">
                <button className="btn-ghost" onClick={reset}>← Search Another Song</button>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          Wavelength · AI Music Discovery · Powered by GPT-4o &amp; Spotify
        </footer>
      </div>
    </>
  );
}
