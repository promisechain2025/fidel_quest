/* ============================================================================
   LICENSE — the honest free-trial engine
   ----------------------------------------------------------------------------
   MONETIZATION SWITCH. By default eGeez is FULLY FREE: no trial, no asks, no
   purchase UI anywhere (VITE_MONETIZE unset). This is the mode to ship while
   purchases are not ready - the app is free for everyone, on web AND in the
   stores, and carries no in-app-purchase / RevenueCat surface for review.

   Set VITE_MONETIZE=true to turn on the PAID-APP flow: the store app is a PAID
   download (price set in the consoles) and unlocks the moment it is installed,
   while the WEB/PWA gives everyone a free TRIAL (VITE_TRIAL_DAYS, default 3) so
   they can fall in love before day 3, then are asked to buy the paid app. No
   in-app purchase is required - Apple/Google take the payment at download.
   There is no server and no account, so nothing here is enforcement - it is an
   honest daily ask around three truths:
     1. A parent who can pay gets a one-tap in-app purchase.
     2. A parent who will not pay is still valuable: ask for honest feedback,
        thanked with more free days.
     3. A family with no way to pay locally can ask a relative abroad to gift
        it (the diaspora gift loop).

   The child is never blocked mid-lesson: the ask appears at most once per
   calendar day, on the home screen, and always has a "Not now".

   fq.license.v1: { startDay, graceUntil, supported, askedDay }
   Deliberately NOT part of the progress keys: "Reset all progress" gives a
   fresh player, not a fresh trial.
   ========================================================================== */
import { progressChanged } from './childModel'
import { dayStamp } from './streak'
import { isNativePlatform } from './native'

const KEY = 'fq.license.v1'

const envInt = (v, fallback) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? n : fallback
}
export const TRIAL_DAYS = envInt(import.meta.env?.VITE_TRIAL_DAYS, 3)
export const FEEDBACK_GRACE_DAYS = 4

/** Master switch. Purchases (trial, buy, Family Pack, gift) are OFF unless
    VITE_MONETIZE is explicitly enabled - so the default build is free. */
export const MONETIZE = /^(1|true|yes|on)$/i.test(String(import.meta.env?.VITE_MONETIZE ?? ''))

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s && typeof s === 'object' ? s : {}
  } catch {
    return {}
  }
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* session-only */ }
  progressChanged()
}

/** Whole days from a to b ('YYYY-MM-DD' stamps; UTC parse keeps it stable). */
export function daysSince(a, b) {
  const ms = new Date(b) - new Date(a)
  return Number.isFinite(ms) ? Math.floor(ms / 86400000) : 0
}

function addDaysStamp(day, n) {
  const d = new Date(day)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** The current license picture. Starts the trial clock on first call.
    - monetization OFF (default): the app is simply free/licensed everywhere.
    - monetization ON, NATIVE: paid at download -> licensed (no trial, no ask).
    - monetization ON, WEB/PWA: the free trial runs, then the once-a-day ask. */
export function licenseState(today = dayStamp(), monetize = MONETIZE, native = isNativePlatform()) {
  if (!monetize || native) return { phase: 'licensed', daysLeft: Infinity, shouldAsk: false, feedbackAvailable: false }
  const s = load()
  if (!s.startDay) {
    s.startDay = today
    save(s)
  }
  if (s.supported) return { phase: 'licensed', daysLeft: Infinity, shouldAsk: false, feedbackAvailable: false }
  const trialEnd = addDaysStamp(s.startDay, TRIAL_DAYS)
  const until = s.graceUntil && s.graceUntil > trialEnd ? s.graceUntil : trialEnd
  const daysLeft = Math.max(0, daysSince(today, until))
  const feedbackAvailable = !s.feedbackUsed
  if (daysLeft > 0) return { phase: 'trial', daysLeft, shouldAsk: false, feedbackAvailable }
  return { phase: 'ended', daysLeft: 0, shouldAsk: s.askedDay !== today, feedbackAvailable }
}

/** Remember that today's ask was shown - at most one per calendar day. */
export function markAsked(today = dayStamp()) {
  const s = load()
  s.askedDay = today
  save(s)
}

/** Honest feedback earns more free days - ONCE. After that the only paths
    are buying it or a relative gifting it. Returns the days granted (0 if
    the one extension was already used). */
export function grantFeedbackGrace(today = dayStamp()) {
  const s = load()
  if (s.feedbackUsed) return 0
  s.feedbackUsed = true
  s.graceUntil = addDaysStamp(today, FEEDBACK_GRACE_DAYS)
  save(s)
  return FEEDBACK_GRACE_DAYS
}

/** The family says they bought it (store purchase, or a relative's gift).
    Honor system by design - there is no server to check against. */
export function markSupported(source = 'unknown') {
  const s = load()
  s.supported = source || true
  save(s)
}
