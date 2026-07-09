/* ============================================================================
   SESSION COACH — platform layer
   ----------------------------------------------------------------------------
   Kids rush to the games; the coach makes sure every session starts by
   touching yesterday's letters first. Three pieces:

   1. WARM-UP  buildWarmup() assembles a short refresher quiz from the
      child's own history: trouble letters first (the ones they actually
      miss), then the least-recently-seen learned letters. It reuses the
      Lesson machine's {target, options} shape, twin-safe like every other
      question builder. Never empty once one family is learned.
   2. PLAN     a parent or the child registers a pace (families per week);
      etaStamp() turns progress + pace into a finish date. fq.plan.v1.
   3. RECORD   one warm-up per calendar day (fq.coach.v1), same pattern as
      the streak/gift/hunt records. Enforcement is a PLAN SETTING
      (requireWarmup) - by default the app recommends, never blocks,
      matching the rest of the design.

   Everything below is pure in its inputs; the wall clock enters only via
   default args at the caller's boundary.
   ========================================================================== */

import { rngShuffle } from './rng'
import { dayStamp } from './streak'
import { letterStats, troubleLetters } from './telemetry'
import { INDEXES, FIDEL_FAMILIES } from './ethiopic'

const PLAN_KEY = 'fq.plan.v1'
const COACH_KEY = 'fq.coach.v1'
export const WARMUP_SIZE = 5

/** The registerable paces: families of letters per week. */
export const PACES = Object.freeze([
  { id: 'chill', perWeek: 1 },
  { id: 'steady', perWeek: 2 },
  { id: 'zoom', perWeek: 4 },
])

/* ── plan (fq.plan.v1) ── */

export function loadPlan() {
  try {
    const p = JSON.parse(localStorage.getItem(PLAN_KEY))
    return p && PACES.some((x) => x.id === p.pace) ? p : null
  } catch {
    return null
  }
}
export function savePlan(plan) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
  } catch {
    /* session-only */
  }
  return plan
}
export function makePlan(pace, { requireWarmup = false, today = dayStamp() } = {}) {
  return savePlan({ pace, requireWarmup: !!requireWarmup, createdDay: today })
}
export function setRequireWarmup(on) {
  const p = loadPlan()
  if (p) savePlan({ ...p, requireWarmup: !!on })
  return p
}

/** 'YYYY-MM-DD' plus n days, pure calendar math (UTC, no wall clock). */
export function addDays(stamp, n) {
  const [y, m, d] = String(stamp).split('-').map(Number)
  const t = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + n))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

/** The finish date for the whole abugida at a pace. Pure. */
export function etaStamp(today, learnedCount, perWeek) {
  const remaining = Math.max(0, FIDEL_FAMILIES.length - learnedCount)
  if (!remaining) return today
  return addDays(today, Math.ceil(remaining / perWeek) * 7)
}

/* ── daily warm-up record (fq.coach.v1) ── */

export function loadCoach() {
  try {
    return JSON.parse(localStorage.getItem(COACH_KEY)) || { lastDay: null, days: 0 }
  } catch {
    return { lastDay: null, days: 0 }
  }
}
export function warmupDoneToday(today = dayStamp()) {
  return loadCoach().lastDay === today
}
export function markWarmupDone(today = dayStamp()) {
  const s = loadCoach()
  const next = s.lastDay === today ? s : { lastDay: today, days: (s.days || 0) + 1 }
  try {
    localStorage.setItem(COACH_KEY, JSON.stringify(next))
  } catch {
    /* session-only */
  }
  return next
}

/* ── the warm-up builder ── */

const soundOf = (key) => INDEXES.byAudioKey.get(key)?.sound

/**
 * A short refresher over what the child has ALREADY learned:
 *   1. trouble letters first (actually missed, from the answer ledger),
 *   2. then the least-recently-practiced learned letters,
 * as Lesson-machine questions with twin-safe distractors. Pure in
 * (seed, learnedIds, events). Empty only when nothing is learned yet.
 */
export function buildWarmup(seed, learnedIds, events = [], count = WARMUP_SIZE) {
  const pool = learnedIds.map((id) => `${id}-1`).filter((k) => INDEXES.byAudioKey.has(k))
  if (!pool.length) return []
  let state = seed

  // Trouble first (limited so the warm-up is never all pain)...
  const trouble = troubleLetters(events, { minSeen: 2, minRate: 0.25, limit: 3 })
    .map((t) => t.key)
    .filter((k) => pool.includes(k))
  // ...then the letters the child has not touched for the longest.
  const stats = letterStats(events)
  const staleFirst = pool
    .filter((k) => !trouble.includes(k))
    .sort((a, b) => (stats.get(a)?.lastDay || 0) - (stats.get(b)?.lastDay || 0) || (a < b ? -1 : 1))
  // One target per SOUND: a listen-and-pick prompt cannot distinguish twins
  // (ha/hha/kha, a/ae, ...), so hearing "a" twice with two different right
  // answers would be ambiguous by ear. Same rule as every other builder.
  const usedTargetSounds = new Set()
  const targetPick = []
  for (const k of [...trouble, ...staleFirst]) {
    if (targetPick.length >= Math.min(count, pool.length)) break
    const s = soundOf(k)
    if (!s || usedTargetSounds.has(s)) continue
    usedTargetSounds.add(s)
    targetPick.push(k)
  }
  let targets = targetPick
  ;[targets, state] = rngShuffle(targets, state)

  return targets.map((target) => {
    const sound = soundOf(target)
    // Distractors: learned letters first, padded from the whole abugida,
    // pairwise-distinct sounds so twins never make a question ambiguous.
    const all = FIDEL_FAMILIES.map((f) => `${f.id}-1`)
    let candidates
    ;[candidates, state] = rngShuffle(
      [...pool, ...all.filter((k) => !pool.includes(k))].filter((k) => k !== target),
      state,
    )
    const used = new Set([sound])
    const picked = [target]
    for (const k of candidates) {
      if (picked.length >= 4) break
      const s = soundOf(k)
      if (!s || used.has(s)) continue
      used.add(s)
      picked.push(k)
    }
    let options
    ;[options, state] = rngShuffle(picked, state)
    return { target, options }
  })
}
