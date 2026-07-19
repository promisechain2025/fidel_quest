/* ============================================================================
   PLACEMENT — test out of letters the child already knows
   ----------------------------------------------------------------------------
   A heritage child who already reads half the fidel should not grind the
   path from ሀ. Placement is a strict ladder of short seeded checks: each
   window covers the next WINDOW_SIZE families of the journey order with two
   listen-and-pick questions per family (the base form plus one other vocal
   order, distractors in-window). Passing a window (PASS_RATE first-try)
   credits it and offers the next; the FIRST miss ends the ladder - what the
   child could not show, they will learn on the path.

   Crediting is honest and mechanical: complete every journey node up to
   (not including) the first node that involves an unplaced family, capped
   before the vowel-orders lap, whose bosses placement's two questions per
   family have not earned. Completed nodes get 2 stars (tested out, not
   perfected) and their wearables - a placed child must never open a poorer
   closet than a played one.
   ========================================================================== */

import { FIDEL_FAMILIES } from './ethiopic'
import { rngNext } from './rng'
import { buildReviewQueue } from './coach'
import { JOURNEY, NodeKind, loadJourney, saveJourney, grantReward } from '../journey'
import { progressChanged } from './childModel'

export const WINDOW_SIZE = 4
export const PASS_RATE = 0.85
export const QUESTIONS_PER_FAMILY = 2

/** Journey-ordered family windows: [['ha','le','hha','me'], ...]. */
export function placementWindows(families = FIDEL_FAMILIES) {
  const ids = families.map((f) => f.id)
  const out = []
  for (let i = 0; i < ids.length; i += WINDOW_SIZE) out.push(ids.slice(i, i + WINDOW_SIZE))
  return out
}

/** The seeded check for one window: base form + one other order per family,
    distractors strictly in-window (buildReviewQueue keeps them in scope). */
export function buildPlacementQueue(seed, windowFamilies) {
  const [r] = rngNext(seed)
  const order = 2 + Math.floor(r * 6) // one of the 2nd..7th orders
  const priority = windowFamilies.flatMap((id) => [`${id}-1`, `${id}-${order}`])
  return buildReviewQueue(seed, windowFamilies, priority, windowFamilies.length * QUESTIONS_PER_FAMILY, [1, order])
}

/** First journey index that involves any family OUTSIDE the placed set,
    capped before the vowel-orders lap. Everything before it is creditable. */
export function placementCut(placedIds, journey = JOURNEY) {
  const placed = new Set(placedIds)
  for (let i = 0; i < journey.length; i++) {
    const n = journey[i]
    if (n.vowel) return i
    if (n.kind === NodeKind.LEARN && !placed.has(n.familyId)) return i
    if (n.kind === NodeKind.MIX && !n.families.every((id) => placed.has(id))) return i
  }
  return journey.length
}

/** Write the credit into the journey. Returns how many nodes were newly
    completed (0 = placement changed nothing; the path was already ahead). */
export function applyPlacement(placedIds) {
  const cut = placementCut(placedIds)
  const p = loadJourney()
  let credited = 0
  for (let i = 0; i < cut; i++) {
    const n = JOURNEY[i]
    if (p.done[n.id]) continue
    p.done[n.id] = { stars: 2, placed: true }
    grantReward(p, n.id)
    credited++
  }
  if (credited > 0) {
    saveJourney(p)
    progressChanged()
  }
  return credited
}
