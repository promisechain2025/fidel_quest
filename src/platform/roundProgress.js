/* ============================================================================
   ROUND PROGRESS — shared level / re-deal bookkeeping for the learning games
   ----------------------------------------------------------------------------
   Echo Match, Vowel Train, Word Market and Kebero Beats all follow one
   contract, so it lives here once:

   - A level UNLOCKS only when a round is finished at UNLOCK_ACCURACY
     first-try accuracy - completion alone never opens the next level.
   - ADAPTIVE RE-DEAL: an item (letter key, or word id) missed this round is
     DUE for the next REDEAL_ROUNDS rounds; dealt and answered cleanly, its
     count drops by one; not dealt, it keeps its count.
   - Per-game state { unlocked, due, best } is stored on-device only (never
     sent), sanitised on load.
   Pure helpers + a tiny storage adapter.
   ========================================================================== */

export const UNLOCK_ACCURACY = 0.75
export const REDEAL_ROUNDS = 2

/** Stars for a first-try accuracy (0..1): 3 perfect, 2 at the unlock bar. */
export function starsFor(accuracy) {
  return accuracy >= 1 ? 3 : accuracy >= UNLOCK_ACCURACY ? 2 : accuracy > 0 ? 1 : 0
}

/** Next re-deal schedule from a round's { missed, mastered }. Pure. */
export function nextDue(due, summary) {
  const out = { ...due }
  for (const k of summary.missed || []) out[k] = REDEAL_ROUNDS
  for (const k of summary.mastered || []) {
    if (out[k] > 0) out[k] -= 1
    if (!out[k]) delete out[k]
  }
  return out
}

/** Due items, most urgent first (stable by id). */
export function dueList(due) {
  return Object.entries(due || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([k]) => k)
}

/** Fold a finished round in: unlock the next level only when it PASSED. */
export function applyRound(state, level, summary, maxLevel) {
  const unlocked = summary.passed ? Math.min(maxLevel, Math.max(state.unlocked, level + 1)) : state.unlocked
  const best = { ...state.best, [level]: Math.max(state.best[level] || 0, summary.stars) }
  return { state: { unlocked, due: nextDue(state.due, summary), best }, unlockedNew: unlocked > state.unlocked }
}

/** Storage adapter for one game. `validId` filters stored due ids. */
export function roundStore(key, maxLevel, validId = (id) => typeof id === 'string' && id.length > 0 && id.length < 64) {
  const blank = () => ({ unlocked: 1, due: {}, best: {} })
  return {
    key,
    load() {
      try {
        const v = JSON.parse(localStorage.getItem(key) || 'null')
        if (!v || typeof v !== 'object') return blank()
        const n = Number(v.unlocked)
        const due = {}
        for (const [k, c] of Object.entries(v.due || {})) if (validId(k) && Number(c) > 0) due[k] = Math.min(REDEAL_ROUNDS, Math.floor(Number(c)))
        const best = {}
        for (const [lv, s] of Object.entries(v.best || {})) {
          const l = Number(lv)
          if (l >= 1 && l <= maxLevel) best[lv] = Math.max(0, Math.min(3, Math.floor(Number(s) || 0)))
        }
        return { unlocked: n >= 1 && n <= maxLevel ? Math.floor(n) : 1, due, best }
      } catch {
        return blank()
      }
    },
    save(state) {
      try {
        localStorage.setItem(key, JSON.stringify(state))
      } catch {
        /* session-only */
      }
    },
  }
}

/** A letter audioKey ('le-3'). */
export const isLetterKey = (k) => /^[a-z]+-\d$/.test(k)
