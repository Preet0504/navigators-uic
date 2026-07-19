import React from 'react';
import { useAdmin } from '../context/AdminContext';
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
 * The normal member sign-in surface. Opened from the navbar and from any
 * "Sign in to RSVP" button (via AdminContext's openLogin). Members authenticate
 * with Google; admins use the separate hidden Ctrl+Shift+A portal.
 */
export default function LoginModal() {
  const { user, loginOpen, closeLogin, signInWithGoogle, backendOk } = useAdmin();
  if (user || !loginOpen) return null;

  return (
    <div className="modal-overlay" onMouseDown={closeLogin}>
      <div className="modal" style={{ maxWidth: 400 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <BrandLogo size={44} wordmark={false} />
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>Sign in</h2>
          <p className="muted" style={{ fontSize: '0.9rem', margin: '0.4rem 0 1.5rem' }}>
            Sign in to RSVP for events and stay in the loop. We only use your name and email.
          </p>

          {!backendOk && (
            <div className="badge" style={{ background: 'rgba(225,107,42,0.14)', color: '#b4511c', marginBottom: '1rem', display: 'block', padding: '0.6rem' }}>
              Sign-in is offline right now — please try again later.
            </div>
          )}

          <button
            className="btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', background: '#fff', color: '#3c4043', border: '1px solid var(--border)' }}
            onClick={signInWithGoogle}
            disabled={!backendOk}
          >
            <GoogleIcon /> Continue with Google
          </button>

          <button onClick={closeLogin} className="muted" style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '1rem', fontSize: '0.85rem' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
