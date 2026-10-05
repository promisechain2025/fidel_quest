/* ============================================================================
   WEB TRIAL — easygeez.com/app only
   ----------------------------------------------------------------------------
   The webpage app (built with VITE_BASE=/app/, see docs/deploy-aws.md) is
   free to try for FREE_SESSIONS browser sessions. The first open is session
   1. After 3 sessions the home path and Grown-Ups stay browsable, and
   starting a lesson, game, or story asks a grown-up to buy the phone app
   ($12.99, one time) or to enter the unlock code from that app.

   Native iOS/Android builds are paid at download. They are NOT built with
   VITE_BASE=/app/ (Capacitor loads assets from '/'), and even if they were,
   isNativePlatform() keeps fullAccess true. Nothing here sells the native
   app or gates its content.

   A session is one browser session (sessionStorage), not a day and not a
   timer. Refreshing the same tab does not count again. A new tab or a cold
   start of the installed PWA does.

   Storage key fq.webtrial.v1 is deliberately NOT a progress key: "Reset all
   progress" must not restart the trial or forget an unlock. There is no
   Capacitor Preferences usage elsewhere for license state, so this stays in
   localStorage (it persists in the native WebView too, which is what makes
   the install id — and therefore the displayed code — stable per install).

   Unlock codes: scripts/gen-app-codes.mjs mints support codes with the same
   checksum the app checks. The paid app shows the one code derived from its
   install id (Grown-Ups, behind the parental gate).
   ========================================================================== */
import { isNativePlatform } from './native'
import { codeForInstall, isValidAppCode } from './appCodes'

export const FREE_SESSIONS = 3
export const TRIAL_KEY = 'fq.webtrial.v1'
const SESSION_FLAG = 'fq.webtrial.counted'

/** Screens a limited browser may still open. Everything else is a lesson,
    game, or story and opens the paywall instead. */
export const TRIAL_BROWSE_SCREENS = Object.freeze(['home', 'grownups', 'teacher', 'joinclass', 'plan'])

export function isAppWebBase(base = import.meta.env?.BASE_URL) {
  const b = String(base ?? '/')
  return b === '/app/' || b === '/app'
}

/** True only for the website app. Native is never on the trial, whatever
    base the bundle was built with. */
export function webTrialActive(native = isNativePlatform(), base = import.meta.env?.BASE_URL) {
  if (native) return false
  return isAppWebBase(base)
}

export function loadWebTrial() {
  try {
    const s = JSON.parse(localStorage.getItem(TRIAL_KEY))
    return s && typeof s === 'object' ? s : {}
  } catch {
    return {}
  }
}

function save(s) {
  try { localStorage.setItem(TRIAL_KEY, JSON.stringify(s)) } catch { /* session-only */ }
}

function newInstallId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch { /* fall through */ }
  return `fq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Count this browser session once. No-op on native and on any build that
    is not the /app web deploy. Safe to call on every launch, including
    React StrictMode's double invoke. */
export function noteWebSession({ native, base } = {}) {
  if (!webTrialActive(native, base)) return loadWebTrial()
  let counted = false
  try { counted = sessionStorage.getItem(SESSION_FLAG) === '1' } catch { counted = false }
  const s = loadWebTrial()
  if (!s.installId) s.installId = newInstallId()
  if (!counted) {
    s.sessions = (Number(s.sessions) || 0) + 1
    try { sessionStorage.setItem(SESSION_FLAG, '1') } catch { /* counted in localStorage anyway */ }
  }
  save(s)
  return s
}

export function hasFullAccess({ native, base, state } = {}) {
  if (!webTrialActive(native, base)) return true
  const s = state || loadWebTrial()
  if (s.unlocked) return true
  return (Number(s.sessions) || 0) <= FREE_SESSIONS
}

export function isWebTrialLimited(opts) {
  return webTrialActive(opts?.native, opts?.base) && !hasFullAccess(opts)
}

export function screenBlockedByTrial(name, opts) {
  if (!isWebTrialLimited(opts)) return false
  if (!name || TRIAL_BROWSE_SCREENS.includes(name)) return false
  return true
}

/** Create the install id if this device does not have one yet, and return
    the stable unlock code a grown-up can read in the paid app. */
export function ensureInstallId() {
  const s = loadWebTrial()
  if (typeof s.installId === 'string' && s.installId) return s.installId
  s.installId = newInstallId()
  save(s)
  return s.installId
}

export function deviceUnlockCode(id = ensureInstallId()) {
  return codeForInstall(id)
}

/** Accept a code from the paid app or from scripts/gen-app-codes.mjs.
    Remembers forever on this browser. Returns false for anything else. */
export function redeemUnlockCode(raw) {
  if (!isValidAppCode(raw)) return false
  const s = loadWebTrial()
  s.unlocked = true
  s.unlockSource = 'code'
  save(s)
  return true
}
