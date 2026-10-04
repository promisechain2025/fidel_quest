/* Grown-Ups helpers: the in-app privacy-policy link and the QA unlock
   switch. eGeez 1.3.0 is paid upfront in the stores with everything
   unlocked, so there is no buy, gift, or trial helper here any more. */

/** The site's published privacy policy (same text as public/privacy.html).
    Verified live (HTTP 200, "Privacy - eGeez") on 2026-10-01. */
export const DEFAULT_PRIVACY_URL = 'https://www.easygeez.com/privacy'

/** The privacy-policy URL for the in-app link. Apple 5.1.1(i) requires the
    policy to be reachable INSIDE the app, so this is never empty:
    VITE_PRIVACY_URL wins when set, otherwise the site's real /privacy page
    (never the marketing/landing URL - a "Privacy policy" link must open the
    policy). Pass `env` only in tests. */
export function privacyUrl(env = import.meta.env) {
  const v = env?.VITE_PRIVACY_URL
  return typeof v === 'string' && v.trim() ? v.trim() : DEFAULT_PRIVACY_URL
}

/** The QA "Open everything" shortcut is a developer tool: shown in dev builds
    (npm run dev) or when a build opts in with VITE_QA_UNLOCK=true, never in a
    store/production build. The ?unlock URL param still works for QA. */
export function qaUnlockEnabled(env = import.meta.env) {
  return !!(env?.DEV || env?.VITE_QA_UNLOCK === 'true')
}
