import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useReveal } from '../hooks/useReveal';
import { isUpcoming, parseDate, formatDate } from '../lib/format';
import HighlightReel from './HighlightReel';

const sameEvent = (h, ev) => String(h.event_id) === String(ev.id);

/**
 * Home-page recap: a swipeable film-strip of the most recent past event that
 * actually has media, opening into the same full-screen reel as the event card.
 * Renders nothing when no past event has highlights, so there's no empty state
 * to design around on a fresh install.
 */
export default function LatestHighlights() {
  const { events, highlights, likes, likedByMe } = useAdmin();
  const [openAt, setOpenAt] = useState(null); // index the reel opens on, or null
  const strip = useRef(null);

  const event = useMemo(() => events
    .filter((e) => !isUpcoming(e.date))
    .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0))
    .find((e) => highlights.some((h) => sameEvent(h, e))), [events, highlights]);

  const items = useMemo(() => (event ? highlights.filter((h) => sameEvent(h, event)) : []), [event, highlights]);

  // Own reveal observer rather than leaning on Home's: highlights usually land
  // after events do, so this section mounts once Home's effect has already run.
  const ref = useReveal([items.map((h) => h.id).join(',')]);

  if (!event || items.length === 0) return null;

  const likesFor = (id) => likes.filter((l) => String(l.highlight_id) === String(id)).length;
  const nudge = (dir) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className="section container" ref={ref}>
      <style>{`
        .lh-head { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.4rem; }
        .lh-strip-wrap { position: relative; }
        .lh-strip { display: flex; gap: 0.8rem; overflow-x: auto; scroll-snap-type: x mandatory; padding: 0.3rem 0 1rem;
          scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .lh-strip::-webkit-scrollbar { display: none; }
        .lh-tile { position: relative; flex: 0 0 auto; width: clamp(150px, 34vw, 210px); aspect-ratio: 4 / 5;
          scroll-snap-align: start; border: none; padding: 0; border-radius: var(--r-md); overflow: hidden;
          background: #000; cursor: pointer; box-shadow: var(--shadow-sm);
          transition: transform .3s var(--ease), box-shadow .3s var(--ease); }
        .lh-tile:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); }
        .lh-tile img, .lh-tile video { width: 100%; height: 100%; object-fit: cover; }
        .lh-tile .lh-scrim { position: absolute; inset: auto 0 0 0; height: 45%;
          background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); pointer-events: none; }
        .lh-tile .lh-likes { position: absolute; left: 8px; bottom: 8px; font-size: 0.78rem; font-weight: 700; color: #fff;
          display: flex; align-items: center; gap: 0.25rem; text-shadow: 0 1px 4px rgba(0,0,0,0.7); }
        .lh-tile .lh-kind { position: absolute; right: 8px; top: 8px; font-size: 0.8rem;
          filter: drop-shadow(0 1px 3px rgba(0,0,0,0.7)); }
        .lh-more { display: grid; place-items: center; flex: 0 0 auto; width: clamp(150px, 34vw, 210px); aspect-ratio: 4 / 5;
          scroll-snap-align: start; border: 2px dashed var(--border); border-radius: var(--r-md); background: var(--paper);
          cursor: pointer; color: var(--teal); font-weight: 700; font-size: 0.95rem; }
        .lh-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 5; width: 40px; height: 40px;
          border-radius: 50%; border: 1px solid var(--border); background: #fff; box-shadow: var(--shadow-md);
          cursor: pointer; font-size: 1rem; color: var(--ink); }
        .lh-arrow.l { left: -14px; } .lh-arrow.r { right: -14px; }
        @media (hover: none) { .lh-arrow { display: none; } }
      `}</style>

      <div className="lh-head reveal">
        <div>
          <span className="eyebrow">Last time</span>
          <h2 className="section-title">Highlights from {event.title}</h2>
          <p className="muted" style={{ fontSize: '0.9rem', marginTop: '0.3rem' }}>
            {formatDate(event.date, { month: 'long', day: 'numeric', year: 'numeric' })} · {items.length} photo{items.length === 1 ? '' : 's'} &amp; video{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link to="/events" className="btn btn-ghost btn-sm">Browse past events</Link>
      </div>

      <div className="lh-strip-wrap reveal">
        {items.length > 2 && (
          <>
            <button className="lh-arrow l" onClick={() => nudge(-1)} aria-label="Scroll left">‹</button>
            <button className="lh-arrow r" onClick={() => nudge(1)} aria-label="Scroll right">›</button>
          </>
        )}
        <div className="lh-strip" ref={strip}>
          {items.map((h, i) => (
            <button key={h.id} className="lh-tile" onClick={() => setOpenAt(i)} aria-label={`Open highlight ${i + 1}`}>
              {h.type === 'video'
                ? <video src={h.url} muted playsInline preload="metadata" />
                : <img src={h.url} alt="" loading="lazy" />}
              <span className="lh-scrim" />
              <span className="lh-kind">{h.type === 'video' ? '🎬' : '📷'}</span>
              <span className="lh-likes">{likedByMe(h.id) ? '❤️' : '🤍'} {likesFor(h.id)}</span>
            </button>
          ))}
          <button className="lh-more" onClick={() => setOpenAt(0)}>View all {items.length} →</button>
        </div>
      </div>

      {openAt !== null && (
        <HighlightReel highlights={items} event={event} startIndex={openAt} onClose={() => setOpenAt(null)} />
      )}
    </section>
  );
}
