/* ============================================================================
   LETTER SCOPE — which letters the games draw from
   ----------------------------------------------------------------------------
   By default the games practise only the letters the child has LEARNED on the
   Journey so far, so a beginner is never quizzed on letters they haven't met.
   A per-game toggle switches to ALL letters for anyone who wants the whole
   abugida. The choice is one shared, persisted preference (fq.scope.v1) so it
   stays consistent across games; each game still owns a little state seeded
   from it and writes back on toggle.

   'learned' falls back to the first family when nothing is learned yet, so a
   game launched by a brand-new player still has something to play.
   ========================================================================== */

import { FIDEL_FAMILIES, ALL_FORMS } from './ethiopic'
import { loadJourney, learnedFamilyIds } from '../journey'

const KEY = 'fq.scope.v1'

export const SCOPES = Object.freeze({ LEARNED: 'learned', ALL: 'all' })

export function getScope() {
  try {
    return localStorage.getItem(KEY) === SCOPES.ALL ? SCOPES.ALL : SCOPES.LEARNED
  } catch {
    return SCOPES.LEARNED
  }
}

export function setScope(scope) {
  try {
    localStorage.setItem(KEY, scope === SCOPES.ALL ? SCOPES.ALL : SCOPES.LEARNED)
  } catch {
    /* session-only; the game still honours the in-memory choice this run */
  }
}

/** The set of family ids allowed by the scope, or null for "all" (no filter).
   In 'learned' mode, empty progress falls back to the first family so a game is
   never left with nothing to show. */
export function scopedFamilySet(scope = getScope(), p = loadJourney()) {
  if (scope === SCOPES.ALL) return null
  const learned = learnedFamilyIds(p)
  return new Set(learned.length ? learned : [FIDEL_FAMILIES[0].id])
}

/** Whether a family id is in scope (always true for "all"). */
export function familyInScope(familyId, scope = getScope(), p = loadJourney()) {
  const set = scopedFamilySet(scope, p)
  return !set || set.has(familyId)
}

/** Base (1st-order) audioKeys for the scope, e.g. ['ha-1','la-1', ...]. */
export function scopedBaseForms(scope = getScope(), p = loadJourney()) {
  const set = scopedFamilySet(scope, p)
  return FIDEL_FAMILIES.filter((f) => !set || set.has(f.id)).map((f) => `${f.id}-1`)
}

/** Every form (all 7 orders) of every family in the scope, as form objects. */
export function scopedForms(scope = getScope(), p = loadJourney()) {
  const set = scopedFamilySet(scope, p)
  return set ? ALL_FORMS.filter((f) => set.has(f.familyId)) : ALL_FORMS
}

/** The set of family INDICES (0..32) allowed by the scope, or null for "all".
   Classic mode keys families by position (its data source has no shared id),
   and the canonical family order matches ethiopic's, so a position set bridges
   the two. */
export function scopedFamilyIndexSet(scope = getScope(), p = loadJourney()) {
  const set = scopedFamilySet(scope, p)
  if (!set) return null
  const idxs = new Set()
  FIDEL_FAMILIES.forEach((f, i) => { if (set.has(f.id)) idxs.add(i) })
  return idxs
}

/** Count of families the child has learned (for the toggle's helper text). */
export function learnedCount(p = loadJourney()) {
  return learnedFamilyIds(p).length
}
