import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';

export default function BibleStudies() {
  const { bibleStudies, addStudy, removeStudy, isAdmin } = useAdmin();
  const [showAdd, setShowAdd] = useState(false);
  const [newStudy, setNewStudy] = useState({ week: '', topic: '', summary: '' });

  const handleAdd = (e) => {
    e.preventDefault();
    if (newStudy.topic) {
      addStudy(newStudy);
      setNewStudy({ week: '', topic: '', summary: '' });
      setShowAdd(false);
    }
  };

  return (
    <>
      <style>{`
        .church-bg {
          background-color: #F4EBD0;
          background-image: url('https://www.transparenttextures.com/patterns/aged-paper.png');
          color: #2C2A29;
          font-family: 'Lora', serif;
          min-height: 100vh;
          padding: 6rem 2rem 2rem;
        }
        .church-container {
          max-width: 800px;
          margin: 0 auto;
        }
        .church-title {
          font-family: 'Cinzel', serif;
          text-align: center;
          font-size: 3.5rem;
          color: #1a1614;
          margin-bottom: 1rem;
        }
        .church-divider {
          height: 2px;
          background: #C5A059;
          width: 150px;
          margin: 0 auto 3rem;
        }
        .church-card {
          background: #FDFAF2;
          border: 1px solid #D6C3A1;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          padding: 3rem;
          margin-bottom: 3rem;
          position: relative;
        }
        .church-input {
          width: 100%;
          padding: 1rem;
          background: transparent;
          border: 1px solid #C5A059;
          font-family: 'Lora', serif;
          margin-bottom: 1rem;
          font-size: 1.1rem;
          color: #2C2A29;
        }
        .church-btn {
          font-family: 'Cinzel', serif;
          background: #2C2A29;
          color: #F4EBD0;
          border: none;
          padding: 1rem 2rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s;
        }
        .church-btn:hover { background: #C5A059; }
      `}</style>
      
      <div className="church-bg">
        <div className="church-container">
          <h1 className="church-title">Study & Fellowship</h1>
          <div className="church-divider"></div>
          
          <p style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: '4rem', fontStyle: 'italic', color: '#5a5550' }}>
            A historical ledger of our gatherings around the scripture.
          </p>

          {isAdmin && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <button className="church-btn" style={{ background: '#C5A059', color: '#fff' }} onClick={() => setShowAdd(!showAdd)}>
                {showAdd ? 'Cancel Scribe' : 'Add New Entry'}
              </button>
            </div>
          )}

          {showAdd && isAdmin && (
            <form className="church-card" onSubmit={handleAdd}>
              <h2 style={{ fontFamily: 'Cinzel', textAlign: 'center', marginBottom: '2rem' }}>Scribe a Record</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input className="church-input" placeholder="Chapter / Week" value={newStudy.week} onChange={e => setNewStudy({...newStudy, week: e.target.value})} required style={{ flex: 1 }} />
                <input className="church-input" placeholder="Subject Title" value={newStudy.topic} onChange={e => setNewStudy({...newStudy, topic: e.target.value})} required style={{ flex: 2 }} />
              </div>
              <textarea className="church-input" placeholder="The details of our discourse..." value={newStudy.summary} onChange={e => setNewStudy({...newStudy, summary: e.target.value})} style={{ minHeight: '150px' }} />
              <button className="church-btn" type="submit" style={{ width: '100%' }}>Finalize Entry</button>
            </form>
          )}

          {bibleStudies.map((study) => (
            <div key={study.id} className="church-card">
              {isAdmin && (
                <button onClick={() => removeStudy(study.id)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#a00', cursor: 'pointer', fontSize: '1.2rem' }}>✖</button>
              )}
              <div style={{ textAlign: 'center', color: '#C5A059', fontStyle: 'italic', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                {study.week}
              </div>
              <h2 style={{ fontFamily: 'Cinzel', color: '#1a1614', textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }}>
                {study.topic}
              </h2>
              <p style={{ fontSize: '1.1rem', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {study.summary}
              </p>
            </div>
          ))}
          {bibleStudies.length === 0 && <p style={{ textAlign: 'center', fontStyle: 'italic' }}>The archives are empty.</p>}
        </div>
      </div>
    </>
  );
}
