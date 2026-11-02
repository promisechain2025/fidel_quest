/* ============================================================================
   PROGRESS MODEL — one pure read of a child's whole progress
   ----------------------------------------------------------------------------
   The home chip, the My Progress screen and the share card all ask this
   module for numbers. It does not invent them: every figure is folded from
   the stores the child already has (journey, SRS, round games, church,
   words, stories, prayer, streak, practice minutes, app progress) plus the
   small records this screen adds (weekly target, per-game level/stars,
   finished prayers and stories).

   `progressModel(snapshot)` is pure. `loadProgressModel()` is the only
   storage read; the UI never touches localStorage itself.
   Per child: fq.weektarget.v1 is in PROGRESS_KEYS, so profile swap carries it.
   ========================================================================== */
import { progressChanged } from './childModel'
import { dayStamp } from './streak'
import { FIDEL_FAMILIES, getActivePackId } from './ethiopic'
import { JOURNEY, NodeKind } from '../journey'
import { storyLibrary, isBibleStory, STORIES } from './stories'
import { brickWordsFor } from '../brickWordsCore'
import { loadAppProgress } from './appProgress'

export const WEEK_TARGET_KEY = 'fq.weektarget.v1'
export const WEEK_TARGET_DEFAULT = 105
export const WEEK_TARGET_STEP = 15
export const WEEK_TARGET_MIN = 15
export const WEEK_TARGET_MAX = 420
/** A form is mastered once the family lesson is done, or SRS has counted
    two real (spaced) correct answers. One crammed tap is not mastery. */
export const FORM_MASTER_REPS = 2
export const WEAK_ACCURACY = 0.6
export const WEAK_MIN_SEEN = 3
export const WORD_LEARN_HITS = 2

export const PRAYER_IDS = Object.freeze([
  'tselot-zezewetir',
  'wudase-monday', 'wudase-tuesday', 'wudase-wednesday', 'wudase-thursday',
  'wudase-friday', 'wudase-saturday', 'wudase-sunday',
])

/** Level caps that are a property of the game, not of the pack.
    Pack-sized caps (church, words, stories, explorer) are filled in at read. */
export const GAME_MAX = Object.freeze({
  echo: 4,
  train: 4,
  market: 4,
  beats: 4,
  tower: 7,
  runner: 3,
  catch: 2,
  traffic: 8,
  bingo: 5,
  twins: 4,
  hunt: 14,
})

/** Order is the order the Games card lists them. */
export const GAME_IDS = Object.freeze([
  'echo', 'train', 'market', 'beats', 'tower', 'blocks', 'brickwords', 'runner',
  'catch', 'traffic', 'bingo', 'twins', 'mix', 'hunt', 'explore',
])

/** Side activities the Grown-Ups "not opened yet" line can name.
    Mix lives on the journey itself, so a child who has not reached a mix
    node is not told they skipped a game. */
export const NOT_OPENED_IDS = Object.freeze(['traffic', 'twins', 'explore', 'bingo', 'catch', 'hunt'])

const GAME_AREA = Object.freeze({
  echo: 'echo', train: 'train', market: 'market', beats: 'beats', tower: 'tower',
  blocks: 'blocks', brickwords: 'brickwords', runner: 'arcade', traffic: 'traffic',
  bingo: 'bingo', twins: 'twins', hunt: 'hunt', explore: 'explore',
})

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function clampWeekTarget(minutes) {
  const n = Math.round(Number(minutes) / WEEK_TARGET_STEP) * WEEK_TARGET_STEP
  if (!Number.isFinite(n)) return WEEK_TARGET_DEFAULT
  return Math.max(WEEK_TARGET_MIN, Math.min(WEEK_TARGET_MAX, n))
}

export function loadWeekTarget() {
  try {
    const raw = JSON.parse(localStorage.getItem(WEEK_TARGET_KEY))
    if (raw && Number.isFinite(Number(raw.minutes))) return clampWeekTarget(raw.minutes)
  } catch { /* default */ }
  return WEEK_TARGET_DEFAULT
}

export function setWeekTarget(minutes) {
  const next = clampWeekTarget(minutes)
  try {
    localStorage.setItem(WEEK_TARGET_KEY, JSON.stringify({ minutes: next }))
    progressChanged()
  } catch { /* session only */ }
  return next
}

/** Monday-first local dates for the week that contains `today` (YYYY-MM-DD). */
export function weekDates(today) {
  const [y, m, d] = String(today || '').split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1)
  if (Number.isNaN(date.getTime())) return []
  const dow = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1))
  const out = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    out.push(dayStamp(x))
  }
  return out
}

