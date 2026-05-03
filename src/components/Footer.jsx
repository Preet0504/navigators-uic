import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--mc-stone)',
      borderTop: '8px solid var(--mc-border)',
      padding: '2rem 0',
      color: '#000',
      fontFamily: "'VT323', monospace",
      fontSize: '1.2rem'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontFamily: "'Press Start 2P'", color: 'var(--mc-green)', textShadow: '2px 2px 0px #000', marginBottom: '0.5rem' }}>UIC NAVIGATORS</h3>
          <p>Connecting cultures at UIC.</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <span>IG: @uicnavigators</span>
          <span>contact@uicnavigators.org</span>
        </div>
        <div>
          &copy; {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
