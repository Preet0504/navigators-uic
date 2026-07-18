import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '../context/AdminContext';
import { useToast } from './Toast';
import { isUpcoming, parseDate, formatDate, formatDay } from '../lib/format';
import { sanitizeHtml, htmlToText } from '../lib/richtext';
import { sendRsvpConfirmation, sendRsvpRemoved, emailReady } from '../lib/email';
import { supabase } from '../lib/supabase';
import { getRsvp, saveRsvp, clearRsvp } from '../lib/rsvp';

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
const rsvpConfirmed = (r) => r.status == null || r.status === 'confirmed'; // NULL = grandfathered

export default function EventCard({ event: ev, manage = false, onEdit }) {
  const { isAdmin, removeEvent, addRsvp, rsvps, removeRsvp, confirmRsvp, highlights, addHighlight, removeHighlight } = useAdmin();
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
  const [rsvpData, setRsvpData] = useState({ firstName: '', lastName: '', email: '', bringingGuests: 'No, just me' });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  // ---- RSVP identity + state for THIS browser ----
  const [rsvp, setRsvp] = useState(() => getRsvp(ev.id));
  const [status, setStatus] = useState(() => { const r = getRsvp(ev.id); if (!r) return 'none'; return r.token ? 'checking' : 'pending'; });
  const [resending, setResending] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  // Verify the real status once on mount (handles confirm-on-another-device and admin removal).
  useEffect(() => {
    if (status !== 'checking' || !rsvp?.token || !supabase) return;
    let active = true;
    supabase.rpc('rsvp_status', { p_token: rsvp.token }).then(({ data, error }) => {
      if (!active) return;
      if (error) setStatus('pending');
      else if (data === 'confirmed') setStatus('confirmed');
      else if (data === 'pending') setStatus('pending');
      else { clearRsvp(ev.id); setRsvp(null); setStatus('none'); }
    });
    return () => { active = false; };
  }, [status, rsvp?.token, ev.id]);

  // Tick the 120s expiry clock while pending.
  useEffect(() => {
    if (status !== 'pending' || !rsvp?.sentAt) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status, rsvp?.sentAt]);

  const remaining = rsvp?.sentAt ? Math.max(0, 120 - Math.floor((nowTs - rsvp.sentAt) / 1000)) : 0;
  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  const close = () => { setModal(null); setLightbox(null); };

  // ---- RSVP submit (double opt-in) ----
  const openRsvp = () => {
    if (ev._seed) return toast('Demo event — RSVP opens once real events are added', 'gold');
    if (ev.rsvp_url) return window.open(ev.rsvp_url, '_blank');
    setModal('rsvp');
  };
  const submitRsvp = async (e) => {
    e.preventDefault();
    const email = rsvpData.email.trim().toLowerCase();
    if (!/@([a-z0-9-]+\.)*uic\.edu$/.test(email)) return toast('Please use your UIC email address (…@uic.edu)', 'error');
    const token = genToken();
    const payload = {
      event_id: ev.id, first_name: rsvpData.firstName.trim(), last_name: rsvpData.lastName.trim(),
      email, bringing_guests: rsvpData.bringingGuests, status: 'pending', token,
    };
    setSubmitting(true);
    const res = await addRsvp(payload);
    if (res.error) {
      // Already an RSVP for this email+event → recover instead of dead-ending.
      if (/duplicate|unique|23505/i.test(res.error) && supabase) {
        const { data: r, error: rerr } = await supabase.rpc('reclaim_rsvp', {
          p_event_id: String(ev.id), p_first: payload.first_name, p_last: payload.last_name, p_email: email, p_guests: payload.bringing_guests,
        });
        if (rerr) { setSubmitting(false); return toast('Couldn’t submit right now — please try again.', 'error'); }
        if (r === 'confirmed') {
          const stored = { token: null, email, first_name: payload.first_name, last_name: payload.last_name };
          saveRsvp(ev.id, stored); setRsvp(stored); setStatus('confirmed'); setModal(null); setSubmitting(false);
          return toast('You’re already confirmed for this event — you’re all set! ✓', 'success');
        }
        if (r && r !== 'none') {
          const stored = { token: r, email, first_name: payload.first_name, last_name: payload.last_name, sentAt: Date.now() };
          const emailRes = await sendRsvpConfirmation({ email, first_name: payload.first_name, last_name: payload.last_name }, ev, `${window.location.origin}/rsvp/confirm?token=${r}`);
          saveRsvp(ev.id, stored); setRsvp(stored); setStatus('pending'); setNowTs(Date.now()); setModal(null);
          setRsvpData({ firstName: '', lastName: '', email: '', bringingGuests: 'No, just me' });
          setSubmitting(false);
          if (emailRes?.error || emailRes?.skipped) return toast('RSVP updated — but we couldn’t email the link. Please reach out to confirm.', 'gold');
          return toast('We re-sent your confirmation link — check your email ✉️', 'success');
        }
        setSubmitting(false);
        return toast('You’ve already RSVP’d for this event with that email.', 'gold');
      }
      setSubmitting(false);
      return toast(res.error, 'error');
    }
    const stored = { token, email, first_name: payload.first_name, last_name: payload.last_name, sentAt: Date.now() };
    const emailRes = await sendRsvpConfirmation(payload, ev, `${window.location.origin}/rsvp/confirm?token=${token}`);
    setSubmitting(false);
    saveRsvp(ev.id, stored); setRsvp(stored); setStatus('pending'); setNowTs(Date.now());
    setModal(null);
    setRsvpData({ firstName: '', lastName: '', email: '', bringingGuests: 'No, just me' });
    if (emailRes?.error || emailRes?.skipped) toast('RSVP saved — but we couldn’t email your confirmation link. Please reach out so we can confirm you.', 'gold');
    else toast('Almost there — check your email and confirm within 2 minutes ✉️', 'success');
  };

  const resend = async () => {
    if (!rsvp?.token || !supabase) return;
    setResending(true);
    const { data: newTok, error } = await supabase.rpc('resend_rsvp', { p_token: rsvp.token });
    if (error || !newTok) {
      setResending(false);
      setStatus('checking'); // re-check: probably confirmed or cancelled
      return toast(error ? 'Couldn’t resend right now — try again.' : 'Nothing to resend (already confirmed or cancelled).', 'gold');
    }
    const updated = { ...rsvp, token: newTok, sentAt: Date.now() };
    const emailRes = await sendRsvpConfirmation({ email: rsvp.email, first_name: rsvp.first_name, last_name: rsvp.last_name }, ev, `${window.location.origin}/rsvp/confirm?token=${newTok}`);
    saveRsvp(ev.id, updated); setRsvp(updated); setNowTs(Date.now());
    setResending(false);
    if (emailRes?.error || emailRes?.skipped) toast('Couldn’t send the email — check your address or try again.', 'error');
    else toast('Fresh confirmation link sent ✉️', 'success');
  };

  const cancelRsvp = async () => {
    if (!confirm('Cancel your RSVP for this event?')) return;
    if (rsvp?.token && supabase) {
      const { error } = await supabase.rpc('cancel_rsvp', { p_token: rsvp.token });
      if (error) return toast('Couldn’t cancel right now — try again.', 'error');
    }
    clearRsvp(ev.id); setRsvp(null); setStatus('none');
    toast('Your RSVP was cancelled');
  };

  const del = async (e) => {
    e.stopPropagation();
    if (ev._seed) return toast('Demo event — nothing to delete yet', 'gold');
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
              {status === 'confirmed' ? (
                <>
                  <div className="badge ec-cta-badge" style={{ marginTop: '1rem', background: 'rgba(0,140,149,0.12)', color: 'var(--teal-dark)' }}>✓ You’re going!</div>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '0.5rem' }} onClick={cancelRsvp}>Cancel RSVP</button>
                </>
              ) : status === 'pending' ? (
                <>
                  <div className="badge badge-gold ec-cta-badge" style={{ marginTop: '1rem' }}>
                    {remaining > 0 ? `✉️ Confirm within ${mmss}` : '⌛ Link expired — resend below'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-sm" style={{ flex: 1 }} onClick={resend} disabled={resending}>{resending ? 'Sending…' : 'Resend email'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={cancelRsvp}>Cancel</button>
                  </div>
                </>
              ) : status === 'checking' ? (
                <button className="btn" style={{ width: '100%', marginTop: '1rem' }} disabled>Checking…</button>
              ) : (
                <button className="btn" style={{ width: '100%', marginTop: '1rem' }} onClick={openRsvp}>RSVP now</button>
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
              {!emailReady && (
                <div style={{ background: 'rgba(225,107,42,0.12)', color: '#b4511c', border: '1px solid rgba(225,107,42,0.35)', borderRadius: 'var(--r-sm)', padding: '0.7rem 0.9rem', marginBottom: '1.1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  Heads up: confirmation emails aren’t set up right now, so we can’t verify your RSVP automatically. Please message us after you submit.
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="field" style={{ flex: '1 1 140px' }}><label>First name</label><input className="input" required value={rsvpData.firstName} onChange={(e) => setRsvpData({ ...rsvpData, firstName: e.target.value })} /></div>
                <div className="field" style={{ flex: '1 1 140px' }}><label>Last name</label><input className="input" required value={rsvpData.lastName} onChange={(e) => setRsvpData({ ...rsvpData, lastName: e.target.value })} /></div>
              </div>
              <div className="field"><label>UIC email <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(we’ll email a link to confirm it’s really you)</span></label><input className="input" type="email" required placeholder="netid@uic.edu" value={rsvpData.email} onChange={(e) => setRsvpData({ ...rsvpData, email: e.target.value })} /></div>
              <div className="field"><label>Bringing anyone?</label><select className="select" value={rsvpData.bringingGuests} onChange={(e) => setRsvpData({ ...rsvpData, bringingGuests: e.target.value })}><option>No, just me</option><option>Yes, 1 guest</option><option>Yes, 2 guests</option><option>Yes, 3+ guests</option></select></div>
              <button type="submit" className="btn" style={{ width: '100%' }} disabled={submitting}>{submitting ? 'Sending…' : 'Confirm RSVP'}</button>
              <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.7rem', textAlign: 'center' }}>You’ll get an email with a link — it expires in 2 minutes, but you can resend a fresh one.</p>
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
