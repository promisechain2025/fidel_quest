/* ============================================================================
   PRACTICE TRACKER — the runtime around the pure practice.js core
   ----------------------------------------------------------------------------
   Installs once at app start. Feeds practice.step() from:
     - pointerdown anywhere (capture phase)          -> 'tap' (with x/y)
     - telemetry.recordAnswer (every game's answers)  -> 'answer'
     - audioEngine clip onended                        -> 'listen'
     - Journey node / hunt / homework finished        -> 'lesson' | 'game'
     - visibilitychange / pagehide / pageshow         -> 'hidden' | 'visible'
       (tab hidden, app backgrounded and screen locked all arrive here)
     - a 5 s tick so the ring moves while the child plays
   Persists to fq.practice.v1 at most every 5 s and on every hide, and asks
   the class sync queue to push today's row. Never throws into gameplay.
   ========================================================================== */
import { step, emptyRuntime, loadPractice, savePractice } from './practice'
import { queueDaySync, installPracticeSync } from './practiceSync'
import { setAnswerHook } from './telemetry'
import { setListenHook } from './audioEngine'
import { PRACTICE_EVENT, isPracticeMode, prayerOpen, prayerPage, prayerAudio, prayerClose } from './prayerPractice'

let state = null
let installed = false
let dirty = false
let lastSave = 0
const subs = new Set()
const now = () => Date.now()

function ensure() {
  if (!state) state = { rt: emptyRuntime(), days: loadPractice().days }
  return state
}

function persist(force = false) {
  if (!dirty) return
  const t = now()
  if (!force && t - lastSave < 5000) return
  lastSave = t
  dirty = false
  try {
    const p = loadPractice()
    savePractice({ days: state.days, goal: p.goal })
    queueDaySync(Object.keys(state.days).sort().slice(-2))
  } catch { /* never break play */ }
}

/** Feed one event. Public so game code can report 'trace', 'lesson', 'game'. */
export function notePractice(type, extra = {}) {
  try {
    ensure()
    state = step(state, { ...extra, type, t: extra.t ?? now() })
    dirty = true
    persist(type === 'hidden')
    subs.forEach((fn) => { try { fn() } catch { /* ignore */ } })
  } catch { /* never break play */ }
}

/** Prayer/practice-mode contract lives in prayerPractice.js (shared with the
    prayer book, PR #57). Re-exported here for app code. */
export { startPractice, endPractice, isPracticeMode, playCurrentPrayerOnly } from './prayerPractice'
export const prayerTracking = Object.freeze({ open: prayerOpen, page: prayerPage, audio: prayerAudio, close: prayerClose })

const PRAYER_TYPES = new Set(['practiceStart', 'practiceEnd', 'prayerOpen', 'prayerPage', 'prayerClose', 'prayerAudio'])
/** Bus listener: prayer-book events -> tracker events. Exported for tests. */
export function onPracticeBus(e) {
  const d = e?.detail
  if (!d || !PRAYER_TYPES.has(d.type)) return
  notePractice(d.type, d.type === 'prayerAudio' ? { playing: !!d.playing, key: d.key ?? null } : {})
}

/** Current in-memory days (fresher than storage). */
export function currentPracticeDays() {
  return ensure().days
}

export function subscribePractice(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

/** Profile switch reloads the app; tests call this to start clean. */
export function resetPracticeRuntime() {
  state = null
  dirty = false
}

export function installPracticeTracker(doc = typeof document !== 'undefined' ? document : null, win = typeof window !== 'undefined' ? window : null) {
  if (installed || !doc || !win) return
  installed = true
  ensure()
  setAnswerHook((correct) => notePractice('answer', { correct }))
  setListenHook(() => notePractice('listen'))
  installPracticeSync(win)
  win.addEventListener(PRACTICE_EVENT, onPracticeBus)
  if (isPracticeMode()) notePractice('practiceStart')
  if (doc.visibilityState === 'hidden') notePractice('hidden')
  doc.addEventListener('pointerdown', (e) => notePractice('tap', { x: e.clientX, y: e.clientY }), { capture: true, passive: true })
  doc.addEventListener('keydown', () => notePractice('tap', { x: -1, y: -1 }), { capture: true, passive: true })
  doc.addEventListener('visibilitychange', () => notePractice(doc.visibilityState === 'hidden' ? 'hidden' : 'visible'))
  win.addEventListener('pagehide', () => notePractice('hidden'))
  win.addEventListener('pageshow', () => notePractice('visible'))
  win.addEventListener('blur', () => notePractice('tick'))
  setInterval(() => notePractice('tick'), 5000)
}
