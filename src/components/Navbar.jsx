import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

export default function Navbar() {
  const { isAdmin, logout } = useAdmin();

  const links = [
    { to: '/', label: 'Home' },
    { to: '/events', label: 'Events' },
    { to: '/bible-studies', label: 'Bible Studies' },
    { to: '/cold-brew', label: 'Cold Brew' },
    { to: '/people', label: 'People' }
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', padding: '0 2rem' }}>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {links.map(l => (
            <NavLink 
              key={l.to} 
              to={l.to} 
              style={({ isActive }) => ({
                color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.9rem',
                fontWeight: isActive ? '700' : '400',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                transition: 'color 0.2s',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        {isAdmin && (
          <button onClick={logout} style={{ 
            background: 'rgba(255,50,50,0.8)', color: 'white', border: 'none', 
            padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: "'Space Grotesk'", fontWeight: 700 
          }}>
            EXIT ADMIN
          </button>
        )}
      </div>
    </nav>
  );
}
