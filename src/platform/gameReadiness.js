/* ============================================================================
   GAME READINESS — which side games make sense yet
   ----------------------------------------------------------------------------
   The Backpack used to show every game from the very first letter, and the
   games dutifully dealt boards they could not fill. With one family learned,
   Match deals a "pair" of the same letter twice, Bingo repeats that letter
   across nine cells (so "daub the one Kokeb called" becomes a coin flip), and
   Build silently falls back to words spelled from letters the child has never
   met. A game that cannot be played honestly is worse than a game that is not
   there yet, so each one declares the smallest number of learned families at
   which its board is real, and its tile only appears from there.

   The thresholds are derived, not felt:

     ladder / lineup  1  one family IS the board - its seven vowel orders.
     match            4  the gentlest board is 4 pairs (memoryCore's 'easy'),
                         which needs 4 distinct letters.
     workshop         4  where the first fully decodable illustrated word
                         appears in the Amharic pack (ላም, ሎሚ). Locked to the
                         word data by gameReadiness.test.js rather than
                         trusted as a constant.
     bingo            9  a 3x3 card needs 9 distinct letters or initBingo
                         fills it by repeating the pool.
     market           0  Ge'ez numerals and coins, no letters at all.

   The ALL letter-scope is the deliberate override: a grown-up who switches
   the games to the whole abugida (or a child using an app that already knows
   the letters) gets every game back at once. Readiness is about the child's
   pool being too small, not about withholding content.
   ========================================================================== */

import { SCOPES, getScope } from './letterScope'
import { loadJourney, learnedFamilyIds } from '../journey'

/** Smallest learned-family count at which each game deals an honest board. */
export const GAME_MIN_FAMILIES = Object.freeze({
  ladder: 1,
  lineup: 1,
  match: 4,
  workshop: 4,
  bingo: 9,
  market: 0,
})

/** Whether `game` should be offered. Unknown games are always ready - a new
    game is visible by default and opts IN to a threshold. */
export function gameReady(game, { scope = getScope(), learned = null } = {}) {
  const min = GAME_MIN_FAMILIES[game]
  if (min == null || min === 0) return true
  if (scope === SCOPES.ALL) return true
  const n = learned == null ? learnedFamilyIds(loadJourney()).length : learned
  return n >= min
}

/** True while at least one game is still waiting on letters, so the Backpack
    can say "more games are coming" instead of just showing a shorter grid. */
export function gamesPending({ scope = getScope(), learned = null } = {}) {
  const n = learned == null ? learnedFamilyIds(loadJourney()).length : learned
  return Object.keys(GAME_MIN_FAMILIES).some((g) => !gameReady(g, { scope, learned: n }))
}
