import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../components/Toast';
import { useReveal } from '../hooks/useReveal';
import { uploadImage } from '../lib/supabase';
import Pattern from '../components/Pattern';

const EMPTY = { name: '', role: '', bio: '', image: '', sort: 99 };
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&q=80';

export default function People() {
  const { leaders, addLeader, updateLeader, removeLeader, isAdmin } = useAdmin();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const ref = useReveal([leaders.length]);

  const reset = () => { setShowForm(false); setEditId(null); setDraft(EMPTY); };

  const save = async (e) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    const payload = { ...draft, sort: Number(draft.sort) || 99 };
    const res = editId ? await updateLeader(editId, payload) : await addLeader(payload);
    setSaving(false);
    if (res.error) return toast(res.error, 'error');
    toast(editId ? 'Saved' : 'Team member added ✦', 'success');
    reset();
  };

  const edit = (p) => {
    if (p._seed) return toast('Demo profile — add your own to manage it', 'gold');
    setDraft({ ...EMPTY, ...p }); setEditId(p.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const del = async (p) => {
    if (p._seed) return toast('Demo profile — nothing to delete yet', 'gold');
    if (!confirm(`Remove ${p.name}?`)) return;
    const res = await removeLeader(p.id);
    res.error ? toast(res.error, 'error') : toast('Removed');
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'leaders');
      setDraft((d) => ({ ...d, image: url }));
      toast('Photo uploaded', 'success');
    } catch (err) { toast(err.message || 'Upload failed', 'error'); }
    finally { setUploading(false); }
  };

  return (
    <div className="page" ref={ref}>
      <div className="container">
        <header style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'linear-gradient(120deg, var(--blue), #1b6f99)', color: '#fff', padding: 'clamp(2.5rem,5vw,3.5rem)', marginBottom: '2.5rem' }}>
          <Pattern variant="rays" color="#ffffff" opacity={0.1} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="eyebrow" style={{ color: '#fff' }}>Say hi</span>
            <h1 style={{ color: '#fff', fontSize: 'clamp(2.2rem,5vw,3.4rem)', margin: '0.4rem 0' }}>Meet the team</h1>
            <p style={{ color: '#dcefff', maxWidth: '52ch' }}>These are the people who’d genuinely love to grab coffee and get to know you. Reach out anytime.</p>
            {isAdmin && <button className="btn btn-gold" style={{ marginTop: '1.4rem' }} onClick={() => (showForm ? reset() : setShowForm(true))}>{showForm ? 'Close' : '+ Add member'}</button>}
          </div>
        </header>

        {showForm && isAdmin && (
          <form className="card pop-in" style={{ padding: '1.8rem', marginBottom: '2.5rem' }} onSubmit={save}>
            <h2 style={{ marginBottom: '1.2rem' }}>{editId ? 'Edit member' : 'Add a team member'}</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: '2 1 200px' }}><label>Name</label><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></div>
              <div className="field" style={{ flex: '1 1 160px' }}><label>Role</label><input className="input" placeholder="Small Groups Lead" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} /></div>
              <div className="field" style={{ flex: '0 1 110px' }}><label>Order</label><input className="input" type="number" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value })} /></div>
            </div>
            <div className="field"><label>Photo</label><input className="input" type="file" accept="image/*" onChange={onPhoto} />{uploading && <span className="muted" style={{ fontSize: '0.8rem' }}>Uploading…</span>}</div>
            <div className="field"><label>Bio</label><textarea className="textarea" placeholder="A sentence or two about them" value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : editId ? 'Save' : 'Add member'}</button>
              <button className="btn btn-ghost" type="button" onClick={reset}>Cancel</button>
            </div>
          </form>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))' }}>
          {leaders.map((p) => (
            <article key={p.id} className="card card-hover admin-zone reveal" style={{ display: 'flex', flexDirection: 'column' }}>
              {isAdmin && (
                <div className="admin-actions">
                  <button className="btn btn-sm btn-gold" onClick={() => edit(p)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => del(p)}>✕</button>
                </div>
              )}
              <div style={{ aspectRatio: '4/5', overflow: 'hidden', background: 'var(--mist)' }}>
                <img src={p.image || FALLBACK_IMG} alt={p.name} onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              </div>
              <div style={{ padding: '1.3rem' }}>
                <h3 style={{ fontSize: '1.3rem' }}>{p.name}</h3>
                {p.role && <div className="badge badge-gold" style={{ margin: '0.4rem 0 0.7rem' }}>{p.role}</div>}
                <p className="muted" style={{ fontSize: '0.9rem' }}>{p.bio}</p>
              </div>
            </article>
          ))}
          {leaders.length === 0 && <div className="empty-state card" style={{ gridColumn: '1 / -1' }}><p>No team members added yet.</p></div>}
        </div>
      </div>
    </div>
  );
}
