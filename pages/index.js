import { useState } from 'react';
import Head from 'next/head';

const ANALYZE_OPTIONS = [
  { id: 'lyrics', label: 'Lyrics & Meaning', icon: '✍' },
  { id: 'mood', label: 'Mood & Emotions', icon: '◎' },
  { id: 'genre', label: 'Genre & Style', icon: '◈' },
  { id: 'tempo', label: 'Tempo & Energy', icon: '⚡' },
];

export default function Home() {
  const [inputType, setInputType] = useState('name');
  const [songInput, setSongInput] = useState('');
  const [analyzeBy, setAnalyzeBy] = useState(['lyrics', 'mood', 'genre', 'tempo']);
  const [genreMode, setGenreMode] = useState('explore');
  const [languageFilter, setLanguageFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

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

  const { inputSong, analysis, suggestions } = result || {};

  return (
    <>
      <Head>
        <title>WAVELENGTH — AI Music Discovery</title>
        <meta name="description" content="AI-powered song analysis and recommendations via Spotify" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="app">
        {/* Ambient background orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="noise" />

        {/* Nav */}
        <nav className="nav">
          <div className="logo">
            WAVE<span className="logo-accent">LENGTH</span>
          </div>
          <div className="nav-right">
            <span className="nav-badge">GPT-4o × Spotify</span>
          </div>
        </nav>

        <main className="main">
          {/* ── HERO (hidden once we have results) ── */}
          {!result && !loading && (
            <section className="hero">
              <div className="hero-eyebrow">✦ AI Music Discovery</div>
              <h1 className="hero-title">
                Decode any song.
                <br />
                <em>Discover your next obsession.</em>
              </h1>
              <p className="hero-sub">
                Enter any song. Choose what to analyze — lyrics, mood, genre, energy.
                <br />
                We'll surface 5 songs that truly resonate.
              </p>
            </section>
          )}

          {/* ── FORM ── */}
          {!result && (
            <section className="form-wrap">
              <form onSubmit={handleSubmit} className="form">
                {/* Input type toggle */}
                <div className="pill-toggle">
                  <button
                    type="button"
                    className={`pill-btn ${inputType === 'name' ? 'pill-active' : ''}`}
                    onClick={() => setInputType('name')}
                  >
                    Song Name
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${inputType === 'link' ? 'pill-active' : ''}`}
                    onClick={() => setInputType('link')}
                  >
                    Spotify Link
                  </button>
                </div>

                {/* Main input */}
                <div className="input-wrap">
                  <input
                    className="song-input"
                    type="text"
                    value={songInput}
                    onChange={(e) => setSongInput(e.target.value)}
                    placeholder={
                      inputType === 'name'
                        ? 'e.g.  Blinding Lights — The Weeknd'
                        : 'Paste Spotify track URL…'
                    }
                    autoFocus
                    required
                  />
                </div>

                {/* Analyze by */}
                <div className="field-group">
                  <div className="field-label">Analyze by</div>
                  <div className="check-grid">
                    {ANALYZE_OPTIONS.map((opt) => {
                      const checked = analyzeBy.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`check-card ${checked ? 'check-active' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAnalyze(opt.id)}
                            hidden
                          />
                          <span className="check-mark">{checked ? '✓' : ''}</span>
                          <span className="check-icon">{opt.icon}</span>
                          <span className="check-label">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Filters */}
                <div className="filters-row">
                  <div className="field-group filter-half">
                    <div className="field-label">Genre exploration</div>
                    <div className="pill-toggle small">
                      <button
                        type="button"
                        className={`pill-btn ${genreMode === 'same' ? 'pill-active' : ''}`}
                        onClick={() => setGenreMode('same')}
                      >
                        Same genre
                      </button>
                      <button
                        type="button"
                        className={`pill-btn ${genreMode === 'explore' ? 'pill-active' : ''}`}
                        onClick={() => setGenreMode('explore')}
                      >
                        Explore broadly
                      </button>
                    </div>
                  </div>

                  <div className="field-group filter-half">
                    <div className="field-label">Language preference <span className="opt">(optional)</span></div>
                    <input
                      className="lang-input"
                      type="text"
                      value={languageFilter}
                      onChange={(e) => setLanguageFilter(e.target.value)}
                      placeholder="e.g. Spanish, Korean…"
                    />
                  </div>
                </div>

                {analyzeBy.length === 0 && (
                  <p className="warn">Please select at least one analysis dimension.</p>
                )}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || !songInput.trim() || analyzeBy.length === 0}
                >
                  ✦ Analyze &amp; Discover
                </button>
              </form>
            </section>
          )}

          {/* ── ERROR ── */}
          {error && <div className="error-box">⚠ {error}</div>}

          {/* ── LOADING ── */}
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

          {/* ── RESULTS ── */}
          {result && !loading && (
            <div className="results">
              {/* Analysis card */}
              <div className="analysis-card">
                <div className="analysis-inner">
                  {inputSong?.spotify?.albumArt ? (
                    <img
                      className="art"
                      src={inputSong.spotify.albumArt}
                      alt={inputSong.title}
                    />
                  ) : (
                    <div className="art art-placeholder">♪</div>
                  )}
                  <div className="analysis-text">
                    <div className="analysis-eyebrow">Analyzed song</div>
                    <div className="analysis-title">{inputSong?.title}</div>
                    <div className="analysis-artist">{inputSong?.artist}</div>
                    {inputSong?.spotify?.url && (
                      <a
                        className="open-spotify"
                        href={inputSong.spotify.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Spotify ↗
                      </a>
                    )}
                  </div>
                </div>

                <p className="analysis-summary">{analysis?.summary}</p>

                <div className="tag-row">
                  {analysis?.mood?.map((m) => (
                    <span key={m} className="tag tag-green">{m}</span>
                  ))}
                  {analysis?.themes?.map((t) => (
                    <span key={t} className="tag tag-amber">{t}</span>
                  ))}
                </div>
              </div>

              {/* Suggestions header */}
              <div className="recs-header">
                <h2 className="recs-title">5 Recommendations</h2>
                <div className="recs-meta">Based on your analysis · {genreMode === 'same' ? 'Same genre' : 'Cross-genre'}</div>
              </div>

              {/* Song cards */}
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
                        <a
                          className="card-spotify-btn"
                          href={s.spotify.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ▶ Open
                        </a>
                      )}
                    </div>

                    <p className="card-reason">{s.reason}</p>

                    <div className="tag-row">
                      {s.moodTags?.map((t) => (
                        <span key={t} className="tag tag-dim">{t}</span>
                      ))}
                    </div>

                    {s.spotify?.embedUrl ? (
                      <iframe
                        className="embed"
                        src={s.spotify.embedUrl}
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        title={`${s.title} by ${s.artist}`}
                      />
                    ) : (
                      <div className="no-preview">
                        🎵 Preview not available on Spotify — <a href={`https://open.spotify.com/search/${encodeURIComponent(s.title + ' ' + s.artist)}`} target="_blank" rel="noreferrer" className="search-spotify">Search on Spotify ↗</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* New search */}
              <div className="reset-wrap">
                <button className="reset-btn" onClick={reset}>
                  ← Search Another Song
                </button>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          WAVELENGTH · AI Music Discovery · Powered by GPT-4o &amp; Spotify
        </footer>
      </div>
    </>
  );
}
