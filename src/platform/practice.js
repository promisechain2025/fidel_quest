/* ============================================================================
   PRACTICE — verified active-time tracking (per child, per day)
   ----------------------------------------------------------------------------
   A teacher who asks for "one hour a day" needs to know the hour was real
   practice, not an app left open. This module is the pure core:

   ACTIVE TIME. Every real interaction (tap, answer, trace, a completed audio
   listen) opens a 30 s activity window. Wall time is credited only while a
   window is open AND the app is visible. Idle > 30 s, a hidden tab, a
   backgrounded app or a locked screen (all surface as visibility=hidden)
   stop the clock; coming back is not itself an interaction.

   ANTI-CHEAT FLAGS (never block the child, only inform the teacher):
     rapidTap   >= RAPID_RUN taps on the same spot (RAPID_PX) each < RAPID_MS
                apart. Taps inside such a run stop extending the window.
     randomTap  over the last RANDOM_WINDOW answers: accuracy < RANDOM_ACC
                and the answers came faster than RANDOM_FAST_MS on average.
     audioLoop  >= LOOP_RUN completed listens with no other input between.
                Listens after the LOOP_FREE-th stop extending the window.

   Pure: `step(state, event)` folds one timestamped event; the runtime
   (practiceTracker.js) supplies events and persists. No clock, no random.
   Storage: fq.practice.v1 (registered in PROGRESS_KEYS, so it is per child).
   ========================================================================== */
import { dayStamp, prevDay } from './streak'

export const PRACTICE_KEY = 'fq.practice.v1'
export const IDLE_MS = 30000
export const SESSION_GAP_MS = 5 * 60000
export const RAPID_MS = 250
export const RAPID_PX = 24
export const RAPID_RUN = 8
export const RANDOM_WINDOW = 12
export const RANDOM_ACC = 0.3
export const RANDOM_FAST_MS = 1500
export const LOOP_RUN = 6
export const LOOP_FREE = 3
export const KEEP_DAYS = 90
export const GOAL_MIN = 5
export const GOAL_MAX = 180
/* Prayer pages: kids memorize by reading/listening, so time counts with no
   interaction while a prayer page is open+visible or a recording plays.
   Safety cap: after PRAYER_CAP_MS with no page change, tap or audio event
   the clock pauses (a phone left open on a prayer page). */
export const PRAYER_CAP_MS = 10 * 60000

export const emptyDay = (day) => ({
  day, activeMs: 0, prayerMs: 0, sessions: 0, items: 0, answered: 0, correct: 0,
  lessons: 0, games: 0, flags: { rapidTap: 0, randomTap: 0, audioLoop: 0 },
})

/** Runtime (never persisted): what the next event needs to know. */
export const emptyRuntime = () => ({
  visible: true, windowEnd: -Infinity, accountedAt: null, lastInteractionAt: null,
  prayerOpen: false, prayerAudio: false, prayerLast: null,
  taps: [], answers: [], listensSinceInput: 0, rapidFlagged: false, randomFlagged: false, loopFlagged: false,
})

export const emptyState = () => ({ rt: emptyRuntime(), days: {} })

const dayOf = (t) => dayStamp(new Date(t))

function dayRow(days, t) {
  const d = dayOf(t)
  if (!days[d]) days[d] = emptyDay(d)
  return days[d]
}

/** Where the prayer window ends: open-ended while a recording plays,
    otherwise PRAYER_CAP_MS after the last prayer activity. */
export function prayerEnd(rt) {
  if (!rt.prayerOpen && !rt.prayerAudio) return -Infinity
  if (rt.prayerAudio) return Infinity
  return (rt.prayerLast ?? -Infinity) + PRAYER_CAP_MS
}

function addSpan(days, from, end, field) {
  let a = from
  while (a < end) {
    const d = new Date(a)
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
    const b = Math.min(end, midnight)
    dayRow(days, a)[field] += b - a
    a = b
  }
}

/** Credit visible time up to t: the interaction window and the prayer window
    both start at `from`, so total = the longer one, prayer = its own span.
    Split at midnight so each day gets its own share. */
