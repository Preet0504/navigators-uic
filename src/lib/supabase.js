import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// `isConfigured` lets the app degrade gracefully (show seed/demo content)
// instead of crashing when env vars are missing or the project is unreachable.
export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
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
