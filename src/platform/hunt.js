/* ============================================================================
   DAILY LETTER HUNT — platform layer
   ----------------------------------------------------------------------------
   The daily comeback game, shaped after Akukulu (the Ethiopian call-and-
   response hide-and-seek): Jibby hides a handful of the child's letters
   around a meadow, Kokeb calls a sound, and the child finds the letter that
   says it. One hunt per calendar day, seeded by the date, so every morning
   there is a fresh puzzle — and finishing it opens the daily gift treasure.

   The machine is pure and seeded (no wall clock, no Math.random) per the
   repo convention: buildHunt(seed, forms) -> layout + call order, and
   huntTransition(ctx, event) -> { next, accepted }. The calendar date only
   enters at the boundary (daySeed / markHuntDone default args).
   ========================================================================== */

import { dayStamp } from './streak'

const KEY = 'fq.hunt.v1'
/** Number of hiding spots drawn in the scene (letters use the first N). */
export const HUNT_SPOTS = 6
/** Letters hidden per hunt (fewer if the scope has fewer distinct sounds). */
export const HUNT_SIZE = 5

/* ── seeded PRNG (mulberry32 step, same shape as the other machines) ── */
function rngNext(state) {
  let t = (state + 0x6d2b79f5) | 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t]
}
function rngShuffle(items, state) {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    let v
    ;[v, state] = rngNext(state)
    const j = Math.floor(v * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, state]
}

/** Deterministic seed for a calendar day (default: today at the boundary). */
export function daySeed(stamp = dayStamp()) {
  let h = 0
  for (let i = 0; i < stamp.length; i++) h = (h * 31 + stamp.charCodeAt(i)) & 0x7fffffff
  return h | 1
}

/**
 * Build a hunt from the scoped letter forms ({ audioKey, char, sound }).
 * Picks up to HUNT_SIZE letters with pairwise-distinct sounds (twins like
 * ha/hha share a sound, so only one may hide — every call stays findable
 * by ear), assigns each to a hiding spot, and fixes the call order.
 * Pure function of (seed, forms).
 */
export function buildHunt(seed, forms, count = HUNT_SIZE) {
  let state = seed
  let shuffled
  ;[shuffled, state] = rngShuffle(forms.filter(Boolean), state)
  const seen = new Set()
  const letters = []
  for (const f of shuffled) {
    if (letters.length >= count) break
    if (!f.sound || seen.has(f.sound)) continue
    seen.add(f.sound)
    letters.push(f)
  }
  let spotIdxs
  ;[spotIdxs, state] = rngShuffle(Array.from({ length: HUNT_SPOTS }, (_, i) => i), state)
  const hidden = letters.map((f, i) => ({ ...f, spot: spotIdxs[i] }))
  let order
  ;[order] = rngShuffle(hidden.map((f) => f.audioKey), state)
  return {
    hidden, // letters with their hiding spots
    order, // the sequence Kokeb calls them in
    cursor: 0,
    found: [],
    wrong: 0,
    lastWrong: null,
    status: hidden.length ? 'seek' : 'done',
  }
}

export const huntTarget = (ctx) => (ctx.status === 'seek' ? ctx.order[ctx.cursor] : null)

/** TAP the letter at `key`. Correct advances the call; wrong ducks the letter
    and is counted (never punished — the same call just repeats). Taps on
    already-found letters or after the hunt ends are rejected, not absorbed. */
export function huntTransition(ctx, event) {
  if (event.type !== 'TAP') return { next: ctx, accepted: false }
  if (ctx.status !== 'seek') return { next: ctx, accepted: false }
  const key = event.key
  if (!ctx.hidden.some((f) => f.audioKey === key)) return { next: ctx, accepted: false }
  if (ctx.found.includes(key)) return { next: ctx, accepted: false }
  if (key === huntTarget(ctx)) {
    const found = [...ctx.found, key]
    const cursor = ctx.cursor + 1
    return {
      next: { ...ctx, found, cursor, lastWrong: null, status: cursor >= ctx.order.length ? 'done' : 'seek' },
      accepted: true,
    }
  }
  return { next: { ...ctx, wrong: ctx.wrong + 1, lastWrong: key }, accepted: true }
}

/* ── once-a-day record (storage at the edge, like streak/gift) ── */

export function loadHunt() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { lastDay: null, days: 0 }
  } catch {
    return { lastDay: null, days: 0 }
  }
}
export function huntDoneToday(today = dayStamp()) {
  return loadHunt().lastDay === today
}
/** Record today's hunt as finished; counts distinct hunt days. */
export function markHuntDone(today = dayStamp()) {
  const s = loadHunt()
  const next = s.lastDay === today ? s : { lastDay: today, days: (s.days || 0) + 1 }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* session-only */
  }
  return next
}
