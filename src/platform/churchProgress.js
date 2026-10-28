/* ============================================================================
   CHURCH PROGRESS - which consonant families this child has built in Block
   Church, with 1-3 stars each. Stored under fq.church.v1, which is in the
   progress registry (progress.js), so it is per child profile, backed up and
   wiped with the rest of the child's progress. On-device only, sanitised on
   load; a failed write just means the progress lasts this session.
   ========================================================================== */
import { noteDone } from './appProgress'

export const CHURCH_KEY = 'fq.church.v1'
const validId = (id) => typeof id === 'string' && /^[a-z]{1,8}$/.test(id)

/** Stars for a finished family from its wrong-snap count. */
export const starsForMisses = (misses) => (misses <= 0 ? 3 : misses <= 2 ? 2 : 1)

export const churchStore = {
  key: CHURCH_KEY,
  /** -> { done: { [familyId]: 1|2|3 } } */
  load() {
    try {
      const v = JSON.parse(localStorage.getItem(CHURCH_KEY) || 'null')
      const done = {}
      if (v && typeof v === 'object' && v.done && typeof v.done === 'object') {
        for (const [id, st] of Object.entries(v.done)) {
          const n = Math.floor(Number(st))
          if (validId(id) && n >= 1 && n <= 3) done[id] = n
        }
      }
      return { done }
    } catch {
      return { done: {} }
    }
  },
  save(state) {
    try {
      localStorage.setItem(CHURCH_KEY, JSON.stringify({ done: state.done }))
    } catch {
      /* session-only */
    }
    noteDone() // a built family is app-level progress too
  },
}

/** Fold one finished family in: the best star count is kept. Pure. */
export function withFamilyBuilt(state, id, stars) {
  if (!validId(id)) return state
  const s = Math.max(1, Math.min(3, Math.floor(stars) || 1))
  return { done: { ...state.done, [id]: Math.max(state.done[id] || 0, s) } }
}
