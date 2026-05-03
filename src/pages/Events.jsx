import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(targetDate) - new Date();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        });
      } else {
        setTimeLeft(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', color: '#00D1FF' }}>
      <div style={{ background: 'rgba(0,209,255,0.1)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', flex: 1 }}><b>{timeLeft.days}</b><div style={{ fontSize: '0.6rem' }}>DAYS</div></div>
      <div style={{ background: 'rgba(0,209,255,0.1)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', flex: 1 }}><b>{timeLeft.hours}</b><div style={{ fontSize: '0.6rem' }}>HRS</div></div>
      <div style={{ background: 'rgba(0,209,255,0.1)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', flex: 1 }}><b>{timeLeft.minutes}</b><div style={{ fontSize: '0.6rem' }}>MIN</div></div>
      <div style={{ background: 'rgba(0,209,255,0.1)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', flex: 1 }}><b>{timeLeft.seconds}</b><div style={{ fontSize: '0.6rem' }}>SEC</div></div>
    </div>
  );
};

export default function Events() {
  const { events, addEvent, updateEvent, removeEvent, isAdmin, highlights, addHighlight, removeHighlight, rsvps, addRsvp } = useAdmin();
  const [showAdd, setShowAdd] = useState(false);
  const [editEventId, setEditEventId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewRsvpsEvent, setViewRsvpsEvent] = useState(null);

  const [newEv, setNewEv] = useState({ title: '', date: '', address: '', rsvpUrl: '', description: '', image: '/sample-event.png' });
  const [rsvpModal, setRsvpModal] = useState(null);
  const [rsvpData, setRsvpData] = useState({ firstName: '', lastName: '', birthdate: '', bringingGuests: 'No' });
  const [localRsvps, setLocalRsvps] = useState({});
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'

  useEffect(() => {
    const saved = localStorage.getItem('nav_rsvps');
    if (saved) setLocalRsvps(JSON.parse(saved));
  }, []);

  const handleFileUpload = (eventId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = (ev) => {
      addHighlight(eventId, { type: isVideo ? 'video' : 'dataUrl', dataUrl: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewEv({ ...newEv, image: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  const starsCode = Array.from({ length: 100 }).map((_, i) => `${Math.random() * 99}vw ${Math.random() * 99}vh #FFF`).join(', ');

  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (newEv.title) {
      if (editEventId) {
        updateEvent(editEventId, { ...newEv });
      } else {
        addEvent({ ...newEv });
      }
      handleCancelEdit();
    }
  };

  const handleEditClick = (e, ev) => {
    e.stopPropagation();
    setNewEv(ev);
    setEditEventId(ev.id);
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setShowAdd(false);
    setEditEventId(null);
    setNewEv({ title: '', date: '', address: '', rsvpUrl: '', description: '', image: '/sample-event.png' });
  };

  const handleRsvpSubmit = (e) => {
    e.preventDefault();

    // Save to Database for Admin visibility
    const payload = {
      event_id: rsvpModal.id,
      first_name: rsvpData.firstName,
      last_name: rsvpData.lastName,
      birthdate: rsvpData.birthdate,
      bringing_guests: rsvpData.bringingGuests
    };
    addRsvp(payload);

    // Save locally for User feedback
    const updated = { ...localRsvps, [rsvpModal.id]: true };
    setLocalRsvps(updated);
    localStorage.setItem('nav_rsvps', JSON.stringify(updated));

    setRsvpModal(null);
    setRsvpData({ firstName: '', lastName: '', birthdate: '', bringingGuests: 'No' });
  };

  const exportRsvpsCsv = () => {
    const data = rsvps.filter(r => r.event_id === viewRsvpsEvent.id);
    if (data.length === 0) return alert('No data to export');
    const csv = "First Name,Last Name,Birthdate,Guests\n" + data.map(r => `"${r.first_name}","${r.last_name}","${r.birthdate}","${r.bringing_guests}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${viewRsvpsEvent.title}_RSVPs.csv`);
    a.click();
  };

  return (
    <>
      <style>{`
        .space-bg {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #0B0B1A;
          z-index: -1;
        }
        .stars {
          width: 2px; height: 2px;
          background: transparent;
          box-shadow: ${starsCode};
          animation: twinkle 4s linear infinite;
        }
        @keyframes twinkle {
          50% { opacity: 0.3; }
        }
        .space-container {
          padding: 5rem 2rem 2rem;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          max-width: 1200px;
          margin: 0 auto;
        }
        .space-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
          transition: 0.3s;
          position: relative;
        }
        .space-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.3);
          transform: translateY(-5px);
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .nebula-glow {
          position: absolute;
          width: 200px; height: 200px;
          background: rgba(100, 50, 255, 0.5);
          filter: blur(100px);
          border-radius: 50%;
          top: -100px; left: -100px;
          z-index: 0;
          pointer-events: none;
        }
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 2000;
          display: flex; justify-content: center; align-items: flex-start;
          overflow-y: auto;
          animation: fadeIn 0.3s ease-out forwards;
        }
        .modal-content {
          width: 100%; max-width: 500px;
          min-height: 100vh;
          background: #0B0B1A;
          position: relative;
          padding-bottom: 2rem;
          animation: slideUp 0.4s ease-out forwards;
        }
        .reel-post {
          width: 100%; height: 80vh;
          margin-bottom: 2rem;
          background: #000;
          position: relative;
        }
        .rsvp-form {
          min-height: auto;
          padding: 2rem;
          border-radius: 16px;
          margin-top: 10vh;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .form-input {
          width: 100%; padding: 1rem; background: rgba(0,0,0,0.5); border: 1px solid #555; color: white; margin-bottom: 1rem; border-radius: 8px; font-family: 'Space Grotesk';
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(50px); } to { transform: translateY(0); } }
      `}</style>

      <div className="space-bg"><div className="stars"></div></div>

      <div className="space-container">
        <div style={{ textAlign: 'center', marginBottom: '4rem', position: 'relative' }}>
          <div className="nebula-glow" style={{ top: '0', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px' }}></div>
          <h1 style={{ fontSize: '4rem', fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 20px rgba(255,255,255,0.5)', position: 'relative', zIndex: 1 }}>
            Constellations
          </h1>
          <p style={{ color: '#aaa', fontSize: '1.2rem', letterSpacing: '1px' }}>Events & Meetups in the Cosmos</p>
          {isAdmin && (
            <button onClick={showAdd ? handleCancelEdit : () => setShowAdd(true)} style={{ marginTop: '1rem', background: 'white', color: 'black', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 700 }}>
              {showAdd ? 'CANCEL' : 'ADD NEW STAR'}
            </button>
          )}
        </div>

        {showAdd && isAdmin && (
          <form className="space-card" style={{ padding: '2rem', marginBottom: '3rem' }} onSubmit={handleSaveEvent}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{editEventId ? 'Edit Event' : 'Create New Event'}</h2>
            <input placeholder="Event Constellation Title..." value={newEv.title} onChange={e => setNewEv({ ...newEv, title: e.target.value })} required className="form-input" />
            <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Event Date & Time (Click the calendar icon)</label>
            <input type="datetime-local" value={newEv.date} onChange={e => setNewEv({ ...newEv, date: e.target.value })} required className="form-input" />
            <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Event Cover Image (Optional)</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="form-input" />
            <input placeholder="Event Address (For Maps Location)" value={newEv.address || ''} onChange={e => setNewEv({ ...newEv, address: e.target.value })} className="form-input" />
            <input placeholder="Custom RSVP URL (Optional e.g. Google Form link)" value={newEv.rsvpUrl || ''} onChange={e => setNewEv({ ...newEv, rsvpUrl: e.target.value })} className="form-input" />
            <textarea placeholder="Description of the coordinates..." value={newEv.description} onChange={e => setNewEv({ ...newEv, description: e.target.value })} className="form-input" style={{ minHeight: '100px' }} />
            <button type="submit" style={{ background: 'white', color: 'black', padding: '1rem 2rem', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              {editEventId ? 'SAVE CHANGES' : 'IGNITE EVENT'}
            </button>
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <button
            onClick={() => setActiveTab('upcoming')}
            style={{ background: 'transparent', color: activeTab === 'upcoming' ? '#00D1FF' : 'white', border: 'none', borderBottom: activeTab === 'upcoming' ? '3px solid #00D1FF' : '3px solid transparent', padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
            UPCOMING EVENTS
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            style={{ background: 'transparent', color: activeTab === 'completed' ? '#00D1FF' : 'white', border: 'none', borderBottom: activeTab === 'completed' ? '3px solid #00D1FF' : '3px solid transparent', padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
            COMPLETED EVENTS
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {events.filter((ev) => {
            const eventDate = new Date(ev.date);
            const isUpcoming = isNaN(eventDate.getTime()) ? true : eventDate > new Date();
            return activeTab === 'upcoming' ? isUpcoming : !isUpcoming;
          }).map((ev) => {
            const eventDate = new Date(ev.date);
            const isUpcoming = isNaN(eventDate.getTime()) ? true : eventDate > new Date();

            return (
              <div key={ev.id} className="space-card" onClick={() => { if (!isUpcoming) setSelectedEvent(ev); }} style={{ cursor: isUpcoming ? 'default' : 'pointer' }}>
                {isAdmin && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
                    <button onClick={(e) => { e.stopPropagation(); setViewRsvpsEvent(ev); }} style={{ background: 'rgba(0,209,255,0.8)', border: 'none', color: 'black', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}>👀 RSVPs</button>
                    <button onClick={(e) => handleEditClick(e, ev)} style={{ background: 'rgba(255,165,0,0.8)', border: 'none', color: 'black', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}>✏️ Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); removeEvent(ev.id); }} style={{ background: 'rgba(255,0,0,0.5)', border: 'none', color: 'white', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}>✖ Del</button>
                  </div>
                )}
                <img src={ev.image} style={{ width: '100%', height: '200px', objectFit: 'cover', opacity: 0.8 }} alt={ev.title} />
                <div style={{ padding: '2rem', position: 'relative' }}>
                  {ev.address && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noreferrer"
                      style={{ color: '#FF9040', fontSize: '0.9rem', display: 'inline-block', marginBottom: '0.5rem', fontWeight: 'bold' }}
                      onClick={e => e.stopPropagation()}>
                      📍 Map: {ev.address}
                    </a>
                  )}

                  <div style={{ color: '#00D1FF', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    {isNaN(eventDate.getTime()) ? ev.date : eventDate.toLocaleString()}
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 400 }}>{ev.title}</h2>
                  <p style={{ color: '#aaa', lineHeight: 1.6, fontSize: '0.9rem' }}>{ev.description}</p>

                  {isUpcoming ? (
                    <>
                      <Countdown targetDate={ev.date} />
                      {localRsvps[ev.id] ? (
                        <div style={{ marginTop: '1.5rem', background: 'rgba(89, 165, 51, 0.2)', color: '#59A533', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                          ✓ YOU ARE RSVP'd
                        </div>
                      ) : (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          if (ev.rsvpUrl) window.open(ev.rsvpUrl, '_blank');
                          else setRsvpModal(ev);
                        }} style={{ marginTop: '1.5rem', width: '100%', background: '#00D1FF', color: 'black', padding: '0.8rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px' }}>
                          RSVP NOW
                        </button>
                      )}
                    </>
                  ) : (
                    <div style={{ marginTop: '1.5rem', color: '#888', fontStyle: 'italic', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                      ▶ Event Complete. Click to view Highlights.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {events.length === 0 && <p>No constellations discovered.</p>}
        </div>
      </div>

      {/* Internal RSVP Modal */}
      {rsvpModal && (
        <div className="modal-overlay" onClick={() => setRsvpModal(null)}>
          <form className="modal-content rsvp-form" onClick={e => e.stopPropagation()} onSubmit={handleRsvpSubmit} style={{ maxWidth: '400px' }}>
            <h2 style={{ color: 'white', marginBottom: '2rem', fontFamily: "'Space Grotesk'", fontSize: '1.8rem' }}>RSVP: {rsvpModal.title}</h2>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <input placeholder="First Name" required value={rsvpData.firstName} onChange={e => setRsvpData({ ...rsvpData, firstName: e.target.value })} className="form-input" style={{ flex: 1 }} />
              <input placeholder="Last Name" required value={rsvpData.lastName} onChange={e => setRsvpData({ ...rsvpData, lastName: e.target.value })} className="form-input" style={{ flex: 1 }} />
            </div>

            <label style={{ color: '#aaa', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Birthdate</label>
            <input type="date" required value={rsvpData.birthdate} onChange={e => setRsvpData({ ...rsvpData, birthdate: e.target.value })} className="form-input" />

            <label style={{ color: '#aaa', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Is anyone else coming with you?</label>
            <select value={rsvpData.bringingGuests} onChange={e => setRsvpData({ ...rsvpData, bringingGuests: e.target.value })} className="form-input" style={{ appearance: 'auto' }}>
              <option>No, just me</option>
              <option>Yes, 1 guest</option>
              <option>Yes, 2 guests</option>
              <option>Yes, 3+ guests</option>
            </select>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setRsvpModal(null)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #555', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ flex: 2, padding: '1rem', background: '#00D1FF', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Confirm RSVP</button>
            </div>
          </form>
        </div>
      )}

      {/* Admin View RSVPs Modal */}
      {viewRsvpsEvent && (
        <div className="modal-overlay" onClick={() => setViewRsvpsEvent(null)}>
          <div className="modal-content rsvp-form" onClick={e => e.stopPropagation()} style={{ padding: '2rem', maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'white', margin: 0, fontFamily: "'Space Grotesk'" }}>RSVPs: {viewRsvpsEvent.title}</h2>
              <button onClick={() => setViewRsvpsEvent(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto', maxHeight: '50vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', color: 'white', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ padding: '0.5rem', fontWeight: 'bold' }}>First Name</th>
                    <th style={{ padding: '0.5rem', fontWeight: 'bold' }}>Last Name</th>
                    <th style={{ padding: '0.5rem', fontWeight: 'bold' }}>Birthdate</th>
                    <th style={{ padding: '0.5rem', fontWeight: 'bold' }}>Guests</th>
                  </tr>
                </thead>
                <tbody>
                  {rsvps.filter(r => r.event_id === viewRsvpsEvent.id).map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem' }}>{r.first_name}</td>
                      <td style={{ padding: '0.5rem' }}>{r.last_name}</td>
                      <td style={{ padding: '0.5rem', color: '#aaa' }}>{r.birthdate}</td>
                      <td style={{ padding: '0.5rem' }}>{r.bringing_guests}</td>
                    </tr>
                  ))}
                  {rsvps.filter(r => r.event_id === viewRsvpsEvent.id).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>No one has RSVP'd yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={exportRsvpsCsv} style={{ padding: '0.8rem 1.5rem', background: '#00D1FF', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                ⬇ Export to CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Highlights Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'sticky', top: 0, background: 'rgba(11, 11, 26, 0.9)', backdropFilter: 'blur(10px)', padding: '1rem 2rem', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'white', fontFamily: "'Space Grotesk', sans-serif" }}>
                {selectedEvent.title} REELS
              </h2>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
            </div>

            <div style={{ padding: '1rem', fontFamily: "'Space Grotesk', sans-serif" }}>
              {isAdmin && (
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                  <label style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '1rem 2rem', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px', fontSize: '1rem', display: 'block', color: 'white', transition: '0.2s' }}>
                    + Upload Reel/Post
                    <input type="file" accept="image/*,video/*" onChange={(e) => handleFileUpload(selectedEvent.id, e)} style={{ display: 'none' }} />
                  </label>
                </div>
              )}

              {highlights && highlights.filter(h => h.eventId === selectedEvent.id).map(h => (
                <div key={h.id} className="reel-post">
                  {isAdmin && (
                    <button onClick={() => removeHighlight(h.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,0,0,0.8)', border: 'none', color: 'white', padding: '0.5rem 0.8rem', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer', zIndex: 10 }}>
                      Delete
                    </button>
                  )}
                  {h.type === 'video' ? (
                    <video src={h.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay loop muted playsInline controls />
                  ) : (
                    <img src={h.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#05050A' }} alt="Highlight" />
                  )}
                </div>
              ))}

              {(!highlights || highlights.filter(h => h.eventId === selectedEvent.id).length === 0) && (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#555' }}>
                  <p style={{ fontSize: '1.2rem' }}>No highlights recorded in this sector yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
