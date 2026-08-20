import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '../context/AdminContext';
import { useToast } from './Toast';
import { formatDate, timeAgo } from '../lib/format';

/**
 * Full-screen, swipeable highlight viewer — the Instagram-reel experience.
 *
 * Vertical paging is native CSS scroll-snap rather than JS drag handling: the
 * browser gives us real touch momentum, rubber-banding and trackpad support for
 * free, and gets it right on devices we'll never test on. We only *observe*
 * which panel is centred (to drive the active index) instead of driving it.
 *
 * Used from both EventCard ("View highlights") and the home page strip, so
 * everything media-related — share, download, admin delete — lives here.
 */
export default function HighlightReel({ highlights, event, startIndex = 0, onClose, onUpload, uploading = false }) {
  const { isAdmin, user, openLogin, removeHighlight, likes, comments, likedByMe, toggleLike, addComment, removeComment } = useAdmin();
  const toast = useToast();

  const [index, setIndex] = useState(startIndex);
  const [view, setView] = useState('reel'); // 'reel' | 'grid'
  const [sheet, setSheet] = useState(false); // comment sheet open
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [burst, setBurst] = useState(null); // highlight id mid heart-animation
  const [muted, setMuted] = useState(true);

  const scroller = useRef(null);
  const panels = useRef([]);
  const videos = useRef({});
  const lastTap = useRef(0);
  // Which panel the reel should land on the next time it's shown — set on open,
  // and again when a grid tile is picked. Held in a ref so restoring position
  // doesn't re-run on every index change as you scroll.
  const jumpTo = useRef(startIndex);

  const active = highlights[index];
  // String compare: highlights.id may be bigint, so ids can arrive as numbers
  // from one table and strings from another (see AdminContext).
  const likesFor = useCallback((id) => likes.filter((l) => String(l.highlight_id) === String(id)).length, [likes]);
  const commentsFor = useCallback((id) => comments.filter((c) => String(c.highlight_id) === String(id)), [comments]);
  const activeComments = active ? commentsFor(active.id) : [];

  // ---- Lock the page behind the overlay ----
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ---- Land on the chosen highlight before the first paint (no visible jump) ----
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || view !== 'reel') return;
    el.scrollTop = jumpTo.current * el.clientHeight;
  }, [view]);

  // ---- Track which panel is centred ----
  useEffect(() => {
    if (view !== 'reel') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setIndex(Number(e.target.dataset.i));
        });
      },
      { root: scroller.current, threshold: 0.6 },
    );
    panels.current.forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, [view, highlights.length]);

  const goTo = useCallback((i) => {
    const el = scroller.current;
    if (!el || i < 0 || i >= highlights.length) return;
    el.scrollTo({ top: i * el.clientHeight, behavior: 'smooth' });
  }, [highlights.length]);

  // ---- Keyboard: arrows page, Esc backs out one layer at a time ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') return sheet ? setSheet(false) : onClose();
      if (sheet || view !== 'reel') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(index + 1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(index - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, sheet, view, goTo, onClose]);

  // ---- Only the centred video plays; the rest stay paused ----
  useEffect(() => {
    Object.entries(videos.current).forEach(([id, el]) => {
      if (!el) return;
      if (active && id === String(active.id) && view === 'reel') el.play().catch(() => {});
      else el.pause();
    });
  }, [index, view, active]);

  // ---- Likes ----
  const like = async (h, { force = false } = {}) => {
    if (!user) return openLogin();
    if (force && likedByMe(h.id)) return; // double-tap only ever likes, never un-likes
    setBurst(h.id);
    setTimeout(() => setBurst((b) => (b === h.id ? null : b)), 700);
    const res = await toggleLike(h.id);
    if (res?.error) toast(res.error, 'error');
  };

  // A double-tap on the media likes it, the way every feed app works. Tracked by
  // timestamp rather than onDoubleClick so touch and mouse behave identically.
  const onMediaTap = (h) => {
    const now = Date.now();
    if (now - lastTap.current < 300) { lastTap.current = 0; like(h, { force: true }); }
    else lastTap.current = now;
  };

  // ---- Comments ----
  const postComment = async (e) => {
    e.preventDefault();
    if (!user) return openLogin();
    setPosting(true);
    const res = await addComment(active.id, draft);
    setPosting(false);
    if (res?.error) return toast(res.error, 'error');
    setDraft('');
  };
  const deleteComment = async (c) => {
    if (!confirm('Delete this comment?')) return;
    const res = await removeComment(c.id);
    if (res?.error) toast(res.error, 'error');
  };

  // ---- Media actions ----
  const share = async (h) => {
    try {
      if (navigator.share) return await navigator.share({ title: `${event?.title || 'Highlight'}`, url: h.url });
      await navigator.clipboard.writeText(h.url);
      toast('Link copied to clipboard', 'success');
    } catch (err) { if (err?.name !== 'AbortError') toast('Couldn’t share — try downloading', 'error'); }
  };
  const download = async (h) => {
    try {
      const blob = await (await fetch(h.url)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = h.path?.split('/').pop() || `highlight.${h.type === 'video' ? 'mp4' : 'jpg'}`;
      a.click(); URL.revokeObjectURL(url);
    } catch { window.open(h.url, '_blank'); }
  };
  const del = async (h) => {
    if (!confirm('Delete this highlight? Its likes and comments go with it.')) return;
    const res = await removeHighlight(h);
    if (res?.error) return toast(res.error, 'error');
    toast('Highlight removed');
    if (highlights.length <= 1) onClose();
  };

  const railBtn = (icon, label, count, onClick, activeState) => (
    <button className={`hr-rail-btn${activeState ? ' is-on' : ''}`} onClick={onClick} title={label} aria-label={label}>
      <span className="hr-rail-ic">{icon}</span>
      {count != null && <span className="hr-rail-n">{count}</span>}
    </button>
  );

  return createPortal(
    <div className="hr-root">
      <style>{`
        .hr-root { position: fixed; inset: 0; z-index: 2400; background: #0b0f0f; color: #fff; display: flex; flex-direction: column; animation: fadeIn .2s ease both; }
        .hr-top { position: absolute; top: 0; left: 0; right: 0; z-index: 30; display: flex; align-items: center; gap: 0.8rem;
          padding: 0.9rem 1rem; background: linear-gradient(to bottom, rgba(0,0,0,0.65), transparent); pointer-events: none; }
        .hr-top > * { pointer-events: auto; }
        .hr-top .hr-title { flex: 1; min-width: 0; }
        .hr-top h3 { font-size: 1rem; color: #fff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hr-top .hr-sub { font-size: 0.75rem; color: rgba(255,255,255,0.7); }
        .hr-icon { width: 40px; height: 40px; flex-shrink: 0; border: none; border-radius: 50%; cursor: pointer;
          background: rgba(255,255,255,0.14); color: #fff; font-size: 1.05rem; display: grid; place-items: center;
          transition: background .2s var(--ease); }
        .hr-icon:hover { background: rgba(255,255,255,0.26); }

        /* Native snap paging — see the component doc comment. */
        .hr-scroll { flex: 1; overflow-y: auto; scroll-snap-type: y mandatory; scrollbar-width: none; overscroll-behavior: contain; }
        .hr-scroll::-webkit-scrollbar { display: none; }
        .hr-panel { position: relative; height: 100%; scroll-snap-align: start; scroll-snap-stop: always;
          display: grid; place-items: center; padding: 0; }
        .hr-media { max-width: 100%; max-height: 100%; object-fit: contain; user-select: none; -webkit-user-select: none; }
        .hr-tapzone { position: absolute; inset: 0; display: grid; place-items: center; cursor: pointer; }

        .hr-burst { position: absolute; font-size: 7rem; pointer-events: none; animation: hrPop .7s var(--ease) both; }
        @keyframes hrPop {
          0% { transform: scale(0.3); opacity: 0; }
          35% { transform: scale(1.15); opacity: 1; }
          70% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        .hr-rail { position: absolute; right: 0.7rem; bottom: 5.5rem; z-index: 20; display: flex; flex-direction: column; gap: 1.1rem; }
        .hr-rail-btn { background: none; border: none; cursor: pointer; color: #fff; display: flex; flex-direction: column;
          align-items: center; gap: 0.25rem; padding: 0; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6)); }
        .hr-rail-ic { width: 46px; height: 46px; border-radius: 50%; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px);
          display: grid; place-items: center; font-size: 1.35rem; transition: transform .2s var(--ease), background .2s var(--ease); }
        .hr-rail-btn:hover .hr-rail-ic { transform: scale(1.08); background: rgba(0,0,0,0.6); }
        .hr-rail-btn.is-on .hr-rail-ic { background: rgba(225,45,75,0.9); }
        .hr-rail-n { font-size: 0.75rem; font-weight: 700; }

        .hr-caption { position: absolute; left: 0; right: 4.5rem; bottom: 0; z-index: 20; padding: 1.2rem 1.2rem 1.6rem;
          background: linear-gradient(to top, rgba(0,0,0,0.75), transparent); }
        .hr-caption .hr-ev { font-family: var(--font-display); font-size: 1.15rem; color: #fff; }
        .hr-caption .hr-meta { font-size: 0.78rem; color: rgba(255,255,255,0.72); margin-top: 0.15rem; }

        .hr-nav { position: absolute; right: 1.3rem; z-index: 20; }
        .hr-nav.up { top: 45%; } .hr-nav.down { top: calc(45% + 52px); }
        @media (hover: none) { .hr-nav { display: none; } }

        .hr-dots { position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); z-index: 20;
          display: flex; flex-direction: column; gap: 5px; }
        .hr-dot { width: 3px; border-radius: 2px; background: rgba(255,255,255,0.3); height: 14px; transition: background .25s, height .25s; }
        .hr-dot.on { background: var(--gold); height: 26px; }
        @media (max-width: 640px) { .hr-dots { display: none; } }

        /* Comment sheet — bottom drawer on phones, right-hand panel on desktop. */
        .hr-sheet { position: absolute; inset: auto 0 0 0; z-index: 40; max-height: 72%; display: flex; flex-direction: column;
          background: var(--paper, #fff); color: var(--text, #222); border-radius: var(--r-lg) var(--r-lg) 0 0;
          animation: hrUp .28s var(--ease) both; }
        @keyframes hrUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (min-width: 900px) {
          .hr-sheet { inset: 0 0 0 auto; width: 380px; max-height: none; border-radius: 0; animation: hrIn .28s var(--ease) both; }
          @keyframes hrIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        }
        .hr-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.2rem;
          border-bottom: 1px solid var(--border); }
        .hr-sheet-head h4 { margin: 0; font-size: 1rem; }
        .hr-sheet-body { flex: 1; overflow-y: auto; padding: 1rem 1.2rem; }
        .hr-c { display: flex; gap: 0.7rem; margin-bottom: 1rem; }
        .hr-av { width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; object-fit: cover; background: var(--teal);
          color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 0.85rem; }
        .hr-c-b { flex: 1; min-width: 0; }
        .hr-c-n { font-size: 0.85rem; font-weight: 700; }
        .hr-c-t { font-size: 0.72rem; color: var(--text-muted); font-weight: 400; margin-left: 0.4rem; }
        .hr-c-x { font-size: 0.9rem; line-height: 1.5; overflow-wrap: anywhere; }
        .hr-c-del { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.75rem; padding: 0.1rem 0.3rem; }
        .hr-c-del:hover { color: var(--danger, #c0392b); }
        .hr-sheet-foot { border-top: 1px solid var(--border); padding: 0.8rem 1rem; display: flex; gap: 0.6rem; }
        .hr-sheet-foot .input { flex: 1; }

        .hr-grid { flex: 1; overflow-y: auto; padding: 4.5rem 1.2rem 2rem; }
        .hr-grid-in { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem;
          max-width: 1000px; margin: 0 auto; }
        .hr-t { position: relative; aspect-ratio: 1; border-radius: var(--r-sm); overflow: hidden; background: #000; cursor: pointer; border: none; padding: 0; }
        .hr-t img, .hr-t video { width: 100%; height: 100%; object-fit: cover; }
        .hr-t-n { position: absolute; left: 6px; bottom: 6px; font-size: 0.72rem; font-weight: 700; color: #fff;
          text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
        .hr-t-tag { position: absolute; right: 6px; top: 6px; font-size: 0.75rem; }
        .hr-up { display: grid; place-items: center; aspect-ratio: 1; border: 2px dashed rgba(255,255,255,0.3);
          border-radius: var(--r-sm); cursor: pointer; color: rgba(255,255,255,0.75); font-size: 0.85rem;
          font-weight: 600; text-align: center; padding: 0.5rem; }
        .hr-empty { text-align: center; color: rgba(255,255,255,0.6); padding: 4rem 1rem; }
      `}</style>

      {/* ---- Top bar ---- */}
      <div className="hr-top">
        <button className="hr-icon" onClick={onClose} aria-label="Close">✕</button>
        <div className="hr-title">
          <h3>{event?.title || 'Highlights'}</h3>
          <div className="hr-sub">
            {view === 'reel' && highlights.length > 0
              ? `${index + 1} of ${highlights.length}`
              : `${highlights.length} photo${highlights.length === 1 ? '' : 's'} & video${highlights.length === 1 ? '' : 's'}`}
          </div>
        </div>
        {isAdmin && view === 'reel' && active && (
          <button className="hr-icon" onClick={() => del(active)} aria-label="Delete highlight" title="Delete">🗑</button>
        )}
        <button className="hr-icon" onClick={() => setView((v) => (v === 'reel' ? 'grid' : 'reel'))} title={view === 'reel' ? 'Grid view' : 'Reel view'} aria-label="Toggle view">
          {view === 'reel' ? '⊞' : '▶'}
        </button>
      </div>

      {/* ---- Reel ---- */}
      {view === 'reel' && (
        <div className="hr-scroll" ref={scroller}>
          {highlights.map((h, i) => {
            // Windowed: mount media only for the centred panel and its immediate
            // neighbours, so a 50-item reel doesn't fetch 50 files on open.
            const near = Math.abs(i - index) <= 1;
            const liked = likedByMe(h.id);
            return (
              <div key={h.id} className="hr-panel" data-i={i} ref={(el) => { panels.current[i] = el; }}>
                {near && (h.type === 'video' ? (
                  <video
                    ref={(el) => { videos.current[h.id] = el; }}
                    className="hr-media" src={h.url} loop playsInline muted={muted} preload="metadata"
                  />
                ) : (
                  <img className="hr-media" src={h.url} alt="Event highlight" loading="lazy" />
                ))}

                <div className="hr-tapzone" onClick={() => { onMediaTap(h); if (h.type === 'video') setMuted((m) => !m); }}>
                  {burst === h.id && <span className="hr-burst">❤️</span>}
                </div>

                <div className="hr-rail">
                  {railBtn(liked ? '❤️' : '🤍', liked ? 'Unlike' : 'Like', likesFor(h.id), () => like(h), liked)}
                  {railBtn('💬', 'Comments', commentsFor(h.id).length, () => { goTo(i); setSheet(true); })}
                  {railBtn('↗', 'Share', null, () => share(h))}
                  {railBtn('⬇', 'Download', null, () => download(h))}
                  {h.type === 'video' && railBtn(muted ? '🔇' : '🔊', muted ? 'Unmute' : 'Mute', null, () => setMuted((m) => !m))}
                </div>

                <div className="hr-caption">
                  <div className="hr-ev">{event?.title}</div>
                  <div className="hr-meta">
                    {event?.date ? formatDate(event.date, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    {h.created_at ? ` · added ${timeAgo(h.created_at)}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
          {highlights.length === 0 && <div className="hr-empty"><p>No highlights yet.</p></div>}
        </div>
      )}

      {/* Desktop paging affordance — touch devices just swipe (hidden via @media). */}
      {view === 'reel' && highlights.length > 1 && (
        <>
          <button className="hr-icon hr-nav up" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous">↑</button>
          <button className="hr-icon hr-nav down" onClick={() => goTo(index + 1)} disabled={index === highlights.length - 1} aria-label="Next">↓</button>
          <div className="hr-dots">
            {highlights.map((h, i) => <div key={h.id} className={`hr-dot${i === index ? ' on' : ''}`} />)}
          </div>
        </>
      )}

      {/* ---- Grid ---- */}
      {view === 'grid' && (
        <div className="hr-grid">
          <div className="hr-grid-in">
            {isAdmin && onUpload && (
              <label className="hr-up">
                {uploading ? 'Uploading…' : '+ Add photo / video'}
                <input type="file" accept="image/*,video/*" hidden onChange={onUpload} />
              </label>
            )}
            {highlights.map((h, i) => (
              <button key={h.id} className="hr-t" onClick={() => { jumpTo.current = i; setIndex(i); setView('reel'); }}>
                {h.type === 'video'
                  ? <video src={h.url} muted playsInline preload="metadata" />
                  : <img src={h.url} alt="Event highlight" loading="lazy" />}
                <span className="hr-t-tag">{h.type === 'video' ? '🎬' : '📷'}</span>
                <span className="hr-t-n">{likedByMe(h.id) ? '❤️' : '🤍'} {likesFor(h.id)}</span>
              </button>
            ))}
          </div>
          {highlights.length === 0 && <div className="hr-empty"><p>No highlights yet{isAdmin ? ' — add the first one above.' : '.'}</p></div>}
        </div>
      )}

      {/* ---- Comment sheet ---- */}
      {sheet && active && (
        <div className="hr-sheet" onMouseDown={(e) => e.stopPropagation()}>
          <div className="hr-sheet-head">
            <h4>{activeComments.length} comment{activeComments.length === 1 ? '' : 's'}</h4>
            <button className="icon-btn" onClick={() => setSheet(false)} aria-label="Close comments">✕</button>
          </div>
          <div className="hr-sheet-body">
            {activeComments.map((c) => (
              <div key={c.id} className="hr-c">
                {c.author_avatar
                  ? <img className="hr-av" src={c.author_avatar} alt="" referrerPolicy="no-referrer" />
                  : <div className="hr-av">{(c.author_name || '?').charAt(0).toUpperCase()}</div>}
                <div className="hr-c-b">
                  <div className="hr-c-n">{c.author_name || 'Member'}<span className="hr-c-t">{timeAgo(c.created_at)}</span></div>
                  <div className="hr-c-x">{c.body}</div>
                </div>
                {(isAdmin || c.user_id === user?.id) && (
                  <button className="hr-c-del" onClick={() => deleteComment(c)} title="Delete comment">✕</button>
                )}
              </div>
            ))}
            {activeComments.length === 0 && (
              <p className="muted center" style={{ padding: '2rem 0', fontSize: '0.9rem' }}>No comments yet — say something nice.</p>
            )}
          </div>
          {user ? (
            <form className="hr-sheet-foot" onSubmit={postComment}>
              <input className="input" placeholder="Add a comment…" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} />
              <button className="btn btn-sm" type="submit" disabled={posting || !draft.trim()}>{posting ? '…' : 'Post'}</button>
            </form>
          ) : (
            <div className="hr-sheet-foot">
              <button className="btn" style={{ width: '100%' }} onClick={openLogin}>Sign in to comment</button>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