function readJson(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

function packWordLatins(families) {
  const out = []
  const seen = new Set()
  for (const f of families || []) {
    const list = Array.isArray(f.words) && f.words.length ? f.words : f.word ? [f.word] : []
    for (const w of list) {
      if (!w?.latin || seen.has(w.latin)) continue
      seen.add(w.latin)
      out.push(w.latin)
    }
  }
  return out
}

function roundLevel(state, max) {
  const best = state?.best && typeof state.best === 'object' ? state.best : {}
  let stars = 0
  let fromBest = 0
  for (const s of Object.values(best)) {
    const n = Math.max(0, Math.floor(Number(s) || 0))
    if (n > 0) { fromBest += 1; stars += n }
  }
  const unlocked = Math.max(1, Math.floor(Number(state?.unlocked) || 1))
  const fromUnlocked = Math.max(0, unlocked - 1)
  return { level: Math.min(max, Math.max(fromBest, fromUnlocked)), stars }
}

function levelOf(levels, id, max) {
  const row = levels?.[id]
  return {
    level: Math.min(max, Math.max(0, Math.floor(Number(row?.level) || 0))),
    stars: Math.max(0, Math.floor(Number(row?.stars) || 0)),
  }
}

function formMastered(familyId, order, learnDone, srs) {
  if (learnDone) return true
  const e = srs?.[`${familyId}-${order}`]
  return Array.isArray(e) && Math.floor(Number(e[0]) || 0) >= FORM_MASTER_REPS
}

function formTouched(familyId, order, srs) {
  const e = srs?.[`${familyId}-${order}`]
  return Array.isArray(e)
}

function charAt(family, order) {
  const chars = Array.from(family?.chars || '')
  return chars[order - 1] || chars[0] || ''
}

/** Pure. `snapshot` is the plain object `readSnapshot` builds. */
export function progressModel(snapshot) {
  const snap = snapshot && Array.isArray(snapshot.families) ? snapshot : readSnapshot(snapshot?.today)
  const families = snap.families || []
  const total = families.length
  const srs = snap.srs || {}
  const done = snap.journeyDone || {}
  const tiles = []
  let masteredRows = 0
  let letters = 0
  let next = null
  families.forEach((f) => {
    const learnDone = !!done[`learn:${f.id}`]
    let mastered = 0
    let touched = 0
    let nextOrder = 0
    for (let order = 1; order <= 7; order++) {
      const ok = formMastered(f.id, order, learnDone, srs)
      if (ok) mastered += 1
      else if (!nextOrder) nextOrder = order
      if (ok || formTouched(f.id, order, srs)) touched += 1
    }
    letters += mastered
    const state = mastered >= 7 ? 'mastered' : touched > 0 ? 'partial' : 'none'
    if (state === 'mastered') masteredRows += 1
    const fill = mastered / 7
    tiles.push({ id: f.id, char: charAt(f, 1), state, fill, mastered })
    if (!next && nextOrder) next = { familyId: f.id, char: charAt(f, nextOrder), order: nextOrder }
  })

  const levels = snap.levels || {}
  const areas = snap.areas || {}
  const church = snap.church || {}
  const churchIds = Object.keys(church).filter((id) => families.some((f) => f.id === id))
  const mixIds = snap.mixNodeIds || []
  const mixDone = mixIds.filter((id) => done[id])
  const brickMax = Math.max(0, Math.floor(Number(snap.brickWordCount) || 0))
  const rounds = snap.rounds || {}

  const gameRaw = {
    echo: roundLevel(rounds.echo, GAME_MAX.echo),
    train: roundLevel(rounds.train, GAME_MAX.train),
    market: roundLevel(rounds.market, GAME_MAX.market),
    beats: roundLevel(rounds.beats, GAME_MAX.beats),
    tower: levelOf(levels, 'tower', GAME_MAX.tower),
    blocks: { level: Math.min(total, churchIds.length), stars: churchIds.reduce((n, id) => n + Math.max(0, Math.floor(Number(church[id]) || 0)), 0) },
    brickwords: levelOf(levels, 'brickwords', brickMax || 1),
    runner: {
      level: Math.min(GAME_MAX.runner, Math.max(Math.floor(Number(snap.runner?.level) || 0), Math.floor(Number(levels.runner?.level) || 0))),
      stars: Math.max(0, Math.floor(Number(levels.runner?.stars) || 0)),
    },
    catch: levelOf(levels, 'catch', GAME_MAX.catch),
    traffic: {
      level: Math.min(GAME_MAX.traffic, Math.max(0, Math.floor(Number(snap.traffic?.shifts) || 0))),
      stars: Math.max(0, Math.floor(Number(snap.traffic?.perfect) || 0)),
    },
    bingo: levelOf(levels, 'bingo', GAME_MAX.bingo),
    twins: levelOf(levels, 'twins', GAME_MAX.twins),
    mix: {
      level: mixDone.length,
      stars: mixDone.reduce((n, id) => n + Math.max(0, Math.floor(Number(done[id]?.stars) || 0)), 0),
    },
    hunt: { level: Math.min(GAME_MAX.hunt, Math.max(0, Math.floor(Number(snap.huntDays) || 0))), stars: 0 },
    explore: levelOf(levels, 'explore', total || 1),
  }
  const maxOf = {
    echo: GAME_MAX.echo, train: GAME_MAX.train, market: GAME_MAX.market, beats: GAME_MAX.beats,
    tower: GAME_MAX.tower, blocks: total, brickwords: brickMax, runner: GAME_MAX.runner,
    catch: GAME_MAX.catch, traffic: GAME_MAX.traffic, bingo: GAME_MAX.bingo, twins: GAME_MAX.twins,
    mix: mixIds.length, hunt: GAME_MAX.hunt, explore: total,
  }
  const games = GAME_IDS.map((id) => ({
    id,
    level: Math.min(maxOf[id] || 0, gameRaw[id].level),
    max: maxOf[id] || 0,
    stars: gameRaw[id].stars,
  })).filter((g) => g.max > 0)

  const tried = (area) => {
    const a = areas[area]
    return !!a && ((a.visits || 0) > 0 || (a.answers || 0) > 0 || (a.done || 0) > 0)
  }
  const notOpened = NOT_OPENED_IDS.filter((id) => {
    const g = games.find((row) => row.id === id)
    if (!g || g.level > 0) return false
    const area = GAME_AREA[id]
    return area ? !tried(area) : true
  })

  const latins = packWordLatins(families)
  const latinSet = new Set(latins)
  const practiced = snap.words?.practiced || {}
  const hits = snap.words?.hits || {}
  const learned = snap.words?.learned || {}
  let wordsDone = 0
  for (const latin of latins) {
    const n = Math.floor(Number(hits[latin]) || 0)
    if (practiced[latin] || learned[latin] || n >= WORD_LEARN_HITS) wordsDone += 1
  }
  // A learned id that is not in this pack (the other language) never counts.
  void latinSet

  const read = snap.storiesRead || {}
  const finished = snap.finished || { prayer: {}, bible: {}, story: {} }
  const countFinished = (ids, bag) => (ids || []).filter((id) => (read[id] || 0) >= 1 || bag?.[id]).length
  const prayerDone = PRAYER_IDS.filter((id) => finished.prayer?.[id]).length
  const listen = [
    { id: 'prayers', done: prayerDone, max: PRAYER_IDS.length },
    { id: 'bible', done: countFinished(snap.bibleIds, finished.bible), max: (snap.bibleIds || []).length },
    { id: 'books', done: countFinished(snap.bookIds, finished.story), max: (snap.bookIds || []).length },
    { id: 'words', done: wordsDone, max: latins.length },
  ].filter((row) => row.max > 0)

  const target = clampWeekTarget(snap.weekTarget ?? WEEK_TARGET_DEFAULT)
  const dates = weekDates(snap.today)
  const days = dates.map((date, i) => {
    const app = snap.appDays?.[date] || {}
    const practiceMs = Math.max(0, Number(snap.practiceDays?.[date]?.activeMs) || 0)
    const fromPractice = Math.floor(practiceMs / 60000)
    const minutes = Math.max(Math.floor(Number(app.minutes) || 0), fromPractice)
    return {
      date,
      name: DAY_NAMES[i],
      minutes,
      hit: target > 0 && minutes > 0 && minutes * 7 >= target,
      today: date === snap.today,
      answers: Math.max(0, Math.floor(Number(app.answers) || 0)),
      correct: Math.max(0, Math.floor(Number(app.correct) || 0)),
      done: Math.max(0, Math.floor(Number(app.done) || 0)),
    }
  })
  const weekMinutes = days.reduce((n, d) => n + d.minutes, 0)
  const weekAnswers = days.reduce((n, d) => n + d.answers, 0)
  const weekCorrect = days.reduce((n, d) => n + Math.min(d.correct, d.answers), 0)
  const daysActive = days.filter((d) => d.answers > 0 || d.minutes > 0 || d.done > 0).length

  const weak = weakForms(snap.telemetry, families)

  return {
    pack: snap.pack || 'am',
    today: snap.today,
    rows: {
      mastered: masteredRows,
      total,
      letters,
      totalLetters: total * 7,
      tiles,
    },
    games,
    stars: games.reduce((n, g) => n + g.stars, 0),
    streak: Math.max(0, Math.floor(Number(snap.streak) || 0)),
    words: { done: wordsDone, max: latins.length },
    listen,
    week: {
      minutes: weekMinutes,
      target,
      daily: Math.max(1, Math.round(target / 7)),
      days,
      hitDays: days.filter((d) => d.hit).length,
      todayActive: days.some((d) => d.today && (d.minutes > 0 || d.answers > 0 || d.done > 0)),
    },
    grown: {
      weak,
      notOpened,
      daysActive,
      answers: weekAnswers,
      correct: weekCorrect,
      accuracy: weekAnswers ? Math.round((weekCorrect / weekAnswers) * 100) : null,
    },
    next,
    name: snap.name || '',
  }
}

function weakForms(events, families) {
  const byId = new Map((families || []).map((f) => [f.id, f]))
  const stats = new Map()
  for (const e of events || []) {
    if (!e || typeof e.k !== 'string' || e.k.includes(':')) continue
    const s = stats.get(e.k) || { seen: 0, correct: 0 }
    s.seen += 1
    if (e.p === e.k) s.correct += 1
    stats.set(e.k, s)
  }
  const out = []
  for (const [key, s] of stats) {
    if (s.seen < WEAK_MIN_SEEN) continue
    const accuracy = s.correct / s.seen
    if (accuracy >= WEAK_ACCURACY) continue
    const dash = key.lastIndexOf('-')
    if (dash < 1) continue
    const family = byId.get(key.slice(0, dash))
    const order = Number(key.slice(dash + 1))
    const char = charAt(family, order)
    if (!char) continue
    out.push({ key, char, accuracy })
  }
  return out.sort((a, b) => a.accuracy - b.accuracy || a.key.localeCompare(b.key)).slice(0, 6)
}

/** Storage -> the plain snapshot `progressModel` folds. Active child only
    (profile swap has already moved the keys). */
export function readSnapshot(today = dayStamp()) {
  const pack = getActivePackId()
  const families = FIDEL_FAMILIES
  const journey = readJson('fq.journey.v1')
  const srsRaw = readJson('fq.srs.v1')
  const app = loadAppProgress()
  const words = readJson('fq.words.v1') || {}
  const stories = readJson('fq.stories.v1')
  const streak = readJson('fq.streak.v1')
  const practice = readJson('fq.practice.v1')
  const church = readJson('fq.church.v1')
  const runner = readJson('fq2.runner')
  const traffic = readJson('fq.traffic.v1')
  const hunt = readJson('fq.hunt.v1')
  const ledger = readJson('fq.telemetry.v1')
  const lib = storyLibrary([], STORIES, pack)
  return {
    today,
    pack,
    families,
    journeyDone: journey?.done && typeof journey.done === 'object' ? journey.done : {},
    mixNodeIds: JOURNEY.filter((n) => n.kind === NodeKind.MIX).map((n) => n.id),
    srs: srsRaw?.f && typeof srsRaw.f === 'object' ? srsRaw.f : {},
    rounds: {
      echo: readJson('fq.echo.v1'),
      train: readJson('fq.train.v1'),
      market: readJson('fq.market.v1'),
      beats: readJson('fq.beats.v1'),
    },
    church: church?.done && typeof church.done === 'object' ? church.done : {},
    runner: runner && typeof runner === 'object' ? runner : { level: 0 },
    traffic: traffic && typeof traffic === 'object' ? traffic : {},
    huntDays: Math.max(0, Math.floor(Number(hunt?.days) || 0)),
    words: { practiced: words.practiced || {}, hits: words.hits || {}, learned: words.learned || {} },
    storiesRead: stories?.read && typeof stories.read === 'object' ? stories.read : {},
    bibleIds: lib.filter((s) => isBibleStory(s)).map((s) => s.id),
    bookIds: lib.filter((s) => !isBibleStory(s)).map((s) => s.id),
    brickWordCount: brickWordsFor(pack).length,
    finished: app.finished,
    levels: app.levels,
    areas: app.areas,
    appDays: app.days,
    practiceDays: practice?.days && typeof practice.days === 'object' ? practice.days : {},
    weekTarget: loadWeekTarget(),
    telemetry: Array.isArray(ledger?.events) ? ledger.events : [],
    streak: Math.max(0, Math.floor(Number(streak?.count) || 0)),
    name: (() => { try { return (localStorage.getItem('fq.nickname') || '').trim() } catch { return '' } })(),
  }
}

export function loadProgressModel(today = dayStamp()) {
  return progressModel(readSnapshot(today))
}

/** QA / screenshot seed. Writes the active child's stores so the screen
    shows a mid-path child (about 12 rows, a week of minutes, a few games).
    Safe to call only from the `?seedprogress=1` preview. */
export function applyExampleProgressSeed(today = dayStamp()) {
  const families = FIDEL_FAMILIES
  const done = {}
  families.slice(0, 12).forEach((f) => { done[`learn:${f.id}`] = { stars: 3 } })
  const srs = { v: 1, f: {} }
  ;[[12, 5], [13, 3], [14, 1]].forEach(([idx, n]) => {
    const f = families[idx]
    if (!f) return
    for (let order = 1; order <= n; order++) srs.f[`${f.id}-${order}`] = [FORM_MASTER_REPS, 250, 3, 99999, 1]
  })
  const round = (best) => JSON.stringify({ unlocked: 1, due: {}, best })
  const church = {}
  if (families[0]) church[families[0].id] = 3
  if (families[1]) church[families[1].id] = 2
  const latins = packWordLatins(families)
  const practiced = {}
  latins.slice(0, 48).forEach((latin) => { practiced[latin] = true })
  const lib = storyLibrary([], STORIES, getActivePackId())
  const read = {}
  lib.filter(isBibleStory).slice(0, 3).forEach((s) => { read[s.id] = 1 })
  lib.filter((s) => !isBibleStory(s)).slice(0, 7).forEach((s) => { read[s.id] = 1 })
  const dates = weekDates(today)
  const minutes = [18, 12, 0, 15, 9, 8, 0]
  const answers = [20, 18, 0, 16, 15, 13, 0]
  const correct = [17, 15, 0, 14, 12, 11, 0]
  const days = {}
  dates.forEach((date, i) => {
    if (!minutes[i] && !answers[i]) return
    days[date] = { answers: answers[i] || 0, correct: correct[i] || 0, done: 0, areas: [], minutes: minutes[i] || 0 }
  })
  const prayer = {}
  PRAYER_IDS.slice(0, 4).forEach((id) => { prayer[id] = 1 })
  const events = []
  const push = (k, ok, n) => { for (let i = 0; i < n; i++) events.push({ k, p: ok ? k : 'le-2', m: 'echo', d: 20261102 }) }
  push('ha-1', false, 4); push('ha-1', true, 1)
  push('qe-1', false, 3); push('qe-1', true, 1)
  push('ttse-1', false, 4); push('ttse-1', true, 1)
  const write = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)) } catch { /* preview only */ } }
  write('fq.journey.v1', { version: 1, done, collection: { owned: [], worn: {} } })
  write('fq.srs.v1', srs)
  write('fq.echo.v1', round({ 1: 3, 2: 3, 3: 3 }))
  write('fq.train.v1', round({ 1: 3, 2: 3 }))
  write('fq.market.v1', round({ 1: 3, 2: 3, 3: 3, 4: 3 }))
  write('fq.beats.v1', round({ 1: 2 }))
  write('fq.church.v1', { done: church })
  write('fq2.runner', { fed: 12, level: 3 })
  write('fq.streak.v1', { count: 5, best: 5, lastDay: today })
  write('fq.words.v1', { v: 1, practiced })
  write('fq.stories.v1', { v: 1, read })
  write('fq.hunt.v1', { lastDay: today, days: 2 })
  write('fq.weektarget.v1', { minutes: WEEK_TARGET_DEFAULT })
  write('fq.telemetry.v1', { v: 1, events })
  write('fq.nickname', 'Abel')
  write('fq.appprogress.v1', {
    v: 1,
    areas: { bingo: { visits: 1, answers: 0, correct: 0, done: 0, last: today } },
    days,
    levels: {
      tower: { level: 5, stars: 11 },
      brickwords: { level: 6, stars: 14 },
      runner: { level: 3, stars: 4 },
      catch: { level: 1, stars: 0 },
    },
    finished: { prayer, bible: {}, story: {} },
  })
  progressChanged()
}
