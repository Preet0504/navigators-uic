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

// The display name every notification shows as its sender, and where replies
// land. EmailJS is client-side and can only send through whichever mailbox is
// connected as the "Service" in the EmailJS dashboard — code here can't change
// the actual From address, only the display name and Reply-To. If the connected
// service isn't tim.bierma@navigators.org's own inbox, replies routing there
// via REPLY_TO is the honest fix; see the schema.sql-adjacent setup notes for
// the dashboard steps to make the From address itself match.
const FROM_NAME = 'Navigators at UIC';
const REPLY_TO = 'tim.bierma@navigators.org';

const fullName = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'there';

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// Builds the "when / where" info card as raw HTML (consumed by the template via
// the triple-brace {{{details_html}}} so it renders as markup, not escaped
// text). Returns '' when the event has neither, so the template shows nothing
// rather than an empty box.
function detailsCardHtml(event) {
  const rows = [];
  if (event.date) rows.push(['When', escapeHtml(formatDate(event.date))]);
  if (event.address) rows.push(['Where', escapeHtml(event.address)]);
  if (!rows.length) return '';
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:6px 0;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#008c95;width:80px;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;font-size:15px;color:#24201e;">${value}</td>
    </tr>`).join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfaf7;border:1px solid #e7e3dc;border-radius:10px;margin:20px 0;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
      </td></tr>
    </table>`;
}

// Gold call-to-action button, matching the site's .btn-gold styling. Table-based
// so it renders correctly in Outlook, which ignores most CSS on <a>/<button>.
function ctaButtonHtml(url, label) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;">
      <tr><td style="border-radius:999px;background:#d19f2a;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#2a2207;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
      </td></tr>
    </table>`;
}

const siteOrigin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://navigators-uic.vercel.app');

/**
 * Low-level send. Never throws — notifications are best-effort and must never
 * block or break the RSVP / admin action that triggered them.
 *
 * Your EmailJS template (Email Templates → your template → Code editor) should
 * be full HTML using these variables:
 *   {{to_name}}        — recipient's first name, for the greeting
 *   {{subject}}         — also set as the template's own Subject field
 *   {{heading}}         — short headline shown at the top of the email body
 *   {{body}}            — the main paragraph (plain text, already escaped)
 *   {{{details_html}}}  — event date/location card (triple braces: raw HTML)
 *   {{{cta_html}}}       — the call-to-action button (triple braces: raw HTML)
 *   {{from_name}}       — "Navigators at UIC", for a footer credit line
 * And in the template's Settings tab (not the body): set "Reply To" to
 * {{reply_to}} and "From Name" to {{from_name}} — see the EMAILJS TEMPLATE
 * comment block below for the full paste-in template + dashboard steps.
 */
async function send(params) {
  if (!emailReady) return { skipped: true };
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, { from_name: FROM_NAME, reply_to: REPLY_TO, ...params });
    return { ok: true };
  } catch (e) {
    console.warn('Email send failed:', e);
    return { error: e?.text || e?.message || 'Email failed' };
  }
}

/** Sent to every member when a new event is posted. */
export function sendNewEvent(recipient, event) {
  const name = recipient.full_name || 'there';
  return send({
    to_email: recipient.email,
    to_name: name,
    subject: `New event — ${event.title}`,
    heading: `A new event just went up 🎉`,
    body: `We just posted "${escapeHtml(event.title)}" — take a look and grab your spot.`,
    details_html: detailsCardHtml(event),
    cta_html: ctaButtonHtml(`${siteOrigin()}/events`, 'View & RSVP'),
  });
}

/** Sent to the attendee themselves right after they RSVP. */
export function sendRsvpConfirmed(rsvp, event) {
  const name = fullName(rsvp);
  const questions = Array.isArray(event.rsvp_questions) ? event.rsvp_questions : [];
  const answers = rsvp.answers || {};
  const answerRows = questions
    .map((q) => (answers[q.id] ? `
      <tr>
        <td style="padding:6px 0;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#008c95;width:auto;vertical-align:top;">${escapeHtml(q.label)}</td>
        <td style="padding:6px 0 6px 14px;font-size:15px;color:#24201e;">${escapeHtml(answers[q.id])}</td>
      </tr>` : null))
    .filter(Boolean);
  const answersHtml = answerRows.length ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfaf7;border:1px solid #e7e3dc;border-radius:10px;margin:14px 0 0;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${answerRows.join('')}</table>
      </td></tr>
    </table>` : '';
  return send({
    to_email: rsvp.email,
    to_name: name,
    subject: `You're going — ${event.title}`,
    heading: `You're confirmed! 🎉`,
    body: `You're all set for "${escapeHtml(event.title)}". We can't wait to see you there.`,
    details_html: detailsCardHtml(event) + answersHtml,
    cta_html: ctaButtonHtml(`${siteOrigin()}/events`, 'View event details'),
  });
}

/** Sent to every attendee when an admin edits the event. */
export function sendEventUpdate(rsvp, event) {
  const name = fullName(rsvp);
  return send({
    to_email: rsvp.email,
    to_name: name,
    subject: `Update — ${event.title}`,
    heading: `Here's what changed`,
    body: `"${escapeHtml(event.title)}" was just updated — here are the latest details.`,
    details_html: detailsCardHtml(event),
    cta_html: ctaButtonHtml(`${siteOrigin()}/events`, 'See updated details'),
  });
}

/** Sent to an attendee when an admin removes their RSVP. */
export function sendRsvpRemoved(rsvp, event) {
  const name = fullName(rsvp);
  return send({
    to_email: rsvp.email,
    to_name: name,
    subject: `RSVP cancelled — ${event.title}`,
    heading: `Your RSVP was cancelled`,
    body: `Your spot for "${escapeHtml(event.title)}" has been cancelled. If this doesn't look right, just RSVP again or reply to this email.`,
    details_html: '',
    cta_html: ctaButtonHtml(`${siteOrigin()}/events`, 'Browse events'),
  });
}

/* ============================================================
   EMAILJS TEMPLATE — paste into EmailJS → Email Templates → your
   template → "Code editor" (the </> icon, not the visual editor).
   Uses only the variables `send()` above supplies, so no other
   code changes are needed if you swap this in.

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ec;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7e3dc;">

      <tr><td style="background:#024247;padding:28px 32px;">
        <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:.01em;">Navigators <span style="color:#d19f2a;font-style:italic;">at UIC</span></span>
      </td></tr>

      <tr><td style="height:4px;background:linear-gradient(90deg,#008c95,#d19f2a);line-height:4px;font-size:0;">&nbsp;</td></tr>

      <tr><td style="padding:36px 32px 8px;">
        <p style="margin:0 0 4px;font-size:14px;color:#6b6560;">Hi {{to_name}},</p>
        <h1 style="margin:4px 0 14px;font-size:22px;line-height:1.3;color:#24201e;font-family:Georgia,'Times New Roman',serif;">{{heading}}</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#24201e;">{{body}}</p>
        {{{details_html}}}
        {{{cta_html}}}
      </td></tr>

      <tr><td style="padding:28px 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e7e3dc;padding-top:20px;">
          <tr><td style="font-size:12px;line-height:1.6;color:#9a938c;">
            {{from_name}} · University of Illinois Chicago<br />
            Questions? Just reply to this email.
          </td></tr>
        </table>
      </td></tr>

    </table>
  </td></tr>
</table>

   ============================================================ */
