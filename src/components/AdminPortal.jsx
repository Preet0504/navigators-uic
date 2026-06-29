import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useToast } from './Toast';
import BrandLogo from './BrandLogo';

/**
 * Hidden admin entrance. Revealed with the keyboard gesture Ctrl+Shift+A
 * (kept from the original), then authenticates via Supabase Auth so the
 * password never lives in the client bundle. Students never see this.
 */
export default function AdminPortal() {
  const { isAdmin, login, backendOk } = useAdmin();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(import.meta.env.VITE_ADMIN_EMAIL || '');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setOpen((p) => !p);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (isAdmin || !open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { ok, error } = await login(email, pwd);
    setBusy(false);
    if (ok) {
      setOpen(false);
      setPwd('');
      toast('Welcome back, admin ✦', 'success');
    } else {
      setError(error || 'Invalid credentials');
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={() => setOpen(false)}>
      <div className="modal" style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <BrandLogo size={44} wordmark={false} />
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>Admin sign in</h2>
          <p className="muted" style={{ fontSize: '0.9rem', margin: '0.4rem 0 1.5rem' }}>
            Maintainer access only. Students don’t need an account.
          </p>

          {!backendOk && (
            <div className="badge" style={{ background: 'rgba(225,107,42,0.14)', color: '#b4511c', marginBottom: '1rem', display: 'block', padding: '0.6rem' }}>
              Backend offline — connect Supabase to sign in.
            </div>
          )}

          <form onSubmit={submit} style={{ textAlign: 'left' }}>
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input id="admin-email" className="input" type="email" autoComplete="username" placeholder="you@uicnavigators.org" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="admin-pwd">Password</label>
              <input id="admin-pwd" className="input" type="password" autoComplete="current-password" placeholder="••••••••" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
            </div>
            {error && <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{error}</p>}
            <button type="submit" className="btn" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Signing in…' : 'Unlock admin mode'}
            </button>
          </form>

          <button onClick={() => setOpen(false)} className="muted" style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '1rem', fontSize: '0.85rem' }}>
            Cancel (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
