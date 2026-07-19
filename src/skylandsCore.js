/* ============================================================================
   FIDEL SKYLANDS — pure core (data + seeded question factory)
   ----------------------------------------------------------------------------
   Split from FidelSkylands.jsx so the 2D fallback (ArcadeFallback.jsx) and
   the tests can use the sessions and quiz builders WITHOUT statically
   importing the R3F scene — that import would drag the whole three.js
   stack into the home chunk and defeat the lazy 3D loading.
   No three/R3F imports may ever be added here.
   ========================================================================== */

import { rngShuffle } from './platform/rng'
import { FIDEL_FAMILIES, ORDERS as PACK_ORDERS } from './platform/ethiopic'
import { skylandsPlaces } from './platform/places'


/* Families come from the Ethiopic Engine (script table + active pack). */

/** Base (1st-order) form of every family: the teaching unit of this game. */
export const BASE_FORMS = FIDEL_FAMILIES.map((f, i) => ({
  char: Array.from(f.chars)[0],
  sound: f.consonant + PACK_ORDERS[0].vowel,
  audioKey: `${f.id}-1`,
  familyIndex: i,
}))
export const FORM_BY_KEY = new Map(BASE_FORMS.map((f) => [f.audioKey, f]))

const SESSION_FRUIT = ['#ff7a59', '#ffc24b', '#8ed069', '#5db7ff']

/* Island geography follows the language being learned (platform/places.js):
   Ethiopian islands for Amharic, Eritrea + Axum for Tigrinya. */
const SESSION_TITLES = ['First Letters', 'More Letters', 'Even More Letters', 'The Last Letters']

export const SESSIONS = skylandsPlaces().map((placeSpec, i) => ({
  n: i + 1,
  title: SESSION_TITLES[i],
  ...placeSpec,
  fruit: SESSION_FRUIT[i],
  pool: BASE_FORMS.slice(i * 8, i === 3 ? BASE_FORMS.length : i * 8 + 8).map((f) => f.audioKey),
}))

/** Cumulative pool for game level n: sessions 1..n. */
export const cumulativePool = (n) => SESSIONS.slice(0, n).flatMap((s) => s.pool)
export const sessionOfKey = (key) => SESSIONS.find((s) => s.pool.includes(key))
/** Every base letter - used when the player opts into "all letters" instead of
   the default island-cumulative pool. */
export const ALL_BASE = BASE_FORMS.map((f) => f.audioKey)

/* ============================================================================
   §2 QUESTIONS (seeded, cumulative, twin-safe) — over the shared platform RNG
   ========================================================================== */

/**
 * Level n quiz: 5+n questions over the cumulative pool. Twin letters that
 * share a sound are never shown together. Recent-session letters are
 * guaranteed at least half the questions so new material gets practiced.
 */
export function buildQuiz(n, seed, allForms = false) {
  const pool = allForms ? ALL_BASE : cumulativePool(n)
  const fresh = SESSIONS[n - 1].pool
  const older = pool.filter((k) => !fresh.includes(k))
  const count = 5 + n
  const optionCount = Math.min(4 + Math.ceil(n / 2), 6)
  let state = seed
  let freshShuffled, olderShuffled
  ;[freshShuffled, state] = rngShuffle(fresh, state)
  ;[olderShuffled, state] = rngShuffle(older, state)
  const freshCount = Math.min(freshShuffled.length, Math.ceil(count / 2))
  let targets = [...freshShuffled.slice(0, freshCount), ...olderShuffled.slice(0, count - freshCount)]
  // Cycle if a session pool is smaller than its quota (defensive).
  while (targets.length < count) targets.push(freshShuffled[targets.length % freshShuffled.length])
  ;[targets, state] = rngShuffle(targets, state)

  const questions = targets.map((target) => {
    const sound = FORM_BY_KEY.get(target).sound
    let distractors
    ;[distractors, state] = rngShuffle(
      pool.filter((k) => k !== target && FORM_BY_KEY.get(k).sound !== sound),
      state,
    )
    let options
    ;[options, state] = rngShuffle([target, ...distractors.slice(0, optionCount - 1)], state)
    return { target, options }
  })
  return questions
}

/**
 * Jibby's Snack Attack: the boss review. He steals three letters from
 * EARLIER sessions (the review material); level 1 steals from its own pool.
 * Stolen letters have pairwise-distinct sounds so each is findable by ear.
 */
export function pickStolen(n, seed, allForms = false) {
  const pool = allForms ? ALL_BASE : cumulativePool(Math.max(1, n - 1))
  const [shuffled] = rngShuffle(pool, (seed ^ 0x9e37) | 1)
  const chosen = []
  for (const k of shuffled) {
    if (chosen.length === 3) break
    const sound = FORM_BY_KEY.get(k).sound
    if (!chosen.some((c) => FORM_BY_KEY.get(c).sound === sound)) chosen.push(k)
  }
  return chosen
}
