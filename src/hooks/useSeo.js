import { useEffect } from 'react';
import { SITE_URL, OG_IMAGE, absoluteUrl } from '../data/seo';

const setMeta = (selector, attr, value) => {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
};

/**
 * Sets document.title + meta description/canonical/OG tags for the current
 * page. Handles two audiences differently:
 *   - Users navigating client-side (no full page reload) and Googlebot's
 *     JS-rendering pass both see this run and get the right title/meta.
 *   - Link-preview bots (WhatsApp, iMessage, Facebook) do NOT run this — they
 *     fetch raw HTML and never execute JS. Those are served correctly by the
 *     per-route static HTML shells generated at build time (see
 *     scripts/generate-static-shells.mjs), which bake in the same values
 *     from src/data/seo.js. This hook and that script must stay in sync,
 *     which is why they both read from that one shared file.
 */
export function useSeo({ path, title, description }) {
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', absoluteUrl(path));
    setMeta('meta[property="og:image"]', 'content', OG_IMAGE);
    setMeta('link[rel="canonical"]', 'href', absoluteUrl(path));
  }, [path, title, description]);
}

export { SITE_URL };
