import { describe, it, expect, beforeEach } from 'vitest'
import {
  progressModel, loadProgressModel, readSnapshot, weekDates, clampWeekTarget,
  loadWeekTarget, setWeekTarget, applyExampleProgressSeed,
  WEEK_TARGET_KEY, WEEK_TARGET_DEFAULT, FORM_MASTER_REPS, PRAYER_IDS, GAME_MAX,
} from './progressModel'
import { PROGRESS_KEYS } from './progress'
import { SWAP_KEYS } from './profiles'
import { noteDayMinutes, noteLevel, noteRound, noteFinished, loadAppProgress } from './appProgress'

const TODAY = '2026-11-02' // Monday
const fam = (id, ch, words = [{ latin: `${id}w` }]) => ({ id, chars: `${ch}234567`, words })

function base(over = {}) {
  const families = [fam('ha', 'ሀ'), fam('le', 'ለ'), fam('me', 'መ')]
  return {
    today: TODAY,
    pack: 'am',
    families,
    journeyDone: {},
    mixNodeIds: ['mix:le'],
    srs: {},
    rounds: {},
    church: {},
    runner: { level: 0 },
    traffic: {},
    huntDays: 0,
    words: { practiced: {}, hits: {} },
    storiesRead: {},
    bibleIds: ['creation'],
    bookIds: ['market-day'],
    brickWordCount: 4,
    finished: { prayer: {}, bible: {}, story: {} },
    levels: {},
    areas: {},
    appDays: {},
    practiceDays: {},
    weekTarget: 105,
    telemetry: [],
    streak: 0,
    ...over,
  }
}

beforeEach(() => { localStorage.clear(); localStorage.setItem('fq.pack', 'am') })

describe('progressModel rows', () => {
  it('a finished learn node masters all 7 forms; SRS reps of 2 master one form; one rep does not', () => {
    const m = progressModel(base({
      journeyDone: { 'learn:ha': { stars: 3 } },
      srs: { 'le-1': [FORM_MASTER_REPS, 250, 1, 1, 1], 'le-2': [1, 250, 1, 1, 1], 'me-1': [FORM_MASTER_REPS, 250, 1, 1, 1] },
    }))
    expect(m.rows.total).toBe(3)
    expect(m.rows.mastered).toBe(1)
    expect(m.rows.letters).toBe(7 + 1 + 1)
    expect(m.rows.totalLetters).toBe(21)
    expect(m.rows.tiles.map((t) => t.state)).toEqual(['mastered', 'partial', 'partial'])
    expect(m.rows.tiles[1].fill).toBeCloseTo(1 / 7)
    expect(m.rows.tiles[1].char).toBe('ለ')
    expect(m.next).toEqual({ familyId: 'le', char: '2', order: 2 })
  })

  it('an untouched row stays grey and the next step is its first form', () => {
    const m = progressModel(base())
    expect(m.rows.mastered).toBe(0)
    expect(m.rows.tiles.every((t) => t.state === 'none')).toBe(true)
    expect(m.next).toEqual({ familyId: 'ha', char: 'ሀ', order: 1 })
  })

  it('34 families is a full Tigrinya row count, 33 is Amharic', () => {
    const ti = Array.from({ length: 34 }, (_, i) => fam(`f${i}`, 'ቐ'))
    const am = ti.slice(0, 33)
    expect(progressModel(base({ families: ti, pack: 'ti' })).rows.total).toBe(34)
    expect(progressModel(base({ families: am })).rows.total).toBe(33)
  })
})

