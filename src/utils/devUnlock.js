/* Testing helper: unlock ALL content so every game, level, and letter is
   reachable without playing through the Journey first. Triggered only by an
   explicit URL query param, so it never fires for a normal player:

     ?unlock  - mark every node/level/island complete (and grant all wearables)
     ?reset   - wipe progress back to a brand-new player

   Purely local (writes only progress keys in localStorage), reversible, and
   offline. Handy for QA and for showing the app fully populated. */
import { JOURNEY, saveJourney, grantReward } from '../journey'

const CLASSIC_KEY = 'fidel-quest-progress-v1'
const SKY_KEY = 'fq3.skylands'
const PROGRESS_KEYS = ['fq.journey.v1', CLASSIC_KEY, SKY_KEY, 'fq2.runner', 'fq.onboarded.v1', 'fq.learn.v1', 'fq2.progress']

export function unlockEverything() {
  // Journey: every node done + every wearable owned and equipped.
  const p = { version: 1, done: {}, collection: { owned: [], worn: {} } }
  JOURNEY.forEach((n) => { p.done[n.id] = { stars: 3 } })
  JOURNEY.forEach((n) => grantReward(p, n.id))
  saveJourney(p)
  // Classic: three stars on every level unlocks all seven.
  try {
    localStorage.setItem(CLASSIC_KEY, JSON.stringify({ stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 }, bestScore: 0, missCounts: {} }))
  } catch { /* storage blocked */ }
  // Skylands: all four islands learned and beaten.
  try {
    localStorage.setItem(SKY_KEY, JSON.stringify({ sessionsCompleted: 4, learnedSessions: 4 }))
  } catch { /* storage blocked */ }
  // Don't nag with the first-run onboarding once everything is open.
  try { localStorage.setItem('fq.onboarded.v1', '1') } catch { /* ignore */ }
}

export function resetEverything() {
  for (const k of PROGRESS_KEYS) {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  }
}

/** Apply ?unlock / ?reset from the URL, then strip the param so a refresh does
   not re-run it. Call once before the app mounts. */
export function applyUrlUnlock() {
  if (typeof window === 'undefined') return
  let q
  try { q = new URLSearchParams(window.location.search) } catch { return }
  const doReset = q.has('reset')
  const doUnlock = q.has('unlock')
  if (!doReset && !doUnlock) return
  if (doReset) resetEverything()
  else unlockEverything()
  try {
    q.delete('unlock'); q.delete('reset')
    const url = window.location.pathname + (q.toString() ? `?${q}` : '') + window.location.hash
    window.history.replaceState(null, '', url)
  } catch { /* history unavailable; the param just stays in the address bar */ }
}
