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

export const SITE = 'https://egeez.app'

/** Routes that get a prerendered HTML file. `noindex` pages are skipped by
    crawlers but still benefit from a correct title in the browser tab. */
export const ROUTE_META = Object.freeze({
  '/': {
    title: 'eGeez - Learn Amharic and Tigrinya, guided from anywhere',
    description: 'A joyful app that teaches children the fidel - all 231 letters, offline, with no ads and no child data. Plus teachers who guide from anywhere.',
  },
  '/amharic': {
    title: 'The Amharic journey - eGeez',
    description: 'All 231 fidel taught through play: words, stories, tracing, games, and a daily practice loop. Free for 3 days, then $12.99 once.',
  },
  '/tigrinya': {
    title: 'Tigrinya - eGeez',
    description: 'Tigrinya letters, words and voices for Eritrean families, built with Eritrean educators. Join the waitlist and help decide what comes first.',
  },
  '/alphabet': {
    title: 'The Fidel alphabet chart - all 231 letters - eGeez',
    description: 'The full interactive Amharic fidel chart: 33 consonant families in 7 vowel orders, searchable and printable for the wall or the fridge.',
  },
  '/teachers': {
    title: 'For teachers - eGeez',
    description: 'Teach Amharic or Tigrinya from anywhere: class links, homework assignments with receipts, a term planner, and a TV classroom display.',
  },
  '/homeschool': {
    title: 'Homeschooling with eGeez',
    description: 'A week-by-week homeschool plan for the fidel: what to do together, what the child does alone, and how to tell that it is working.',
  },
  '/pricing': {
    title: 'Pricing - eGeez',
    description: 'Free to download and free for 3 days, then $12.99 once for the whole journey - and never twice. Family Pack add-on $4.99.',
  },
  '/about': {
    title: 'About eGeez',
    description: 'Why we built a fidel app for diaspora families, who Anbessa and Kokeb are, and what we will never do with your child data.',
  },
  '/privacy': {
    title: 'Privacy - eGeez',
    description: 'What the offline app stores on the device, what the website and accounts collect, and what never leaves your phone. No ads, no child data.',
  },
  '/terms': {
    title: 'Terms of Service - eGeez',
    description: 'The terms for using the eGeez app, website and teacher tools, including purchases, unlock codes, refunds and the teacher directory.',
  },
})

/** Absolute canonical for a route path. */
export const canonicalFor = (path) => SITE + path
