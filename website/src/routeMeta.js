/* ============================================================================
   ROUTE METADATA — one source of truth for per-page head tags
   ----------------------------------------------------------------------------
   This site is a client-rendered SPA, so before prerendering every route
   served the SAME static <head> from index.html: identical title, the generic
   description, and no canonical at all. Per-page tags only appeared after
   Seo.jsx ran, which some crawlers and every link-preview scraper never see.

   scripts/prerender.mjs reads this table at build time and writes a real
   dist/<route>/index.html with the head already baked. Seo.jsx keeps doing
   the same job for client-side navigation.

   ADDING A ROUTE: add it here AND to public/sitemap.xml (unless noindex).
   Keep `description` between 50 and 160 characters - the prerender script
   fails the build outside that band rather than shipping a bad snippet.
   ========================================================================== */

export const SITE = 'https://easygeez.com'

/** Routes that get a prerendered HTML file. `noindex` pages are skipped by
    crawlers but still benefit from a correct title in the browser tab. */
export const ROUTE_META = Object.freeze({
  '/': {
    title: 'eGeez - the fidel app for families',
    description: 'A joyful app that teaches children the fidel: all 231 letters, offline, with no ads and no child data. One-time $12.99.',
  },
  '/pricing': {
    title: 'Pricing - eGeez',
    description: 'One-time $12.99 with 1 kid profile. More children: $4.99 for a 2nd child, $2.49 for each child after, up to 6. No ads, no subscriptions.',
  },
  '/teachers': {
    title: 'Teach Ge\u2019ez, Tigrinya or Amharic online - eGeez for teachers',
    description: 'Run an online fidel and prayer class for your parish or Sunday school: class codes, homework links, a weekly lesson plan and a printable guide.',
  },
  '/teachers/guide': {
    title: 'Printable teacher guide - eGeez',
    description: 'A printable week-by-week guide for teaching the fidel, words, reading and ጸሎት with reading marks in live video lessons, using eGeez class tools.',
  },
  '/about': {
    title: 'About eGeez - why a church teacher built it',
    description: 'eGeez is built by a church teacher who has taught many deacons, so every child in the diaspora can read the fidel, the prayers and their language.',
  },
  '/privacy': {
    title: 'Privacy - eGeez',
    description: 'What the offline app stores on the device, what the website and accounts collect, and what never leaves your phone. No ads, no child data.',
  },
  '/terms': {
    title: 'Terms of Service - eGeez',
    description: 'The terms for using the eGeez app, website and teacher tools, including store purchases, refunds and the teacher directory.',
  },
})

/** Absolute canonical for a route path. */
export const canonicalFor = (path) => SITE + path
