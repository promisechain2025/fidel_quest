/* ============================================================================
   FIDEL TRAFFIC — the little bit that persists
   ----------------------------------------------------------------------------
   Only a keepsake: the best shift score, how many intersections have ever been
   cleared, and how many perfect shifts. No per-player records - group play is
   turn-taking on one phone, and the podium lives for the length of the game,
   not forever. Registered in progress.js so it exports/imports/wipes with the
   rest of the child's progress (and swaps per child profile).
   ========================================================================== */
import { progressChanged } from './childModel'

const KEY = 'fq.traffic.v1'
const EMPTY = { best: 0, cleared: 0, perfect: 0, shifts: 0 }

export function loadTraffic() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    if (!v || typeof v !== 'object') return { ...EMPTY }
    return {
      best: Math.max(0, Math.round(Number(v.best) || 0)),
      cleared: Math.max(0, Math.round(Number(v.cleared) || 0)),
      perfect: Math.max(0, Math.round(Number(v.perfect) || 0)),
      shifts: Math.max(0, Math.round(Number(v.shifts) || 0)),
    }
  } catch {
    return { ...EMPTY }
  }
}

/** File one finished shift. Returns the stored totals. */
export function saveTrafficRun({ score = 0, cleared = 0, perfect = false } = {}) {
  const cur = loadTraffic()
  const next = {
    best: Math.max(cur.best, Math.round(Number(score) || 0)),
    cleared: cur.cleared + Math.max(0, Math.round(Number(cleared) || 0)),
    perfect: cur.perfect + (perfect ? 1 : 0),
    shifts: cur.shifts + 1,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
    progressChanged()
  } catch { /* session-only */ }
  return next
}
