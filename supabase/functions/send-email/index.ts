// Supabase Edge Function: send-email
// -----------------------------------------------------------------------------
// Sends transactional email through Resend (https://resend.com) server-side, so
// the API key never touches the browser and there are no client-origin limits
// (the problem that made EmailJS unusable on the free plan).
//
// Deploy from the Supabase dashboard: Edge Functions → Deploy a new function →
// name it "send-email" → paste this file. Then add two secrets
// (Edge Functions → Manage secrets, or `supabase secrets set`):
//   RESEND_API_KEY   — from https://resend.com/api-keys
//   RESEND_FROM      — e.g. "Navigators at UIC <hello@your-domain.org>"
//                      (must be a domain you've verified in Resend; until you
//                       verify one, Resend only delivers to your own account
//                       email via the default onboarding@resend.dev sender)
//
// The browser calls it with the project's anon key, so leave "Verify JWT" on.
// -----------------------------------------------------------------------------

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') || 'Navigators at UIC <onboarding@resend.dev>';
  if (!apiKey) return json({ error: 'RESEND_API_KEY is not set' }, 500);

  let payload: { to_email?: string; to_name?: string; subject?: string; message?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { to_email, subject, message } = payload;
  if (!to_email || !subject || !message) return json({ error: 'Missing to_email, subject, or message' }, 400);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      // Plain-text body: email clients auto-linkify URLs (the confirm link), and
      // it sidesteps HTML-escaping concerns for user-supplied names.
      body: JSON.stringify({ from, to: [to_email], subject, text: message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: data?.message || `Resend responded ${res.status}` }, 502);
    return json({ ok: true, id: data?.id });
  } catch (e) {
    return json({ error: (e as Error)?.message || 'Send failed' }, 500);
  }
});
