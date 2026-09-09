import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useToast } from './Toast';
import { isUpcoming, parseDate, formatDate, formatDay } from '../lib/format';
import { sanitizeHtml, htmlToText } from '../lib/richtext';
import { sendRsvpRemoved, sendRsvpConfirmed, sendEventReminder, emailReady } from '../lib/email';
import HighlightReel from './HighlightReel';
import { Share as ShareIcon } from './Icons';

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

export default function EventCard({ event: ev, manage = false, onEdit, activeEventId = null, activeHighlightId = null }) {
  const { isAdmin, user, openLogin, removeEvent, addRsvp, rsvps, removeRsvp, confirmRsvp, cancelOwnRsvp, highlights, addHighlight } = useAdmin();
  const toast = useToast();
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const upcoming = isUpcoming(ev.date);
  const d = formatDay(ev.date);
  const faqs = Array.isArray(ev.faqs) ? ev.faqs.filter((f) => f && (f.q || f.a)) : [];
  const teaser = (ev.description || htmlToText(ev.description_html)).trim();
  const hasDetails = Boolean((ev.description_html && htmlToText(ev.description_html)) || ev.description);
  // String compare: event_id can come back as a different JS type than ev.id
  // (e.g. bigint vs number), and a strict === would silently hide the rows.
  const evHighlights = highlights.filter((h) => String(h.event_id) === String(ev.id));
  const eventRsvps = rsvps.filter((r) => String(r.event_id) === String(ev.id));

  const [modal, setModal] = useState(null); // 'details' | 'faqs' | 'rsvp' | 'highlights' | 'rsvpsList'
  const rsvpQuestions = Array.isArray(ev.rsvp_questions) ? ev.rsvp_questions : [];
  const [answers, setAnswers] = useState({}); // { [questionId]: value }
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [justWent, setJustWent] = useState(false); // optimistic, before realtime catches up
  const [sendingReminder, setSendingReminder] = useState(false);

  // The card is now itself the click target for the expanded popup (see
  // .ec-cover/.ec-body below), and that's what /events/:eventId is FOR — so
  // the URL has to be the source of truth for whether 'expanded'/'highlights'
  // is open, not just a one-time seed on mount like it was before clicking
  // the card could also open these. Every other modal (rsvp, faqs-now-merged,
  // rsvpsList) stays purely local state, untouched by this.
  const isTarget = activeEventId != null && String(ev.id) === String(activeEventId);
  useEffect(() => {
    if (isTarget) {
      // modal can't be a purely derived value: it also has to be freely
      // settable by non-URL actions (e.g. opening the RSVP form while
      // staying on this same /events/:id URL), so it has to stay real state
      // kept in sync via effect rather than computed inline.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModal(activeHighlightId ? 'highlights' : 'expanded');
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // The URL moved away from this event — close ONLY if a URL-driven modal
      // was showing, so this never stomps on a locally-opened one (rsvp, etc.)
      // that has nothing to do with the URL.
      setModal((m) => (m === 'expanded' || m === 'highlights' ? null : m));
    }
  }, [isTarget, activeHighlightId]);
  // Index to open the reel at, resolved from the shared highlight's id — not
  // stored in state, since evHighlights can legitimately arrive after the
  // effect above already ran (see EventCard's HighlightReel doc comment).
  const autoOpenHighlightIndex = activeHighlightId
    ? Math.max(0, evHighlights.findIndex((h) => String(h.id) === String(activeHighlightId)))
    : 0;

  // Both push a new URL rather than setModal() directly — the effect above
  // is what actually opens the modal, once isTarget flips true. Keeps the
  // URL as the single source of truth instead of two ways to reach the same
  // state that could drift out of sync with each other.
  const openExpanded = () => navigate(`/events/${ev.id}`);
  const openHighlights = () => {
    if (evHighlights.length > 0) navigate(`/events/${ev.id}/highlight/${evHighlights[0].id}`);
    else setModal('highlights'); // no highlights to deep-link to yet; just show the empty state locally
  };

  // This member's RSVP for this event, if any. A member's `rsvps` only contains
  // their own rows (RLS), so this is the source of truth once realtime lands.
  const myRsvp = user ? rsvps.find((r) => String(r.event_id) === String(ev.id) && r.user_id === user.id) : null;
  const going = Boolean(myRsvp) || justWent;

  // Grid vs. reel view is reflected in the URL as ?view=grid — deliberately
  // NOT the scroll position/current highlight within the reel (that would
  // spam browser history on every swipe and break the back button, the way
  // no reel-style app actually does it; sharing "what I'm looking at right
  // now" is already covered by the explicit Share button). This toggle is a
  // discrete, infrequent choice, same as Events.jsx's own ?tab= pattern, so
  // it's cheap and safe to sync.
  const initialReelView = searchParams.get('view') === 'grid' ? 'grid' : 'reel';
  const setReelView = (v) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === 'grid') next.set('view', 'grid'); else next.delete('view');
      return next;
    }, { replace: true }); // replace, not push — a view toggle isn't a new "page"
  };

  const close = () => {
    // Only 'expanded'/'highlights' were opened by the URL (see the isTarget
    // effect above) — for those, closing has to leave /events/:id too, or
    // the URL would still claim "viewing this event" with nothing shown for
    // it, and refreshing/re-sharing that URL would silently reopen it.
    const wasUrlDriven = modal === 'expanded' || modal === 'highlights';
    setModal(null);
    if (wasUrlDriven) navigate('/events', { replace: true });
    else setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete('view'); return next; }, { replace: true });
  };

  // ---- RSVP (login required; identity comes from the auth provider) ----
  const openRsvp = async () => {
    if (ev.rsvp_url) return window.open(ev.rsvp_url, '_blank');
    if (!user) return openLogin();
    // Default choice questions to their first option (matches a <select>'s
    // natural default); text questions start blank.
    const initial = {};
    rsvpQuestions.forEach((q) => { initial[q.id] = q.type === 'choice' ? (q.options?.[0] || '') : ''; });
    setAnswers(initial);
    setModal('rsvp');
  };
  const setAnswer = (id, val) => setAnswers((a) => ({ ...a, [id]: val }));

  const submitRsvp = async (e) => {
    e.preventDefault();
    if (!user) return openLogin();
    const { first_name, last_name } = nameFromUser(user);
    const payload = {
      event_id: ev.id, user_id: user.id, email: user.email,
      first_name, last_name, answers, status: 'confirmed',
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
    sendRsvpConfirmed({ email: user.email, first_name, last_name, answers }, ev);
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

  // Admin-triggered, any time — unlike the other notifications (which fire
  // automatically off an RSVP/edit/removal), this one only ever sends because
  // an admin clicked the button, so it needs its own confirm + explicit
  // success/failure reporting rather than the fire-and-forget pattern used
  // for the automatic ones.
  const sendReminder = async () => {
    // send() silently no-ops ({ skipped: true }, never an error) when EmailJS
    // isn't configured — without this check the button would report success
    // while actually sending nothing, since a skipped send isn't counted as
    // a failure below.
    if (!emailReady) return toast('Email isn’t configured on this deployment — see the notice at the top of this page.', 'error');
    const recipients = eventRsvps.filter((r) => r.email);
    if (!recipients.length) return toast('No RSVPs to remind yet', 'gold');
    if (!confirm(`Send a reminder to ${recipients.length} attendee${recipients.length === 1 ? '' : 's'} for "${ev.title}"?`)) return;
    setSendingReminder(true);
    const results = await Promise.allSettled(recipients.map((r) => sendEventReminder(r, ev)));
    setSendingReminder(false);
    const failed = results.filter((r) => r.status === 'rejected' || r.value?.error).length;
    if (failed === recipients.length) return toast('Reminder failed to send', 'error');
    const sent = recipients.length - failed;
    toast(
      failed ? `Reminder sent to ${sent}/${recipients.length} — ${failed} failed` : `Reminder sent to ${sent} attendee${sent === 1 ? '' : 's'} ✓`,
      failed ? 'gold' : 'success',
    );
  };
  const csvEsc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const exportCsv = () => {
    if (!eventRsvps.length) return toast('No RSVPs to export yet', 'gold');
    const header = ['First Name', 'Last Name', 'Email', ...rsvpQuestions.map((q) => q.label), 'Status'];
    const rows = eventRsvps.map((r) => [
      r.first_name, r.last_name, r.email || '',
      ...rsvpQuestions.map((q) => r.answers?.[q.id] ?? ''),
      rsvpConfirmed(r) ? 'Confirmed' : 'Pending',
    ].map(csvEsc).join(','));
    const csv = header.map(csvEsc).join(',') + '\n' + rows.join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${ev.title}-rsvps.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Share (this event, not a highlight) ----
  // Points at this app's own /events/:id route, not any database/storage
  // URL — the same principle as HighlightReel's per-highlight share.
  const shareEvent = async () => {
    const url = `${window.location.origin}/events/${ev.id}`;
    try {
      if (navigator.share) return await navigator.share({ title: ev.title, url });
      await navigator.clipboard.writeText(url);
      toast('Link copied to clipboard', 'success');
    } catch (err) { if (err?.name !== 'AbortError') toast('Couldn’t share — try copying the link', 'error'); }
  };

  // ---- Highlights ----
  // Viewing (and share/download/delete of individual media) lives in
  // HighlightReel; the card only owns the upload entry point.
  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await addHighlight(ev.id, file);
    setUploading(false);
    res.error ? toast(res.error, 'error') : toast('Highlight added ✦', 'success');
  };

  // Shared between the small card and the expanded popup — same admin/RSVP/
  // highlights logic either way, just shown in two places, so this lives
  // here once rather than as two copies that could quietly drift apart.
  const actionArea = isAdmin ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setModal('rsvpsList')}>👥 View RSVPs ({eventRsvps.length})</button>
      {upcoming && (
        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={sendReminder} disabled={sendingReminder} title="Email everyone who's RSVP'd">
          {sendingReminder ? 'Sending…' : '🔔 Send reminder'}
        </button>
      )}
      {!upcoming && <button className="btn btn-ghost" style={{ width: '100%' }} onClick={openHighlights}>▶ View highlights{evHighlights.length ? ` (${evHighlights.length})` : ''}</button>}
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
    <button className="btn btn-ghost" style={{ width: '100%' }} onClick={openHighlights}>▶ View highlights{evHighlights.length ? ` (${evHighlights.length})` : ''}</button>
  );

  return (
    <>
    <article ref={cardRef} className="ec card admin-zone" style={{ display: 'flex', flexDirection: 'column' }}>
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
        .ec .ec-share-btn { display: inline-flex; align-items: center; gap: 0.35rem; }
        /* The image + title/teaser block double as a click target for the
           expanded popup — a bonus for pointer/touch users. The "View
           details" button is the real, keyboard-accessible way in; these
           divs aren't given a role/tabIndex on purpose, since duplicating
           that as a second focus stop would be redundant, not additive. */
        .ec .ec-clickable { cursor: pointer; }
        .ec .ec-cover.ec-clickable img { transition: transform .4s var(--ease); }
        .ec .ec-cover.ec-clickable:hover img { transform: scale(1.04); }
        .ec .ec-title-block.ec-clickable:hover h3 { color: var(--teal); }
        .ec-expand { max-width: 640px; padding: 0; position: relative; }
        .ec-expand-close { position: absolute; top: 12px; right: 12px; z-index: 2; background: rgba(20,17,16,0.55); color: #fff; }
        .ec-expand-close:hover { background: rgba(20,17,16,0.75); color: #fff; }
        .ec-expand-img { width: 100%; height: 260px; object-fit: cover; display: block; border-radius: var(--r-lg) var(--r-lg) 0 0; }
        .ec-expand-body { padding: 1.7rem 1.8rem 1.9rem; }
        .ec-expand-actions { margin-top: 1.8rem; padding-top: 1.4rem; border-top: 1px solid var(--border); }
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
        .ec-cta-badge { justify-content: center; width: 100%; padding: 0.6rem; text-align: center; }
      `}</style>

      {isAdmin && manage && (
        <div className="admin-actions">
          <button className="btn btn-sm btn-gold" onClick={(e) => { e.stopPropagation(); onEdit?.(ev); }} title="Edit">Edit</button>
          <button className="btn btn-sm btn-danger" onClick={del} title="Delete">✕</button>
        </div>
      )}

      <div className="ec-cover ec-clickable" onClick={openExpanded}>
        <img src={ev.image || '/sample-event.png'} alt={ev.title} loading="lazy" />
        <div className="ec-date"><div className="dd">{d.day}</div><div className="mm">{d.month}</div></div>
      </div>

      <div className="ec-body">
        {ev.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', marginBottom: '0.4rem', display: 'inline-block' }}>📍 {ev.address}</a>
        )}
        <div className="ec-title-block ec-clickable" onClick={openExpanded}>
          <div className="badge" style={{ marginBottom: '0.5rem' }}>{formatDate(ev.date)}</div>
          <h3 style={{ fontSize: '1.35rem', marginBottom: '0.4rem' }}>{ev.title}</h3>
          {teaser && <p className="ec-teaser">{teaser}</p>}
        </div>

        <div className="ec-actions">
          <div className="ec-links">
            <button className="btn btn-ghost btn-sm" onClick={openExpanded}>View details</button>
            <button className="btn btn-ghost btn-sm ec-share-btn" onClick={shareEvent} title="Share this event" aria-label="Share this event">
              <ShareIcon size={15} /> Share
            </button>
          </div>

          {actionArea}
        </div>
      </div>
    </article>

    {createPortal(
      <>
      {/* ---- Expanded event popup ---- */}
      {/* The click target for the whole card, and the URL-driven view opened
          by a shared /events/:id link. Consolidates what used to be two
          separate modals (Details, FAQs) plus a copy of the RSVP/highlights
          action area, so this is genuinely everything about the event in one
          "zoomed in" place instead of three clicks deep. */}
      {modal === 'expanded' && (
        <div className="modal-overlay" onMouseDown={close}>
          <div className="modal ec-expand" onMouseDown={(e) => e.stopPropagation()}>
            <button className="icon-btn ec-expand-close" onClick={close} aria-label="Close">✕</button>
            <img className="ec-expand-img" src={ev.image || '/sample-event.png'} alt={ev.title} />
            <div className="ec-expand-body">
              {ev.address && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', marginBottom: '0.5rem', display: 'inline-block' }}>📍 {ev.address}</a>
              )}
              <div className="badge" style={{ marginBottom: '0.6rem' }}>{formatDate(ev.date)}</div>
              <h2 style={{ fontSize: '1.7rem', marginBottom: hasDetails || faqs.length > 0 ? '1rem' : 0 }}>{ev.title}</h2>

              {hasDetails && (
                ev.description_html
                  ? <div className="rte-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ev.description_html) }} />
                  : <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ev.description}</p>
              )}

              {faqs.length > 0 && (
                <div style={{ marginTop: hasDetails ? '1.6rem' : 0 }}>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>FAQs</h3>
                  {faqs.map((f, i) => (
                    <details key={i} className="ec-faq" open={i === 0}>
                      <summary>{f.q || 'Question'}</summary>
                      <div className="ec-faq-a" style={{ whiteSpace: 'pre-wrap' }}>{f.a}</div>
                    </details>
                  ))}
                </div>
              )}

              <div className="ec-expand-actions">{actionArea}</div>
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
                Signed in as <b>{user?.email}</b>.{rsvpQuestions.length ? ' Just a couple quick questions.' : ' Click below to confirm you’re going.'}
              </p>
              {rsvpQuestions.map((q) => (
                <div className="field" key={q.id}>
                  <label>{q.label}{!q.required && <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}> (optional)</span>}</label>
                  {q.type === 'choice' ? (
                    <select className="select" required={q.required} value={answers[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)}>
                      {(q.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="input" required={q.required} value={answers[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
                  )}
                </div>
              ))}
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
                  <thead><tr style={{ background: 'var(--mist)' }}>{['First', 'Last', 'Email', ...rsvpQuestions.map((q) => q.label), 'Status', ''].map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {eventRsvps.map((r) => (
                      <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{r.first_name}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{r.last_name}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }} className="muted">{r.email ? <a href={`mailto:${r.email}`} style={{ color: 'var(--teal)' }}>{r.email}</a> : '—'}</td>
                        {rsvpQuestions.map((q) => (
                          <td key={q.id} style={{ padding: '0.6rem 0.8rem' }}>{r.answers?.[q.id] || '—'}</td>
                        ))}
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
                    {eventRsvps.length === 0 && <tr><td colSpan={5 + rsvpQuestions.length} className="muted center" style={{ padding: '2rem' }}>No one has RSVP’d yet.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="center" style={{ marginTop: '1.2rem' }}><button className="btn btn-gold" onClick={exportCsv}>⬇ Export CSV</button></div>
            </div>
          </div>
        </div>
      )}

      </>,
      document.body,
    )}

    {/* Full-screen reel: swipe/scroll through the media, like, comment. Portals
        itself, and carries its own admin upload/delete controls. */}
    {modal === 'highlights' && (
      <HighlightReel highlights={evHighlights} event={ev} startIndex={autoOpenHighlightIndex} initialView={initialReelView} onViewChange={setReelView} onClose={close} onUpload={onUpload} uploading={uploading} />
    )}
    </>
  );
}
