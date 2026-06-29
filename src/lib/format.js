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

export function formatDay(value) {
  const d = parseDate(value);
  if (!d) return { day: '–', month: '', weekday: typeof value === 'string' ? value : 'TBA' };
  return {
    day: d.getDate(),
    month: d.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleString(undefined, { weekday: 'long' }),
  };
}
