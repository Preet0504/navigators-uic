import emailjs from '@emailjs/browser';
import { formatDate } from './format';

// EmailJS is a client-side email service (no server needed). The public key is
// safe to expose — lock sending down in the EmailJS dashboard by allowlisting
// your site's domain. Configure these in .env.local / Vercel (see .env.example).
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// When keys are missing the app still works — notifications simply no-op. (RSVPs
// no longer depend on email at all; sign-in verifies identity.)
export const emailReady = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

if (emailReady) emailjs.init({ publicKey: PUBLIC_KEY });

const fullName = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'there';

/**
 * Low-level send. Never throws — notifications are best-effort and must never
 * block or break the RSVP / admin action that triggered them. Your EmailJS
 * template should reference these variables: {{to_email}}, {{to_name}},
 * {{subject}}, {{title}}, {{message}}, and set its "To email" to {{to_email}}.
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

/** Sent to every member when a new event is posted. */
export function sendNewEvent(recipient, event) {
  const name = recipient.full_name || 'there';
  return send({
    to_email: recipient.email,
    to_name: name,
    subject: `New event — ${event.title}`,
    title: event.title,
    message: `Hi ${name},\n\nWe just posted a new event: "${event.title}".${whenWhere(event)}\n\nHope to see you there — RSVP on the site!\n\n— The Navigators`,
  });
}

/** Sent to the attendee themselves right after they RSVP. */
export function sendRsvpConfirmed(rsvp, event) {
  const name = fullName(rsvp);
  const guestLine = rsvp.bringing_guests && rsvp.bringing_guests !== 'No, just me' ? `\nGuests: ${rsvp.bringing_guests}` : '';
  return send({
    to_email: rsvp.email,
    to_name: name,
    subject: `You’re going — ${event.title}`,
    title: event.title,
    message: `Hi ${name},\n\nYou’re confirmed for "${event.title}" 🎉${whenWhere(event)}${guestLine}\n\nCan’t make it after all? You can cancel your RSVP anytime on the site.\n\nSee you there!\n\n— The Navigators`,
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
