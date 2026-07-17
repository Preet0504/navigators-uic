import { useEffect, useRef } from 'react';

/**
 * Adds the `in` class to elements with the `reveal` class. Anything already in
 * or above the viewport is revealed immediately (so nothing is ever stuck at
 * opacity:0 if a scroll event never comes); elements below the fold reveal as
 * they scroll into view. Respects prefers-reduced-motion (handled in CSS).
 *
 * Pass a dep that changes when the observed content changes (e.g. the list of
 * ids, not just its length) so cards that mount later — async data replacing
 * seed, tab switches — get picked up instead of staying invisible.
 */
export function useReveal(deps = []) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const els = [...root.querySelectorAll('.reveal:not(.in)')];
    if (els.length === 0) return;

    const reveal = (el) => el.classList.add('in');

    if (!('IntersectionObserver' in window)) {
      els.forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) reveal(el);
      else io.observe(el);
    });

    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
