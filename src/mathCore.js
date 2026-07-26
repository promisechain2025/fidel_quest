/* ============================================================================
   MATH CORE - seeded arithmetic problem generator (numbers track)
   ----------------------------------------------------------------------------
   The first genuinely-new logic of the math track (see
   docs/general-learning-platform.md). PURE + SEEDED: every problem is a pure
   function of (levelId, seed) over the app's shared mulberry32 RNG
   (platform/rng.js) - no Math.random - so a round is reproducible and tests
   run headless, exactly like letterCatchCore.js.

   Correctness bar matches the fidel table: operands and answers are the truth
   a child learns, so mathCore.test.js exhaustively verifies every generated
   problem (operands >= 1, the stated operation actually equals the answer,
   the answer is among the choices, choices are distinct and in range) across
   many seeds and every level.

   Scope: single-digit-ish addition and subtraction with results in 1..N, so
   every number is displayable as a Ge'ez numeral (via data/numerals.js) and
   there is no zero (which Ge'ez has no glyph for). Multiplication/division and
   larger ranges are deliberately left for later levels.
   ========================================================================== */

import { rngNext, rngShuffle } from './platform/rng'
import { toGeez, fromGeez } from './data/numerals'

// Each level: an operation and a cap. Addition caps the SUM; subtraction caps
// the MINUEND (and keeps the result >= 1). Ordered easiest-first.
export const MATH_LEVELS = [
  { id: 'add5', op: '+', max: 5 },
  { id: 'add10', op: '+', max: 10 },
  { id: 'add20', op: '+', max: 20 },
  { id: 'sub10', op: '-', max: 10 },
  { id: 'sub20', op: '-', max: 20 },
]

export const CHOICES_PER_PROBLEM = 3

const seedOf = (n) => (Number(n) >>> 0) || 1
// inclusive integer in [lo, hi] threaded through the shared RNG.
function pickInt(state, lo, hi) {
  const [v, next] = rngNext(state)
  return [lo + Math.floor(v * (hi - lo + 1)), next]
}

/** One problem, deterministic in (level, seed). Returns
    { op, a, b, answer, choices, geez: { a, b, answer } }. `geez` mirrors each
    number as a Ge'ez numeral so a screen can show both scripts. */
export function makeProblem(level, seed) {
  let s = seedOf(seed)
  let a, b, answer
  if (level.op === '-') {
    ;[a, s] = pickInt(s, 2, level.max)      // minuend 2..max
    ;[b, s] = pickInt(s, 1, a - 1)          // subtrahend 1..a-1 -> result >= 1
    answer = a - b
  } else {
    ;[a, s] = pickInt(s, 1, level.max - 1)  // first addend 1..max-1
    ;[b, s] = pickInt(s, 1, level.max - a)  // second so a+b <= max
    answer = a + b
  }
  // Plausible distractors: nearby numbers, in the displayable 1..100 range.
  const near = []
  for (let d = 1; d <= 8; d++) {
    for (const cand of [answer - d, answer + d]) {
      if (cand >= 1 && cand <= 100 && cand !== answer) near.push(cand)
    }
  }
  let pool
  ;[pool, s] = rngShuffle([...new Set(near)], s)
  const distractors = pool.slice(0, CHOICES_PER_PROBLEM - 1)
  let choices
  ;[choices, s] = rngShuffle([answer, ...distractors], s)
  return {
    op: level.op, a, b, answer, choices,
    geez: { a: toGeez(a), b: toGeez(b), answer: toGeez(answer) },
  }
}

/** A round of `count` problems for a level, deterministic in (levelId, seed).
    Each problem draws from a distinct derived seed so the set varies. */
export function buildRound(levelId, seed, count = 6) {
  const level = MATH_LEVELS.find((l) => l.id === levelId) || MATH_LEVELS[0]
  const base = seedOf(seed)
  const problems = []
  for (let i = 0; i < count; i++) {
    problems.push(makeProblem(level, (base + i * 0x9e3779b1) >>> 0))
  }
  return problems
}

/** Is `pick` the right answer to `problem`? */
export function checkAnswer(problem, pick) {
  return !!problem && Number(pick) === problem.answer
}

/** Count correct picks over a round (picks aligned by index; missing = wrong). */
export function scoreRound(problems, picks = []) {
  return problems.reduce((n, p, i) => n + (checkAnswer(p, picks[i]) ? 1 : 0), 0)
}

// re-exported so a renderer/test has the glyph helpers from one import.
export { toGeez, fromGeez }
