/* BLOCK CHURCH (sample) - pure core for the snap-on vowel blocks game.
   One consonant family (ለ for the sample). The game calls a target form,
   the child snaps the matching vowel piece onto the consonant block; each
   correct snap adds one block to the toy church; all 7 completes the dome
   and cross. Pure + deterministic so it is easy to test. */

export const SAMPLE_FAMILY = 'le'
export const ORDERS = [1, 2, 3, 4, 5, 6, 7]

/** Deterministic shuffle (mulberry32) so a seed replays the same round. */
export function shuffled(list, seed = 1) {
  let a = seed >>> 0
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function initRound(seed = 1, orders = ORDERS) {
  return { queue: shuffled(orders, seed), built: 0, total: orders.length, misses: 0, last: null }
}

export const target = (s) => (s.built < s.total ? s.queue[s.built] : null)
export const isComplete = (s) => s.built >= s.total

/** Try snapping piece `order` onto the slot. Returns the next state;
    `last` is 'right' | 'wrong' | 'done' for the renderer. */
export function snap(s, order) {
  if (isComplete(s)) return s
  if (order !== target(s)) return { ...s, misses: s.misses + 1, last: 'wrong' }
  const built = s.built + 1
  return { ...s, built, last: built >= s.total ? 'done' : 'right' }
}
