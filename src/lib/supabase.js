import { createClient, processLock } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// `isConfigured` lets the app degrade gracefully (show seed/demo content)
// instead of crashing when env vars are missing or the project is unreachable.
export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Older builds kept the admin session in localStorage, which survived browser
// restarts — reopening the site dropped you straight back into admin. Clear any
// leftover token so a previous browsing session can't be reused.
try {
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith('sb-') && k.includes('-auth-token'))
    .forEach((k) => window.localStorage.removeItem(k));
} catch { /* storage unavailable — nothing to clean up */ }

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        // Background auto-refresh isn't worth it for us: our sessions are
        // already short-lived by design (sessionStorage, gone on browser
        // close — never meant to survive hours anyway), and the SDK
        // force-signs-out the user whenever a background refresh call fails
        // for *any* reason (see GoTrueClient#_recoverAndRefresh, which calls
        // _removeSession() on a non-retryable refresh error with no retry or
        // recovery path available to us). That's what caused reports of
        // being signed out automatically shortly after a successful Google
        // sign-in. Without auto-refresh, an already-established session is
        // just used as-is from storage until it naturally expires or the
        // browser closes, instead of being torn down by a failed background
        // refresh attempt.
        autoRefreshToken: false,
        // PKCE flow: OAuth returns a short-lived `?code=` that we exchange for a
        // session, instead of the implicit flow's `#access_token=…` sitting in
        // the URL (which leaks via history/referrer). detectSessionInUrl then
        // completes the exchange and strips the code from the address bar.
        flowType: 'pkce',
        detectSessionInUrl: true,
        // sessionStorage (not localStorage): the session dies with the browser
        // session, so closing the browser forces a fresh sign-in. A refresh
        // within the same tab keeps you signed in.
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        // Default lock (navigatorLock) coordinates session reads/refreshes
        // across every tab open to the site via the shared, browser-wide
        // navigator.locks API. That coordination is pointless for us — each
        // tab already has its own isolated sessionStorage above, so there's
        // no cross-tab state to protect — and it was actively harmful: we
        // reproduced the lock getting orphaned (held by a torn-down tab/
        // context and never released), which silently hung every subsequent
        // sign-in check and authenticated request until the whole browser
        // (not just the tab) was closed. processLock scopes the lock to just
        // this tab's in-memory process instead, sidestepping the shared-lock
        // failure mode entirely.
        lock: processLock,
      },
    })
  : null;

// Bucket used for event highlight photos/videos.
export const HIGHLIGHTS_BUCKET = 'highlights';

/**
 * Uploads a file to Supabase Storage and returns its public URL + path.
 * Storing media in object storage (not base64 in Postgres rows) keeps the
 * database small and fast as the site scales.
 */
export async function uploadHighlight(file, eventId) {
  if (!supabase) throw new Error('Backend not configured');
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${eventId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(HIGHLIGHTS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(HIGHLIGHTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removeHighlightFile(path) {
  if (!supabase || !path) return;
  await supabase.storage.from(HIGHLIGHTS_BUCKET).remove([path]);
}

/** Generic image upload (e.g. event covers, leader photos) → returns public URL. */
export async function uploadImage(file, folder = 'misc') {
  if (!supabase) throw new Error('Backend not configured');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(HIGHLIGHTS_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return supabase.storage.from(HIGHLIGHTS_BUCKET).getPublicUrl(path).data.publicUrl;
}
