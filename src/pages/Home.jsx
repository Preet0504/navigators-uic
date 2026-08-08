import React from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useReveal } from '../hooks/useReveal';
import { isUpcoming, parseDate } from '../lib/format';
import BrandLogo from '../components/BrandLogo';
import Pattern from '../components/Pattern';
import EventCard from '../components/EventCard';
import { NAVIGATORS_ORG } from '../data/resources';

const QUICK = [
  { to: '/events', label: 'Events', desc: 'Bonfires, retreats & weekly hangs', accent: 'var(--orange)', icon: '✦' },
  { to: '/weekly-gathering', label: 'Weekly Gathering', desc: 'Bible studies & Cold Brew game nights', accent: 'var(--teal)', icon: '✚' },
  { to: '/community', label: 'Community', desc: 'See where our people call home', accent: 'var(--blue)', icon: '☻' },
];

const VALUES = [
  { t: 'Relational', d: 'Real friendships over a shared table — you belong here before you believe anything.' },
  { t: 'Bible-based', d: 'We read the actual text together and wrestle with the big questions, honestly.' },
  { t: 'Intentional', d: 'Growth on purpose. We help each other take the next step, whatever it is.' },
  { t: 'Transformational', d: 'Lives change here. We’ve seen it, and we can’t wait to see yours.' },
];

