import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from 'next-auth/react';

const tabs = [
  {
    href: '/',
    label: 'Discover',
    section: 'discover',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Playlists',
    section: 'playlists',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    href: '/discover',
    label: 'People',
    section: 'people',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export default function Nav() {
  const router = useRouter();
  const { data: session, status } = useSession();

  function isActive(href) {
    if (href === '/') return router.pathname === '/';
    return router.pathname.startsWith(href);
  }

  // Don't render nav on chat pages — chat has its own full-height layout
  if (router.pathname.startsWith('/chat')) return null;

  return (
    <>
      {/* ── Desktop / Tablet top nav ─────────────────────────── */}
      <nav className="top-nav">
        <Link href="/" className="nav-logo">
          WAVE<span className="accent">LENGTH</span>
        </Link>

        <div className="nav-center">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`nav-tab${isActive(tab.href) ? ' active' : ''}`}
              data-section={tab.section}
            >
              {tab.label}
              <span className="tab-pip" />
            </Link>
          ))}
        </div>

        <div className="nav-right">
          {status === 'loading' ? null : session ? (
            <div className="nav-user-info">
              <div className="nav-avatar-wrap">
                {session.avatar
                  ? <img src={session.avatar} alt={session.displayName} />
                  : <span>{(session.displayName || 'U')[0]}</span>
                }
              </div>
              <button className="btn-signout" onClick={() => signOut()}>Sign out</button>
            </div>
          ) : (
            <button className="btn-connect" onClick={() => signIn('spotify')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span>Connect Spotify</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ─────────────────────────────── */}
      <nav className="bottom-nav">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`btab${isActive(tab.href) ? ' active' : ''}`}
            data-section={tab.section}
          >
            <span className="btab-active-bar" />
            <span className="btab-icon">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
