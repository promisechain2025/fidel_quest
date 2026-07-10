/* ============================================================================
   LICENSE — the honest free-trial engine
   ----------------------------------------------------------------------------
   Fidel Quest is a paid app, but anyone may download it free and use ALL of
   it for a trial period. There is no server and no account, so nothing here
   is enforcement - it is an honest daily ask, designed around three truths:

     1. A parent who can pay should get a one-tap way to buy.
     2. A parent who will not pay is still valuable: ask for honest feedback,
        and thank them with more free days.
     3. A family in Ethiopia/Eritrea may have NO way to pay - but a relative
        abroad does. Give them a ready-made message asking that relative to
        gift the app (this is the diaspora gift loop, same as the Backpack
        Gift flow).

   The child is never blocked mid-lesson: the ask appears at most once per
   calendar day, on the home screen, and always has a "Not now".

   Native store builds (Capacitor) were paid for at download - no trial, no
   asks. Web/PWA is the free-trial vehicle.

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
export const TRIAL_DAYS = envInt(import.meta.env?.VITE_TRIAL_DAYS, 7)
export const FEEDBACK_GRACE_DAYS = 4

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

/** The current license picture. Starts the trial clock on first call. */
export function licenseState(today = dayStamp(), native = isNativePlatform()) {
  if (native) return { phase: 'licensed', daysLeft: Infinity, shouldAsk: false }
  const s = load()
  if (!s.startDay) {
    s.startDay = today
    save(s)
  }
  if (s.supported) return { phase: 'licensed', daysLeft: Infinity, shouldAsk: false }
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
