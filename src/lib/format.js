// Shared date helpers. Event dates may be ISO strings or free-text (legacy),
// so every helper degrades gracefully.

export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function isUpcoming(value) {
  const d = parseDate(value);
  return d ? d.getTime() > Date.now() : true; // unknown dates treated as upcoming
}

export function formatDate(value, opts) {
  const d = parseDate(value);
  if (!d) return typeof value === 'string' ? value : 'TBA';
  return d.toLocaleString(undefined, opts || { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Compact relative time for feed-style timestamps ("just now", "4h", "3d").
// Falls back to an absolute date past a week, where "52w" stops being useful.
export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return '';
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDay(value) {
  const d = parseDate(value);
  if (!d) return { day: '–', month: '', weekday: typeof value === 'string' ? value : 'TBA' };
  return {
    day: d.getDate(),
    month: d.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleString(undefined, { weekday: 'long' }),
  };
}
