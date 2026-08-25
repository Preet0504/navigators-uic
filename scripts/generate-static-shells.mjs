// Runs after `vite build` (wired as package.json's "postbuild" script).
//
// Link-preview bots (WhatsApp, iMessage, Facebook, Slack) fetch a URL's raw
// HTML and never execute JavaScript — so a title/meta tag set by React after
// mount (src/hooks/useSeo.js) is invisible to them. Since this is a
// client-rendered SPA with no server, the only routes.js runs are ONE
// index.html served for every path (see vercel.json's catch-all rewrite).
//
// This script fixes that without adopting SSR: it copies dist/index.html once
// per known route, swapping in that route's title/description/OG tags, and
// writes each copy to dist/<route>/index.html. Vercel serves a matching
// static file before it falls back to the SPA rewrite, so a bot requesting
// /events gets a shell with real "Events & Meetups" meta tags baked in, while
// a browser gets the exact same JS bundle and becomes the exact same
// interactive app once it mounts — this only changes what's in <head> before
// JS runs, nothing about the app itself.
//
// Only covers the 4 fixed top-level routes, same as sitemap.xml — events
// don't have individual URLs, so there's nothing per-item to generate.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PAGE_SEO, SITE_URL, OG_IMAGE } from '../src/data/seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

function withTag(html, pattern, replacement) {
  if (!pattern.test(html)) {
    console.warn(`  ! pattern not found, skipped: ${pattern}`);
    return html;
  }
  return html.replace(pattern, replacement);
}

function stamp(html, { path: routePath, title, description }) {
  const url = `${SITE_URL}${routePath}`;
  let out = html;
  out = withTag(out, /<title>.*?<\/title>/, `<title>${title}</title>`);
  out = withTag(out, /<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}" />`);
  out = withTag(out, /<link rel="canonical" href=".*?"\s*\/?>/, `<link rel="canonical" href="${url}" />`);
  out = withTag(out, /<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${title}" />`);
  out = withTag(out, /<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${description}" />`);
  out = withTag(out, /<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${url}" />`);
  out = withTag(out, /<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${OG_IMAGE}" />`);
  out = withTag(out, /<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${title}" />`);
  out = withTag(out, /<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${description}" />`);
  return out;
}

async function main() {
  const template = await readFile(path.join(distDir, 'index.html'), 'utf8');

  const routes = Object.values(PAGE_SEO).filter((r) => r.path !== '/'); // home IS dist/index.html already
  for (const route of routes) {
    const outDir = path.join(distDir, route.path.replace(/^\//, ''));
    await mkdir(outDir, { recursive: true });
    const html = stamp(template, route);
    await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
    console.log(`  ✓ dist${route.path}/index.html (${route.title})`);
  }

  console.log(`Generated ${routes.length} static SEO shells.`);
}

main().catch((e) => {
  console.error('generate-static-shells failed:', e);
  process.exit(1);
});
