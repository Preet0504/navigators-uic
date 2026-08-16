import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '../context/AdminContext';
import { useToast } from './Toast';
import { isUpcoming, parseDate, formatDate, formatDay } from '../lib/format';
import { sanitizeHtml, htmlToText } from '../lib/richtext';
import { sendRsvpRemoved, sendRsvpConfirmed } from '../lib/email';

function Countdown({ targetDate }) {
  const [t, setT] = useState(null);
  useEffect(() => {
    const tick = () => {
      const diff = (parseDate(targetDate)?.getTime() || 0) - Date.now();
      if (diff > 0) setT({ d: Math.floor(diff / 86400000), h: Math.floor((diff / 3600000) % 24), m: Math.floor((diff / 60000) % 60), s: Math.floor((diff / 1000) % 60) });
      else setT(null);
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

const rsvpConfirmed = (r) => r.status == null || r.status === 'confirmed'; // NULL = grandfathered

// Best-effort first/last name from a Google identity.
const nameFromUser = (u) => {
  const m = u?.user_metadata || {};
  const full = (m.full_name || m.name || '').trim();
  return {
    first_name: (m.given_name || full.split(' ')[0] || '').trim(),
    last_name: (m.family_name || full.split(' ').slice(1).join(' ') || '').trim(),
  };
};

export default function EventCard({ event: ev, manage = false, onEdit }) {
  const { isAdmin, user, openLogin, removeEvent, addRsvp, rsvps, removeRsvp, confirmRsvp, cancelOwnRsvp, highlights, addHighlight, removeHighlight } = useAdmin();
  const toast = useToast();

  const upcoming = isUpcoming(ev.date);
  const d = formatDay(ev.date);
  const faqs = Array.isArray(ev.faqs) ? ev.faqs.filter((f) => f && (f.q || f.a)) : [];
  const teaser = (ev.description || htmlToText(ev.description_html)).trim();
  const hasDetails = Boolean((ev.description_html && htmlToText(ev.description_html)) || ev.description);
  const evHighlights = highlights.filter((h) => h.event_id === ev.id);
  // String compare: event_id can come back as a different JS type than ev.id
  // (e.g. bigint vs number), and a strict === would silently hide the rows.
  const eventRsvps = rsvps.filter((r) => String(r.event_id) === String(ev.id));

  const [modal, setModal] = useState(null); // 'details' | 'faqs' | 'rsvp' | 'highlights' | 'rsvpsList'
  const [guests, setGuests] = useState('No, just me');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [justWent, setJustWent] = useState(false); // optimistic, before realtime catches up

  // This member's RSVP for this event, if any. A member's `rsvps` only contains
  // their own rows (RLS), so this is the source of truth once realtime lands.
  const myRsvp = user ? rsvps.find((r) => String(r.event_id) === String(ev.id) && r.user_id === user.id) : null;
  const going = Boolean(myRsvp) || justWent;

  const close = () => { setModal(null); setLightbox(null); };

  // ---- RSVP (login required; identity comes from the auth provider) ----
  const openRsvp = async () => {
    if (ev.rsvp_url) return window.open(ev.rsvp_url, '_blank');
    if (!user) return openLogin();
    setModal('rsvp');
  };

  const submitRsvp = async (e) => {
    e.preventDefault();
    if (!user) return openLogin();
    const { first_name, last_name } = nameFromUser(user);
    const payload = {
      event_id: ev.id, user_id: user.id, email: user.email,
      first_name, last_name, bringing_guests: guests, status: 'confirmed',
    };
    setSubmitting(true);
    const res = await addRsvp(payload);
    setSubmitting(false);
    if (res.error) {
      if (/duplicate|unique|23505/i.test(res.error)) { setModal(null); setJustWent(true); return toast('You’re already down for this one ✓', 'gold'); }
      return toast(res.error, 'error');
    }
    setModal(null); setJustWent(true);
    // Best-effort confirmation email to the attendee (never blocks the RSVP).
    sendRsvpConfirmed({ email: user.email, first_name, last_name, bringing_guests: guests }, ev);
    toast('You’re going! 🎉', 'success');
  };

  const cancelRsvp = async () => {
    if (!confirm('Cancel your RSVP for this event?')) return;
    const res = await cancelOwnRsvp(ev.id);
    if (res.error) return toast('Couldn’t cancel right now — try again.', 'error');
    setJustWent(false);
    toast('Your RSVP was cancelled');
  };

  const del = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${ev.title}"? This can’t be undone.`)) return;
    const res = await removeEvent(ev.id);
    res.error ? toast(res.error, 'error') : toast('Event deleted');
  };

  // ---- Admin: manage RSVPs ----
  const removeRsvpHandler = async (r) => {
    if (!confirm(`Remove ${r.first_name} ${r.last_name}'s RSVP? They'll be emailed about it.`)) return;
    const res = await removeRsvp(r.id);
    if (res.error) return toast(res.error, 'error');
    if (r.email) sendRsvpRemoved(r, ev);
    toast('RSVP removed', 'success');
  };
  const confirmRsvpHandler = async (r) => {
    const res = await confirmRsvp(r.id);
    res.error ? toast(res.error, 'error') : toast(`${r.first_name || 'RSVP'} marked confirmed ✓`, 'success');
  };
  const exportCsv = () => {
    if (!eventRsvps.length) return toast('No RSVPs to export yet', 'gold');
    const csv = 'First Name,Last Name,Email,Guests,Status\n' + eventRsvps.map((r) => `"${r.first_name}","${r.last_name}","${r.email || ''}","${r.bringing_guests}","${rsvpConfirmed(r) ? 'Confirmed' : 'Pending'}"`).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${ev.title}-rsvps.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Highlights ----
  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await addHighlight(ev.id, file);
    setUploading(false);
    res.error ? toast(res.error, 'error') : toast('Highlight added ✦', 'success');
  };
  const downloadHighlight = async (h) => {
    try {
      const blob = await (await fetch(h.url)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = h.path?.split('/').pop() || `highlight.${h.type === 'video' ? 'mp4' : 'jpg'}`;
      a.click(); URL.revokeObjectURL(url);
    } catch { window.open(h.url, '_blank'); }
  };
  const shareHighlight = async (h) => {
    try {
      if (navigator.share) return navigator.share({ title: `${ev.title} — highlight`, url: h.url });
      await navigator.clipboard.writeText(h.url);
      toast('Link copied to clipboard', 'success');
    } catch (err) { if (err?.name !== 'AbortError') toast('Couldn’t share — try downloading', 'error'); }
  };

  return (
    <>
    <article className="ec card admin-zone" style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .ec .ec-cover { position: relative; }
        .ec .ec-cover img { width: 100%; height: 180px; object-fit: cover; }
        .ec .ec-date { position: absolute; left: 12px; bottom: -22px; width: 56px; text-align: center; background: #fff; border-radius: 10px; box-shadow: var(--shadow-md); padding: 0.4rem 0; }
        .ec .ec-date .dd { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--teal); line-height: 1; }
        .ec .ec-date .mm { font-size: 0.6rem; letter-spacing: 0.08em; color: var(--text-muted); }
        .ec .ec-body { padding: 1.6rem 1.4rem 1.4rem; flex: 1; display: flex; flex-direction: column; }
        .ec .ec-teaser { color: var(--text-muted); font-size: 0.9rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .ec .ec-actions { margin-top: auto; padding-top: 0.9rem; }
        .ec .ec-links { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.9rem; }
        .rte-content { color: var(--text); line-height: 1.7; }
        .rte-content p { margin: 0 0 0.7rem; }
        .rte-content ul, .rte-content ol { padding-left: 1.4rem; margin: 0.5rem 0; }
        .rte-content a { color: var(--teal); text-decoration: underline; }
        .rte-content mark { padding: 0 0.15em; border-radius: 3px; }
        .ec-faq { border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 0.7rem; overflow: hidden; }
        .ec-faq summary { cursor: pointer; padding: 0.9rem 1.1rem; font-weight: 700; color: var(--ink); list-style: none; display: flex; justify-content: space-between; gap: 1rem; }
        .ec-faq summary::-webkit-details-marker { display: none; }
        .ec-faq summary::after { content: '+'; color: var(--teal); font-size: 1.3rem; line-height: 1; }
        .ec-faq[open] summary::after { content: '−'; }
        .ec-faq .ec-faq-a { padding: 0 1.1rem 1rem; color: var(--text-muted); line-height: 1.6; }
        .ec-hl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.9rem; }
        .ec-hl { position: relative; aspect-ratio: 4 / 3; border-radius: var(--r-md); overflow: hidden; background: #000; cursor: pointer; border: 1px solid var(--border); }
        .ec-hl img, .ec-hl video { width: 100%; height: 100%; object-fit: cover; }
        .ec-hl .ec-hl-tag { position: absolute; left: 6px; top: 6px; font-size: 0.7rem; background: rgba(0,0,0,0.55); color: #fff; padding: 2px 7px; border-radius: 999px; }
        .ec-hl .ec-hl-del { position: absolute; right: 6px; top: 6px; }
        .ec-hl-up { display: flex; align-items: center; justify-content: center; text-align: center; aspect-ratio: 4 / 3; border: 2px dashed var(--border); border-radius: var(--r-md); cursor: pointer; color: var(--text-muted); font-size: 0.85rem; font-weight: 600; padding: 0.5rem; background: var(--paper); }
        .ec-lightbox { position: fixed; inset: 0; z-index: 2200; background: rgba(20,17,16,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; animation: fadeIn .2s ease both; }
        .ec-lightbox img, .ec-lightbox video { max-width: min(100%, 1100px); max-height: 80vh; border-radius: var(--r-md); }
        .ec-lightbox-bar { display: flex; gap: 0.6rem; margin-top: 1rem; }
        .ec-cta-badge { justify-content: center; width: 100%; padding: 0.6rem; text-align: center; }
      `}</style>

      {isAdmin && manage && (
        <div className="admin-actions">
          <button className="btn btn-sm btn-gold" onClick={(e) => { e.stopPropagation(); onEdit?.(ev); }} title="Edit">Edit</button>
          <button className="btn btn-sm btn-danger" onClick={del} title="Delete">✕</button>
        </div>
      )}

      <div className="ec-cover">
        <img src={ev.image || '/sample-event.png'} alt={ev.title} loading="lazy" />
        <div className="ec-date"><div className="dd">{d.day}</div><div className="mm">{d.month}</div></div>
      </div>

      <div className="ec-body">
        {ev.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', marginBottom: '0.4rem', display: 'inline-block' }}>📍 {ev.address}</a>
        )}
        <div className="badge" style={{ marginBottom: '0.5rem' }}>{formatDate(ev.date)}</div>
        <h3 style={{ fontSize: '1.35rem', marginBottom: '0.4rem' }}>{ev.title}</h3>
        {teaser && <p className="ec-teaser">{teaser}</p>}

        <div className="ec-actions">
          {(hasDetails || faqs.length > 0) && (
            <div className="ec-links">
              {hasDetails && <button className="btn btn-ghost btn-sm" onClick={() => setModal('details')}>Details</button>}
              {faqs.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setModal('faqs')}>FAQs</button>}
            </div>
          )}

          {isAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setModal('rsvpsList')}>👥 View RSVPs ({eventRsvps.length})</button>
              {!upcoming && <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setModal('highlights')}>▶ View highlights{evHighlights.length ? ` (${evHighlights.length})` : ''}</button>}
            </div>
          ) : upcoming ? (
            <>
              <Countdown targetDate={ev.date} />
              {going ? (
                <>
                  <div className="badge ec-cta-badge" style={{ marginTop: '1rem', background: 'rgba(0,140,149,0.12)', color: 'var(--teal-dark)' }}>✓ You’re going!</div>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '0.5rem' }} onClick={cancelRsvp}>Cancel RSVP</button>
                </>
              ) : (
                <button className="btn" style={{ width: '100%', marginTop: '1rem' }} onClick={openRsvp}>{user ? 'RSVP now' : 'Sign in to RSVP'}</button>
              )}
            </>
          ) : (
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setModal('highlights')}>▶ View highlights{evHighlights.length ? ` (${evHighlights.length})` : ''}</button>
          )}
        </div>
      </div>
    </article>

    {createPortal(
      <>
      {/* ---- Details modal ---- */}
      {modal === 'details' && (
        <div className="modal-overlay" onMouseDown={close}>
          <div className="modal" style={{ maxWidth: 640 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>{ev.title}</h2><button className="icon-btn" onClick={close}>✕</button></div>
            <div className="modal-body">
              <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{formatDate(ev.date)}{ev.address ? ` · ${ev.address}` : ''}</div>
              {ev.description_html
                ? <div className="rte-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ev.description_html) }} />
                : <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ev.description}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ---- FAQs modal ---- */}
      {modal === 'faqs' && (
        <div className="modal-overlay" onMouseDown={close}>
          <div className="modal" style={{ maxWidth: 620 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>FAQs — {ev.title}</h2><button className="icon-btn" onClick={close}>✕</button></div>
            <div className="modal-body">
              {faqs.map((f, i) => (
                <details key={i} className="ec-faq" open={i === 0}>
                  <summary>{f.q || 'Question'}</summary>
                  <div className="ec-faq-a" style={{ whiteSpace: 'pre-wrap' }}>{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- RSVP modal (login required; identity from the signed-in account) ---- */}
      {modal === 'rsvp' && (
        <div className="modal-overlay" onMouseDown={close}>
          <form className="modal" style={{ maxWidth: 440 }} onMouseDown={(e) => e.stopPropagation()} onSubmit={submitRsvp}>
            <div className="modal-head"><h2>RSVP — {ev.title}</h2><button type="button" className="icon-btn" onClick={close}>✕</button></div>
            <div className="modal-body">
              <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '1.1rem' }}>
                Signed in as <b>{user?.email}</b>. Just let us know if you’re bringing anyone.
              </p>
              <div className="field"><label>Bringing anyone?</label><select className="select" value={guests} onChange={(e) => setGuests(e.target.value)}><option>No, just me</option><option>Yes, 1 guest</option><option>Yes, 2 guests</option><option>Yes, 3+ guests</option></select></div>
              <button type="submit" className="btn" style={{ width: '100%' }} disabled={submitting}>{submitting ? 'Saving…' : 'I’m going 🎉'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ---- Admin: RSVP list ---- */}
      {modal === 'rsvpsList' && (
        <div className="modal-overlay" onMouseDown={close}>
          <div className="modal" style={{ maxWidth: 720 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>RSVPs — {ev.title}</h2><button className="icon-btn" onClick={close}>✕</button></div>
            <div className="modal-body">
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead><tr style={{ background: 'var(--mist)' }}>{['First', 'Last', 'Email', 'Guests', 'Status', ''].map((h) => <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {eventRsvps.map((r) => (
                      <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{r.first_name}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{r.last_name}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }} className="muted">{r.email ? <a href={`mailto:${r.email}`} style={{ color: 'var(--teal)' }}>{r.email}</a> : '—'}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{r.bringing_guests}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          {rsvpConfirmed(r)
                            ? <span className="badge" style={{ background: 'rgba(0,140,149,0.12)', color: 'var(--teal-dark)' }}>✓ Confirmed</span>
                            : <span className="badge badge-gold">Pending</span>}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {!rsvpConfirmed(r) && <button className="btn btn-sm" style={{ marginRight: '0.4rem' }} onClick={() => confirmRsvpHandler(r)} title="Manually confirm this RSVP">Confirm</button>}
                          <button className="btn btn-sm btn-danger" onClick={() => removeRsvpHandler(r)} title="Remove RSVP (emails the attendee)">Remove</button>
                        </td>
                      </tr>
                    ))}
                    {eventRsvps.length === 0 && <tr><td colSpan="6" className="muted center" style={{ padding: '2rem' }}>No one has RSVP’d yet.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="center" style={{ marginTop: '1.2rem' }}><button className="btn btn-gold" onClick={exportCsv}>⬇ Export CSV</button></div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Highlights grid ---- */}
      {modal === 'highlights' && (
        <div className="modal-overlay" onMouseDown={close}>
          <div className="modal" style={{ maxWidth: 860 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>{ev.title} — highlights</h2><button className="icon-btn" onClick={close}>✕</button></div>
            <div className="modal-body">
              <div className="ec-hl-grid">
                {isAdmin && (
                  <label className="ec-hl-up">
                    {uploading ? 'Uploading…' : '+ Add photo / video'}
                    <input type="file" accept="image/*,video/*" hidden onChange={onUpload} />
                  </label>
                )}
                {evHighlights.map((h) => (
                  <div key={h.id} className="ec-hl" onClick={() => setLightbox(h)}>
                    {h.type === 'video'
                      ? <video src={h.url} muted playsInline preload="metadata" />
                      : <img src={h.url} alt="Event highlight" loading="lazy" />}
                    <span className="ec-hl-tag">{h.type === 'video' ? '🎬' : '📷'}</span>
                    {isAdmin && <button className="btn btn-sm btn-danger ec-hl-del" onClick={async (e) => { e.stopPropagation(); const r = await removeHighlight(h); r.error ? toast(r.error, 'error') : toast('Removed'); }}>✕</button>}
                  </div>
                ))}
              </div>
              {evHighlights.length === 0 && <div className="empty-state"><p>No highlights yet{isAdmin ? ' — add the first one above!' : '.'}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* ---- Lightbox ---- */}
      {lightbox && (
        <div className="ec-lightbox" onMouseDown={() => setLightbox(null)}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {lightbox.type === 'video'
              ? <video src={lightbox.url} controls autoPlay playsInline style={{ background: '#000' }} />
              : <img src={lightbox.url} alt="Event highlight" />}
            <div className="ec-lightbox-bar">
              <button className="btn btn-sm btn-outline-light" onClick={() => shareHighlight(lightbox)}>↗ Share</button>
              <button className="btn btn-sm btn-outline-light" onClick={() => downloadHighlight(lightbox)}>⬇ Download</button>
              <button className="btn btn-sm" onClick={() => setLightbox(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      </>,
      document.body,
    )}
    </>
  );
}
