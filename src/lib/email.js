import emailjs from '@emailjs/browser';
import { formatDate } from './format';

// EmailJS is a client-side email service (no server needed). The public key is
// safe to expose — lock sending down in the EmailJS dashboard by allowlisting
// your site's domain. Configure these in .env.local (see .env.example).
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// When keys are missing the app still works — notifications simply no-op.
export const emailReady = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

if (emailReady) emailjs.init({ publicKey: PUBLIC_KEY });

const fullName = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'there';

/**
 * Low-level send. Never throws — notifications are best-effort and must never
 * block or break the RSVP / admin action that triggered them. Your EmailJS
 * template should reference these variables: {{to_email}}, {{to_name}},
 * {{subject}}, {{title}}, {{message}}.
 */
async function send(params) {
  if (!emailReady) return { skipped: true };
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
    return { ok: true };
  } catch (e) {
    console.warn('Email send failed:', e);
    return { error: e?.text || e?.message || 'Email failed' };
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
