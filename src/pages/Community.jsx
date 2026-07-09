import React, { useMemo, useState, useEffect } from 'react';
import { Country, State } from 'country-state-city';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../components/Toast';
import { useReveal } from '../hooks/useReveal';
import Pattern from '../components/Pattern';
import WorldMap from '../components/WorldMap';
import { getVisitorId, getMyPinId, setMyPinId } from '../lib/visitor';

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// Sticky-note look: warm paper colours + a gentle per-note tilt. Notes have no
// fixed size — each one is exactly as tall as the words written on it.
const NOTE_COLORS = ['#ffe6a3', '#ffd0d8', '#cbe7ff', '#d4f4be', '#ffd9b0', '#e7d6f7', '#c7f0e6'];
const NOTE_ROTS = [-2.6, 1.7, -1.1, 2.2, -1.9, 1.2, -0.7, 2.6];

// Masonry column count by viewport width.
const colsForWidth = (w) => (w < 640 ? 1 : w < 1000 ? 2 : 3);

export default function Community() {
  const {
    pins, addPin, updatePin, removePin, removeAnyPin,
    feedback, addFeedback, approveFeedback, rejectFeedback,
    isAdmin,
  } = useAdmin();
  const toast = useToast();
  const ref = useReveal([pins.length, feedback.length]);

  const countries = useMemo(() => Country.getAllCountries(), []);

  // ---- My pin (remembered per browser) ----
  const [myPinId, setMyPinIdState] = useState(() => getMyPinId());
  const myPin = useMemo(() => pins.find((p) => p.id === myPinId) || null, [pins, myPinId]);
  const mineKey = myPin
    ? `${myPin.country_code || myPin.country}|${myPin.state_code || myPin.state || ''}`
    : null;

  // ---- Pin form ----
  const [countryCode, setCountryCode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [saving, setSaving] = useState(false);
  const states = useMemo(() => (countryCode ? State.getStatesOfCountry(countryCode) : []), [countryCode]);

  const onCountry = (code) => { setCountryCode(code); setStateCode(''); };

  const submitPin = async (e) => {
    e.preventDefault();
    if (!countryCode) return toast('Pick your country first', 'gold');
    const country = Country.getCountryByCode(countryCode);
    const stateObj = stateCode ? State.getStateByCodeAndCountry(stateCode, countryCode) : null;
    const lat = num(stateObj?.latitude) ?? num(country?.latitude);
    const lng = num(stateObj?.longitude) ?? num(country?.longitude);
    if (lat == null || lng == null) return toast('Could not locate that place — try another', 'error');

    const payload = {
      visitor_id: getVisitorId(),
      country: country?.name || '',
      country_code: countryCode,
      state: stateObj?.name || null,
      state_code: stateCode || null,
      lat, lng,
    };

    setSaving(true);
    const res = myPin ? await updatePin(myPin.id, payload) : await addPin(payload);
    setSaving(false);
    if (res.error) return toast(res.error, 'error');
    if (!myPin && res.data?.id) { setMyPinId(res.data.id); setMyPinIdState(res.data.id); }
    toast(myPin ? 'Your pin was updated ✦' : 'You’re on the map! ✦', 'success');
  };

  const removeMine = async () => {
    if (!myPin) return;
    const res = await removePin(myPin.id, getVisitorId());
    if (res.error) return toast(res.error, 'error');
    setMyPinId(null); setMyPinIdState(null);
    setCountryCode(''); setStateCode('');
    toast('Your pin was removed');
  };

  const adminRemovePin = async (p) => {
    if (p._seed) return toast('Demo pin — add real pins to manage them', 'gold');
    if (!confirm(`Remove pin from ${p.state ? p.state + ', ' : ''}${p.country}?`)) return;
    const res = await removeAnyPin(p.id);
    if (res.error) return toast(res.error, 'error');
    if (p.id === myPinId) { setMyPinId(null); setMyPinIdState(null); }
    toast('Pin removed');
  };

  // ---- Feedback ----
  const approved = useMemo(() => feedback.filter((f) => f.status === 'approved'), [feedback]);
  const pending = useMemo(() => feedback.filter((f) => f.status === 'pending'), [feedback]);

  // Masonry: spread the approved notes round-robin across a responsive number of
  // columns so blobs of different heights pack tightly with no ragged gaps.
  const [cols, setCols] = useState(() => (typeof window !== 'undefined' ? colsForWidth(window.innerWidth) : 3));
  useEffect(() => {
    const onResize = () => setCols(colsForWidth(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const columns = useMemo(() => {
    const buckets = Array.from({ length: cols }, () => []);
    approved.forEach((f, i) => buckets[i % cols].push({ f, gi: i }));
    return buckets;
  }, [approved, cols]);

  const [fbName, setFbName] = useState('');
  const [fbMsg, setFbMsg] = useState('');
  const [fbSaving, setFbSaving] = useState(false);

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!fbMsg.trim()) return toast('Write a short message first', 'gold');
    setFbSaving(true);
    const res = await addFeedback({ name: fbName.trim() || 'Anonymous', message: fbMsg.trim() });
    setFbSaving(false);
    if (res.error) return toast(res.error, 'error');
    setFbName(''); setFbMsg('');
    toast('Thanks! Sent to the team for review ✦', 'success');
  };

  const approve = async (f) => {
    const res = await approveFeedback(f.id);
    res.error ? toast(res.error, 'error') : toast('Published to the wall ✦', 'success');
  };
  const reject = async (f) => {
    if (!confirm('Reject and delete this message?')) return;
    const res = await rejectFeedback(f.id);
    res.error ? toast(res.error, 'error') : toast('Rejected');
  };

  return (
    <div className="page" ref={ref}>
      <style>{`
        .cm-map-card { padding: clamp(1rem, 3vw, 2rem); }
        .cm-pinform { display: flex; flex-wrap: wrap; gap: 0.9rem; align-items: flex-end; }
        .cm-pinform .field { margin-bottom: 0; flex: 1 1 190px; }
        .cm-mine {
          display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;
          background: rgba(0,140,149,0.07); border: 1px solid rgba(0,140,149,0.2);
          border-radius: var(--r-md); padding: 0.85rem 1.1rem; margin-bottom: 1.2rem;
        }
        /* Scrollable masonry: peek ~2 rows, scroll for the rest. */
        .fb-cols {
          display: flex; gap: clamp(1rem, 2vw, 1.6rem); align-items: flex-start;
          max-height: clamp(470px, 62vh, 640px); overflow-y: auto; overflow-x: hidden;
          padding: 1.6rem 0.8rem 0.6rem;
          scroll-behavior: smooth; scrollbar-gutter: stable;
        }
        .fb-col { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: clamp(1.3rem, 2.4vw, 2rem); }
        /* Sticky note — sized entirely by its content, no min/max. */
        .fb-note {
          position: relative; font-family: var(--font-hand);
          background: var(--note, #ffe6a3); color: #3b3218;
          padding: 1.5rem 1.4rem 1.3rem; border-radius: 3px;
          box-shadow: 0 10px 20px rgba(36,32,30,0.16), 0 2px 5px rgba(36,32,30,0.12);
          transform: rotate(var(--rot, 0deg));
          transition: transform .25s var(--ease), box-shadow .25s var(--ease);
          animation: fbIn .5s var(--ease) backwards; animation-delay: var(--delay, 0s);
        }
        .fb-note::before {              /* strip of washi tape */
          content: ''; position: absolute; top: -11px; left: 50%;
          width: 82px; height: 24px; transform: translateX(-50%) rotate(var(--tape, -3deg));
          background: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.35);
          box-shadow: 0 1px 3px rgba(36,32,30,0.12);
        }
        .fb-note p {
          font-family: var(--font-hand); font-size: clamp(1.28rem, 1.6vw, 1.72rem);
          line-height: 1.28; font-weight: 600; overflow-wrap: anywhere;
        }
        .fb-note .fb-who { margin-top: 0.6rem; font-family: var(--font-hand); font-size: clamp(1rem, 1.2vw, 1.22rem); font-weight: 700; color: rgba(59,50,24,0.6); }
        .fb-note .fb-admin { margin-top: 0.8rem; }
        .fb-note:hover { transform: rotate(0deg) translateY(-5px) scale(1.03); box-shadow: 0 22px 42px rgba(36,32,30,0.26); z-index: 3; }
        @keyframes fbIn { from { opacity: 0; transform: translateY(14px) scale(.94) rotate(var(--rot,0deg)); } to { opacity: 1; transform: rotate(var(--rot,0deg)); } }
        @media (prefers-reduced-motion: reduce) { .fb-note { animation: none; } }
        .cm-queue { display: grid; gap: 0.8rem; }
        .cm-queue-item { display: flex; flex-wrap: wrap; gap: 0.8rem; align-items: center; justify-content: space-between; padding: 1rem 1.2rem; border: 1px dashed var(--gold); border-radius: var(--r-md); background: rgba(209,159,42,0.06); }
        .cm-pinlist { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: 0.7rem; }
        .cm-pinrow { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding: 0.6rem 0.85rem; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface); font-size: 0.9rem; }
      `}</style>

      <div className="container">
        {/* ---------- Header ---------- */}
        <header style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'linear-gradient(120deg, var(--teal-dark), var(--teal))', color: '#fff', padding: 'clamp(2.5rem,5vw,3.5rem)', marginBottom: '2.5rem' }}>
          <Pattern variant="connection" color="#ffffff" opacity={0.12} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="eyebrow" style={{ color: '#fff' }}>Our community</span>
            <h1 style={{ color: '#fff', fontSize: 'clamp(2.2rem,5vw,3.4rem)', margin: '0.4rem 0' }}>Where we’re from</h1>
            <p style={{ color: '#d8f2f3', maxWidth: '56ch' }}>
              Navigators at UIC is a home for people from all over the world. Drop a pin to show where you call home — and leave a note about what this community has meant to you.
            </p>
          </div>
        </header>

        {/* ---------- Map ---------- */}
        <section className="reveal" style={{ marginBottom: '4rem' }}>
          <div className="card cm-map-card">
            {myPin && (
              <div className="cm-mine">
                <span className="badge badge-gold">★ Your pin</span>
                <span className="muted" style={{ fontSize: '0.92rem' }}>
                  You’re on the map from <b style={{ color: 'var(--ink)' }}>{myPin.state ? `${myPin.state}, ` : ''}{myPin.country}</b>. Change the dropdowns and update, or remove it.
                </span>
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={removeMine}>Remove my pin</button>
              </div>
            )}

            <WorldMap pins={pins} mineKey={mineKey} />

            <form className="cm-pinform" onSubmit={submitPin} style={{ marginTop: '1.5rem' }}>
              <div className="field">
                <label htmlFor="cm-country">Country</label>
                <select id="cm-country" className="select" value={countryCode} onChange={(e) => onCountry(e.target.value)}>
                  <option value="">Select country… (type to search)</option>
                  {countries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="cm-state">State / Region</label>
                <select id="cm-state" className="select" value={stateCode} onChange={(e) => setStateCode(e.target.value)} disabled={!countryCode || states.length === 0}>
                  <option value="">{states.length === 0 ? (countryCode ? 'No regions — country only' : 'Pick a country first') : 'Select region… (optional)'}</option>
                  {states.map((s) => (
                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-gold" disabled={saving} style={{ flex: '0 0 auto' }}>
                {saving ? 'Saving…' : myPin ? 'Update my pin' : 'Drop my pin'}
              </button>
            </form>
            <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.7rem' }}>
              One pin per person. Hover a dot to see how many people are from there — the bigger the dot, the more of us.
            </p>
          </div>

          {/* Admin: manage all pins */}
          {isAdmin && pins.length > 0 && (
            <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Manage pins <span className="badge badge-soft">{pins.length}</span></h3>
              <div className="cm-pinlist">
                {pins.map((p) => (
                  <div key={p.id} className="cm-pinrow">
                    <span>{p.state ? `${p.state}, ` : ''}{p.country}</span>
                    <button className="btn btn-sm btn-danger" onClick={() => adminRemovePin(p)} aria-label="Remove pin">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ---------- Feedback wall ---------- */}
        <section className="reveal">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>In their words</span>
            <h2 className="section-title" style={{ margin: '0.5rem 0' }}>What this place has meant</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>
              Real words from real students.{!isAdmin ? ' Share yours below — the team reviews each note before it goes up.' : ''}
            </p>
          </div>

          {approved.length > 0 ? (
            <div className="fb-cols">
              {columns.map((col, ci) => (
                <div className="fb-col" key={ci}>
                  {col.map(({ f, gi }) => (
                    <blockquote
                      key={f.id}
                      className="fb-note"
                      style={{
                        '--note': NOTE_COLORS[gi % NOTE_COLORS.length],
                        '--rot': `${NOTE_ROTS[gi % NOTE_ROTS.length]}deg`,
                        '--tape': `${gi % 2 ? 3 : -3}deg`,
                        '--delay': `${(gi % 6) * 0.06}s`,
                      }}
                    >
                      <p>{f.message}</p>
                      <div className="fb-who">— {f.name || 'Anonymous'}</div>
                      {isAdmin && !f._seed && (
                        <button className="btn btn-sm btn-danger fb-admin" onClick={() => reject(f)}>Remove</button>
                      )}
                    </blockquote>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state card"><p>No notes yet — be the first to share what this community means to you.</p></div>
          )}

          {/* Admin: moderation queue */}
          {isAdmin && pending.length > 0 && (
            <div className="card" style={{ padding: '1.6rem', marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                Awaiting review <span className="badge badge-gold">{pending.length}</span>
              </h3>
              <div className="cm-queue">
                {pending.map((f) => (
                  <div key={f.id} className="cm-queue-item">
                    <div style={{ flex: '1 1 240px' }}>
                      <p style={{ fontStyle: 'italic' }}>“{f.message}”</p>
                      <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>— {f.name || 'Anonymous'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm" onClick={() => approve(f)}>Approve</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => reject(f)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit form — students only; admins moderate, they don't submit. */}
          {!isAdmin && (
            <form className="card" style={{ padding: '1.8rem', marginTop: '2.5rem', maxWidth: 640, marginInline: 'auto' }} onSubmit={submitFeedback}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.1rem' }}>Share your experience</h3>
              <div className="field">
                <label htmlFor="fb-name">Your name <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                <input id="fb-name" className="input" value={fbName} onChange={(e) => setFbName(e.target.value)} placeholder="First name is perfect" maxLength={60} />
              </div>
              <div className="field">
                <label htmlFor="fb-msg">What have you learned or loved here?</label>
                <textarea id="fb-msg" className="textarea" value={fbMsg} onChange={(e) => setFbMsg(e.target.value)} placeholder="A sentence or two…" maxLength={400} required />
              </div>
              <button type="submit" className="btn" disabled={fbSaving}>{fbSaving ? 'Sending…' : 'Send for review'}</button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
