import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin, logout } = useAdmin();
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const navLinks = [
    { name: 'HOME', path: '/' },
    { name: 'EVENTS', path: '/events' },
    { name: 'BIBLE STUDIES', path: '/bible-studies' },
    { name: 'COLD BREW', path: '/cold-brew' },
    { name: 'PEOPLE', path: '/people' },
  ];

  return (
    <nav className="navbar">
      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(15px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          height: 70px;
          display: flex;
          align-items: center;
          transition: 0.3s ease;
        }

        .nav-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
        }

        .nav-logo {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: white;
          text-decoration: none;
          letter-spacing: 2px;
        }

        /* Desktop Links */
        .nav-links {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .nav-item {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 1px;
          transition: 0.3s;
        }

        .nav-item:hover, .nav-item.active {
          color: white;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        /* Hamburger Button */
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;
          padding: 5px;
          z-index: 1001;
        }

        .hamburger span {
          width: 25px;
          height: 2px;
          background: white;
          transition: 0.3s;
        }

        /* Mobile Menu */
        .mobile-menu {
          position: fixed;
          top: 0;
          right: -100%;
          width: 80%;
          height: 100vh;
          background: rgba(10, 10, 20, 0.95);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 2rem;
          transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
        }

        .mobile-menu.open {
          right: 0;
        }

        /* Responsive Logic */
        @media (max-width: 900px) {
          .nav-links {
            display: none !important;
          }

          .hamburger {
            display: flex;
          }
          
          /* Transform Hamburger to X when open */
          .hamburger.open span:nth-child(1) { transform: translateY(8px) rotate(45deg); }
          .hamburger.open span:nth-child(2) { opacity: 0; }
          .hamburger.open span:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }
        }

        .admin-tag {
          background: #FFD272;
          color: black;
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 8px;
          vertical-align: middle;
        }
      `}</style>

      <div className="nav-container">
        <Link to="/" className="nav-logo" onClick={closeMenu}>
          NAVIGATORS
          {isAdmin && <span className="admin-tag">ADMIN</span>}
        </Link>

        {/* Desktop Menu */}
        <div className="nav-links">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
          {isAdmin && (
            <button onClick={logout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
              LOCK
            </button>
          )}
        </div>

        {/* Hamburger Icon */}
        <div className={`hamburger ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Mobile Slide-out Menu */}
        <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}
              onClick={closeMenu}
              style={{ fontSize: '1.5rem' }}
            >
              {link.name}
            </Link>
          ))}
          {isAdmin && (
            <button 
              onClick={() => { logout(); closeMenu(); }} 
              style={{ background: 'white', color: 'black', border: 'none', padding: '1rem 2rem', borderRadius: '50px', fontWeight: 'bold', marginTop: '2rem' }}
            >
              LOCK SERVER
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
