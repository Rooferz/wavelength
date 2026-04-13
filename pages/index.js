import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const GOOGLE_FORM_URL = 'https://forms.gle/YOUR_FORM_LINK_HERE';

const ANALYZE_OPTIONS = [
  { id: 'lyrics', label: 'Lyrics & Meaning', icon: '✍' },
  { id: 'mood', label: 'Mood & Emotions', icon: '◎' },
  { id: 'genre', label: 'Genre & Style', icon: '◈' },
  { id: 'tempo', label: 'Tempo & Energy', icon: '⚡' },
];

const MAX_HISTORY = 20;

export default function Home() {
  const [inputType, setInputType] = useState('name');
  const [songInput, setSongInput] = useState('');
  const [analyzeBy, setAnalyzeBy] = useState(['lyrics', 'mood', 'genre', 'tempo']);
  const [genreMode, setGenreMode] = useState('explore');
  const [languageFilter, setLanguageFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wl_history') || '[]');
      setHistory(saved);
    } catch {}
  }, []);

  function saveToHistory(inputSong, analysis) {
    try {
      const entry = {
        title: inputSong.title,
        artist: inputSong.artist,
        albumArt: inputSong.spotify?.albumArt || null,
        searchedAt: new Date().toISOString(),
      };
      const updated = [entry, ...history].slice(0, MAX_HISTORY);
      setHistory(updated);
      localStorage.setItem('wl_history', JSON.stringify(updated));
    } catch {}
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem('wl_history');
  }

  function toggleAnalyze(id) {
    setAnalyzeBy((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!songInput.trim() || analyzeBy.length === 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    setShowHistory(false);
    try {
      const body = { analyzeBy, genreMode, languageFilter };
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
      saveToHistory(data.inputSong, data.analysis);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setSongInput('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function loadFromHistory(entry) {
    setSongInput(`${entry.title} — ${entry.artist}`);
    setInputType('name');
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const { inputSong, analysis, suggestions } = result || {};

  return (
    <>
      <Head>
        <title>WAVELENGTH — AI Music Discovery</title>
        <meta name="description" content="AI-powered song analysis and recommendations via Spotify" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="noise" />

        <nav className="nav">
          <Link href="/" className="logo" onClick={() => { setResult(null); setError(''); setSongInput(''); }}>
            WAVE<span className="logo-accent">LENGTH</span>
          </Link>
          <div className="nav-right">
            {history.length > 0 && (
              <button className="history-toggle" onClick={() => setShowHistory((v) => !v)}>
                {showHistory ? '✕ Close' : `🕐 History (${history.length})`}
              </button>
            )}
            <span className="nav-badge">GPT-4o × Spotify</span>
          </div>
        </nav>

        {showHistory && (
          <div className="history-panel">
            <div className="history-header">
              <span className="history-title">Recent Searches</span>
              <button className="history-clear" onClick={clearHistory}>Clear all</button>
            </div>
            <div className="history-list">
              {history.map((h, i) => (
                <button key={i} className="history-item" onClick={() => loadFromHistory(h)}>
                  {h.albumArt && <img src={h.albumArt} alt={h.title} className="history-art" />}
                  <div className="history-meta">
                    <div className="history-song">{h.title}</div>
                    <div className="history-artist">{h.artist}</div>
                  </div>
                  <span className="history-date">{new Date(h.searchedAt).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <main className="main">
          {!result && !loading && (
            <section className="hero">
              <div className="hero-eyebrow">✦ AI Music Discovery</div>
              <h1 className="hero-title">
                Decode any song.<br />
                <em>Discover your next obsession.</em>
              </h1>
              <p className="hero-sub">
                Enter any song. Choose what to analyze — lyrics, mood, genre, energy.<br />
                We'll surface 5 songs that truly resonate.
              </p>
            </section>
          )}

          {!result && (
            <section className="form-wrap">
              <form onSubmit={handleSubmit} className="form">
                <div className="pill-toggle">
                  <button type="button" className={`pill-btn ${inputType === 'name' ? 'pill-active' : ''}`} onClick={() => setInputType('name')}>Song Name</button>
                  <button type="button" className={`pill-btn ${inputType === 'link' ? 'pill-active' : ''}`} onClick={() => setInputType('link')}>Spotify Link</button>
                </div>

                <div className="input-wrap">
                  <input
                    className="song-input"
                    type="text"
                    value={songInput}
                    onChange={(e) => setSongInput(e.target.value)}
                    placeholder={inputType === 'name' ? 'e.g.  Blinding Lights — The Weeknd' : 'Paste Spotify track URL…'}
                    autoFocus
                    required
                  />
                </div>

                <div className="field-group">
                  <div className="field-label">Analyze by</div>
                  <div className="check-grid">
                    {ANALYZE_OPTIONS.map((opt) => {
                      const checked = analyzeBy.includes(opt.id);
                      return (
                        <label key={opt.id} className={`check-card ${checked ? 'check-active' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleAnalyze(opt.id)} hidden />
                          <span className="check-mark">{checked ? '✓' : ''}</span>
                          <span className="check-icon">{opt.icon}</span>
                          <span className="check-label">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="filters-row">
                  <div className="field-group filter-half">
                    <div className="field-label">Genre exploration</div>
                    <div className="pill-toggle small">
                      <button type="button" className={`pill-btn ${genreMode === 'same' ? 'pill-active' : ''}`} onClick={() => setGenreMode('same')}>Same genre</button>
                      <button type="button" className={`pill-btn ${genreMode === 'explore' ? 'pill-active' : ''}`} onClick={() => setGenreMode('explore')}>Explore broadly</button>
                    </div>
                  </div>
                  <div className="field-group filter-half">
                    <div className="field-label">Language preference <span className="opt">(optional)</span></div>
                    <input className="lang-input" type="text" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} placeholder="e.g. Spanish, Korean…" />
                  </div>
                </div>

                {analyzeBy.length === 0 && <p className="warn">Please select at least one analysis dimension.</p>}

                <button type="submit" className="submit-btn" disabled={loading || !songInput.trim() || analyzeBy.length === 0}>
                  ✦ Analyze &amp; Discover
                </button>
              </form>
            </section>
          )}

          {error && <div className="error-box">⚠ {error}</div>}

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

          {result && !loading && (
            <div className="results">
              <div className="analysis-card">
                <div className="analysis-inner">
                  {inputSong?.spotify?.albumArt ? (
                    <img className="art" src={inputSong.spotify.albumArt} alt={inputSong.title} />
                  ) : (
                    <div className="art art-placeholder">♪</div>
                  )}
                  <div className="analysis-text">
                    <div className="analysis-eyebrow">Analyzed song</div>
                    <div className="analysis-title">{inputSong?.title}</div>
                    <div className="analysis-artist">{inputSong?.artist}</div>
                    {inputSong?.spotify?.url && (
                      <a className="open-spotify" href={inputSong.spotify.url} target="_blank" rel="noreferrer">Open in Spotify ↗</a>
                    )}
                  </div>
                </div>

                <p className="analysis-summary">{analysis?.summary}</p>

                <div className="tag-row">
                  {analysis?.mood?.map((m) => <span key={m} className="tag tag-green">{m}</span>)}
                  {analysis?.themes?.map((t) => <span key={t} className="tag tag-amber">{t}</span>)}
                </div>

                <div className="rate-btn-wrap">
                  <a className="rate-btn" href={GOOGLE_FORM_URL} target="_blank" rel="noreferrer">
                    ★ Rate these results
                  </a>
                </div>
              </div>

              <div className="recs-header">
                <h2 className="recs-title">5 Recommendations</h2>
                <div className="recs-meta">Based on your analysis · {genreMode === 'same' ? 'Same genre' : 'Cross-genre'}</div>
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
                      {s.spotify?.url && (
                        <a className="card-spotify-btn" href={s.spotify.url} target="_blank" rel="noreferrer">▶ Open</a>
                      )}
                    </div>
                    <p className="card-reason">{s.reason}</p>
                    <div className="tag-row">
                      {s.moodTags?.map((t) => <span key={t} className="tag tag-dim">{t}</span>)}
                    </div>
                    {s.spotify?.embedUrl ? (
                      <iframe className="embed" src={s.spotify.embedUrl} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title={`${s.title} by ${s.artist}`} />
                    ) : (
                      <div className="no-preview">
                        🎵 Preview not available — <a href={`https://open.spotify.com/search/${encodeURIComponent(s.title + ' ' + s.artist)}`} target="_blank" rel="noreferrer" className="search-spotify">Search on Spotify ↗</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="reset-wrap">
                <button className="reset-btn" onClick={reset}>← Search Another Song</button>
              </div>
            </div>
          )}
        </main>

        {/* ── Coming Soon Teaser ─────────────────────────── */}
        <div className="coming-soon-strip">
          <div className="cs-inner">
            <div className="cs-eyebrow">✦ What's coming next</div>
            <h3 className="cs-title">Wavelength is getting a lot bigger.</h3>
            <div className="cs-features">
              <div className="cs-feature">
                <div className="cs-icon">♪</div>
                <div className="cs-feat-text">
                  <div className="cs-feat-title">Playlist Discovery</div>
                  <div className="cs-feat-desc">Connect Spotify. Pick a playlist. AI reads its DNA and surfaces songs you've never heard that were made for your taste.</div>
                </div>
              </div>
              <div className="cs-feature">
                <div className="cs-icon">◎</div>
                <div className="cs-feat-text">
                  <div className="cs-feat-title">Taste Matching</div>
                  <div className="cs-feat-desc">Find real people on the same wavelength. Not by genre — by musical fingerprint. Your people are out there.</div>
                </div>
              </div>
              <div className="cs-feature">
                <div className="cs-icon">💬</div>
                <div className="cs-feat-text">
                  <div className="cs-feat-title">Music Chat</div>
                  <div className="cs-feat-desc">When you match with someone, talk to them. Share songs, trade recommendations, connect over what you actually hear.</div>
                </div>
              </div>
            </div>
            <div className="cs-cta-row">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSfky-0X933FGqkqQs4xVo1VdgRIr0wv7h3Xn8rcir7hWGrysw/viewform"
                target="_blank"
                rel="noreferrer"
                className="cs-notify-btn"
              >
                ★ Rate the current version &amp; shape what's next
              </a>
              <div className="cs-disclaimer">Early users get first access.</div>
            </div>
          </div>
        </div>

        <footer className="footer">
          WAVELENGTH · AI Music Discovery · Powered by GPT-4o &amp; Spotify
        </footer>
      </div>
    </>
  );
}
