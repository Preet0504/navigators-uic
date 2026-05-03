import React from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

export default function Home() {
  const { events } = useAdmin();
  
  const upcomingEvents = events
    .filter(ev => {
      const d = new Date(ev.date);
      return isNaN(d.getTime()) ? true : d > new Date();
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3); // Display top 3 upcoming events

  return (
    <>
      <style>{`
        .sunset-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(180deg, #1C0A3E 0%, #641E4F 30%, #D84242 60%, #FF9040 100%);
          z-index: -1;
        }
        .sunset-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 6rem 2rem 4rem;
          min-height: 100vh;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
        }
        .sun-orb {
          width: 200px;
          height: 200px;
          background: #FFD272;
          border-radius: 50%;
          box-shadow: 0 0 80px 30px rgba(255, 210, 114, 0.4);
          position: absolute;
          bottom: 5%;
          left: 50%;
          transform: translateX(-50%);
          z-index: -1;
        }
        .sunset-title {
          font-size: clamp(3rem, 8vw, 6rem);
          font-weight: 700;
          letter-spacing: -0.05em;
          margin-bottom: 1rem;
          text-shadow: 0 4px 10px rgba(0,0,0,0.3);
          text-align: center;
        }
        .sunset-subtitle {
          font-size: 1.5rem;
          font-weight: 300;
          opacity: 0.9;
          margin-bottom: 3rem;
          max-width: 600px;
          text-align: center;
        }
        .nav-links {
          display: flex;
          gap: 1rem;
          margin-bottom: 5rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .sunset-btn {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-size: 1.1rem;
          font-weight: 700;
          transition: 0.3s;
          cursor: pointer;
          text-decoration: none;
        }
        .sunset-btn:hover {
          background: white;
          color: #D84242;
          transform: translateY(-2px);
        }
        .upcoming-section {
          width: 100%;
          max-width: 1200px;
        }
        .upcoming-title {
          font-size: 2rem;
          border-bottom: 2px solid rgba(255,255,255,0.2);
          padding-bottom: 0.5rem;
          margin-bottom: 2rem;
        }
        .home-events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }
        .home-event-card {
          background: rgba(0,0,0,0.3);
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          overflow: hidden;
          transition: 0.3s;
          text-decoration: none;
          color: white;
          display: block;
        }
        .home-event-card:hover {
          transform: translateY(-5px);
          background: rgba(0,0,0,0.5);
          border-color: rgba(255,255,255,0.3);
        }
      `}</style>

      <div className="sunset-bg">
        <div className="sun-orb"></div>
      </div>
      
      <div className="sunset-content">
        <h1 className="sunset-title">Find Your People.</h1>
        <p className="sunset-subtitle">
          Experience a culture of community and growth at UIC Navigators. Watching the sun set on the past, leaning into a brand new future.
        </p>
        
        <div className="nav-links">
          <Link to="/events" className="sunset-btn">Events</Link>
          <Link to="/bible-studies" className="sunset-btn">Bible Studies</Link>
          <Link to="/cold-brew" className="sunset-btn">Cold Brew Scoreboard</Link>
          <Link to="/people" className="sunset-btn" style={{ background: 'transparent' }}>Meet the Guild</Link>
        </div>

        <div className="upcoming-section">
          <h2 className="upcoming-title">Upcoming Events</h2>
          <div className="home-events-grid">
            {upcomingEvents.length > 0 ? upcomingEvents.map((ev) => {
              const eventDate = new Date(ev.date);
              return (
                <Link to="/events" key={ev.id} className="home-event-card">
                  <img src={ev.image} alt={ev.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ color: '#FFD272', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      {isNaN(eventDate.getTime()) ? ev.date : eventDate.toLocaleString()}
                    </div>
                    <h3 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem 0' }}>{ev.title}</h3>
                    <p style={{ opacity: 0.8, fontSize: '0.9rem', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ev.description}
                    </p>
                  </div>
                </Link>
              );
            }) : (
              <p style={{ opacity: 0.8 }}>No upcoming events scheduled right now. Check back later!</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
