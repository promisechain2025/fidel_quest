/* ============================================================================
   PRAYER PRACTICE - the contract between the prayer book and practice tracking
   ----------------------------------------------------------------------------
   This file is identical on feat/prayer-reading-marks (PR #57) and
   feat/practice-tracking (PR #58), so either can merge first. It has no imports.

   Practice mode is a homework/practice session. Prayer time is tracked ONLY
   while it is on; casually opening the prayer book earns nothing.
     startPractice(source)  source: 'button' | 'class' | 'assignment' | 'goal'
     endPractice()
     isPracticeMode() / practiceSource() / subscribePracticeMode(fn)

   Prayer page events (the tracker turns these into time; outside practice
   mode it ignores the prayer rules):
     prayerOpen()  prayerPage()  prayerClose()
     prayerAudio(playing, prayerKey)   prayerKey = index of the prayer's first unit

   Playback in practice mode: play ONLY the current prayer, then stop.
     playCurrentPrayerOnly(units, i) -> the next recorded unit inside the same
     prayer, or -1 at the prayer's end (no auto-advance, no loop). A prayer
     (ጸሎት) is the run of units from one `s: 1` section start to the next.

   Transport: a window CustomEvent ('fq:practice'), so the prayer book never
   imports the tracker. With no listener (PR #57 alone) these calls do nothing.
   ========================================================================== */

export const PRACTICE_EVENT = 'fq:practice'

let mode = null
const subs = new Set()

function emit(type, detail = {}) {
  try {
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PRACTICE_EVENT, { detail: { type, ...detail } }))
    }
  } catch { /* never break the page */ }
}
const notify = () => subs.forEach((fn) => { try { fn(!!mode) } catch { /* ignore */ } })

export function startPractice(source = 'button') {
  mode = { source: String(source || 'button') }
  emit('practiceStart', { source: mode.source })
  notify()
}

export function endPractice() {
  if (!mode) return
  mode = null
  emit('practiceEnd')
  notify()
}

export const isPracticeMode = () => !!mode
export const practiceSource = () => mode?.source || null

export function subscribePracticeMode(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

export const prayerOpen = () => emit('prayerOpen')
export const prayerPage = () => emit('prayerPage')
export const prayerClose = () => emit('prayerClose')
export const prayerAudio = (playing, prayerKey = null) => emit('prayerAudio', { playing: !!playing, key: prayerKey })

/** [first, last] unit indexes of the prayer containing unit i. */
export function prayerRange(units, i) {
  if (!units?.length) return [0, -1]
  const at = Math.max(0, Math.min(units.length - 1, i))
  let a = at
  while (a > 0 && !units[a].s) a -= 1
  let b = at + 1
  while (b < units.length && !units[b].s) b += 1
  return [a, b - 1]
}

/** Next recorded unit in the SAME prayer after i, or -1 (stop). */
export function playCurrentPrayerOnly(units, i) {
  const [, last] = prayerRange(units, i)
  for (let j = i + 1; j <= last; j++) if (units[j]?.a) return j
  return -1
}

/**
 * Where play starts on a page. Outside practice mode: the current unit, else the
 * page's first recorded unit, else the next recorded unit after the page.
 * In practice mode the "after the page" fallback stays inside the prayer of the
 * page's last unit, so a page whose prayer has no recording (e.g. ቀዳሚት ፯) plays
 * nothing instead of jumping into the next prayer. Returns -1 when nothing plays.
 */
export function startUnitForPage(units, onPage, cur, practice) {
  if (!units?.length || !onPage?.length) return -1
  if (cur >= 0 && onPage.includes(cur) && units[cur]?.a) return cur
  const first = onPage.find((i) => units[i]?.a)
  if (first !== undefined) return first
  const lastOnPage = onPage[onPage.length - 1]
  if (practice) return playCurrentPrayerOnly(units, lastOnPage)
  for (let j = lastOnPage + 1; j < units.length; j++) if (units[j]?.a) return j
  return -1
}

/** Test hook. */
export function _resetPracticeMode() { mode = null; subs.clear() }
