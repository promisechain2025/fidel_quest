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
     - never in the first REVIEW_MIN_SESSION_MS of a session (no ask at
       app launch), and callers only ask BETWEEN activities: on the way
       back to the path, never mid-game
     - automatic asks at these happy moments:
         'complete' a Journey node (letter family / quiz / arcade) finished
                    with stars, or a Lesson Level replay passed with 2+
                    stars - once REVIEW_MIN_COMPLETIONS have happened
         'words'    a First Words / Twin Drill round finished with 80%+
                    first-try accuracy, on Continue - same minimum
         'chapter'  a whole chapter finished, asked when the chapter party
                    is closed (not over it) - a big win, no minimum
     - opening the website-unlock code in Grown-Ups (already behind the
       parental gate) is its own happy moment
     - the Grown-Ups "Rate eGeez" button is an explicit grown-up ask and
       still obeys the same caps

   Only the system review card is ever used: no custom "rate us 5 stars"
   screen, no reward for reviewing, and nothing is locked behind a rating.
   The web trial does not call this. Unlocked website users get listing
   links instead (WebTrialPaywall), which a grown-up chooses to open.
   fq.review.v1 is not a progress key: resetting a child's progress must
   not reset the "we already asked" memory.
   ========================================================================== */
import { isNativePlatform } from './native'

export const REVIEW_KEY = 'fq.review.v1'
export const REVIEW_MIN_COMPLETIONS = 2
export const REVIEW_COOLDOWN_MS = 120 * 24 * 60 * 60 * 1000
export const REVIEW_MAX_ASKS = 3
export const REVIEW_MIN_SESSION_MS = 60 * 1000
/** Reasons that count as a finished activity (they bump `completions`). */
export const COMPLETION_REASONS = Object.freeze(['complete', 'words'])
const SESSION_FLAG = 'fq.review.session'
const BOOT_AT = Date.now()

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
  if (COMPLETION_REASONS.includes(reason)) return (Number(state.completions) || 0) >= REVIEW_MIN_COMPLETIONS
  if (reason === 'chapter' || reason === 'unlock-code' || reason === 'grownups') return true
  return false
}

async function requestNativeReview() {
  const { InAppReview } = await import('@capacitor-community/in-app-review')
  await InAppReview.requestReview()
  return true
}

/** Record a happy moment and, when the caps allow, ask the OS to show its
    review card. Returns a short status the Grown-Ups button can show.
    'complete' / 'words' count a finished activity even when no ask is made.
    deps.sessionAgeMs overrides how long this app session has been running. */
export async function maybeRequestReview(reason, deps = {}) {
  const now = deps.now ?? Date.now()
  if (COMPLETION_REASONS.includes(reason)) noteCompletion(now)
  const native = deps.native ?? isNativePlatform()
  if (!native) return 'skip'
  // No ask right at launch. The explicit grown-up button is exempt.
  const sessionAge = deps.sessionAgeMs ?? (Date.now() - BOOT_AT)
  if (reason !== 'grownups' && sessionAge < REVIEW_MIN_SESSION_MS) return 'launch'
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