function credit(rt, days, t) {
  const from = rt.accountedAt
  rt.accountedAt = t
  if (from == null || !rt.visible) return
  const pEnd = Math.min(t, prayerEnd(rt))
  const end = Math.max(Math.min(t, rt.windowEnd), pEnd)
  addSpan(days, from, end, 'activeMs')
  addSpan(days, from, pEnd, 'prayerMs')
}

/** Is this tap part of a rapid same-spot run? Mutates rt.taps. */
function rapidTap(rt, ev) {
  const last = rt.taps[rt.taps.length - 1]
  const same = last && ev.t - last.t < RAPID_MS && Math.hypot((ev.x ?? 0) - (last.x ?? 0), (ev.y ?? 0) - (last.y ?? 0)) <= RAPID_PX
  rt.taps = same ? [...rt.taps, { t: ev.t, x: ev.x ?? 0, y: ev.y ?? 0 }].slice(-RAPID_RUN * 4) : [{ t: ev.t, x: ev.x ?? 0, y: ev.y ?? 0 }]
  return rt.taps.length >= RAPID_RUN
}

function openWindow(rt, days, t) {
  const row = dayRow(days, t)
  if (rt.lastInteractionAt == null || t - rt.lastInteractionAt > SESSION_GAP_MS || dayOf(rt.lastInteractionAt) !== row.day) row.sessions += 1
  rt.lastInteractionAt = t
  rt.windowEnd = t + IDLE_MS
}

/** Fold one event. Returns a NEW state (inputs untouched). Events:
    {type:'tap', t, x, y} | {type:'answer', t, correct} | {type:'trace', t}
    {type:'listen', t} (a clip played to its end) | {type:'hidden'|'visible'|'tick', t}
    {type:'lesson'|'game', t} (finished one). */
export function step(state, ev) {
  if (!ev || !Number.isFinite(ev.t)) return state
  const s = state || emptyState()
  const rt = { ...s.rt, taps: s.rt.taps, answers: s.rt.answers }
  const days = { ...s.days }
  // copy-on-write for the row(s) we may touch
  const touch = (t) => { const d = dayOf(t); days[d] = days[d] ? { ...days[d], flags: { ...days[d].flags } } : emptyDay(d); return days[d] }
  touch(ev.t)
  if (rt.accountedAt != null) touch(rt.accountedAt)
  if (rt.accountedAt != null && ev.t < rt.accountedAt) return s // clock went backwards: ignore
  credit(rt, days, ev.t)
  const row = days[dayOf(ev.t)]
  switch (ev.type) {
    case 'hidden':
      rt.visible = false
      rt.windowEnd = -Infinity
      break
    case 'visible':
      rt.visible = true
      if (rt.prayerOpen) rt.prayerLast = ev.t // the page is on screen again
      break
    // prayer hooks (PrayerBook): open/close the page, turn a page, audio state
    case 'prayerOpen':
      rt.prayerOpen = true
      rt.prayerLast = ev.t
      break
    case 'prayerPage':
      if (rt.prayerOpen) rt.prayerLast = ev.t
      break
    case 'prayerClose':
      rt.prayerOpen = false
      rt.prayerAudio = false
      break
    case 'prayerAudio':
      rt.prayerAudio = !!ev.playing
      rt.prayerLast = ev.t
      break
    case 'tap': {
      if (!rt.visible) break
      if (rapidTap(rt, ev)) {
        if (!rt.rapidFlagged) { row.flags.rapidTap += 1; rt.rapidFlagged = true }
        break // does not extend the window
      }
      rt.rapidFlagged = false
      if (rt.prayerOpen) rt.prayerLast = ev.t
      rt.listensSinceInput = 0
      rt.loopFlagged = false
      openWindow(rt, days, ev.t)
      break
    }
    case 'trace':
      rt.listensSinceInput = 0
      rt.loopFlagged = false
      row.items += 1
      openWindow(rt, days, ev.t)
      break
    case 'answer': {
      rt.listensSinceInput = 0
      rt.loopFlagged = false
      row.items += 1
      row.answered += 1
      if (ev.correct) row.correct += 1
      rt.answers = [...rt.answers, { t: ev.t, ok: !!ev.correct }].slice(-RANDOM_WINDOW)
      if (rt.answers.length >= RANDOM_WINDOW) {
        const acc = rt.answers.filter((a) => a.ok).length / rt.answers.length
        const pace = (rt.answers[rt.answers.length - 1].t - rt.answers[0].t) / (rt.answers.length - 1)
        const random = acc < RANDOM_ACC && pace < RANDOM_FAST_MS
        if (random && !rt.randomFlagged) row.flags.randomTap += 1
        rt.randomFlagged = random
      }
      openWindow(rt, days, ev.t)
      break
    }
    case 'listen': {
      if (!rt.visible) break
      rt.listensSinceInput += 1
      if (rt.listensSinceInput >= LOOP_RUN && !rt.loopFlagged) { row.flags.audioLoop += 1; rt.loopFlagged = true }
      if (rt.listensSinceInput <= LOOP_FREE) openWindow(rt, days, ev.t)
      break
    }
    case 'lesson': row.lessons += 1; break
    case 'game': row.games += 1; break
    default: break // 'tick' only credits
  }
  return { rt, days }
}

