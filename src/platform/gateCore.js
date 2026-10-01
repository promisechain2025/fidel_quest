/* ============================================================================
   PARENTAL GATE CORE — challenge generation + wrong-answer lockout. Pure apart
   from the tiny persisted lock record, so it is unit-testable.
   ----------------------------------------------------------------------------
   Apple 1.3 (Kids) wants gates a child cannot pass by chance or memory. The
   old gate rotated three fixed "tap the number" puzzles with 1-in-3 odds and
   unlimited retries. Now:
     - a fresh random arithmetic question every time (two-digit sums with a
       carry, or a times-table product), answered on a keypad - a guess has
       about a 1-in-100 chance, not 1-in-3;
     - after MAX_MISSES wrong answers the gate locks for a cooldown that
       doubles on each lock (30s, 60s, 120s ... capped at 5 min), persisted so
       closing and reopening the gate does not reset it.
   ========================================================================== */
const KEY = 'fq.gate.v1'
export const MAX_MISSES = 2
export const BASE_LOCK_MS = 30_000
export const MAX_LOCK_MS = 5 * 60_000

const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1))

/** A random question: { text: '7 × 6', answer: 42 } or { text: '27 + 38', answer: 65 }. */
export function makeChallenge(rand = Math.random) {
  if (rand() < 0.5) {
    const a = randInt(rand, 3, 9)
    const b = randInt(rand, 4, 9)
    return { text: `${a} × ${b}`, answer: a * b }
  }
  // two-digit addition that always carries (ones digits sum to >= 10)
  const a1 = randInt(rand, 1, 4)
  const b1 = randInt(rand, 1, 4)
  const a0 = randInt(rand, 2, 9)
  const b0 = randInt(rand, Math.max(1, 10 - a0), 9)
  const a = a1 * 10 + a0
  const b = b1 * 10 + b0
  return { text: `${a} + ${b}`, answer: a + b }
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s && typeof s === 'object' ? s : {}
  } catch {
    return {}
  }
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* session only */ }
}

/** Milliseconds left on an active lockout (0 when the gate is open). */
export function lockRemaining(now = Date.now()) {
  const s = load()
  return s.lockUntil && s.lockUntil > now ? s.lockUntil - now : 0
}

/** Record a wrong answer; returns the lock length started (0 if none). */
export function recordMiss(now = Date.now()) {
  const s = load()
  const misses = (s.misses || 0) + 1
  if (misses < MAX_MISSES) {
    save({ ...s, misses })
    return 0
  }
  const locks = (s.locks || 0) + 1
  const ms = Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** (locks - 1))
  save({ misses: 0, locks, lockUntil: now + ms })
  return ms
}

/** A correct answer clears misses and the escalation. */
export function recordPass() {
  save({})
}
