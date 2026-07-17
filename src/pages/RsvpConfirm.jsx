import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, isConfigured } from '../lib/supabase';
import BrandLogo from '../components/BrandLogo';

// Landing page for the confirm link emailed after an RSVP. It calls the
// confirm_rsvp() SQL function (SECURITY DEFINER) with the token from the URL.
export default function RsvpConfirm() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState('working'); // working | ok | expired | invalid | error

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) return setState('invalid');
      if (!isConfigured || !supabase) return setState('error');
      try {
        const { data, error } = await supabase.rpc('confirm_rsvp', { p_token: token });
        if (!active) return;
        if (error) setState('error');
        else if (data === 'ok') setState('ok');
        else if (data === 'expired') setState('expired');
        else setState('invalid');
      } catch {
        if (active) setState('error');
      }
    })();
    return () => { active = false; };
  }, [token]);

  const MESSAGES = {
    working: { icon: '⏳', title: 'Confirming your RSVP…', body: 'One moment while we lock in your spot.' },
    ok: { icon: '🎉', title: "You're all set!", body: 'Your RSVP is confirmed. We can’t wait to see you there.' },
    expired: { icon: '⌛', title: 'This link has expired', body: 'Confirmation links are only valid for 2 minutes. Head back to the event and hit “Resend email” for a fresh link.' },
    invalid: { icon: '🤔', title: 'Link not found', body: 'This confirmation link isn’t valid — you may have already confirmed or cancelled. If not, just RSVP again from the Events page.' },
    error: { icon: '⚠️', title: 'Something went wrong', body: 'We couldn’t confirm your RSVP right now. Please try the link again in a moment, or RSVP again.' },
  };
  const m = MESSAGES[state];

  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card center" style={{ padding: 'clamp(2rem, 5vw, 3rem)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><BrandLogo size={44} wordmark={false} /></div>
          <div style={{ fontSize: '2.6rem', marginBottom: '0.5rem' }}>{m.icon}</div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', marginBottom: '0.6rem' }}>{m.title}</h1>
          <p className="muted" style={{ marginBottom: '1.6rem' }}>{m.body}</p>
          <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/events" className="btn btn-gold">See all events</Link>
            <Link to="/" className="btn btn-ghost">Back home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