describe('progressModel games, words, listen', () => {
  it('reads round stores, church, runner and the level record, and sums stars', () => {
    const m = progressModel(base({
      rounds: { echo: { unlocked: 4, best: { 1: 3, 2: 3, 3: 3 } }, beats: { unlocked: 1, best: { 1: 2 } } },
      church: { ha: 3, le: 2, nope: 3 },
      runner: { level: 3 },
      levels: { tower: { level: 5, stars: 11 }, runner: { level: 3, stars: 4 }, brickwords: { level: 6, stars: 14 } },
      traffic: { shifts: 3, perfect: 1 },
      huntDays: 2,
      journeyDone: { 'mix:le': { stars: 2 } },
    }))
    const g = Object.fromEntries(m.games.map((row) => [row.id, row]))
    expect(g.echo).toMatchObject({ level: 3, max: 4, stars: 9 })
    expect(g.beats).toMatchObject({ level: 1, max: 4, stars: 2 })
    expect(g.blocks).toMatchObject({ level: 2, max: 3, stars: 5 })
    expect(g.tower).toMatchObject({ level: 5, max: 7, stars: 11 })
    expect(g.runner).toMatchObject({ level: 3, max: GAME_MAX.runner, stars: 4 })
    expect(g.brickwords).toMatchObject({ level: 4, max: 4, stars: 14 })
    expect(g.traffic).toMatchObject({ level: 3, max: 8, stars: 1 })
    expect(g.hunt).toMatchObject({ level: 2, max: 14 })
    expect(g.mix).toMatchObject({ level: 1, max: 1, stars: 2 })
    expect(m.stars).toBe(m.games.reduce((n, row) => n + row.stars, 0))
  })

  it('counts a practiced word and a word correct twice, and ignores the other pack', () => {
    const m = progressModel(base({
      words: { practiced: { haw: true, foreign: true }, hits: { lew: 1, mew: 2 } },
      families: [fam('ha', 'ሀ', [{ latin: 'haw' }]), fam('le', 'ለ', [{ latin: 'lew' }]), fam('me', 'መ', [{ latin: 'mew' }])],
    }))
    expect(m.words).toEqual({ done: 2, max: 3 })
  })

  it('listen bars use finished prayers and stories already read, and hide an empty shelf', () => {
    const m = progressModel(base({
      finished: { prayer: { 'tselot-zezewetir': 1, 'wudase-monday': 1 }, bible: {}, story: {} },
      storiesRead: { creation: 2 },
      bookIds: [],
    }))
    const listen = Object.fromEntries(m.listen.map((row) => [row.id, row]))
    expect(listen.prayers).toEqual({ id: 'prayers', done: 2, max: PRAYER_IDS.length })
    expect(listen.bible).toEqual({ id: 'bible', done: 1, max: 1 })
    expect(listen.books).toBeUndefined()
  })
})

describe('progressModel week and grown-ups', () => {
  it('folds Mon–Sun, prefers the higher of app minutes and practice minutes, and marks the target', () => {
    const dates = weekDates(TODAY)
    expect(dates[0]).toBe(TODAY)
    expect(dates).toHaveLength(7)
    const appDays = {}
    const practiceDays = {}
    appDays[dates[0]] = { minutes: 18, answers: 10, correct: 8 }
    practiceDays[dates[1]] = { activeMs: 12 * 60000 }
    appDays[dates[3]] = { minutes: 15, answers: 4, correct: 4 }
    const m = progressModel(base({ appDays, practiceDays, weekTarget: 105 }))
    expect(m.week.minutes).toBe(18 + 12 + 15)
    expect(m.week.daily).toBe(15)
    expect(m.week.hitDays).toBe(2)
    expect(m.week.days[0]).toMatchObject({ minutes: 18, hit: true, today: true, name: 'Mon' })
    expect(m.week.days[1]).toMatchObject({ minutes: 12, hit: false, name: 'Tue' })
    expect(m.week.todayActive).toBe(true)
    expect(m.grown.answers).toBe(14)
    expect(m.grown.accuracy).toBe(Math.round((12 / 14) * 100))
    expect(m.grown.daysActive).toBe(3)
  })

  it('names weak forms by fidel only when accuracy is under 60%', () => {
    const events = []
    const add = (k, ok, n) => { for (let i = 0; i < n; i++) events.push({ k, p: ok ? k : 'le-2' }) }
    add('ha-1', false, 4); add('ha-1', true, 1)
    add('le-1', true, 5)
    add('me-1', false, 1)
    const m = progressModel(base({ telemetry: events }))
    expect(m.grown.weak.map((w) => w.char)).toEqual(['ሀ'])
    expect(m.grown.weak[0].key).toBe('ha-1')
    expect(m.grown.weak.every((w) => !/[A-Za-z]/.test(w.char))).toBe(true)
  })

  it('lists side activities that were never opened and never levelled', () => {
    const m = progressModel(base({
      areas: { bingo: { visits: 1, answers: 0, done: 0 } },
      levels: { catch: { level: 1, stars: 0 } },
      huntDays: 2,
    }))
    expect(m.grown.notOpened).toEqual(['traffic', 'twins', 'explore'])
  })
})

