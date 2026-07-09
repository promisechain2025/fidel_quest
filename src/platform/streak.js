/* ============================================================================
   STREAK  —  the daily-habit engine (retention)
   ----------------------------------------------------------------------------
   A day-granular streak: how many days in a row the child has played. Stored in
   fq.streak.v1 = { count, best, lastDay }. The transition is a pure function of
   (state, today) so it is testable without a clock; the wrapper stamps "today"
   from the device. Playing again the same day does not change the count; a gap
   of a day or more resets to 1. See docs/family-voice.md siblings for the wider
   retention plan.
   ========================================================================== */

const KEY = 'fq.streak.v1'
const DAY_MS = 86400000

/** 'YYYY-MM-DD' for a Date (local time). */
export function dayStamp(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** The calendar day before a 'YYYY-MM-DD' stamp. */
export function prevDay(stamp) {
  const d = new Date(`${stamp}T00:00:00`)
  return dayStamp(new Date(d.getTime() - DAY_MS))
}

const empty = () => ({ count: 0, best: 0, lastDay: null })

export function loadStreak() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && typeof raw.count === 'number') return { count: raw.count, best: raw.best || raw.count, lastDay: raw.lastDay || null }
  } catch { /* ignore */ }
  return empty()
}

function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* session only */ }
}

/** Pure: fold today's play into the streak. Same day = unchanged; yesterday =
   +1; a longer gap = restart at 1. Returns { state, incremented }. */
export function advanceStreak(state, today) {
  const s = state || empty()
  if (s.lastDay === today) return { state: s, incremented: false }
  const count = s.lastDay === prevDay(today) ? s.count + 1 : 1
  const next = { count, best: Math.max(s.best || 0, count), lastDay: today }
  return { state: next, incremented: true }
}

/** Record a day of play and persist. Returns { count, best, incremented }. */
export function bumpStreak(today = dayStamp()) {
  const { state, incremented } = advanceStreak(loadStreak(), today)
  save(state)
  return { ...state, incremented }
}

/** Read-only current streak (for display). */
export function currentStreak() {
  return loadStreak().count
}
