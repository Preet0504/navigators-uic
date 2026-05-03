import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AdminContext = createContext();

export function useAdmin() {
  return useContext(AdminContext);
}

// Initial dummy data to display if tables are empty (optional, but keeps the look)
const DUMMY_EVENTS = [
  { title: 'Welcome Bonfire', date: 'Sept 5', description: 'Kick off the semester!', image: '/sample-event.png' },
  { title: 'Fall Retreat', date: 'Oct 12', description: 'Weekend away.', image: '/sample-retreat.png' }
];

const DUMMY_STUDIES = [
  { week: 'Wk 1', topic: 'Who is Jesus?', summary: 'Discussed the context.' }
];

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState([]);
  const [bibleStudies, setBibleStudies] = useState([]);
  const [scores, setScores] = useState([]); 
  const [highlights, setHighlights] = useState([]); 
  const [rsvps, setRsvps] = useState([]); 

  const fetchData = async () => {
    const [resEvents, resStudies, resScores, resHighlights, resRsvps] = await Promise.all([
      supabase.from('events').select('*'),
      supabase.from('bible_studies').select('*'),
      supabase.from('scores').select('*'),
      supabase.from('highlights').select('*'),
      supabase.from('event_rsvps').select('*')
    ]);
    
    // Fallbacks to dummy data if tables are empty, just for looks initially
    setEvents((resEvents.data && resEvents.data.length > 0) ? resEvents.data : DUMMY_EVENTS);
    setBibleStudies((resStudies.data && resStudies.data.length > 0) ? resStudies.data : DUMMY_STUDIES);
    setScores(resScores.data || []);
    setHighlights(resHighlights.data || []);
    setRsvps(resRsvps.data || []);
  };

  useEffect(() => {
    // 1. Fetch initial data
    fetchData();

    // 2. Subscribe to REALTIME changes for all tables
    const channel = supabase
      .channel('nav-hub-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bible_studies' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'highlights' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_rsvps' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Events ---
  const addEvent = async (event) => {
    await supabase.from('events').insert([event]);
  };
  const updateEvent = async (id, updates) => {
    await supabase.from('events').update(updates).eq('id', id);
  };
  const removeEvent = async (id) => {
    await supabase.from('events').delete().eq('id', id);
  };
  
  // --- Bible Studies ---
  const addStudy = async (study) => {
    await supabase.from('bible_studies').insert([study]);
  };
  const removeStudy = async (id) => {
    await supabase.from('bible_studies').delete().eq('id', id);
  };

  // --- Scores ---
  const updateWin = async (name, game, date, delta) => {
    const existing = scores.find(s => s.name.toLowerCase() === name.toLowerCase() && s.game === game && s.date === date);
    
    if (existing) {
      const newScore = existing.score + delta;
      if (newScore <= 0) {
        await supabase.from('scores').delete().eq('id', existing.id);
      } else {
        await supabase.from('scores').update({ score: newScore }).eq('id', existing.id);
      }
    } else if (delta > 0) {
      await supabase.from('scores').insert([{ name, game, date, score: delta }]);
    }
  };
  
  const removeScoreEntry = async (id) => {
    await supabase.from('scores').delete().eq('id', id);
  };
  const removePlayerScores = async (name) => {
    await supabase.from('scores').delete().eq('name', name);
  };
  const removeGameScores = async (game) => {
    await supabase.from('scores').delete().eq('game', game);
  };

  // --- Highlights ---
  const addHighlight = async (eventId, fileInfo) => {
    await supabase.from('highlights').insert([{ eventId, ...fileInfo }]);
  };

  const removeHighlight = async (id) => {
    await supabase.from('highlights').delete().eq('id', id);
  };

  // --- RSVPs ---
  const addRsvp = async (rsvp) => {
    await supabase.from('event_rsvps').insert([rsvp]);
  };

  // --- Auth ---
  const login = (pwd) => {
    if (pwd === 'admin123') { setIsAdmin(true); return true; }
    return false;
  };
  const logout = () => setIsAdmin(false);

  return (
    <AdminContext.Provider value={{
      isAdmin, login, logout,
      events, addEvent, updateEvent, removeEvent,
      bibleStudies, addStudy, removeStudy,
      scores, updateWin, removeScoreEntry, removePlayerScores, removeGameScores,
      highlights, addHighlight, removeHighlight,
      rsvps, addRsvp
    }}>
      {children}
    </AdminContext.Provider>
  );
}
