/* ============================================================================
   PARENTAL GATE CORE — challenge generation + wrong-answer lockout. Pure apart
   from the tiny persisted lock record, so it is unit-testable.
   ----------------------------------------------------------------------------
   Apple 1.3 / 5.1.4 (Kids) want gates a young child cannot pass by chance or
   memory. Parents found the old arithmetic step (7 × 6, 27 + 38) hard, so the
   gate is now "hold the button, then type the number shown in words":
     - a fresh random number from 11 to 99 is shown ONLY spelled out in the
       app-text language ("forty-seven", "siebenundvierzig"); the digits never
       appear on screen. Reading a written-out two-digit number and turning it
       into digits is adult / older-reader knowledge that pre-readers in the
       Kids age bands do not have, and the number changes every time so it
       cannot be memorised;
     - it is answered on a keypad, so a random guess has a 1-in-89 chance
       (11..99), not 1-in-3 like the old "tap the number" puzzles;
     - "Different number" swaps the number without counting as a miss (it
       gives a guesser nothing);
     - after MAX_MISSES wrong answers the gate locks for a cooldown that
       doubles on each lock (30s, 60s, 120s ... capped at 5 min), persisted so
       closing and reopening the gate does not reset it. Three blind guesses
       pass about 3.4% of the time, then the waits grow.
   ========================================================================== */
import { numberWords } from './numberWords'

const KEY = 'fq.gate.v1'
export const MAX_MISSES = 3
export const BASE_LOCK_MS = 30_000
export const MAX_LOCK_MS = 5 * 60_000
export const MIN_NUMBER = 11
export const MAX_NUMBER = 99

const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1))

/** A random challenge: { text: 'forty-seven', answer: 47 }. `avoid` keeps a
    "Different number" from landing on the same number again. */
export function makeChallenge(lang = 'en', rand = Math.random, avoid) {
  let n = randInt(rand, MIN_NUMBER, MAX_NUMBER)
  if (n === avoid) n = n === MAX_NUMBER ? MIN_NUMBER : n + 1
  return { text: numberWords(n, lang), answer: n }
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
