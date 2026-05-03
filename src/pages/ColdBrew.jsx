import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';

export default function ColdBrew() {
  const { scores, updateWin, isAdmin, removePlayerScores, removeGameScores } = useAdmin();
  const [view, setView] = useState('GLOBAL');
  const [newPlayer, setNewPlayer] = useState('');
  const [activeGame, setActiveGame] = useState('Uno');
  const [confirmPlayer, setConfirmPlayer] = useState(null);
  const [confirmGame, setConfirmGame] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  const globalScores = {};
  scores.forEach(s => {
    if (!globalScores[s.game]) globalScores[s.game] = {};
    if (!globalScores[s.game][s.name]) globalScores[s.game][s.name] = 0;
    globalScores[s.game][s.name] += s.score;
  });

  const historyScores = {};
  scores.forEach(s => {
    if (!historyScores[s.date]) historyScores[s.date] = {};
    if (!historyScores[s.date][s.game]) historyScores[s.date][s.game] = {};
    if (!historyScores[s.date][s.game][s.name]) historyScores[s.date][s.game][s.name] = 0;
    historyScores[s.date][s.game][s.name] += s.score;
  });
  const sortedDates = Object.keys(historyScores).sort((a,b) => new Date(b) - new Date(a));
  const allPlayers = [...new Set(scores.map(s => s.name))];

  return (
    <>
      <style>{`
        .mc-theme {
          background-color: #87CEEB;
          background-image: 
            linear-gradient(45deg, #719df0 25%, transparent 25%, transparent 75%, #719df0 75%, #719df0),
            linear-gradient(45deg, #719df0 25%, transparent 25%, transparent 75%, #719df0 75%, #719df0);
          background-size: 32px 32px;
          background-position: 0 0, 16px 16px;
          color: #1a1a1a;
          font-family: 'VT323', monospace;
          min-height: 100vh;
          padding: 5rem 2rem 2rem;
          image-rendering: pixelated;
        }
        .mc-theme h1, .mc-theme h2, .mc-theme h3 {
          font-family: 'Press Start 2P', monospace;
          text-shadow: 2px 2px 0px #111;
          color: white;
          margin-bottom: 1rem;
        }
        .mc-block {
          background-color: #828282;
          border: 4px solid #111;
          box-shadow: inset -4px -4px 0px rgba(0,0,0,0.3), inset 4px 4px 0px rgba(255,255,255,0.4);
          padding: 2rem;
          margin-bottom: 2rem;
        }
        .mc-grass {
          background-color: #855E42;
          border-top: 16px solid #59A533;
        }
        .mc-wood {
          background-color: #B38656;
          box-shadow: inset -4px -4px 0px rgba(92, 64, 51, 0.6), inset 4px 4px 0px rgba(255,255,255,0.5);
        }
        .mc-btn {
          font-family: 'Press Start 2P', monospace;
          background: #828282;
          color: white; border: 4px solid #111;
          box-shadow: inset -4px -4px 0px rgba(0,0,0,0.3), inset 4px 4px 0px rgba(255,255,255,0.6);
          padding: 0.75rem 1rem; cursor: pointer; text-transform: uppercase; font-size: 0.8rem;
        }
        .mc-btn:active { box-shadow: inset 4px 4px 0px rgba(0,0,0,0.3), inset -4px -4px 0px rgba(255,255,255,0.6); transform: translate(2px, 2px); }
        .mc-btn-primary { background: #59A533; }
        .mc-input {
          font-family: 'VT323', monospace; font-size: 1.5rem; border: 4px solid #111;
          box-shadow: inset 4px 4px 0px rgba(0,0,0,0.2); padding: 0.75rem; width: 100%; margin-bottom: 1rem;
        }
        .mc-table { width: 100%; border-collapse: collapse; font-size: 1.5rem; background: #828282; border: 4px solid #111; }
        .mc-table th { background: #5C4033; color: white; padding: 1rem; font-family: 'Press Start 2P', monospace; font-size: 0.8rem; border: 4px solid #111; }
        .mc-table td { padding: 0.5rem 1rem; border: 4px solid #111; color: black; }
      `}</style>
      
      <div className="mc-theme">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ color: '#5C4033', textShadow: 'none' }}>ARENA: COLD BREW</h1>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
            <button className={`mc-btn ${view === 'GLOBAL' ? 'mc-btn-primary' : ''}`} onClick={() => setView('GLOBAL')}>GLOBAL LEADERBOARD</button>
            <button className={`mc-btn ${view === 'HISTORY' ? 'mc-btn-primary' : ''}`} onClick={() => setView('HISTORY')}>DAY-WISE HISTORY</button>
          </div>

          {isAdmin && (
            <div className="mc-block mc-grass" style={{ marginBottom: '3rem' }}>
              <h2 style={{ textShadow: '2px 2px 0px #000' }}>OP: QUICK LOG ({today})</h2>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input className="mc-input" placeholder="New Player Name" value={newPlayer} onChange={e => setNewPlayer(e.target.value)} style={{ marginBottom: 0 }} />
                <div style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
                  <select className="mc-input" value={activeGame} onChange={e => {setActiveGame(e.target.value); setConfirmGame(null);}} style={{ marginBottom: 0 }}>
                    {Array.from(new Set(['Uno', 'Durak', 'Smash Bros', ...scores.map(s => s.game)])).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  {confirmGame === activeGame ? (
                    <button className="mc-btn" onClick={() => { removeGameScores(activeGame); setConfirmGame(null); }} style={{ background: '#a00', whiteSpace: 'nowrap' }}>SURE?</button>
                  ) : (
                    <button className="mc-btn" onClick={() => setConfirmGame(activeGame)} style={{ background: '#ff7700', whiteSpace: 'nowrap' }}>DEL GAME</button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {allPlayers.concat(newPlayer && !allPlayers.includes(newPlayer) ? [newPlayer] : []).map(p => (
                  <div key={p} style={{ background: '#828282', border: '4px solid #111', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#000', width: '100%' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.5rem', textTransform: 'uppercase' }}>{p}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                      {confirmPlayer === p ? (
                        <button className="mc-btn" onClick={() => { removePlayerScores(p); setConfirmPlayer(null); }} style={{ background: '#a00' }}>SURE?</button>
                      ) : (
                        <button className="mc-btn" onClick={() => setConfirmPlayer(p)} style={{ background: '#ff7700' }}>[X]</button>
                      )}
                      <button className="mc-btn" onClick={() => updateWin(p, activeGame, today, -1)} style={{ background: '#ff5555' }}>[-]</button>
                      <button className="mc-btn mc-btn-primary" onClick={() => updateWin(p, activeGame, today, 1)}>[+]</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'GLOBAL' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {Object.keys(globalScores).map(game => {
                const players = Object.entries(globalScores[game]).sort((a,b) => b[1] - a[1]);
                return (
                  <div key={game}>
                    <h3 style={{ background: '#5C4033', padding: '0.5rem', margin: 0, border: '4px solid #111', borderBottom: 'none' }}>{game} (ALL TIME)</h3>
                    <table className="mc-table">
                      <tbody>
                        {players.map(([name, score], idx) => (
                          <tr key={name} style={{ background: idx === 0 ? '#ffd700' : 'transparent' }}>
                            <td>#{idx + 1}</td>
                            <td style={{ width: '100%' }}>{name}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}

          {view === 'HISTORY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {sortedDates.map(date => (
                <div key={date} className="mc-block mc-wood">
                  <h2>SESSION: {date}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {Object.keys(historyScores[date]).map(game => {
                      const players = Object.entries(historyScores[date][game]).sort((a,b) => b[1] - a[1]);
                      return (
                        <div key={game}>
                          <h3 style={{ color: '#fff' }}>{game}</h3>
                          <table className="mc-table">
                            <tbody>
                              {players.map(([name, score], idx) => (
                                <tr key={name}>
                                  <td>{name}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>+{score} WINS</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {sortedDates.length === 0 && <p className="mc-block">No records found.</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
