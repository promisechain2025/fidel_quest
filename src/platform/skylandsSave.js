/* The Skylands save (fq3.skylands) - shared by the 3D map, the 2D fallback
   and the QA unlock, so nobody touches the key directly.
   sessionsCompleted = islands beaten; learnedSessions = learning phases. */
import { progressChanged } from './childModel'

const KEY = 'fq3.skylands'

export function loadSkySave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY)) || {}
    return { sessionsCompleted: s.sessionsCompleted | 0, learnedSessions: s.learnedSessions | 0 }
  } catch {
    return { sessionsCompleted: 0, learnedSessions: 0 }
  }
}

export function persistSkySave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save))
  } catch {
    /* session-only */
  }
  progressChanged()
}

/** Clearing island N on ANY surface counts once, never regresses. */
export function markIslandCleared(island) {
  const s = loadSkySave()
  persistSkySave({
    sessionsCompleted: Math.max(s.sessionsCompleted, island | 0),
    learnedSessions: Math.max(s.learnedSessions, island | 0),
  })
}
