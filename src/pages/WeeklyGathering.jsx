import React from 'react';
import { useReveal } from '../hooks/useReveal';
import { useSeo } from '../hooks/useSeo';
import { PAGE_SEO } from '../data/seo';
import Pattern from '../components/Pattern';

const GATHERINGS = [
  {
    icon: '✚',
    accent: 'var(--teal)',
    title: 'Bible Studies',
    tag: 'Weekly · small groups',
    desc: 'An open table around the Scriptures — no background, no pressure, just honest questions. We read the text together, ask the hard stuff out loud, and figure it out as a group.',
  },
  {
    icon: '♛',
    accent: 'var(--purple)',
    title: 'Cold Brew Arena',
    tag: 'Weekly · game night',
    desc: 'Board games, card games, chocolates, coffee, and fun conversation. No pressure to be good at anything, just show up and have fun.',
  },
];

export default function WeeklyGathering() {
  useSeo(PAGE_SEO.weeklyGathering);
  const ref = useReveal([]);

  return (
    <div className="page" ref={ref}>
      <div className="container" style={{ maxWidth: 900 }}>
        <header style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'linear-gradient(120deg, var(--teal), var(--teal-darker))', color: '#fff', padding: 'clamp(2.5rem,5vw,3.5rem)', marginBottom: '2.5rem' }}>
          <Pattern variant="connection" color="#ffffff" opacity={0.1} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="eyebrow" style={{ color: '#fff' }}>Every week</span>
            <h1 style={{ fontSize: 'clamp(2.2rem,5vw,3.4rem)', margin: '0.4rem 0', color: '#fff' }}>Weekly Gathering</h1>
            <p style={{ maxWidth: '52ch', color: '#d8efee' }}>Two standing dates on the calendar — come to one, come to both. Check the events page for this week’s time and place.</p>
          </div>
        </header>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: '1.5rem' }}>
          {GATHERINGS.map((g, i) => (
            <div key={g.title} className="card reveal" style={{ padding: '2rem', transitionDelay: `${i * 80}ms` }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '1.7rem', color: '#fff', background: g.accent, marginBottom: '1.1rem' }}>
                {g.icon}
              </div>
              <span className="badge-soft badge" style={{ marginBottom: '0.6rem' }}>{g.tag}</span>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>{g.title}</h2>
              <p className="muted" style={{ lineHeight: 1.7 }}>{g.desc}</p>
            </div>
          ))}
        </div>

        <div className="card reveal center" style={{ marginTop: '2rem', padding: '1.8rem' }}>
          <p className="muted" style={{ marginBottom: '0.9rem' }}>Want in? Join the group chat and we’ll point you to what’s next.</p>
          <a href="https://chat.whatsapp.com/HdFHVznfmCsDVAWTJE50Aa?mode=gi_t" target="_blank" rel="noreferrer" className="btn btn-gold">💬 Join our WhatsApp group</a>
        </div>
      </div>
    </div>
  );
}
