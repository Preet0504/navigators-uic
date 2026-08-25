// Single source of truth for page-level SEO, consumed two ways:
//   1. src/hooks/useSeo.js — updates document.title/meta on client-side route
//      changes, so the browser tab and Googlebot's JS-rendered pass are correct.
//   2. scripts/generate-static-shells.mjs (a plain Node script, works because
//      package.json has "type": "module") — bakes the same values into a
//      real static HTML file per route at build time. That part matters
//      because link-preview bots (WhatsApp, iMessage, Facebook, Slack) fetch
//      raw HTML and never execute JavaScript — a title/meta tag set only by
//      React after mount is invisible to them. Googlebot does run JS, but
//      most social share bots don't, so the static shells are what make
//      shared event/page links actually preview correctly.
//
// EDIT ME: set this to your real production domain (custom domain if you have
// one) before these are meaningful — it's used in canonical URLs, Open Graph
// tags, robots.txt's sitemap reference, and sitemap.xml. Everything below
// derives from this one constant.
export const SITE_URL = 'https://navigators-uic.vercel.app';

const OG_IMAGE = `${SITE_URL}/logo-lockup.png`;

export const PAGE_SEO = {
  home: {
    path: '/',
    title: 'Navigators at UIC — Find Your People',
    description: 'A community of students growing in faith and friendship at the University of Illinois Chicago. Events, Bible studies, game nights and community — come as you are.',
  },
  events: {
    path: '/events',
    title: 'Events & Meetups — Navigators at UIC',
    description: 'Bonfires, retreats, and weekly hangs at Navigators at UIC. See what’s coming up and RSVP in seconds.',
  },
  weeklyGathering: {
    path: '/weekly-gathering',
    title: 'Weekly Gathering — Navigators at UIC',
    description: 'Bible studies and Cold Brew game nights, every week at Navigators at UIC. Come to one, come to both.',
  },
  community: {
    path: '/community',
    title: 'Community — Navigators at UIC',
    description: 'See where our people call home, share encouragement on the feedback wall, and connect with the wider Navigators community.',
  },
};

export function absoluteUrl(path) {
  return `${SITE_URL}${path}`;
}

export { OG_IMAGE };
