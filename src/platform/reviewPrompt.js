/* ============================================================================
   STORE REVIEW — native paid app only
   ----------------------------------------------------------------------------
   Ask for an App Store / Play review at a happy moment, through the
   platform in-app review card (StoreKit / Play In-App Review). The system
   decides whether a card actually appears and enforces its own yearly cap.
   We add our own cap so the app never hammers the API:

     - at most once per browser/app session
     - at most once every REVIEW_COOLDOWN_MS (about four months)
     - at most REVIEW_MAX_ASKS times ever on this install
     - automatic ask after a lesson only once REVIEW_MIN_COMPLETIONS
       successful finishes have happened
     - opening the website-unlock code in Grown-Ups (already behind the
       parental gate) is its own happy moment
     - the Grown-Ups "Rate eGeez" button is an explicit grown-up ask and
       still obeys the same caps

   The web trial does not call this. Unlocked website users get listing
   links instead (WebTrialPaywall), which a grown-up chooses to open.
   fq.review.v1 is not a progress key: resetting a child's progress must
   not reset the "we already asked" memory.
   ========================================================================== */
import { isNativePlatform } from './native'

export const REVIEW_KEY = 'fq.review.v1'
export const REVIEW_MIN_COMPLETIONS = 3
export const REVIEW_COOLDOWN_MS = 120 * 24 * 60 * 60 * 1000
export const REVIEW_MAX_ASKS = 3
const SESSION_FLAG = 'fq.review.session'

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(REVIEW_KEY))
    return s && typeof s === 'object' ? s : {}
  } catch {
    return {}
  }
}
function save(s) {
  try { localStorage.setItem(REVIEW_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function reviewState() {
  return load()
}

export function noteCompletion(now = Date.now()) {
  const s = load()
  s.completions = (Number(s.completions) || 0) + 1
  s.lastCompletionAt = now
  save(s)
  return s
}

function eligible(reason, state) {
  if (reason === 'complete') return (Number(state.completions) || 0) >= REVIEW_MIN_COMPLETIONS
  if (reason === 'unlock-code' || reason === 'grownups') return true
  return false
}

async function requestNativeReview() {
  const { InAppReview } = await import('@capacitor-community/in-app-review')
  await InAppReview.requestReview()
  return true
}

/** Record a happy moment and, when the caps allow, ask the OS to show its
    review card. Returns a short status the Grown-Ups button can show.
    'complete' counts a successful lesson even when no ask is made. */
export async function maybeRequestReview(reason, deps = {}) {
  const now = deps.now ?? Date.now()
  if (reason === 'complete') noteCompletion(now)
  const native = deps.native ?? isNativePlatform()
  if (!native) return 'skip'
  const sess = deps.session ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
  try {
    if (sess?.getItem(SESSION_FLAG) === '1') return 'session'
  } catch { /* storage blocked; keep going */ }
  const state = load()
  if ((Number(state.askCount) || 0) >= REVIEW_MAX_ASKS) return 'limit'
  if (state.lastAskedAt && now - state.lastAskedAt < REVIEW_COOLDOWN_MS) return 'cooldown'
  if (!eligible(reason, state)) return 'early'
  const request = deps.request ?? requestNativeReview
  try {
    const ok = await request()
    if (!ok) return 'unavailable'
    try { sess?.setItem(SESSION_FLAG, '1') } catch { /* the local cap still holds */ }
    const next = load()
    next.askCount = (Number(next.askCount) || 0) + 1
    next.lastAskedAt = now
    save(next)
    return 'asked'
  } catch {
    return 'unavailable'
  }
}
