import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../components/Toast';
import Pattern from '../components/Pattern';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function ColdBrew() {
  const { scores, updateWin, isAdmin, removePlayerScores, removeGameScores } = useAdmin();
  const toast = useToast();
  const [view, setView] = useState('GLOBAL');
  const [newPlayer, setNewPlayer] = useState('');
  const [activeGame, setActiveGame] = useState('');
  const [customGames, setCustomGames] = useState([]);
  const [addingGame, setAddingGame] = useState(false);
  const [newGame, setNewGame] = useState('');
  const [confirmPlayer, setConfirmPlayer] = useState(null);
  const [confirmGame, setConfirmGame] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  const globalScores = {};
  scores.forEach((s) => {
    (globalScores[s.game] ||= {});
    globalScores[s.game][s.name] = (globalScores[s.game][s.name] || 0) + s.score;
  });

  const history = {};
  scores.forEach((s) => {
    (history[s.date] ||= {});
    (history[s.date][s.game] ||= {});
    history[s.date][s.game][s.name] = (history[s.date][s.game][s.name] || 0) + s.score;
  });
  const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
  // Games that exist = those with logged scores, plus any the admin just added.
  const games = [...new Set([...scores.map((s) => s.game), ...customGames])].sort();
  // Players scoped to the selected game (the scorekeeper works one game at a time).
  const gamePlayers = [...new Set(scores.filter((s) => s.game === activeGame).map((s) => s.name))];

  // Default the selected game to the first available once games load.
  useEffect(() => {
    if (games.length && !games.includes(activeGame)) setActiveGame(games[0]);
  }, [games, activeGame]);

  // Standard competition ranking: equal scores share a rank (1, 1, 3…).
  const rankRows = (entries) => {
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    let lastScore = null, lastRank = 0;
    return sorted.map(([name, score], i) => {
      const rank = score === lastScore ? lastRank : i + 1;
      lastScore = score; lastRank = rank;
      return { name, score, rank };
    });
  };
  const medal = (rank) => MEDALS[rank - 1] || `#${rank}`;

  const addGame = () => {
    const g = newGame.trim();
    if (!g) return;
    if (!games.includes(g)) setCustomGames((c) => [...c, g]);
    setActiveGame(g);
    setNewGame('');
    setAddingGame(false);
  };

  const log = async (name, delta) => {
    if (!activeGame) return toast('Add or pick a game first', 'gold');
    const res = await updateWin(name, activeGame, today, delta);
    if (res.error) toast(res.error, 'error');
  };

  return (
    <div className="page arena">
      <style>{`
        .arena { background: radial-gradient(120% 80% at 50% 0%, #024247 0%, #012c30 60%, #011d20 100%); min-height: 100vh; }
        .arena-h1 { font-family: 'Press Start 2P', monospace; color: #fff; text-shadow: 3px 3px 0 var(--teal-darker), 0 0 18px rgba(209,159,42,.4); font-size: clamp(1.2rem, 4vw, 2.2rem); line-height: 1.5; }
        .arcade-btn { font-family: 'Press Start 2P', monospace; font-size: 0.7rem; border: 3px solid #021f22; border-radius: 4px; padding: 0.8rem 1rem; cursor: pointer; color: #021f22; background: var(--mist); box-shadow: inset -3px -3px 0 rgba(0,0,0,.25), inset 3px 3px 0 rgba(255,255,255,.5); transition: transform .08s; text-transform: uppercase; }
        .arcade-btn:active { transform: translate(2px,2px); box-shadow: inset 3px 3px 0 rgba(0,0,0,.25); }
        .arcade-btn.on { background: var(--gold); color: #2a2207; }
        .arcade-btn.teal { background: var(--teal); color: #fff; }
        .arcade-btn.red { background: #c0392b; color: #fff; }
        .arcade-btn.warn { background: var(--orange); color: #2a1404; }
        .board { background: rgba(255,255,255,0.05); border: 3px solid var(--teal); border-radius: var(--r-md); overflow: hidden; backdrop-filter: blur(4px); }
        .board-h { font-family: 'Press Start 2P', monospace; font-size: 0.78rem; color: #2a2207; background: var(--gold); padding: 0.9rem 1rem; letter-spacing: 0.02em; }
        .row { display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 1rem; border-top: 1px solid rgba(255,255,255,0.08); color: #eafcfb; font-family: 'VT323', monospace; font-size: 1.5rem; }
        .row .rank { width: 34px; font-weight: 700; color: var(--gold); }
        .row .pts { margin-left: auto; font-weight: 700; color: #fff; background: rgba(0,140,149,.4); padding: 0 0.7rem; border-radius: 6px; }
        .row.lead { background: linear-gradient(90deg, rgba(209,159,42,.25), transparent); }
        .op-panel { background: rgba(2,66,71,.55); border: 3px dashed var(--gold); border-radius: var(--r-md); padding: 1.4rem; margin-bottom: 2.5rem; }
        .op-input { font-family: 'VT323', monospace; font-size: 1.3rem; padding: 0.5rem 0.8rem; border-radius: 6px; border: 2px solid var(--teal); background: #eafcfb; color: #012; }
        .pchip { display: flex; align-items: center; gap: 0.8rem; background: rgba(255,255,255,.06); border: 2px solid rgba(255,255,255,.12); border-radius: 8px; padding: 0.5rem 0.8rem; color: #eafcfb; font-family: 'VT323', monospace; font-size: 1.4rem; }
        .mini { font-family: 'Press Start 2P', monospace; font-size: 0.6rem; border: none; border-radius: 4px; padding: 0.5rem 0.6rem; cursor: pointer; }
      `}</style>

      <div className="container" style={{ position: 'relative' }}>
        <Pattern variant="rays" color="#0a6f77" opacity={0.25} style={{ top: '-40px' }} />
        <div className="center" style={{ position: 'relative', marginBottom: '2.2rem' }}>
          <span className="badge badge-gold" style={{ marginBottom: '0.8rem' }}>Game Night</span>
          <h1 className="arena-h1">☕ COLD BREW ARENA</h1>
          <p style={{ color: '#9fdad8', fontFamily: "'VT323', monospace", fontSize: '1.4rem', marginTop: '0.5rem' }}>Bragging rights, quantified.</p>
        </div>

        <div className="center" style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', marginBottom: '2.2rem', flexWrap: 'wrap', position: 'relative' }}>
          <button className={`arcade-btn ${view === 'GLOBAL' ? 'on' : ''}`} onClick={() => setView('GLOBAL')}>All-Time</button>
          <button className={`arcade-btn ${view === 'HISTORY' ? 'on' : ''}`} onClick={() => setView('HISTORY')}>By Night</button>
        </div>

        {isAdmin && (
          <div className="op-panel">
            <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem', color: 'var(--gold)', marginBottom: '1rem' }}>SCOREKEEPER · {today}</h2>

            {/* Game picker: choose an existing game or add a new one. */}
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
              {games.length > 0 && (
                <select className="op-input" value={activeGame} onChange={(e) => { setActiveGame(e.target.value); setConfirmGame(null); }} style={{ flex: '1 1 160px' }}>
                  {games.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              {addingGame ? (
                <>
                  <input className="op-input" autoFocus placeholder="New game name…" value={newGame} onChange={(e) => setNewGame(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addGame(); }} style={{ flex: '1 1 160px' }} />
                  <button className="arcade-btn teal" onClick={addGame}>Add</button>
                  <button className="arcade-btn" onClick={() => { setAddingGame(false); setNewGame(''); }}>Cancel</button>
                </>
              ) : (
                <button className="arcade-btn teal" onClick={() => setAddingGame(true)}>＋ Game</button>
              )}
              {!addingGame && activeGame && (confirmGame === activeGame
                ? <button className="arcade-btn red" onClick={async () => { const r = await removeGameScores(activeGame); r.error ? toast(r.error, 'error') : toast(`${activeGame} cleared`); setConfirmGame(null); }}>Sure?</button>
                : <button className="arcade-btn warn" onClick={() => setConfirmGame(activeGame)}>Clear game</button>)}
            </div>

            {activeGame ? (
              <>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <input className="op-input" placeholder={`Add player to ${activeGame}…`} value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} style={{ flex: '1 1 220px' }} />
                </div>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {gamePlayers.concat(newPlayer && !gamePlayers.includes(newPlayer) ? [newPlayer] : []).map((p) => {
                    const wins = globalScores[activeGame]?.[p] || 0;
                    return (
                      <div key={p} className="pchip">
                        <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{p}</span>
                        <span style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>{wins} {wins === 1 ? 'win' : 'wins'}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                          {confirmPlayer === p
                            ? <button className="mini" style={{ background: '#c0392b', color: '#fff' }} onClick={async () => { const r = await removePlayerScores(p); r.error ? toast(r.error, 'error') : toast(`${p} removed`); setConfirmPlayer(null); }}>SURE?</button>
                            : <button className="mini" style={{ background: 'var(--orange)', color: '#2a1404' }} onClick={() => setConfirmPlayer(p)}>DEL</button>}
                          <button className="mini" style={{ background: '#c0392b', color: '#fff' }} onClick={() => log(p, -1)}>−</button>
                          <button className="mini" style={{ background: 'var(--teal)', color: '#fff' }} onClick={() => log(p, 1)}>+ WIN</button>
                        </div>
                      </div>
                    );
                  })}
                  {gamePlayers.length === 0 && !newPlayer && <p style={{ color: '#9fdad8', fontFamily: "'VT323',monospace", fontSize: '1.3rem' }}>No players in {activeGame} yet — add one above and hit “+ WIN”.</p>}
                </div>
              </>
            ) : (
              <p style={{ color: '#9fdad8', fontFamily: "'VT323',monospace", fontSize: '1.3rem' }}>Add a game to start keeping score.</p>
            )}
          </div>
        )}

        {view === 'GLOBAL' && (
          <div className="grid grid-auto" style={{ position: 'relative' }}>
            {Object.keys(globalScores).map((game) => (
              <div key={game} className="board">
                <div className="board-h">{game} · All-Time</div>
                {rankRows(Object.entries(globalScores[game])).map(({ name, score, rank }) => (
                  <div key={name} className={`row ${rank === 1 ? 'lead' : ''}`}>
                    <span className="rank">{medal(rank)}</span>
                    <span style={{ textTransform: 'uppercase' }}>{name}</span>
                    <span className="pts">{score}</span>
                  </div>
                ))}
              </div>
            ))}
            {Object.keys(globalScores).length === 0 && <div className="empty-state board" style={{ color: '#9fdad8', gridColumn: '1/-1' }}><p>No wins logged yet. Let the games begin!</p></div>}
          </div>
        )}

        {view === 'HISTORY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
            {dates.map((date) => (
              <div key={date}>
                <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem', color: 'var(--gold)', marginBottom: '1rem' }}>NIGHT · {date}</h2>
                <div className="grid grid-auto">
                  {Object.keys(history[date]).map((game) => (
                    <div key={game} className="board">
                      <div className="board-h">{game}</div>
                      {rankRows(Object.entries(history[date][game])).map(({ name, score, rank }) => (
                        <div key={name} className={`row ${rank === 1 ? 'lead' : ''}`}>
                          <span className="rank">{medal(rank)}</span>
                          <span style={{ textTransform: 'uppercase' }}>{name}</span>
                          <span className="pts">+{score}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {dates.length === 0 && <div className="empty-state board" style={{ color: '#9fdad8' }}><p>No game nights recorded yet.</p></div>}
          </div>
        )}
      </div>
    </div>
  );
}
