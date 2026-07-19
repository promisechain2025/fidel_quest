/* ============================================================================
   SRS — a real per-form spaced-repetition schedule
   ----------------------------------------------------------------------------
   The answer ledger (telemetry.js) is capped at 600 events, so long-term
   forgetting data falls off the end; nothing guaranteed that a form learned
   in week 1 resurfaced before it decayed. This module is the missing
   scheduler: a compact per-form memory table updated on EVERY answer (the
   telemetry seam calls review()), scheduling each of the 231+ forms with an
   SM-2-style expanding interval.

     fq.srs.v1: { v: 1, f: { [audioKey]: [reps, easeX100, ivlDays, dueDay, lastDay] } }

   Arrays keep the table small (~30 bytes/form). Days are UTC day numbers
   (epochDay) so interval math is integer arithmetic. Pure selectors take
   the table as an argument; load/save wrap storage. The warm-up composes:
   trouble letters first (actual misses), then DUE forms (memory schedule),
   then stalest - so the daily five minutes services the forgetting curve
   instead of only the mistakes.
   ========================================================================== */
import { progressChanged } from './childModel'

const KEY = 'fq.srs.v1'

export const EASE_START = 250 // x100: 2.5
export const EASE_MIN = 130
export const EASE_MAX = 300

export const epochDay = (date = new Date()) => Math.floor(date.getTime() / 86400000)

export function loadSrs() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s && typeof s === 'object' && s.f && typeof s.f === 'object' ? s : { v: 1, f: {} }
  } catch {
    return { v: 1, f: {} }
  }
}

function saveSrs(table) {
  try {
    localStorage.setItem(KEY, JSON.stringify(table))
    progressChanged()
  } catch {
    /* scheduling must never break gameplay */
  }
}

/** Pure SM-2-lite transition for one form. Returns the new entry array.
    Spacing guard (the Anki rule): a CORRECT answer before the entry is due
    changes nothing - a six-phase lesson touches a form five times in ten
    minutes, and without this guard those crammed successes ratchet the
    interval to weeks with zero time-spacing evidence. Misses always count:
    forgetting is evidence whenever it happens. */
export function reviewEntry(entry, correct, today) {
  if (correct && entry && Array.isArray(entry) && entry.length >= 5 && today < entry[3]) return entry
  let [reps, ease, ivl] = entry || [0, EASE_START, 0]
  if (correct) {
    reps += 1
    ease = Math.min(EASE_MAX, ease + 5)
    ivl = reps === 1 ? 1 : reps === 2 ? 3 : Math.max(ivl + 1, Math.round((ivl * ease) / 100))
  } else {
    reps = 0
    ease = Math.max(EASE_MIN, ease - 20)
    ivl = 1
  }
  return [reps, ease, ivl, today + ivl, today]
}

/** Record one answer into the schedule. Called from the telemetry seam. */
export function srsReview(audioKey, correct, today = epochDay()) {
  if (!audioKey || typeof audioKey !== 'string') return
  // Letter forms only: telemetry also records word:/story:/sword: pseudo-key
  // events (all colon-namespaced), which must never occupy review slots.
  if (audioKey.includes(':')) return
  const table = loadSrs()
  table.f[audioKey] = reviewEntry(table.f[audioKey], !!correct, today)
  saveSrs(table)
}

/** Forms due for review (due day reached), most overdue first. Pure. */
export function dueForms(table, today = epochDay(), { limit = 20 } = {}) {
  const due = []
  for (const [key, e] of Object.entries(table.f || {})) {
    if (Array.isArray(e) && e.length >= 5 && e[3] <= today) due.push({ key, overdue: today - e[3], reps: e[0] })
  }
  return due.sort((a, b) => b.overdue - a.overdue || a.key.localeCompare(b.key)).slice(0, limit)
}

/** Convenience: due audioKeys straight from storage. */
export function dueKeys(today = epochDay(), opts) {
  return dueForms(loadSrs(), today, opts).map((d) => d.key)
}

/** How many forms the schedule is maintaining (Grown-Ups diagnostics). */
export function srsSize(table = loadSrs()) {
  return Object.keys(table.f || {}).length
}
