import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isConfigured, uploadHighlight, removeHighlightFile } from '../lib/supabase';
import { SEED_EVENTS, SEED_STUDIES, SEED_LEADERS, SEED_SCORES, SEED_PINS, SEED_FEEDBACK } from '../data/seed';

const AdminContext = createContext();
export function useAdmin() {
  return useContext(AdminContext);
}

// True only when the session was established with an email+password login (the
// hidden Ctrl+Shift+A admin portal), not Google OAuth. Admin access is gated to
// that portal, so a Google sign-in — even by an allowlisted email — stays a
// regular member. Reads the token's `amr` (auth-method) claim; fails open only
// if the token can't be parsed, so the admin is never locked out.
function loggedInWithPassword(session) {
  try {
    const amr = JSON.parse(atob(session.access_token.split('.')[1]))?.amr;
    if (!Array.isArray(amr) || amr.length === 0) return true;
    return amr.some((m) => m?.method === 'password');
  } catch {
    return true;
  }
}

// Tables we read/subscribe to.
const TABLES = {
  events: { setter: 'setEvents', order: { column: 'date', ascending: true }, seed: SEED_EVENTS },
  bible_studies: { setter: 'setStudies', order: { column: 'created_at', ascending: false }, seed: SEED_STUDIES },
  scores: { setter: 'setScores', order: { column: 'created_at', ascending: false }, seed: SEED_SCORES },
  highlights: { setter: 'setHighlights', order: { column: 'created_at', ascending: false }, seed: [] },
  event_rsvps: { setter: 'setRsvps', order: { column: 'created_at', ascending: false }, seed: [] },
  leaders: { setter: 'setLeaders', order: { column: 'sort', ascending: true }, seed: SEED_LEADERS },
  map_pins: { setter: 'setPins', order: { column: 'created_at', ascending: false }, seed: SEED_PINS },
  feedback: { setter: 'setFeedback', order: { column: 'created_at', ascending: false }, seed: SEED_FEEDBACK },
};

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null); // the signed-in member (or admin), or null
  const [loginOpen, setLoginOpen] = useState(false); // member sign-in modal
  const [authReady, setAuthReady] = useState(false);
  const [backendOk, setBackendOk] = useState(isConfigured);

  const [events, setEvents] = useState(SEED_EVENTS);
  const [studies, setStudies] = useState(SEED_STUDIES);
  const [scores, setScores] = useState(SEED_SCORES);
  const [highlights, setHighlights] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [leaders, setLeaders] = useState(SEED_LEADERS);
  const [pins, setPins] = useState(SEED_PINS);
  const [feedback, setFeedback] = useState(SEED_FEEDBACK);

  const setters = useRef({ setEvents, setStudies, setScores, setHighlights, setRsvps, setLeaders, setPins, setFeedback });

  // ---- Fetch a single table, falling back to seed on error ----
  const fetchTable = useCallback(async (name) => {
    const cfg = TABLES[name];
    if (!supabase) {
      setters.current[cfg.setter](cfg.seed);
      return;
    }
    const { data, error } = await supabase.from(name).select('*').order(cfg.order.column, { ascending: cfg.order.ascending });
    if (error) {
      // Unreachable / not provisioned → show seed so the site still looks alive.
      setBackendOk(false);
      setters.current[cfg.setter](cfg.seed);
      return;
    }
    // Connected: always use real data (even when empty). Seed/demo content is
    // NEVER shown against a live backend, so its fake ids can't reach the DB.
    setBackendOk(true);
    setters.current[cfg.setter](data);
  }, []);

  const fetchAll = useCallback(() => Promise.all(Object.keys(TABLES).map(fetchTable)), [fetchTable]);

  // ---- Auth session ----
  // Anyone can sign in (members via Google, to RSVP). Admin is NO LONGER "has a
  // session" — it's decided by the public.is_admin() allowlist check. We also
  // mirror the signed-in user into public.profiles so admins can email members.
  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active = true;
    const apply = async (session) => {
      if (!active) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) setLoginOpen(false); // close the sign-in modal once signed in
      if (u) {
        supabase.from('profiles')
          .upsert({ id: u.id, email: u.email, full_name: u.user_metadata?.full_name || u.user_metadata?.name || null })
          .then(() => {}, () => {}); // best-effort
        const { data } = await supabase.rpc('is_admin');
        // Allowlisted AND signed in via the password portal (not Google).
        if (active) setIsAdmin(Boolean(data) && loggedInWithPassword(session));
      } else {
        setIsAdmin(false);
      }
      if (active) setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // ---- Initial load + realtime ----
  useEffect(() => {
    fetchAll();
    if (!supabase) return;
    const channel = supabase.channel('nav-hub');
    Object.keys(TABLES).forEach((name) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: name }, () => fetchTable(name));
    });
    channel.subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchAll, fetchTable]);

  // event_rsvps is RLS-filtered per user (a member sees only their own rows,
  // an admin sees all), and the initial load can run before the session has
  // restored — so refetch it whenever the signed-in user changes.
  useEffect(() => {
    if (supabase && authReady) fetchTable('event_rsvps');
  }, [user?.id, isAdmin, authReady, fetchTable]);

  // ---- Write helper: guards missing backend + surfaces errors ----
  const write = useCallback(async (fn) => {
    if (!supabase) return { error: 'Backend not configured. Connect Supabase to save changes.' };
    try {
      const { error } = await fn();
      if (error) return { error: error.message };
      return { ok: true };
    } catch (e) {
      return { error: e.message || 'Something went wrong' };
    }
  }, []);

  // ---- Auth actions ----
  const login = useCallback(async (email, password) => {
    if (!supabase) return { error: 'Backend not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message };
    return { ok: true };
  }, []);
  const logout = useCallback(async () => {
    // Clear local state first so the UI signs out instantly and never hangs on
    // a network call. `scope: 'local'` drops the stored session without a server
    // round-trip — avoiding a token-revocation race where an in-flight read uses
    // the just-revoked token, 401s, and drops the app into its seed fallback.
    setIsAdmin(false);
    setUser(null);
    try {
      if (supabase) await supabase.auth.signOut({ scope: 'local' });
    } catch { /* already cleared locally */ }
    fetchAll(); // reload public data as an anonymous visitor (real content, not seed)
  }, [fetchAll]);

  // Members sign in with Google to RSVP. Redirects back to the current page;
  // add this origin to Supabase → Authentication → URL Configuration.
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: 'Backend not configured' };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    if (error) return { error: error.message };
    return { ok: true };
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  // Admin-only: email addresses of everyone who has signed in (for event blasts).
  const listMemberEmails = useCallback(async () => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('profiles').select('email, full_name');
    if (error) return [];
    return (data || []).filter((p) => p.email);
  }, []);

  // ---- Events ----
  const addEvent = (event) => write(() => supabase.from('events').insert([event]).select());
  const updateEvent = (id, updates) => write(() => supabase.from('events').update(updates).eq('id', id));
  const removeEvent = (id) => write(() => supabase.from('events').delete().eq('id', id));

  // ---- Bible studies ----
  const addStudy = (study) => write(() => supabase.from('bible_studies').insert([study]).select());
  const updateStudy = (id, updates) => write(() => supabase.from('bible_studies').update(updates).eq('id', id));
  const removeStudy = (id) => write(() => supabase.from('bible_studies').delete().eq('id', id));

  // ---- Leaders ----
  const addLeader = (leader) => write(() => supabase.from('leaders').insert([leader]).select());
  const updateLeader = (id, updates) => write(() => supabase.from('leaders').update(updates).eq('id', id));
  const removeLeader = (id) => write(() => supabase.from('leaders').delete().eq('id', id));

  // ---- Scores ----
  const updateWin = async (name, game, date, delta) => {
    const existing = scores.find((s) => s.name.toLowerCase() === name.toLowerCase() && s.game === game && s.date === date);
    if (existing && !existing._seed) {
      const newScore = existing.score + delta;
      if (newScore <= 0) return write(() => supabase.from('scores').delete().eq('id', existing.id));
      return write(() => supabase.from('scores').update({ score: newScore }).eq('id', existing.id));
    }
    if (delta > 0) return write(() => supabase.from('scores').insert([{ name, game, date, score: delta }]).select());
    return { ok: true };
  };
  const removePlayerScores = (name) => write(() => supabase.from('scores').delete().eq('name', name));
  const removeGameScores = (game) => write(() => supabase.from('scores').delete().eq('game', game));

  // ---- Highlights (stored in Supabase Storage) ----
  const addHighlight = async (eventId, file) => {
    if (!supabase) return { error: 'Backend not configured' };
    try {
      const isVideo = file.type.startsWith('video/');
      const { url, path } = await uploadHighlight(file, eventId);
      return write(() => supabase.from('highlights').insert([{ event_id: eventId, type: isVideo ? 'video' : 'image', url, path }]).select());
    } catch (e) {
      return { error: e.message || 'Upload failed' };
    }
  };
  const removeHighlight = async (h) => {
    await removeHighlightFile(h.path);
    return write(() => supabase.from('highlights').delete().eq('id', h.id));
  };

  // ---- RSVPs ----
  // No .select() here: anon users can't read back the row they insert (RLS lets
  // the public insert but not read event_rsvps), and requesting the row back
  // makes the insert fail with "new row violates row-level security policy".
  const addRsvp = (rsvp) => write(() => supabase.from('event_rsvps').insert([rsvp]));
  const removeRsvp = (id) => write(() => supabase.from('event_rsvps').delete().eq('id', id));
  // Admin can manually confirm a pending RSVP (useful while confirmation emails
  // aren't being delivered).
  const confirmRsvp = (id) => write(() => supabase.from('event_rsvps').update({ status: 'confirmed' }).eq('id', id));
  // A member cancels their own RSVP for an event (RLS lets them delete only
  // rows where user_id = auth.uid()). Keyed by event so we don't need the row id.
  const cancelOwnRsvp = (eventId) => {
    if (!user) return Promise.resolve({ error: 'Not signed in' });
    return write(() => supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', user.id));
  };

  // ---- Map pins (anonymous, one per browser via visitor_id) ----
  // addPin returns the inserted row so the page can remember its id locally.
  const addPin = async (pin) => {
    if (!supabase) return { error: 'Backend not configured. Connect Supabase to drop a pin.' };
    try {
      const { data, error } = await supabase.from('map_pins').insert([pin]).select().single();
      if (error) return { error: error.message };
      return { ok: true, data };
    } catch (e) { return { error: e.message || 'Something went wrong' }; }
  };
  const updatePin = (id, updates) => write(() => supabase.from('map_pins').update(updates).eq('id', id));
  // A visitor may only remove a pin that matches their own visitor_id.
  const removePin = (id, visitorId) => write(() => supabase.from('map_pins').delete().eq('id', id).eq('visitor_id', visitorId));
  // Admin override: remove any pin.
  const removeAnyPin = (id) => write(() => supabase.from('map_pins').delete().eq('id', id));

  // ---- Feedback (public submits → admin approves/rejects) ----
  // No .select(): the public read policy only exposes approved rows, so trying
  // to read back the just-inserted pending row fails RLS. We don't need it back.
  const addFeedback = (fb) => write(() => supabase.from('feedback').insert([{ ...fb, status: 'pending' }]));
  const approveFeedback = (id) => write(() => supabase.from('feedback').update({ status: 'approved' }).eq('id', id));
  const rejectFeedback = (id) => write(() => supabase.from('feedback').delete().eq('id', id));

  return (
    <AdminContext.Provider value={{
      isAdmin, user, authReady, backendOk, login, logout, signInWithGoogle, listMemberEmails,
      loginOpen, openLogin, closeLogin,
      events, addEvent, updateEvent, removeEvent,
      bibleStudies: studies, addStudy, updateStudy, removeStudy,
      leaders, addLeader, updateLeader, removeLeader,
      scores, updateWin, removePlayerScores, removeGameScores,
      highlights, addHighlight, removeHighlight,
      rsvps, addRsvp, removeRsvp, confirmRsvp, cancelOwnRsvp,
      pins, addPin, updatePin, removePin, removeAnyPin,
      feedback, addFeedback, approveFeedback, rejectFeedback,
    }}>
      {children}
    </AdminContext.Provider>
  );
}
