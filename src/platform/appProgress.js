/* ============================================================================
   APP PROGRESS — one app-level progress store (per child)
   ----------------------------------------------------------------------------
   Every feature already keeps its own detail (journey nodes, round stars,
   church wall, prayer resume, the answer ledger, practice minutes). What was
   missing was ONE place that answers "how far along is this child in the
   whole app?" - so progress looked like it lived only inside whichever game
   (e.g. the prayer book) had its own tracker, and games outside the Journey
   moved nothing on the home screen.

   This module is that place. It never replaces a feature's own store; it
   receives three kinds of report from the shared seams:

     visit   a child stayed on a screen for VISIT_MS (router effect)
     answer  one scored answer (telemetry.recordAnswer, for every game)
     done    a finished unit: Journey node, Daily Hunt, a finished round of
             a levelled game (roundStore.save), a built church family

   Pure core (`applyReport`, `summarize`, `normalize`) + a thin storage layer.
   Storage: fq.appprogress.v1, registered in PROGRESS_KEYS, so it is saved,
   restored, wiped and swapped per child like every other progress key.
   ========================================================================== */
import { progressChanged } from './childModel'
import { dayStamp } from './streak'

export const APP_PROGRESS_KEY = 'fq.appprogress.v1'
export const VISIT_MS = 8000
export const KEEP_DAYS = 60

/** Every place a child can spend time, by the screen name that hosts it. The
    order is the order the progress sheet lists them in. */
export const AREA_GROUPS = Object.freeze([
  { id: 'learn', areas: ['stone', 'lesson', 'findfidel', 'wordbuild', 'review-node', 'warmup', 'hunt', 'arcade', 'practice'] },
  { id: 'games', areas: ['words', 'workshop', 'ladder', 'train', 'echo', 'market', 'bingo', 'twins', 'beats', 'traffic', 'blocks', 'brickwords', 'tower'] },
  { id: 'read', areas: ['stories', 'prayer'] },
  { id: 'explore', areas: ['explore', 'name', 'postcard', 'family', 'familyvoice', 'closet'] },
])
export const AREA_IDS = Object.freeze(AREA_GROUPS.flatMap((g) => g.areas))
const AREA_SET = new Set(AREA_IDS)
export const isArea = (id) => AREA_SET.has(id)

const blankArea = () => ({ visits: 0, answers: 0, correct: 0, done: 0, last: '' })
const blankDay = () => ({ answers: 0, correct: 0, done: 0, areas: [] })
export const emptyAppProgress = () => ({ v: 1, areas: {}, days: {} })

const num = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Math.floor(Number(x)) : 0)
const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

/** Anything read from storage -> a clean state (junk is dropped, never thrown). */
export function normalize(raw) {
  const out = emptyAppProgress()
  if (!raw || typeof raw !== 'object') return out
  for (const [id, a] of Object.entries(raw.areas && typeof raw.areas === 'object' ? raw.areas : {})) {
    if (!isArea(id) || !a || typeof a !== 'object') continue
    out.areas[id] = { visits: num(a.visits), answers: num(a.answers), correct: Math.min(num(a.correct), num(a.answers)), done: num(a.done), last: isDay(a.last) ? a.last : '' }
  }
  for (const [d, v] of Object.entries(raw.days && typeof raw.days === 'object' ? raw.days : {})) {
    if (!isDay(d) || !v || typeof v !== 'object') continue
    const areas = Array.isArray(v.areas) ? [...new Set(v.areas.filter(isArea))] : []
    out.days[d] = { answers: num(v.answers), correct: Math.min(num(v.correct), num(v.answers)), done: num(v.done), areas }
  }
  return out
}

/** Pure: fold one report into the state. report = { type, area, correct? }.
    A report for an unknown area still counts toward the day totals (an answer
    from an overlay is still an answer) but is not listed under any area. */
export function applyReport(state, report, today = dayStamp()) {
  const s = normalize(state)
  const area = isArea(report?.area) ? report.area : null
  const day = s.days[today] || blankDay()
  const a = area ? (s.areas[area] || blankArea()) : null
  if (report?.type === 'visit') {
    if (!area) return s
    a.visits += 1
  } else if (report?.type === 'answer') {
    day.answers += 1
    if (report.correct) day.correct += 1
    if (a) { a.answers += 1; if (report.correct) a.correct += 1 }
  } else if (report?.type === 'done') {
    day.done += 1
    if (a) a.done += 1
  } else return s
  if (a) { a.last = today; s.areas[area] = a; if (!day.areas.includes(area)) day.areas.push(area) }
  s.days[today] = day
  const keep = Object.keys(s.days).sort().slice(-KEEP_DAYS)
  for (const d of Object.keys(s.days)) if (!keep.includes(d)) delete s.days[d]
  return s
}

/** An area counts as "tried" once the child stayed, answered or finished. */
export const isTried = (a) => !!a && (a.visits > 0 || a.answers > 0 || a.done > 0)

/** Pure read model for every surface (home chip, sheet, Grown-Ups). */
export function summarize(state, today = dayStamp()) {
  const s = normalize(state)
  const groups = AREA_GROUPS.map((g) => ({
    id: g.id,
    areas: g.areas.map((id) => ({ id, ...(s.areas[id] || blankArea()), tried: isTried(s.areas[id]) })),
  }))
  const all = groups.flatMap((g) => g.areas)
  const tried = all.filter((a) => a.tried).length
  const sum = (k) => all.reduce((n, a) => n + a[k], 0)
  const t = s.days[today] || blankDay()
  return {
    groups,
    tried,
    total: all.length,
    pct: all.length ? Math.round((tried / all.length) * 100) : 0,
    answers: sum('answers'),
    correct: sum('correct'),
    done: sum('done'),
    today: { answers: t.answers, correct: t.correct, done: t.done, areas: t.areas.length },
  }
}

/* ── storage + runtime ──────────────────────────────────────────────────── */

export function loadAppProgress() {
  try { return normalize(JSON.parse(localStorage.getItem(APP_PROGRESS_KEY))) } catch { return emptyAppProgress() }
}

function persist(state) {
  try { localStorage.setItem(APP_PROGRESS_KEY, JSON.stringify(state)); return true } catch { return false }
}

/** The screen the child is on right now (set by the router effect), so an
    answer or a finished round from ANY game lands on the right area without
    each game having to name itself. */
let activeArea = null
export const setActiveArea = (id) => { activeArea = isArea(id) ? id : null }
export const getActiveArea = () => activeArea

function report(type, area, extra = {}) {
  try {
    const next = applyReport(loadAppProgress(), { type, area: area ?? activeArea, ...extra })
    if (persist(next)) progressChanged()
  } catch { /* progress must never break play */ }
}

export const noteAnswer = (correct, area) => report('answer', area, { correct: !!correct })
export const noteDone = (area) => report('done', area)
export const noteVisit = (area) => report('visit', area)

/** Router seam: call with the current screen name whenever it changes.
    Returns a cleanup. A visit only counts after VISIT_MS on the screen, so a
    stray tap through a screen does not mark it as tried. */
export function trackScreen(name, setTimer = setTimeout, clearTimer = clearTimeout) {
  setActiveArea(name)
  if (!isArea(name)) return () => {}
  const id = setTimer(() => noteVisit(name), VISIT_MS)
  return () => clearTimer(id)
}
