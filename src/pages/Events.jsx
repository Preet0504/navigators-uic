import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../components/Toast';
import { useReveal } from '../hooks/useReveal';
import { isUpcoming, parseDate } from '../lib/format';
import { htmlToText } from '../lib/richtext';
import { uploadImage } from '../lib/supabase';
import { sendEventUpdate, sendNewEvent, emailReady } from '../lib/email';
import Pattern from '../components/Pattern';
import EventCard from '../components/EventCard';
import RichTextEditor from '../components/RichTextEditor';

const PAGE_SIZE = 9;
const EMPTY_EVENT = { title: '', date: '', address: '', rsvp_url: '', description: '', description_html: '', image: '/sample-event.png', faqs: [] };

export default function Events() {
  const { events, addEvent, updateEvent, isAdmin, rsvps, listMemberEmails } = useAdmin();
  const toast = useToast();

  const [tab, setTab] = useState('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [uploading, setUploading] = useState(false);

  const filtered = events.filter((e) => (tab === 'upcoming' ? isUpcoming(e.date) : !isUpcoming(e.date)))
    .sort((a, b) => {
      const ta = parseDate(a.date)?.getTime() || 0, tb = parseDate(b.date)?.getTime() || 0;
      return tab === 'upcoming' ? ta - tb : tb - ta;
    });
  const shown = filtered.slice(0, visible);
  const ref = useReveal([tab, shown.map((e) => e.id).join(',')]);

  useEffect(() => setVisible(PAGE_SIZE), [tab]);

  const resetForm = () => { setShowForm(false); setEditId(null); setDraft(EMPTY_EVENT); };

  const saveEvent = async (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const payload = {
      title: draft.title, date: draft.date, address: draft.address || '', rsvp_url: draft.rsvp_url || '',
      image: draft.image || '', description_html: draft.description_html || '',
      description: htmlToText(draft.description_html) || draft.description || '',
      faqs: (draft.faqs || []).filter((f) => (f.q || '').trim() || (f.a || '').trim()),
    };
    const res = editId ? await updateEvent(editId, payload) : await addEvent(payload);
    setSaving(false);
    if (res.error) return toast(res.error, 'error');
    if (editId) {
      const recipients = rsvps.filter((r) => r.event_id === editId && r.email);
      if (recipients.length) {
        Promise.allSettled(recipients.map((r) => sendEventUpdate(r, { ...payload, id: editId })));
        toast(`Event updated · notifying ${recipients.length} attendee${recipients.length > 1 ? 's' : ''}`, 'success');
      } else toast('Event updated', 'success');
    } else {
      // New event → announce it to every signed-in member (best-effort; no-ops
      // until the Resend email function is configured).
      const recipients = await listMemberEmails();
      if (recipients.length) {
        Promise.allSettled(recipients.map((p) => sendNewEvent(p, payload)));
        toast(`Event published ✦ · notifying ${recipients.length} member${recipients.length > 1 ? 's' : ''}`, 'success');
      } else toast('Event published ✦', 'success');
    }
    resetForm();
  };

  const startEdit = (ev) => {
    if (ev._seed) return toast('Demo event — add your own to manage it', 'gold');
    setDraft({ ...EMPTY_EVENT, ...ev, description_html: ev.description_html || ev.description || '', faqs: Array.isArray(ev.faqs) ? ev.faqs : [] });
    setEditId(ev.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'covers');
      setDraft((d) => ({ ...d, image: url }));
      toast('Cover uploaded', 'success');
    } catch (err) { toast(err.message || 'Upload failed', 'error'); }
    finally { setUploading(false); }
  };

  // FAQ editor helpers
  const addFaq = () => setDraft((d) => ({ ...d, faqs: [...(d.faqs || []), { q: '', a: '' }] }));
  const updFaq = (i, key, val) => setDraft((d) => { const faqs = [...(d.faqs || [])]; faqs[i] = { ...faqs[i], [key]: val }; return { ...d, faqs }; });
  const rmFaq = (i) => setDraft((d) => ({ ...d, faqs: (d.faqs || []).filter((_, j) => j !== i) }));

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

        {/* Admin diagnostic: notification emails need EmailJS configured. RSVPs
            themselves never depend on email (sign-in verifies identity). */}
        {isAdmin && !emailReady && (
          <div className="card" style={{ padding: '1rem 1.2rem', marginBottom: '1.5rem', border: '1px solid var(--orange)', background: 'rgba(225,107,42,0.08)' }}>
            <strong style={{ color: '#b4511c' }}>⚠️ Email is not configured on this deployment.</strong>
            <p className="muted" style={{ fontSize: '0.88rem', marginTop: '0.35rem' }}>
              New-event and update emails to members can’t be sent. Add <code>VITE_EMAILJS_SERVICE_ID</code>, <code>VITE_EMAILJS_TEMPLATE_ID</code> and <code>VITE_EMAILJS_PUBLIC_KEY</code> to your Vercel environment (the <b>Production</b> environment) and redeploy. (RSVPs work regardless.)
            </p>
          </div>
        )}

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
            <div className="field">
              <label>Description <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>— select text, then use the toolbar to format</span></label>
              <RichTextEditor key={editId || 'new'} value={draft.description_html} onChange={(html) => setDraft((d) => ({ ...d, description_html: html }))} placeholder="What’s the vibe? What should people bring?" />
            </div>

            {/* FAQ editor */}
            <div className="field">
              <label>FAQs <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>— optional; shown behind an “FAQs” button on the card</span></label>
              {(draft.faqs || []).map((f, i) => (
                <div key={i} className="card" style={{ padding: '0.9rem', marginBottom: '0.7rem', background: 'var(--paper)' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <input className="input" style={{ marginBottom: '0.5rem' }} placeholder="Question" value={f.q || ''} onChange={(e) => updFaq(i, 'q', e.target.value)} />
                      <textarea className="textarea" style={{ minHeight: 70 }} placeholder="Answer" value={f.a || ''} onChange={(e) => updFaq(i, 'a', e.target.value)} />
                    </div>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => rmFaq(i)} title="Remove FAQ">✕</button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={addFaq}>+ Add FAQ</button>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
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
          {shown.map((ev) => (
            <EventCard key={ev.id} event={ev} manage onEdit={startEdit} />
          ))}
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
    </div>
  );
}
