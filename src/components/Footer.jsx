import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import Pattern from './Pattern';
import { NAVIGATORS_ORG } from '../data/resources';

export default function Footer() {
  return (
    <footer style={{ position: 'relative', background: 'var(--teal-darker)', color: '#dfeceb', overflow: 'hidden' }}>
      <Pattern variant="connection" color="#ffffff" opacity={0.05} />
      <div className="container" style={{ position: 'relative', padding: '3.5rem 1.5rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem' }}>
        <div>
          <BrandLogo size={40} />
          <p style={{ marginTop: '1rem', maxWidth: '30ch', color: '#bcd6d4', fontSize: '0.95rem' }}>
            Find your people. A community of students growing in faith and friendship at the University of Illinois Chicago.
          </p>
        </div>

        <div>
          <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>Explore</h4>
          {[['Home', '/'], ['Events', '/events'], ['Weekly Gathering', '/weekly-gathering'], ['Community', '/community']].map(([label, to]) => (
            <Link key={to} to={to} style={{ display: 'block', color: '#cfe3e1', padding: '0.3rem 0', fontSize: '0.95rem' }}>{label}</Link>
          ))}
        </div>

        <div>
          <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>The Navigators</h4>
          <a href={NAVIGATORS_ORG.href} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#cfe3e1', padding: '0.3rem 0', fontSize: '0.95rem' }}>{NAVIGATORS_ORG.label} ↗</a>
        </div>

        <div>
          <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>Connect</h4>
          <a href="https://chat.whatsapp.com/HdFHVznfmCsDVAWTJE50Aa?mode=gi_t" target="_blank" rel="noreferrer" style={{ display: 'block', color: '#cfe3e1', padding: '0.3rem 0', fontSize: '0.95rem' }}>💬 Join our WhatsApp group</a>
          <a href="mailto:tim.bierma@navigators.org" style={{ display: 'block', color: '#cfe3e1', padding: '0.3rem 0', fontSize: '0.95rem' }}>tim.bierma@navigators.org</a>
          <p style={{ color: '#9fc0bd', fontSize: '0.85rem', marginTop: '0.6rem' }}>University of Illinois Chicago</p>
        </div>
      </div>

      <div className="container" style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.12)', padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.82rem', color: '#9fc0bd' }}>
        <span>&copy; {new Date().getFullYear()} Navigators at UIC. All rights reserved.</span>
        <span>Navigator Teal &amp; Gold · built with care</span>
      </div>
    </footer>
  );
}
