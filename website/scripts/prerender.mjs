/* ============================================================================
   PRERENDER — bake a real <head> into one HTML file per route
   ----------------------------------------------------------------------------
   Runs after `vite build`. For every route in src/routeMeta.js it copies
   dist/index.html to dist/<route>/index.html with the title, description,
   canonical and Open Graph/Twitter tags already correct in the markup.

   Deliberately NOT a headless browser: the body is still the SPA shell and
   React hydrates it exactly as before. What changes is that a crawler or a
   link-preview scraper - neither of which reliably runs JS - now sees the
   right title and description for the page it actually requested, instead of
   the homepage's.

   Netlify serves dist/pricing/index.html for /pricing before falling through
   to the /* -> /index.html rule in public/_redirects, so deep links keep
   working and client-side navigation is untouched.
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTE_META, SITE } from '../src/routeMeta.js'

const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, '..', 'dist')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Replace a tag if present, otherwise insert it before </head>. */
function upsert(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`)
}

const shell = readFileSync(join(dist, 'index.html'), 'utf8')
const problems = []
let written = 0

for (const [route, meta] of Object.entries(ROUTE_META)) {
  const len = meta.description.length
  if (len < 50 || len > 160) problems.push(`${route}: description is ${len} chars (want 50-160)`)
  if (!meta.title) problems.push(`${route}: no title`)

  const url = SITE + route
  let html = shell
  html = upsert(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
  html = upsert(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(meta.description)}" />`)
  html = upsert(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}" />`)
  html = upsert(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(meta.title)}" />`)
  html = upsert(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(meta.description)}" />`)
  html = upsert(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(url)}" />`)
  html = upsert(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(meta.title)}" />`)
  html = upsert(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(meta.description)}" />`)

  const out = route === '/' ? join(dist, 'index.html') : join(dist, route.slice(1), 'index.html')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html)
  written += 1
}

if (problems.length) {
  console.error('prerender: metadata problems\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log(`prerender: ${written} routes written with baked head tags`)
