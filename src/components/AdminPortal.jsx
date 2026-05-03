import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';

export default function AdminPortal() {
  const { isAdmin, login } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Shortcut: Ctrl + Shift + A
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen || isAdmin) return null; // If they are admin, portal closes.

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(pwd)) {
      setIsOpen(false);
      setPwd('');
      setError('');
    } else {
      setError('INVALID_PWRD');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="pixel-card grass" style={{ width: '400px', position: 'relative' }}>
        <button onClick={() => setIsOpen(false)} style={{ position: 'absolute', top: '-16px', right: '0', background: 'var(--mc-border)', color: 'white', border: 'none', padding: '0.5rem', fontFamily: "'Press Start 2P'", cursor: 'pointer' }}>
          [X]
        </button>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2>OP CONSOLE</h2>
          <p style={{ color: '#ccc', fontFamily: "'VT323'", fontSize: '1.2rem' }}>Enter access code...</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="password" 
            placeholder="***" 
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoFocus
            style={{ textAlign: 'center' }}
          />
          {error && <p style={{ color: '#ff5555', textAlign: 'center', fontFamily: "'Press Start 2P'", fontSize: '0.8rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            UNLOCK SERVER
          </button>
        </form>
      </div>
    </div>
  );
}
