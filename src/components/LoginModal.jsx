import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useToast } from './Toast';
import BrandLogo from './BrandLogo';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

/**
 * The normal member sign-in / sign-up surface. Opened from the navbar and from
 * any "Sign in to RSVP" button (via AdminContext's openLogin). Members can use
 * Google or an email + password account. Admins use the separate hidden
 * Ctrl+Shift+A portal.
 */
export default function LoginModal() {
  const { user, loginOpen, closeLogin, signInWithGoogle, login, signUpWithEmail, backendOk } = useAdmin();
  const toast = useToast();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (user || !loginOpen) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const reset = () => { setForm({ name: '', email: '', password: '', confirm: '' }); setError(''); setInfo(''); };
  const close = () => { reset(); closeLogin(); };
  const switchMode = () => { setMode((m) => (m === 'signup' ? 'signin' : 'signup')); setError(''); setInfo(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');

    if (mode === 'signup') {
      if (form.password.length < 6) return setError('Password must be at least 6 characters.');
      if (form.password !== form.confirm) return setError('Passwords don’t match.');
      setBusy(true);
      const res = await signUpWithEmail(form.name, form.email, form.password);
      setBusy(false);
      if (res.error) return setError(res.error);
      if (res.needsConfirmation) {
        setInfo('Almost there — check your email for a confirmation link, then come back and sign in.');
        setMode('signin');
        setForm((f) => ({ ...f, name: '', password: '', confirm: '' }));
        return;
      }
      toast('Welcome! You’re signed in ✦', 'success'); // session set → modal closes on user change
      return;
    }

    setBusy(true);
    const res = await login(form.email, form.password);
    setBusy(false);
    if (res.error) return setError(res.error);
    // success → onAuthStateChange sets the user and closes the modal
  };

  return (
    <div className="modal-overlay" onMouseDown={close}>
      <div className="modal" style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <BrandLogo size={44} wordmark={false} />
            </div>
            <h2 style={{ fontSize: '1.5rem' }}>{mode === 'signup' ? 'Create your account' : 'Sign in'}</h2>
            <p className="muted" style={{ fontSize: '0.9rem', margin: '0.4rem 0 1.25rem' }}>
              {mode === 'signup' ? 'Join to RSVP for events and stay in the loop.' : 'Welcome back — sign in to RSVP.'}
            </p>
          </div>

          {!backendOk && (
            <div className="badge" style={{ background: 'rgba(225,107,42,0.14)', color: '#b4511c', marginBottom: '1rem', display: 'block', padding: '0.6rem', textAlign: 'center' }}>
              Sign-in is offline right now — please try again later.
            </div>
          )}

          <button
            type="button"
            className="btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', background: '#fff', color: '#3c4043', border: '1px solid var(--border)' }}
            onClick={signInWithGoogle}
            disabled={!backendOk}
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '1.1rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} /> or <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={submit} style={{ textAlign: 'left' }}>
            {mode === 'signup' && (
              <div className="field"><label>Full name</label><input className="input" value={form.name} onChange={set('name')} required autoComplete="name" /></div>
            )}
            <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></div>
            <div className="field"><label>Password</label><input className="input" type="password" value={form.password} onChange={set('password')} required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></div>
            {mode === 'signup' && (
              <div className="field"><label>Confirm password</label><input className="input" type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" /></div>
            )}
            {error && <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '0.7rem' }}>{error}</p>}
            {info && <p style={{ color: 'var(--teal-dark)', fontSize: '0.85rem', marginBottom: '0.7rem' }}>{info}</p>}
            <button type="submit" className="btn" style={{ width: '100%' }} disabled={busy || !backendOk}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="muted" style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '1rem' }}>
            {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
            <button type="button" onClick={switchMode} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </button>
          </p>

          <button type="button" onClick={close} className="muted" style={{ display: 'block', margin: '0.75rem auto 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
