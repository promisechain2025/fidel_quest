/* ============================================================================
   ማማ (Tower) — design mock data
   ----------------------------------------------------------------------------
   Design-only. Not a game, not in the backpack, and not registered with the
   app progress store. Words, pictures and recordings are the ones the app
   already ships (Amharic brick list). Decoys are the nearest vowel-order
   siblings of the next letter, never another letter of the answer.

   A real build would report through platform/appProgress.js. A visit on enter,
   and a finished round when a tower lights up. The area id `mama` is
   deliberately not in the progress area list. `tower` already belongs to
   Letter Tower. This file does not call either helper.
   ========================================================================== */
import { ALL_FORMS, INDEXES } from './platform/ethiopic'

/** Tibeb pigments (madder, ochre, lapis, malachite). */
export const MAMA_PIGMENTS = ['#a8463d', '#c0983f', '#40608c', '#57854e']

export const MAMA_SCENES = ['pick', 'play', 'miss', 'win', 'city']

/** One sample word per level, each already in the brick-word list. */
export const MAMA_LEVELS = [
  { id: 1, geez: 'ላም', latin: 'lam', pic: 'cow', glow: true, speed: 'slow', hearOnly: false },
  { id: 2, geez: 'ኮከብ', latin: 'kokeb', pic: 'star', glow: false, speed: 'mid', hearOnly: false },
  { id: 3, geez: 'አንበሳ', latin: 'anbesa', pic: 'lion', glow: false, speed: 'fast', hearOnly: true },
]

/** Finished words become buildings. The last one is the tower just completed. */
export const CITY_WORDS = [
  { geez: 'ላም', latin: 'lam', pic: 'cow' },
  { geez: 'ቤት', latin: 'biet', pic: 'house' },
  { geez: 'ኮከብ', latin: 'kokeb', pic: 'star' },
  { geez: 'አንበሳ', latin: 'anbesa', pic: 'lion', fresh: true },
]

/** Where the progress tracker would attach. Shown in the mock, not called. */
export const PROGRESS_HOOK = Object.freeze({
  area: 'mama',
  visit: 'trackScreen',
  round: 'noteRound',
})

export const lettersOf = (geez) => Array.from(geez)

/** Nearest other orders of the same family, skipping the answer letters.
    Stable: closer order first, then lower order. No randomness. */
export function nearestSiblings(char, avoid = [], n = 2) {
  const form = INDEXES.byChar.get(char)
  if (!form) return []
  const skip = new Set([char, ...avoid])
  return ALL_FORMS
    .filter((f) => f.familyId === form.familyId && !skip.has(f.char))
    .sort((a, b) => Math.abs(a.order - form.order) - Math.abs(b.order - form.order) || a.order - b.order)
    .slice(0, n)
    .map((f) => f.char)
}

/** The staged frame for a scene. Play/miss show the second brick still in the air. */
export function poseFor(scene, level) {
  const letters = lettersOf(level.geez)
  if (scene === 'win') return { letters, placed: letters.length, falling: null, bounce: null, bite: null }
  const placed = 1
  const next = letters[placed]
  if (scene === 'miss') {
    const [bounce, bite] = nearestSiblings(next, letters, 2)
    return { letters, placed, falling: null, bounce, bite }
  }
  return { letters, placed, falling: next, bounce: null, bite: null }
}

export function sceneFromSearch(search) {
  const scene = new URLSearchParams(search).get('scene')
  return MAMA_SCENES.includes(scene) ? scene : 'pick'
}
