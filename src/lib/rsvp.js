// Per-browser memory of the RSVPs made from this device. We store the RSVP's
// token (needed to check status, resend the confirm link, or cancel) plus the
// name/email so a resend can rebuild the email, and sentAt for the 120s clock.
const KEY = 'nav_rsvps';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeAll(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* storage unavailable */ }
}

export function getRsvp(eventId) {
  const v = readAll()[eventId];
  if (!v) return null;
  if (v === true) return { legacy: true }; // old boolean shape (pre-token builds)
  return v;                                 // { token, email, first_name, last_name, sentAt }
}

export function saveRsvp(eventId, data) {
  const map = readAll();
  map[eventId] = data;
  writeAll(map);
}

export function clearRsvp(eventId) {
  const map = readAll();
  delete map[eventId];
  writeAll(map);
}
