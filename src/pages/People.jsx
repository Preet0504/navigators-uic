import React, { useState } from 'react';

export default function People() {
  const leaders = [
    { id: 1, name: 'Sarah Jenkins', role: 'Guild Master', bio: 'Sarah loves connecting people. Connect for coffee! A true friend to all.', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80' }
  ];

  const current = leaders[0];

  return (
    <>
      <style>{`
        .book-bg {
          background-color: #2F2E2C;
          background-image: radial-gradient(circle at center, #4A4843 0%, #1A1918 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem 2rem;
        }
        .book-wrapper {
          display: flex;
          background: #F4EBD0;
          width: 100%;
          max-width: 900px;
          min-height: 500px;
          border-radius: 8px;
          box-shadow: inset 0 0 40px rgba(0,0,0,0.1), 0 20px 50px rgba(0,0,0,0.5);
          position: relative;
          color: #2C2A29;
          font-family: 'Lora', serif;
        }
        .book-wrapper::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0; left: 50%;
          width: 40px;
          background: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0) 100%);
          transform: translateX(-50%);
          pointer-events: none;
        }
        .book-page {
          width: 50%;
          padding: 3rem;
          display: flex;
          flex-direction: column;
        }
        .book-page-left {
          border-right: 1px solid rgba(0,0,0,0.1);
          align-items: center;
          justify-content: center;
        }
        .book-page-right {
          justify-content: center;
        }
        .book-photo {
          width: 250px; height: 350px;
          object-fit: cover;
          border: 1px solid #C5A059;
          padding: 8px;
          background: white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          transform: rotate(-2deg);
        }
        .book-title {
          font-family: 'Cinzel', serif;
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .book-role {
          color: #C5A059;
          font-style: italic;
          font-size: 1.2rem;
          margin-bottom: 2rem;
        }
        .book-bio {
          font-size: 1.1rem;
          line-height: 1.8;
          flex-grow: 1;
        }

        
        @media(max-width: 768px) {
          .book-wrapper { flex-direction: column; }
          .book-page { width: 100%; padding: 2rem; }
          .book-wrapper::after { display: none; }
          .book-photo { height: 250px; }
        }
      `}</style>

      <div className="book-bg">
        <div style={{ position: 'relative', width: '100%', maxWidth: '900px' }}>
          <div className="book-wrapper">
            <div className="book-page book-page-left">
              <img src={current.image} alt={current.name} className="book-photo" />
            </div>
            <div className="book-page book-page-right">
              <h1 className="book-title">{current.name}</h1>
              <div className="book-role">{current.role}</div>
              <p className="book-bio">{current.bio}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