describe('weekly target setting', () => {
  it('defaults to 105, steps by 15, and is per-child progress', () => {
    expect(loadWeekTarget()).toBe(WEEK_TARGET_DEFAULT)
    expect(clampWeekTarget(100)).toBe(105)
    expect(clampWeekTarget(10)).toBe(15)
    expect(clampWeekTarget(9999)).toBe(420)
    expect(setWeekTarget(90)).toBe(90)
    expect(loadWeekTarget()).toBe(90)
    expect(JSON.parse(localStorage.getItem(WEEK_TARGET_KEY))).toEqual({ minutes: 90 })
    expect(PROGRESS_KEYS).toContain(WEEK_TARGET_KEY)
    expect(SWAP_KEYS).toContain(WEEK_TARGET_KEY)
  })
})

describe('new tracking folds into the same store', () => {
  it('minutes, levels and finished items survive normalize and a reload', () => {
    noteDayMinutes(18, TODAY)
    noteLevel('catch', 1, 0)
    noteLevel('catch', 1, 0)
    noteRound('tower', 3)
    noteRound('tower', 3)
    noteFinished('prayer', 'tselot-zezewetir')
    noteFinished('prayer', 'tselot-zezewetir')
    noteFinished('bible', 'creation')
    const s = loadAppProgress()
    expect(s.days[TODAY].minutes).toBe(18)
    expect(s.levels.catch).toEqual({ level: 1, stars: 0 })
    expect(s.levels.tower).toEqual({ level: 2, stars: 6 })
    expect(s.finished.prayer['tselot-zezewetir']).toBe(1)
    expect(s.finished.bible.creation).toBe(1)
    expect(noteLevel('nope', 1, 1)).toBeUndefined()
    expect(loadAppProgress().levels.nope).toBeUndefined()
  })

  it('an old app-progress blob with no minutes still loads, and practice minutes fill the week', () => {
    localStorage.setItem('fq.appprogress.v1', JSON.stringify({
      v: 1,
      areas: { echo: { visits: 1, answers: 2, correct: 2, done: 0, last: TODAY } },
      days: { [TODAY]: { answers: 2, correct: 2, done: 0, areas: ['echo'] } },
    }))
    localStorage.setItem('fq.practice.v1', JSON.stringify({
      v: 1, days: { [TODAY]: { day: TODAY, activeMs: 20 * 60000 } }, goal: null,
    }))
    localStorage.setItem('fq.journey.v1', JSON.stringify({ version: 1, done: { 'learn:ha': { stars: 3 } }, collection: { owned: [], worn: {} } }))
    const loaded = loadAppProgress()
    expect(loaded.areas.echo.visits).toBe(1)
    expect(loaded.levels).toEqual({})
    expect(loaded.days[TODAY].minutes).toBe(0)
    const m = loadProgressModel(TODAY)
    expect(m.rows.mastered).toBeGreaterThanOrEqual(1)
    expect(m.week.days.find((d) => d.today).minutes).toBe(20)
  })
})

describe('example seed', () => {
  it('builds a readable mid-path child from the live pack', () => {
    applyExampleProgressSeed(TODAY)
    const m = loadProgressModel(TODAY)
    expect(m.rows.mastered).toBe(12)
    expect(m.rows.total).toBeGreaterThanOrEqual(33)
    expect(m.rows.letters).toBe(12 * 7 + 5 + 3 + 1)
    expect(m.streak).toBe(5)
    expect(m.week.target).toBe(105)
    expect(m.week.minutes).toBe(62)
    expect(m.stars).toBe(63)
    expect(m.words.done).toBe(Math.min(48, m.words.max))
    expect(m.grown.notOpened).toEqual(expect.arrayContaining(['traffic', 'twins', 'explore']))
    expect(m.grown.weak.length).toBeGreaterThan(0)
    expect(m.grown.weak.every((w) => !/[A-Za-z]/.test(w.char))).toBe(true)
    expect(readSnapshot(TODAY).pack).toBe('am')
  })
})
