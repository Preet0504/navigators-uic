import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../components/Toast';
import { useReveal } from '../hooks/useReveal';
import Pattern from '../components/Pattern';

const EMPTY = { week: '', topic: '', verse: '', summary: '' };

export default function BibleStudies() {
  const { bibleStudies, addStudy, updateStudy, removeStudy, isAdmin } = useAdmin();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const ref = useReveal([bibleStudies.length]);

  const reset = () => { setShowForm(false); setEditId(null); setDraft(EMPTY); };

  const save = async (e) => {
    e.preventDefault();
    if (!draft.topic.trim()) return;
    setSaving(true);
    const res = editId ? await updateStudy(editId, draft) : await addStudy(draft);
    setSaving(false);
    if (res.error) return toast(res.error, 'error');
    toast(editId ? 'Study updated' : 'Study added ✦', 'success');
    reset();
  };

  const edit = (s) => {
    if (s._seed) return toast('Demo entry — add your own to manage it', 'gold');
    setDraft({ ...EMPTY, ...s }); setEditId(s.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const del = async (s) => {
    if (s._seed) return toast('Demo entry — nothing to delete yet', 'gold');
    if (!confirm(`Delete "${s.topic}"?`)) return;
    const res = await removeStudy(s.id);
    res.error ? toast(res.error, 'error') : toast('Deleted');
  };

  return (
    <div className="page" ref={ref}>
      <div className="container" style={{ maxWidth: 900 }}>
        <header style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'linear-gradient(120deg, #b4831f, var(--gold))', color: '#2a2207', padding: 'clamp(2.5rem,5vw,3.5rem)', marginBottom: '2.5rem' }}>
          <Pattern variant="connection" color="#5a4310" opacity={0.12} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="eyebrow" style={{ color: '#5a4310' }}>Grow together</span>
            <h1 style={{ fontSize: 'clamp(2.2rem,5vw,3.4rem)', margin: '0.4rem 0', color: '#2a2207' }}>Bible Studies</h1>
            <p style={{ maxWidth: '52ch', fontWeight: 500 }}>An open table around the Scriptures — no background, no pressure, just honest questions. Here’s what we’ve been digging into.</p>
            {isAdmin && <button className="btn" style={{ marginTop: '1.4rem', background: 'var(--teal-darker)' }} onClick={() => (showForm ? reset() : setShowForm(true))}>{showForm ? 'Close' : '+ Add study'}</button>}
          </div>
        </header>

        {showForm && isAdmin && (
          <form className="card pop-in" style={{ padding: '1.8rem', marginBottom: '2.5rem' }} onSubmit={save}>
            <h2 style={{ marginBottom: '1.2rem' }}>{editId ? 'Edit study' : 'New study entry'}</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: '1 1 120px' }}><label>Week / chapter</label><input className="input" placeholder="Week 3" value={draft.week} onChange={(e) => setDraft({ ...draft, week: e.target.value })} /></div>
              <div className="field" style={{ flex: '2 1 200px' }}><label>Topic</label><input className="input" placeholder="Grace that finds us" value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} required /></div>
            </div>
            <div className="field"><label>Passage</label><input className="input" placeholder="Luke 15:11–32" value={draft.verse || ''} onChange={(e) => setDraft({ ...draft, verse: e.target.value })} /></div>
            <div className="field"><label>Summary / notes</label><textarea className="textarea" placeholder="What did we talk about?" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Add study'}</button>
              <button className="btn btn-ghost" type="button" onClick={reset}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {bibleStudies.map((s) => (
            <article key={s.id} className="card admin-zone reveal" style={{ padding: '1.8rem 2rem', borderLeft: '5px solid var(--gold)' }}>
              {isAdmin && (
                <div className="admin-actions">
                  <button className="btn btn-sm btn-gold" onClick={() => edit(s)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => del(s)}>✕</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                {s.week && <span className="badge-soft badge">{s.week}</span>}
                {s.verse && <span className="badge badge-gold">📖 {s.verse}</span>}
              </div>
              <h2 style={{ fontSize: '1.7rem', marginBottom: '0.7rem' }}>{s.topic}</h2>
              <p style={{ lineHeight: 1.8, whiteSpace: 'pre-line', color: 'var(--cocoa)' }}>{s.summary}</p>
            </article>
          ))}
          {bibleStudies.length === 0 && <div className="empty-state card"><p>No studies posted yet — check back soon.</p></div>}
        </div>
      </div>
    </div>
  );
}
