import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '../context/AdminContext';
import { useToast } from './Toast';
import { isUpcoming, parseDate, formatDate, formatDay } from '../lib/format';
import { sanitizeHtml, htmlToText } from '../lib/richtext';
import { sendRsvpConfirmation } from '../lib/email';

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

const genToken = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);

/**
 * One event, everywhere. Renders the card plus its own Details / FAQs / RSVP /
 * Highlights modals so both the Home and Events pages can drop it in and get
 * identical, fully-working cards. Admin management (edit / view RSVPs) is
 * delegated to the host page via `manage` + callbacks.
 */
export default function EventCard({ event: ev, manage = false, onEdit, onViewRsvps }) {
  const { isAdmin, removeEvent, addRsvp, highlights, addHighlight, removeHighlight } = useAdmin();
  const toast = useToast();

  const upcoming = isUpcoming(ev.date);
  const d = formatDay(ev.date);
  const faqs = Array.isArray(ev.faqs) ? ev.faqs.filter((f) => f && (f.q || f.a)) : [];
  const teaser = (ev.description || htmlToText(ev.description_html)).trim();
  const hasDetails = Boolean((ev.description_html && htmlToText(ev.description_html)) || ev.description);
  const evHighlights = highlights.filter((h) => h.event_id === ev.id);

  const [modal, setModal] = useState(null); // 'details' | 'faqs' | 'rsvp' | 'highlights'
  const [rsvpData, setRsvpData] = useState({ firstName: '', lastName: '', email: '', bringingGuests: 'No, just me' });
  const [submitting, setSubmitting] = useState(false);
  const [rsvped, setRsvped] = useState(() => {
    try { return Boolean(JSON.parse(localStorage.getItem('nav_rsvps') || '{}')[ev.id]); } catch { return false; }
  });
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const close = () => { setModal(null); setLightbox(null); };

  // ---- RSVP (double opt-in) ----
  const openRsvp = () => {
    if (ev._seed) return toast('Demo event — RSVP opens once real events are added', 'gold');
    if (ev.rsvp_url) return window.open(ev.rsvp_url, '_blank');
    setModal('rsvp');
  };
  const submitRsvp = async (e) => {
    e.preventDefault();
    const token = genToken();
    const payload = {
      event_id: ev.id, first_name: rsvpData.firstName.trim(), last_name: rsvpData.lastName.trim(),
      email: rsvpData.email.trim(), bringing_guests: rsvpData.bringingGuests, status: 'pending', token,
    };
    setSubmitting(true);
    const res = await addRsvp(payload);
    setSubmitting(false);
    if (res.error) return toast(res.error, 'error');
    // Send the confirmation/verification link (best-effort).
    const confirmUrl = `${window.location.origin}/rsvp/confirm?token=${token}`;
    sendRsvpConfirmation(payload, ev, confirmUrl);
    try {
      const m = JSON.parse(localStorage.getItem('nav_rsvps') || '{}');
      m[ev.id] = true; localStorage.setItem('nav_rsvps', JSON.stringify(m));
    } catch { /* ignore */ }
    setRsvped(true);
    setModal(null);
    setRsvpData({ firstName: '', lastName: '', email: '', bringingGuests: 'No, just me' });
    toast('Almost there — check your email to confirm your RSVP ✉️', 'success');
  };

  const del = async (e) => {
    e.stopPropagation();
    if (ev._seed) return toast('Demo event — nothing to delete yet', 'gold');
    if (!confirm(`Delete "${ev.title}"? This can’t be undone.`)) return;
    const res = await removeEvent(ev.id);
    res.error ? toast(res.error, 'error') : toast('Event deleted');
  };

  // ---- Highlights ----
  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (ev._seed) return toast('Demo event — add a real one to upload highlights', 'gold');
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
    <article className="ec card admin-zone reveal" style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .ec .ec-cover { position: relative; }
        .ec .ec-cover img { width: 100%; height: 180px; object-fit: cover; }
        .ec .ec-date { position: absolute; left: 12px; bottom: -22px; width: 56px; text-align: center; background: #fff; border-radius: 10px; box-shadow: var(--shadow-md); padding: 0.4rem 0; }
        .ec .ec-date .dd { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--teal); line-height: 1; }
        .ec .ec-date .mm { font-size: 0.6rem; letter-spacing: 0.08em; color: var(--text-muted); }
        .ec .ec-body { padding: 1.6rem 1.4rem 1.4rem; flex: 1; display: flex; flex-direction: column; }
        .ec .ec-teaser { color: var(--text-muted); font-size: 0.9rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        /* margin-top:auto eats the height variation above, pinning the action
           area (links + countdown + button) to the bottom so it lines up across
           cards of different content length. */
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
        .ec-hl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.7rem; }
        .ec-hl { position: relative; aspect-ratio: 1; border-radius: var(--r-sm); overflow: hidden; background: #000; cursor: pointer; border: 1px solid var(--border); }
        .ec-hl img, .ec-hl video { width: 100%; height: 100%; object-fit: cover; }
        .ec-hl .ec-hl-tag { position: absolute; left: 6px; top: 6px; font-size: 0.7rem; background: rgba(0,0,0,0.55); color: #fff; padding: 2px 7px; border-radius: 999px; }
        .ec-hl .ec-hl-del { position: absolute; right: 6px; top: 6px; }
        .ec-hl-up { display: flex; align-items: center; justify-content: center; text-align: center; aspect-ratio: 1; border: 2px dashed var(--border); border-radius: var(--r-sm); cursor: pointer; color: var(--text-muted); font-size: 0.85rem; font-weight: 600; padding: 0.5rem; background: var(--paper); }
        .ec-lightbox { position: fixed; inset: 0; z-index: 2200; background: rgba(20,17,16,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; animation: fadeIn .2s ease both; }
        .ec-lightbox img, .ec-lightbox video { max-width: min(100%, 1100px); max-height: 80vh; border-radius: var(--r-md); }
        .ec-lightbox-bar { display: flex; gap: 0.6rem; margin-top: 1rem; }
      `}</style>

      {isAdmin && manage && (
        <div className="admin-actions">
          <button className="btn btn-sm" style={{ background: 'var(--blue)' }} onClick={(e) => { e.stopPropagation(); onViewRsvps?.(ev); }} title="View RSVPs">RSVPs</button>
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

          {upcoming ? (
            <>
              <Countdown targetDate={ev.date} />
              {rsvped ? (
                <div className="badge" style={{ marginTop: '1rem', justifyContent: 'center', width: '100%', padding: '0.6rem', background: 'rgba(0,140,149,0.12)', color: 'var(--teal-dark)' }}>✓ RSVP received</div>
              ) : (
                <button className="btn" style={{ marginTop: '1rem', width: '100%' }} onClick={openRsvp}>RSVP now</button>
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

      {/* ---- RSVP modal (double opt-in) ---- */}
      {modal === 'rsvp' && (
        <div className="modal-overlay" onMouseDown={close}>
          <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submitRsvp}>
            <div className="modal-head"><h2>RSVP — {ev.title}</h2><button type="button" className="icon-btn" onClick={close}>✕</button></div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="field" style={{ flex: '1 1 140px' }}><label>First name</label><input className="input" required value={rsvpData.firstName} onChange={(e) => setRsvpData({ ...rsvpData, firstName: e.target.value })} /></div>
                <div className="field" style={{ flex: '1 1 140px' }}><label>Last name</label><input className="input" required value={rsvpData.lastName} onChange={(e) => setRsvpData({ ...rsvpData, lastName: e.target.value })} /></div>
              </div>
              <div className="field"><label>Email <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(we’ll email a link to confirm it’s really you)</span></label><input className="input" type="email" required placeholder="you@uic.edu" value={rsvpData.email} onChange={(e) => setRsvpData({ ...rsvpData, email: e.target.value })} /></div>
              <div className="field"><label>Bringing anyone?</label><select className="select" value={rsvpData.bringingGuests} onChange={(e) => setRsvpData({ ...rsvpData, bringingGuests: e.target.value })}><option>No, just me</option><option>Yes, 1 guest</option><option>Yes, 2 guests</option><option>Yes, 3+ guests</option></select></div>
              <button type="submit" className="btn" style={{ width: '100%' }} disabled={submitting}>{submitting ? 'Sending…' : 'Confirm RSVP'}</button>
              <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.7rem', textAlign: 'center' }}>You’ll get an email with a link to finish your RSVP.</p>
            </div>
          </form>
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

      {/* ---- Lightbox (enlarged highlight) ---- */}
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