export default function Home() {
  const { events } = useAdmin();
  const ref = useReveal([events.map((e) => e.id).join(',')]);

  const upcoming = events
    .filter((e) => isUpcoming(e.date))
    .sort((a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0))
    .slice(0, 3);

  return (
    <div ref={ref}>
      <style>{`
        .hero {
          position: relative; margin: calc(var(--nav-h) + 1rem) 1rem 0; border-radius: var(--r-lg);
          background: radial-gradient(120% 120% at 80% 0%, #00a3ad 0%, var(--teal) 40%, var(--teal-darker) 100%);
          color: #fff; overflow: hidden; isolation: isolate;
          box-shadow: var(--shadow-lg);
        }
        .hero-inner { position: relative; z-index: 2; max-width: var(--maxw); margin: 0 auto; padding: clamp(3rem,7vw,6rem) clamp(1.5rem,5vw,4.5rem); }
        .hero h1 { font-size: clamp(2.8rem, 7vw, 5.2rem); line-height: 1.02; letter-spacing: -0.02em; color: #fff; }
        .hero h1 .gold { color: var(--gold); font-style: italic; }
        .hero p.lead { font-size: clamp(1.05rem, 2vw, 1.3rem); max-width: 52ch; color: #d8efee; margin: 1.4rem 0 2.2rem; }
        .hero-orb { position: absolute; border-radius: 50%; filter: blur(2px); z-index: 1; }
        .hero-sail { position: absolute; right: clamp(12px, 3vw, 56px); top: 50%; transform: translateY(-50%); width: min(38vw, 380px); max-height: 82%; opacity: 0.9; z-index: 1; animation: floaty 7s ease-in-out infinite; }
        .hero-sail img { max-height: 100%; }
        @media (max-width: 720px) { .hero-sail { display: none; } }
        .stat-row { display: flex; gap: 2.5rem; flex-wrap: wrap; margin-top: 2.6rem; }
        .stat b { font-family: var(--font-display); font-size: 2rem; color: var(--gold); display: block; line-height: 1; }
        .stat span { font-size: 0.85rem; color: #bfe0de; }

        .quick-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px,1fr)); gap: 1.2rem; }
        .quick-card {
          position: relative; isolation: isolate; display: block; padding: 1.8rem 1.7rem; min-height: 190px;
          border-radius: var(--r-lg); background: #fff; border: 1px solid var(--border); overflow: hidden;
          box-shadow: var(--shadow-sm); transition: transform .3s var(--ease), box-shadow .3s var(--ease), border-color .3s var(--ease);
        }
        .quick-card::before {
          content: ''; position: absolute; inset: 0; z-index: -2;
          background: linear-gradient(155deg, var(--qc-accent) 0%, transparent 60%); opacity: 0.08;
          transition: opacity .3s var(--ease);
        }
        .quick-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-md); border-color: transparent; }
        .quick-card:hover::before { opacity: 0.14; }
        .quick-card .qc-glyph {
          position: absolute; right: -0.4rem; bottom: -1.6rem; z-index: -1; font-size: 7rem; line-height: 1;
          color: var(--qc-accent); opacity: 0.14; transform: rotate(-8deg); transition: transform .45s var(--ease);
          pointer-events: none;
        }
        .quick-card:hover .qc-glyph { transform: rotate(0deg) scale(1.08); }
        .quick-card .ic {
          width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; font-size: 1.5rem;
          color: #fff; background: var(--qc-accent); margin-bottom: 1.1rem; box-shadow: 0 8px 18px -6px var(--qc-accent);
        }
        .quick-card h3 { font-size: 1.3rem; margin-bottom: 0.35rem; }
        .quick-card .go { display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 1rem; font-size: 0.85rem; font-weight: 700; color: var(--qc-accent); }
        .quick-card .go span { transition: transform .3s var(--ease); }
        .quick-card:hover .go span { transform: translateX(3px); }

        .ev-card { display: flex; gap: 1rem; padding: 1rem; align-items: center; }
        .ev-date { flex-shrink: 0; width: 64px; text-align: center; background: var(--teal); color: #fff; border-radius: var(--r-sm); padding: 0.6rem 0; }
        .ev-date .d { font-family: var(--font-display); font-size: 1.6rem; line-height: 1; font-weight: 700; }
        .ev-date .m { font-size: 0.68rem; letter-spacing: 0.1em; }

        .value-card { padding: 1.6rem; border-radius: var(--r-md); background: #fff; border: 1px solid var(--border); }
        .value-card .n { font-family: var(--font-display); font-size: 1.1rem; color: var(--gold-dark); }
        .value-card h4 { font-size: 1.3rem; margin: 0.2rem 0 0.5rem; }

        .cta-band { position: relative; margin: 0 1rem; border-radius: var(--r-lg); overflow: hidden; background: linear-gradient(120deg, var(--gold) 0%, #e7b94e 100%); color: #2a2207; text-align: center; padding: clamp(2.5rem,5vw,4rem) 1.5rem; }

        .res-banner {
          position: relative; overflow: hidden; isolation: isolate; display: flex; width: 100%;
          align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap;
          padding: clamp(1.8rem,4vw,2.6rem) clamp(1.8rem,4vw,3rem); border-radius: var(--r-lg); color: #fff;
          box-shadow: var(--shadow-md);
          transition: transform .35s var(--ease), box-shadow .35s var(--ease);
        }
        .res-banner::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(160deg, rgba(255,255,255,0.18), transparent 46%); }
        .res-banner:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); }
        .res-glyph { position: absolute; right: 1rem; bottom: -2.2rem; font-size: 9rem; line-height: 1; opacity: 0.15; transform: rotate(-8deg); transition: transform .45s var(--ease); pointer-events: none; }
        .res-banner:hover .res-glyph { transform: rotate(0deg) scale(1.08); }
        .res-banner-body { display: flex; align-items: center; gap: 1.2rem; }
        .res-banner-ic { flex-shrink: 0; width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; font-size: 1.5rem; background: rgba(255,255,255,0.18); }
        .res-banner h3 { color: #fff; font-size: 1.4rem; margin-bottom: 0.3rem; }
        .res-banner p { color: rgba(255,255,255,0.92); font-size: 0.92rem; line-height: 1.5; max-width: 46ch; }
        .res-cta {
          flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 0.9rem;
          letter-spacing: 0.02em; background: rgba(255,255,255,0.16); padding: 0.7rem 1.2rem; border-radius: var(--r-pill);
          transition: background .3s var(--ease);
        }
        .res-banner:hover .res-cta { background: rgba(255,255,255,0.26); }
        .res-arrow { transition: transform .3s var(--ease); }
        .res-banner:hover .res-arrow { transform: translate(3px, -3px); }
      `}</style>

      {/* HERO */}
      <header className="hero">
        <Pattern variant="rays" color="#ffffff" opacity={0.10} />
        <div className="hero-orb" style={{ width: 320, height: 320, background: 'rgba(209,159,42,0.35)', top: -120, left: -80 }} />
        <BrandLogo className="hero-sail" size={460} wordmark={false} />
        <div className="hero-inner">
          <span className="eyebrow" style={{ color: '#fff' }}>Navigators at UIC</span>
          <h1>Find your <span className="gold">people.</span></h1>
          <p className="lead">
            A community of students growing in faith and friendship at the University of Illinois Chicago.
            Come as you are — we saved you a seat.
          </p>
          <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
            <Link to="/events" className="btn btn-gold">See what’s happening →</Link>
            <Link to="/weekly-gathering" className="btn btn-outline-light">Weekly Gathering</Link>
          </div>
          <div className="stat-row">
            <div className="stat"><b>4</b><span>nights a week</span></div>
            <div className="stat"><b>1</b><span>welcoming family</span></div>
            <div className="stat"><b>0</b><span>pressure to fit in</span></div>
          </div>
        </div>
      </header>

      {/* QUICK LINKS */}
      <section className="section container">
        <div className="reveal" style={{ marginBottom: '1.6rem' }}>
          <span className="eyebrow">Jump in</span>
          <h2 className="section-title">Wherever you’re starting</h2>
        </div>
        <div className="quick-grid">
          {QUICK.map((q, i) => (
            <Link to={q.to} key={q.to} className="quick-card reveal" style={{ '--qc-accent': q.accent, transitionDelay: `${i * 60}ms` }}>
              <span className="qc-glyph" aria-hidden="true">{q.icon}</span>
              <span className="ic">{q.icon}</span>
              <h3>{q.label}</h3>
              <p className="muted" style={{ fontSize: '0.92rem' }}>{q.desc}</p>
              <div className="go">Explore <span>→</span></div>
            </Link>
          ))}
        </div>
      </section>

      {/* UPCOMING */}
      <section className="section container">
        <div className="reveal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.6rem' }}>
          <div>
            <span className="eyebrow">This semester</span>
            <h2 className="section-title">Upcoming events</h2>
          </div>
          <Link to="/events" className="btn btn-ghost btn-sm">View all events</Link>
        </div>
        <div className="grid grid-auto">
          {upcoming.length > 0 ? (
            upcoming.map((ev) => <EventCard key={ev.id} event={ev} />)
          ) : (
            <div className="empty-state card" style={{ gridColumn: '1 / -1' }}>
              <p>No upcoming events scheduled right now — check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* VALUES */}
      <section className="section container">
        <div className="reveal center" style={{ marginBottom: '2rem' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>What we’re about</span>
          <h2 className="section-title">Come for the people, stay for the purpose</h2>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))' }}>
          {VALUES.map((v, i) => (
            <div key={v.t} className="value-card reveal" style={{ transitionDelay: `${i * 60}ms` }}>
              <div className="n">0{i + 1}</div>
              <h4>{v.t}</h4>
              <p className="muted" style={{ fontSize: '0.92rem' }}>{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXPLORE THE NAVIGATORS (outbound) */}
      <section className="section container">
        <div className="reveal center" style={{ marginBottom: '2rem' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Beyond campus</span>
          <h2 className="section-title">Explore The Navigators</h2>
        </div>
        <a href={NAVIGATORS_ORG.href} target="_blank" rel="noopener noreferrer" className="res-banner reveal" style={{ background: NAVIGATORS_ORG.grad }}>
          <span className="res-glyph" aria-hidden="true">{NAVIGATORS_ORG.icon}</span>
          <div className="res-banner-body">
            <span className="res-banner-ic" aria-hidden="true">{NAVIGATORS_ORG.icon}</span>
            <div>
              <h3>{NAVIGATORS_ORG.label}</h3>
              <p>{NAVIGATORS_ORG.desc}</p>
            </div>
          </div>
          <span className="res-cta">Visit site <span className="res-arrow">↗</span></span>
        </a>
      </section>

      {/* CTA */}
      <section className="cta-band reveal">
        <Pattern variant="movement" color="#7a5e10" opacity={0.10} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#2a2207' }}>Your first time is on us.</h2>
          <p style={{ maxWidth: '46ch', margin: '0.8rem auto 1.6rem', fontWeight: 500 }}>
            Seriously — just show up. Pick an event, RSVP in ten seconds, and we’ll take it from there.
          </p>
          <Link to="/events" className="btn" style={{ background: 'var(--teal-darker)' }}>Find an event →</Link>
        </div>
      </section>

      <div className="container center" style={{ padding: '3rem 0 1rem', opacity: 0.6 }}>
        <BrandLogo size={30} />
      </div>
    </div>
  );
}