export const fold = (events, state = emptyState()) => events.reduce(step, state)

/* ── derived numbers ── */

export const activeMinutes = (row) => Math.floor((row?.activeMs || 0) / 60000)
export const prayerMinutes = (row) => Math.floor((row?.prayerMs || 0) / 60000)
export const accuracyPct = (row) => (row?.answered ? Math.round((100 * row.correct) / row.answered) : null)
export const flagCount = (row) => (row ? row.flags.rapidTap + row.flags.randomTap + row.flags.audioLoop : 0)

/** Consecutive days (ending today, or yesterday if today is still empty)
    with at least one active minute. */
export function practiceStreak(days, today) {
  let d = activeMinutes(days[today]) >= 1 ? today : prevDay(today)
  let n = 0
  while (activeMinutes(days[d]) >= 1) { n += 1; d = prevDay(d) }
  return n
}

/** The last `n` days ending today, oldest first, empty days filled in. */
export function lastDays(days, today, n = 7) {
  const out = []
  let d = today
  for (let i = 0; i < n; i++) { out.unshift(days[d] || emptyDay(d)); d = prevDay(d) }
  return out
}

export const clampGoal = (m) => {
  const n = Math.round(Number(m))
  return Number.isFinite(n) && n > 0 ? Math.max(GOAL_MIN, Math.min(GOAL_MAX, n)) : null
}

/** 0..1 progress against the goal. */
export const goalProgress = (row, goalMin) => (goalMin ? Math.min(1, activeMinutes(row) / goalMin) : 0)

/* ── storage (fq.practice.v1 = {v:1, days, goal}) ── */

const validRow = (r) => r && typeof r.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.day) && Number.isFinite(r.activeMs)

export function loadPractice() {
  try {
    const p = JSON.parse(localStorage.getItem(PRACTICE_KEY))
    if (p && p.v === 1 && p.days && typeof p.days === 'object') {
      const days = {}
      for (const [k, r] of Object.entries(p.days)) if (validRow(r) && r.day === k) days[k] = { ...emptyDay(k), ...r, flags: { ...emptyDay(k).flags, ...(r.flags || {}) } }
      return { days, goal: clampGoal(p.goal) }
    }
  } catch { /* fresh */ }
  return { days: {}, goal: null }
}

/** Keep the newest KEEP_DAYS rows. */
export function prune(days) {
  const keys = Object.keys(days).sort().slice(-KEEP_DAYS)
  return Object.fromEntries(keys.map((k) => [k, days[k]]))
}

export function savePractice({ days, goal }) {
  try { localStorage.setItem(PRACTICE_KEY, JSON.stringify({ v: 1, days: prune(days), goal: clampGoal(goal) })) } catch { /* session only */ }
}

export function setPracticeGoal(minutes) {
  const p = loadPractice()
  savePractice({ ...p, goal: clampGoal(minutes) })
  return clampGoal(minutes)
}
