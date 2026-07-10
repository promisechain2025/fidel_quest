/* Classic mode's stars/bests (fidel-quest-progress-v1) - shared by the
   Classic page and the QA unlock, so nobody touches the key directly. */
import { progressChanged } from './childModel'

const KEY = 'fidel-quest-progress-v1'

export function loadClassicProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY)) || {}
    return {
      stars: parsed.stars || {},
      bestScore: parsed.bestScore || 0,
      missCounts: parsed.missCounts || {},
    }
  } catch {
    return { stars: {}, bestScore: 0, missCounts: {} }
  }
}

export function saveClassicProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    /* storage unavailable (private mode) - session-only */
  }
  progressChanged()
}
