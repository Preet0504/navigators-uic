import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../components/Toast';
import { useReveal } from '../hooks/useReveal';
import { isUpcoming, parseDate, formatDate, formatDay } from '../lib/format';
import { uploadImage } from '../lib/supabase';
import Pattern from '../components/Pattern';

const PAGE_SIZE = 9;
const EMPTY_EVENT = { title: '', date: '', address: '', rsvp_url: '', description: '', image: '/sample-event.png' };

function Countdown({ targetDate }) {
  const [t, setT] = useState(null);
  useEffect(() => {
    const tick = () => {
      const diff = (parseDate(targetDate)?.getTime() || 0) - Date.now();
      if (diff > 0) {
        setT({
          d: Math.floor(diff / 86400000),
          h: Math.floor((diff / 3600000) % 24),
          m: Math.floor((diff / 60000) % 60),
          s: Math.floor((diff / 1000) % 60),
        });
      } else setT(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  if (!t) return null;
  const cell = (v, l) => (
    <div style={{ flex: 1, textAlign: 'center', background: 'rgba(0,140,149,0.08)', borderRadius: 8, padding: '0.5rem 0' }}>
      <b style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--teal-dark)' }}>{v}</b>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{l}</div>
    </div>
  );
  return <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem' }}>{cell(t.d, 'DAYS')}{cell(t.h, 'HRS')}{cell(t.m, 'MIN')}{cell(t.s, 'SEC')}</div>;
}

export default function Events() {
  const { events, addEvent, updateEvent, removeEvent, isAdmin, highlights, addHighlight, removeHighlight, rsvps, addRsvp } = useAdmin();
  const toast = useToast();

  const [tab, setTab] = useState('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [reelEvent, setReelEvent] = useState(null);
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [viewRsvps, setViewRsvps] = useState(null);
  const [rsvpData, setRsvpData] = useState({ firstName: '', lastName: '', birthdate: '', bringingGuests: 'No, just me' });
  const [myRsvps, setMyRsvps] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    try { setMyRsvps(JSON.parse(localStorage.getItem('nav_rsvps') || '{}')); } catch { /* ignore */ }
  }, []);

  const filtered = events.filter((e) => (tab === 'upcoming' ? isUpcoming(e.date) : !isUpcoming(e.date)))
    .sort((a, b) => {
      const ta = parseDate(a.date)?.getTime() || 0, tb = parseDate(b.date)?.getTime() || 0;
      return tab === 'upcoming' ? ta - tb : tb - ta;
    });
  const shown = filtered.slice(0, visible);
  const ref = useReveal([tab, shown.length]);

  useEffect(() => setVisible(PAGE_SIZE), [tab]);

  const resetForm = () => { setShowForm(false); setEditId(null); setDraft(EMPTY_EVENT); };

  const saveEvent = async (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const res = editId ? await updateEvent(editId, draft) : await addEvent(draft);
    setSaving(false);
    if (res.error) return toast(res.error, 'error');
    toast(editId ? 'Event updated' : 'Event published ✦', 'success');
    resetForm();
  };

  const startEdit = (e, ev) => {
    e.stopPropagation();
    if (ev._seed) return toast('Demo event — add your own to manage it', 'gold');
    setDraft({ ...EMPTY_EVENT, ...ev });
    setEditId(ev.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (e, ev) => {
    e.stopPropagation();
    if (ev._seed) return toast('Demo event — nothing to delete yet', 'gold');
    if (!confirm(`Delete "${ev.title}"? This can’t be undone.`)) return;
    const res = await removeEvent(ev.id);
    res.error ? toast(res.error, 'error') : toast('Event deleted');
  };

  const onCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'covers');
      setDraft((d) => ({ ...d, image: url }));
      toast('Cover uploaded', 'success');
    } catch (err) {
      toast(err.message || 'Upload failed', 'error');
    } finally { setUploading(false); }
  };

  const onReelUpload = async (eventId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (reelEvent?._seed) return toast('Demo event — add a real one to upload highlights', 'gold');
    setUploading(true);
    const res = await addHighlight(eventId, file);
    setUploading(false);
    res.error ? toast(res.error, 'error') : toast('Highlight added ✦', 'success');
  };

  const submitRsvp = async (e) => {
    e.preventDefault();
    if (rsvpEvent?._seed) { setRsvpEvent(null); return toast('This is a demo event — RSVP opens once real events are added', 'gold'); }
    const payload = {
      event_id: rsvpEvent.id, first_name: rsvpData.firstName, last_name: rsvpData.lastName,
      birthdate: rsvpData.birthdate, bringing_guests: rsvpData.bringingGuests,
    };
    const res = await addRsvp(payload);
    if (res.error) return toast(res.error, 'error');
    const updated = { ...myRsvps, [rsvpEvent.id]: true };
    setMyRsvps(updated);
    localStorage.setItem('nav_rsvps', JSON.stringify(updated));
    setRsvpEvent(null);
    setRsvpData({ firstName: '', lastName: '', birthdate: '', bringingGuests: 'No, just me' });
    toast('You’re on the list — see you there! 🎉', 'success');
  };

  const exportCsv = () => {
    const data = rsvps.filter((r) => r.event_id === viewRsvps.id);
    if (!data.length) return toast('No RSVPs to export yet', 'gold');
    const csv = 'First Name,Last Name,Birthdate,Guests\n' + data.map((r) => `"${r.first_name}","${r.last_name}","${r.birthdate}","${r.bringing_guests}"`).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${viewRsvps.title}-rsvps.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page" ref={ref}>
      <div className="container">
        {/* Header */}
        <header style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'linear-gradient(120deg, var(--teal) 0%, var(--teal-darker) 100%)', color: '#fff', padding: 'clamp(2.5rem,5vw,3.5rem)', marginBottom: '2.5rem' }}>
          <Pattern variant="movement" color="#ffffff" opacity={0.08} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="eyebrow" style={{ color: '#fff' }}>Gather with us</span>
            <h1 style={{ color: '#fff', fontSize: 'clamp(2.2rem,5vw,3.4rem)', margin: '0.4rem 0' }}>Events &amp; Meetups</h1>
            <p style={{ color: '#d3eceb', maxWidth: '50ch' }}>From bonfires to retreats to random Tuesday hangs — here’s everything coming up. RSVP in seconds.</p>
            {isAdmin && (
              <button className="btn btn-gold" style={{ marginTop: '1.4rem' }} onClick={() => (showForm ? resetForm() : setShowForm(true))}>
                {showForm ? 'Close form' : '+ New event'}
              </button>
            )}
          </div>
        </header>

        {/* Admin form */}
        {showForm && isAdmin && (
          <form className="card pop-in" style={{ padding: '1.8rem', marginBottom: '2.5rem' }} onSubmit={saveEvent}>
            <h2 style={{ marginBottom: '1.2rem' }}>{editId ? 'Edit event' : 'Create a new event'}</h2>
            <div className="field"><label>Title</label><input className="input" placeholder="Welcome Week Bonfire" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: '1 1 220px' }}><label>Date &amp; time</label><input className="input" type="datetime-local" value={draft.date?.length === 24 ? draft.date.slice(0, 16) : draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required /></div>
              <div className="field" style={{ flex: '1 1 220px' }}><label>Location (for map link)</label><input className="input" placeholder="Montrose Beach, Chicago" value={draft.address || ''} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></div>
            </div>
            <div className="field"><label>Cover image</label><input className="input" type="file" accept="image/*" onChange={onCover} />{uploading && <span className="muted" style={{ fontSize: '0.8rem' }}>Uploading…</span>}</div>
            <div className="field"><label>Custom RSVP link (optional — e.g. a Google Form)</label><input className="input" placeholder="https://forms.gle/…" value={draft.rsvp_url || ''} onChange={(e) => setDraft({ ...draft, rsvp_url: e.target.value })} /></div>
            <div className="field"><label>Description</label><textarea className="textarea" placeholder="What’s the vibe? What should people bring?" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Publish event'}</button>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
          {['upcoming', 'completed'].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0.8rem 1.1rem', fontSize: '1rem', fontWeight: 700, textTransform: 'capitalize',
              color: tab === t ? 'var(--teal)' : 'var(--text-muted)', borderBottom: `3px solid ${tab === t ? 'var(--gold)' : 'transparent'}`, marginBottom: -1,
            }}>{t}</button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-auto">
          {shown.map((ev) => {
            const upcoming = isUpcoming(ev.date);
            const d = formatDay(ev.date);
            return (
              <article key={ev.id} className={`card ${!upcoming ? 'card-hover' : ''} admin-zone reveal`} style={{ cursor: !upcoming ? 'pointer' : 'default', display: 'flex', flexDirection: 'column' }} onClick={() => { if (!upcoming) setReelEvent(ev); }}>
                {isAdmin && (
                  <div className="admin-actions">
                    <button className="btn btn-sm" style={{ background: 'var(--blue)' }} onClick={(e) => { e.stopPropagation(); setViewRsvps(ev); }} title="View RSVPs">RSVPs</button>
                    <button className="btn btn-sm btn-gold" onClick={(e) => startEdit(e, ev)} title="Edit">Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={(e) => del(e, ev)} title="Delete">✕</button>
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                  <img src={ev.image || '/sample-event.png'} alt={ev.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} loading="lazy" />
                  <div style={{ position: 'absolute', left: 12, bottom: -22, width: 56, textAlign: 'center', background: '#fff', borderRadius: 10, boxShadow: 'var(--shadow-md)', padding: '0.4rem 0' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--teal)', lineHeight: 1 }}>{d.day}</div>
                    <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{d.month}</div>
                  </div>
                </div>
                <div style={{ padding: '1.6rem 1.4rem 1.4rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {ev.address && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', marginBottom: '0.4rem', display: 'inline-block' }}>📍 {ev.address}</a>
                  )}
                  <div className="badge" style={{ marginBottom: '0.5rem' }}>{formatDate(ev.date)}</div>
                  <h3 style={{ fontSize: '1.35rem', marginBottom: '0.4rem' }}>{ev.title}</h3>
                  <p className="muted" style={{ fontSize: '0.9rem', flex: 1 }}>{ev.description}</p>
                  {upcoming ? (
                    <>
                      <Countdown targetDate={ev.date} />
                      {myRsvps[ev.id] ? (
                        <div className="badge" style={{ marginTop: '1rem', justifyContent: 'center', width: '100%', padding: '0.6rem', background: 'rgba(0,140,149,0.12)', color: 'var(--teal-dark)' }}>✓ You’re RSVP’d</div>
                      ) : (
                        <button className="btn" style={{ marginTop: '1rem', width: '100%' }} onClick={(e) => { e.stopPropagation(); ev.rsvp_url ? window.open(ev.rsvp_url, '_blank') : setRsvpEvent(ev); }}>RSVP now</button>
                      )}
                    </>
                  ) : (
                    <div style={{ marginTop: '1rem', paddingTop: '0.9rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--teal)', fontWeight: 600, fontSize: '0.9rem' }}>▶ View highlights</div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {shown.length === 0 && (
          <div className="empty-state card"><p>{tab === 'upcoming' ? 'No upcoming events yet — check back soon!' : 'No past events to show yet.'}</p></div>
        )}
        {visible < filtered.length && (
          <div className="center" style={{ marginTop: '2rem' }}>
            <button className="btn btn-ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>Load more</button>
          </div>
        )}
      </div>

      {/* RSVP modal */}
      {rsvpEvent && (
        <div className="modal-overlay" onMouseDown={() => setRsvpEvent(null)}>
          <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submitRsvp}>
            <div className="modal-head"><h2>RSVP — {rsvpEvent.title}</h2><button type="button" className="icon-btn" onClick={() => setRsvpEvent(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="field" style={{ flex: '1 1 140px' }}><label>First name</label><input className="input" required value={rsvpData.firstName} onChange={(e) => setRsvpData({ ...rsvpData, firstName: e.target.value })} /></div>
                <div className="field" style={{ flex: '1 1 140px' }}><label>Last name</label><input className="input" required value={rsvpData.lastName} onChange={(e) => setRsvpData({ ...rsvpData, lastName: e.target.value })} /></div>
              </div>
              <div className="field"><label>Birthdate <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(so we can celebrate you 🎂)</span></label><input className="input" type="date" required value={rsvpData.birthdate} onChange={(e) => setRsvpData({ ...rsvpData, birthdate: e.target.value })} /></div>
              <div className="field"><label>Bringing anyone?</label><select className="select" value={rsvpData.bringingGuests} onChange={(e) => setRsvpData({ ...rsvpData, bringingGuests: e.target.value })}><option>No, just me</option><option>Yes, 1 guest</option><option>Yes, 2 guests</option><option>Yes, 3+ guests</option></select></div>
              <button type="submit" className="btn" style={{ width: '100%' }}>Confirm RSVP</button>
            </div>
          </form>
        </div>
      )}

      {/* Admin: view RSVPs */}
      {viewRsvps && (
        <div className="modal-overlay" onMouseDown={() => setViewRsvps(null)}>
          <div className="modal" style={{ maxWidth: 680 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>RSVPs — {viewRsvps.title}</h2><button className="icon-btn" onClick={() => setViewRsvps(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead><tr style={{ background: 'var(--mist)' }}>{['First', 'Last', 'Birthdate', 'Guests'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {rsvps.filter((r) => r.event_id === viewRsvps.id).map((r) => (
                      <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}><td style={{ padding: '0.6rem 0.8rem' }}>{r.first_name}</td><td style={{ padding: '0.6rem 0.8rem' }}>{r.last_name}</td><td style={{ padding: '0.6rem 0.8rem' }} className="muted">{r.birthdate}</td><td style={{ padding: '0.6rem 0.8rem' }}>{r.bringing_guests}</td></tr>
                    ))}
                    {rsvps.filter((r) => r.event_id === viewRsvps.id).length === 0 && <tr><td colSpan="4" className="muted center" style={{ padding: '2rem' }}>No one has RSVP’d yet.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="center" style={{ marginTop: '1.2rem' }}><button className="btn btn-gold" onClick={exportCsv}>⬇ Export CSV</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Highlights / reels */}
      {reelEvent && (
        <div className="modal-overlay" onMouseDown={() => setReelEvent(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>{reelEvent.title} — highlights</h2><button className="icon-btn" onClick={() => setReelEvent(null)}>✕</button></div>
            <div className="modal-body">
              {isAdmin && (
                <label className="card" style={{ display: 'block', textAlign: 'center', padding: '1.2rem', border: '2px dashed var(--border)', cursor: 'pointer', marginBottom: '1.4rem', background: 'var(--paper)' }}>
                  {uploading ? 'Uploading…' : '+ Upload photo or video'}
                  <input type="file" accept="image/*,video/*" hidden onChange={(e) => onReelUpload(reelEvent.id, e)} />
                </label>
              )}
              {highlights.filter((h) => h.event_id === reelEvent.id).map((h) => (
                <div key={h.id} className="admin-zone" style={{ marginBottom: '1rem', borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#000' }}>
                  {isAdmin && <div className="admin-actions"><button className="btn btn-sm btn-danger" onClick={async () => { const r = await removeHighlight(h); r.error ? toast(r.error, 'error') : toast('Removed'); }}>Delete</button></div>}
                  {h.type === 'video'
                    ? <video src={h.url} style={{ width: '100%', maxHeight: '70vh' }} controls playsInline loop muted />
                    : <img src={h.url} alt="Highlight" style={{ width: '100%' }} />}
                </div>
              ))}
              {highlights.filter((h) => h.event_id === reelEvent.id).length === 0 && (
                <div className="empty-state"><p>No highlights yet{isAdmin ? ' — be the first to add one!' : '.'}</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
