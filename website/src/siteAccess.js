/* What easygeez.com still publishes.
   The phone app is the product. The public site is the landing, the store
   price, the legal pages a store listing needs, and the progress-card link
   the app itself shares. Teachers, guides, the alphabet chart, homeschool,
   accounts, and the language marketing pages are closed until they are ready.
   The PWA at /app is a separate build and is not a route of this site.

   Keep CLOSED_PREFIXES in step with scripts/cloudfront-rewrite.js and
   website/public/_redirects. src/platform/siteAccess.test.js checks all three. */

export const CLOSED_PREFIXES = Object.freeze([
  '/amharic',
  '/tigrinya',
  '/teachers',
  '/homeschool',
  '/alphabet',
  '/about',
  '/guides',
  '/family',
  '/teach',
  '/verify',
  '/family-pack',
])

/** True when this path should bounce to the app landing. */
export function isClosedPath(pathname) {
  const path = String(pathname || '/')
  const bare = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
  if (bare === '/' || bare === '') return false
  return CLOSED_PREFIXES.some((p) => bare === p || bare.startsWith(`${p}/`))
}
