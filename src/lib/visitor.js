// Anonymous per-browser identity for the community map. We don't make visitors
// log in, so "one pin per person" is really "one pin per browser": a random
// uuid kept in localStorage identifies the visitor, and we remember which pin
// row is theirs so they can update or remove it later. Different browser =
// treated as a new visitor — acceptable because pins aggregate by location.

const VISITOR_KEY = 'nav_visitor_id';
const PIN_KEY = 'nav_pin_id';

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) { id = uuid(); localStorage.setItem(VISITOR_KEY, id); }
    return id;
  } catch {
    return 'anon';
  }
}

export function getMyPinId() {
  try { return localStorage.getItem(PIN_KEY); } catch { return null; }
}

export function setMyPinId(id) {
  try {
    if (id) localStorage.setItem(PIN_KEY, id);
    else localStorage.removeItem(PIN_KEY);
  } catch { /* storage unavailable — pin just won't be remembered */ }
}
