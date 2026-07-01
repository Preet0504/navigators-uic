import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isConfigured, uploadHighlight, removeHighlightFile } from '../lib/supabase';
import { SEED_EVENTS, SEED_STUDIES, SEED_LEADERS, SEED_SCORES } from '../data/seed';

const AdminContext = createContext();
export function useAdmin() {
  return useContext(AdminContext);
}

// Tables we read/subscribe to.
const TABLES = {
  events: { setter: 'setEvents', order: { column: 'date', ascending: true }, seed: SEED_EVENTS },
  bible_studies: { setter: 'setStudies', order: { column: 'created_at', ascending: false }, seed: SEED_STUDIES },
  scores: { setter: 'setScores', order: { column: 'created_at', ascending: false }, seed: SEED_SCORES },
  highlights: { setter: 'setHighlights', order: { column: 'created_at', ascending: false }, seed: [] },
  event_rsvps: { setter: 'setRsvps', order: { column: 'created_at', ascending: false }, seed: [] },
  leaders: { setter: 'setLeaders', order: { column: 'sort', ascending: true }, seed: SEED_LEADERS },
};

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [backendOk, setBackendOk] = useState(isConfigured);

  const [events, setEvents] = useState(SEED_EVENTS);
  const [studies, setStudies] = useState(SEED_STUDIES);
  const [scores, setScores] = useState(SEED_SCORES);
  const [highlights, setHighlights] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [leaders, setLeaders] = useState(SEED_LEADERS);

  const setters = useRef({ setEvents, setStudies, setScores, setHighlights, setRsvps, setLeaders });

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
  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(Boolean(data.session));
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAdmin(Boolean(session));
    });
    return () => sub.subscription.unsubscribe();
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
  const logout = useCallback(async () => { if (supabase) await supabase.auth.signOut(); setIsAdmin(false); }, []);

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
  const addRsvp = (rsvp) => write(() => supabase.from('event_rsvps').insert([rsvp]).select());
  const removeRsvp = (id) => write(() => supabase.from('event_rsvps').delete().eq('id', id));

  return (
    <AdminContext.Provider value={{
      isAdmin, authReady, backendOk, login, logout,
      events, addEvent, updateEvent, removeEvent,
      bibleStudies: studies, addStudy, updateStudy, removeStudy,
      leaders, addLeader, updateLeader, removeLeader,
      scores, updateWin, removePlayerScores, removeGameScores,
      highlights, addHighlight, removeHighlight,
      rsvps, addRsvp, removeRsvp,
    }}>
      {children}
    </AdminContext.Provider>
  );
}
