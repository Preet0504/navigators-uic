import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import BrandLogo from './BrandLogo';

const LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Events', path: '/events' },
  { name: 'Bible Studies', path: '/bible-studies' },
  { name: 'Cold Brew', path: '/cold-brew' },
  { name: 'People', path: '/people' },
  { name: 'Community', path: '/community' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAdmin, logout } = useAdmin();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change + lock body scroll when open.
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <style>{`
        .nav {
          position: fixed; top: 0; left: 0; width: 100%; height: var(--nav-h); z-index: 1000;
          display: flex; align-items: center;
          background: rgba(251,250,247,0.82); backdrop-filter: blur(14px) saturate(1.4);
          border-bottom: 1px solid transparent; transition: box-shadow .3s, border-color .3s, background .3s;
        }
        .nav-scrolled { border-bottom-color: var(--border); box-shadow: 0 4px 24px rgba(36,32,30,.06); }
        .nav-inner { width: 100%; max-width: var(--maxw); margin: 0 auto; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; }
        .nav-links { display: flex; align-items: center; gap: 0.35rem; }
        .nav-link {
          position: relative; font-size: 0.9rem; font-weight: 600; color: var(--cocoa);
          padding: 0.5rem 0.85rem; border-radius: var(--r-pill); transition: color .2s, background .2s;
        }
        .nav-link:hover { color: var(--teal); background: rgba(0,140,149,0.07); }
        .nav-link.active { color: var(--teal); }
        .nav-link.active::after {
          content: ''; position: absolute; left: 50%; bottom: 2px; transform: translateX(-50%);
          width: 18px; height: 3px; border-radius: 3px; background: var(--gold);
        }
        .nav-cta { display: flex; align-items: center; gap: 0.75rem; }
        .admin-pill {
          display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase; color: #2a2207; background: var(--gold);
          padding: 0.3rem 0.7rem; border-radius: var(--r-pill);
        }
        .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 8px; z-index: 1101; }
        .hamburger span { width: 24px; height: 2px; background: var(--ink); border-radius: 2px; transition: .3s var(--ease); }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .mobile-panel {
          position: fixed; inset: 0 0 0 auto; width: min(82%, 360px); height: 100dvh;
          background: var(--surface); box-shadow: var(--shadow-lg);
          display: flex; flex-direction: column; padding: calc(var(--nav-h) + 1rem) 1.5rem 2rem;
          transform: translateX(100%); transition: transform .4s var(--ease); z-index: 1100; gap: 0.4rem;
        }
        .mobile-panel.open { transform: translateX(0); }
        .mobile-link { font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; color: var(--ink); padding: 0.7rem 0.4rem; border-bottom: 1px solid var(--border); }
        .mobile-link.active { color: var(--teal); }
        .scrim { position: fixed; inset: 0; background: rgba(36,32,30,.45); backdrop-filter: blur(2px); z-index: 1090; animation: fadeIn .25s ease both; }
        @media (max-width: 880px) {
          .nav-links { display: none; }
          .nav-cta .admin-pill { display: none; }
          .hamburger { display: flex; }
        }
      `}</style>

      <div className="nav-inner">
        <Link to="/" aria-label="Navigators home" style={{ display: 'flex', alignItems: 'center' }}>
          <BrandLogo size={36} />
        </Link>

        <div className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.path} to={l.path} className={`nav-link ${location.pathname === l.path ? 'active' : ''}`}>
              {l.name}
            </Link>
          ))}
        </div>

        <div className="nav-cta">
          {isAdmin && <span className="admin-pill">● Admin</span>}
          {isAdmin && (
            <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
          )}
          {!isAdmin && (
            <Link to="/events" className="btn btn-gold btn-sm" style={{ display: 'inline-flex' }}>
              Join us
            </Link>
          )}
          <button
            className={`hamburger ${open ? 'open' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className={`mobile-panel ${open ? 'open' : ''}`}>
        {LINKS.map((l) => (
          <Link key={l.path} to={l.path} className={`mobile-link ${location.pathname === l.path ? 'active' : ''}`}>
            {l.name}
          </Link>
        ))}
        {isAdmin ? (
          <button className="btn btn-ghost" style={{ marginTop: '1.5rem' }} onClick={() => { logout(); setOpen(false); }}>Sign out of admin</button>
        ) : (
          <Link to="/events" className="btn btn-gold" style={{ marginTop: '1.5rem' }}>Join us this week</Link>
        )}
      </div>
    </nav>
  );
}
