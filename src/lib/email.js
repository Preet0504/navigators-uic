import { supabase } from './supabase';
import { formatDate } from './format';

// Email is sent by the Supabase Edge Function `send-email`, which calls Resend
// server-side. No email-provider keys live in the browser, and there are no
// client-origin restrictions. If the function isn't deployed yet (or Resend
// isn't configured), sends fail gracefully and the caller falls back to
// confirming the RSVP directly — see finalizeRsvp in EventCard.
export const emailReady = Boolean(supabase);

const fullName = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'there';

/**
 * Low-level send. Never throws — notifications are best-effort and must never
 * block or break the RSVP / admin action that triggered them.
 * Params: { to_email, to_name, subject, title, message }.
 */
async function send(params) {
  if (!supabase) return { skipped: true };
  try {
    const { data, error } = await supabase.functions.invoke('send-email', { body: params });
    if (error) { console.warn('Email send failed:', error); return { error: error.message || 'Email failed' }; }
    if (data?.error) { console.warn('Email send failed:', data.error); return { error: data.error }; }
    return { ok: true };
  } catch (e) {
    console.warn('Email send failed:', e);
    return { error: e?.message || 'Email failed' };
  }
}

const whenWhere = (event) => {
  const bits = [];
  if (event.date) bits.push(`When: ${formatDate(event.date)}`);
  if (event.address) bits.push(`Where: ${event.address}`);
  return bits.length ? `\n\n${bits.join('\n')}` : '';
};

/**
 * Sent right after someone RSVPs. When a confirmUrl is supplied we ask them to
 * click it to confirm (double opt-in — proves they own the inbox).
 */
export function sendRsvpConfirmation(rsvp, event, confirmUrl) {
  const name = fullName(rsvp);
  const confirmLine = confirmUrl
    ? `\n\nOne quick step to finish — confirm it's really you by opening this link:\n${confirmUrl}\n\nIf you didn't RSVP, you can safely ignore this email.`
    : '';
  return send({
    to_email: rsvp.email,
    to_name: name,
    subject: `Confirm your RSVP — ${event.title}`,
    title: event.title,
    message: `Hi ${name},\n\nThanks for RSVPing to "${event.title}"!${whenWhere(event)}${confirmLine}\n\n— The Navigators`,
  });
}

/** Sent to every attendee when an admin edits the event. */
export function sendEventUpdate(rsvp, event) {
  const name = fullName(rsvp);
  return send({
    to_email: rsvp.email,
    to_name: name,
    subject: `Update — ${event.title}`,
    title: event.title,
    message: `Hi ${name},\n\nHeads up: "${event.title}" was just updated. Here are the latest details:${whenWhere(event)}\n\nSee you there!\n\n— The Navigators`,
  });
}

/** Sent to an attendee when an admin removes their RSVP. */
export function sendRsvpRemoved(rsvp, event) {
  const name = fullName(rsvp);
  return send({
    to_email: rsvp.email,
    to_name: name,
    subject: `RSVP cancelled — ${event.title}`,
    title: event.title,
    message: `Hi ${name},\n\nYour RSVP for "${event.title}" has been cancelled. If you think this was a mistake, just RSVP again or reach out to us.\n\n— The Navigators`,
  });
}
