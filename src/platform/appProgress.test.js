import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  APP_PROGRESS_KEY, AREA_IDS, VISIT_MS, KEEP_DAYS, applyReport, emptyAppProgress, normalize, summarize,
  loadAppProgress, noteAnswer, noteDone, noteVisit, setActiveArea, getActiveArea, trackScreen,
} from './appProgress'
import { PROGRESS_KEYS, snapshotProgress, restoreProgress, wipeProgress } from './progress'
import { SWAP_KEYS, loadProfiles, addProfile, switchProfile } from './profiles'
import { recordAnswer } from './telemetry'
import { roundStore } from './roundProgress'
import { churchStore } from './churchProgress'
import { dayStamp } from './streak'

const TODAY = '2026-10-28'
beforeEach(() => { localStorage.clear(); setActiveArea(null) })
afterEach(() => vi.useRealTimers())

describe('appProgress core', () => {
  it('is registered for save/restore/wipe and per-child swapping', () => {
    expect(PROGRESS_KEYS).toContain(APP_PROGRESS_KEY)
    expect(SWAP_KEYS).toContain(APP_PROGRESS_KEY)
  })

  it('folds visit, answer and done reports per area and per day', () => {
    let s = emptyAppProgress()
    s = applyReport(s, { type: 'visit', area: 'echo' }, TODAY)
    s = applyReport(s, { type: 'answer', area: 'echo', correct: true }, TODAY)
    s = applyReport(s, { type: 'answer', area: 'echo', correct: false }, TODAY)
    s = applyReport(s, { type: 'done', area: 'echo' }, TODAY)
    expect(s.areas.echo).toEqual({ visits: 1, answers: 2, correct: 1, done: 1, last: TODAY })
    expect(s.days[TODAY]).toEqual({ answers: 2, correct: 1, done: 1, areas: ['echo'] })
  })

  it('an answer from outside any area still counts for the day', () => {
    const s = applyReport(emptyAppProgress(), { type: 'answer', area: null, correct: true }, TODAY)
    expect(s.areas).toEqual({})
    expect(s.days[TODAY]).toMatchObject({ answers: 1, correct: 1 })
    expect(applyReport(emptyAppProgress(), { type: 'visit', area: 'nope' }, TODAY)).toEqual(emptyAppProgress())
    expect(applyReport(emptyAppProgress(), { type: 'bogus', area: 'echo' }, TODAY)).toEqual(emptyAppProgress())
  })

  it('is pure: the input state is never mutated', () => {
    const before = applyReport(emptyAppProgress(), { type: 'done', area: 'train' }, TODAY)
    const frozen = JSON.stringify(before)
    applyReport(before, { type: 'done', area: 'train' }, TODAY)
    expect(JSON.stringify(before)).toBe(frozen)
  })

  it('keeps only the last KEEP_DAYS days', () => {
    let s = emptyAppProgress()
    for (let i = 1; i <= KEEP_DAYS + 5; i++) s = applyReport(s, { type: 'done', area: 'bingo' }, `2026-01-${String((i % 28) + 1).padStart(2, '0')}`.replace(/^2026-01/, `20${String(10 + Math.floor(i / 28)).padStart(2, '0')}-01`))
    expect(Object.keys(s.days).length).toBeLessThanOrEqual(KEEP_DAYS)
  })

  it('normalize drops junk and clamps impossible numbers', () => {
    const n = normalize({ areas: { echo: { visits: -3, answers: 2, correct: 9, done: 'x', last: 'yesterday' }, evil: { visits: 5 } }, days: { '2026-10-28': { answers: 1, correct: 4, areas: ['echo', 'evil'] }, bad: {} } })
    expect(n.areas).toEqual({ echo: { visits: 0, answers: 2, correct: 2, done: 0, last: '' } })
    expect(n.days).toEqual({ '2026-10-28': { answers: 1, correct: 1, done: 0, areas: ['echo'] } })
    expect(normalize(null)).toEqual(emptyAppProgress())
    expect(normalize('junk')).toEqual(emptyAppProgress())
  })

  it('summarize counts tried areas, totals and today', () => {
    let s = emptyAppProgress()
    s = applyReport(s, { type: 'visit', area: 'prayer' }, TODAY)
    s = applyReport(s, { type: 'done', area: 'blocks' }, TODAY)
    s = applyReport(s, { type: 'answer', area: 'stone', correct: true }, '2026-10-27')
    const sum = summarize(s, TODAY)
    expect(sum.total).toBe(AREA_IDS.length)
    expect(sum.tried).toBe(3)
    expect(sum.pct).toBe(Math.round((3 / AREA_IDS.length) * 100))
    expect(sum.done).toBe(1)
    expect(sum.answers).toBe(1)
    expect(sum.today).toEqual({ answers: 0, correct: 0, done: 1, areas: 2 })
    expect(sum.groups.flatMap((g) => g.areas).find((a) => a.id === 'prayer').tried).toBe(true)
    expect(sum.groups.flatMap((g) => g.areas).find((a) => a.id === 'echo').tried).toBe(false)
  })
})

describe('appProgress runtime seams', () => {
  it('persists across a reload (read back from storage)', () => {
    noteVisit('explore')
    noteDone('hunt')
    const again = loadAppProgress()
    expect(again.areas.explore.visits).toBe(1)
    expect(again.areas.hunt.done).toBe(1)
    expect(JSON.parse(localStorage.getItem(APP_PROGRESS_KEY)).v).toBe(1)
  })

  it('survives corrupt storage', () => {
    localStorage.setItem(APP_PROGRESS_KEY, '{not json')
    expect(loadAppProgress()).toEqual(emptyAppProgress())
    expect(() => noteDone('echo')).not.toThrow()
    expect(loadAppProgress().areas.echo.done).toBe(1)
  })

  it('telemetry.recordAnswer reports into the ACTIVE screen, for any game', () => {
    setActiveArea('traffic')
    recordAnswer('ha-1', 'ha-1', 'traffic')
    recordAnswer('ha-1', 'le-1', 'traffic')
    const a = loadAppProgress().areas.traffic
    expect(a.answers).toBe(2)
    expect(a.correct).toBe(1)
  })

  it('a finished round of a levelled game and a built church family count as done', () => {
    setActiveArea('train')
    roundStore('fq.train.v1', 5).save({ unlocked: 2, due: {}, best: {} })
    setActiveArea('blocks')
    churchStore.save({ done: { ha: 3 } })
    const s = loadAppProgress()
    expect(s.areas.train.done).toBe(1)
    expect(s.areas.blocks.done).toBe(1)
  })

  it('trackScreen: a visit counts only after VISIT_MS, and leaving early cancels it', () => {
    vi.useFakeTimers()
    const stop = trackScreen('stories')
    expect(getActiveArea()).toBe('stories')
    vi.advanceTimersByTime(VISIT_MS - 100)
    stop()
    vi.advanceTimersByTime(1000)
    expect(loadAppProgress().areas.stories).toBeUndefined()
    const stay = trackScreen('stories')
    vi.advanceTimersByTime(VISIT_MS + 10)
    stay()
    expect(loadAppProgress().areas.stories.visits).toBe(1)
  })

  it('home and unknown screens report nothing but clear the active area', () => {
    vi.useFakeTimers()
    setActiveArea('echo')
    trackScreen('home')()
    expect(getActiveArea()).toBeNull()
    vi.advanceTimersByTime(VISIT_MS * 2)
    expect(localStorage.getItem(APP_PROGRESS_KEY)).toBeNull()
  })

  it('noteAnswer/noteDone with no active area still bump the day totals', () => {
    noteAnswer(true)
    noteDone()
    expect(loadAppProgress().days[dayStamp()]).toMatchObject({ answers: 1, done: 1 })
  })
})

describe('appProgress is per child and survives backup/wipe', () => {
  beforeEach(() => { localStorage.setItem('fq.familypack.v1', JSON.stringify({ unlocked: true, method: 'store' })) })

  it('each profile keeps its own app progress', () => {
    loadProfiles()
    noteDone('echo')
    const first = loadProfiles().active
    const kid2 = addProfile('Abel')
    expect(loadAppProgress()).toEqual(emptyAppProgress()) // fresh start
    noteDone('beats')
    expect(switchProfile(first)).toBe(true)
    const a = loadAppProgress()
    expect(a.areas.echo.done).toBe(1)
    expect(a.areas.beats).toBeUndefined()
    switchProfile(kid2.id)
    expect(loadAppProgress().areas.beats.done).toBe(1)
    expect(loadAppProgress().areas.echo).toBeUndefined()
  })

  it('is carried by the progress snapshot and cleared by wipe', () => {
    noteDone('market')
    const snap = snapshotProgress()
    expect(snap.data[APP_PROGRESS_KEY]).toBeTruthy()
    wipeProgress()
    expect(loadAppProgress()).toEqual(emptyAppProgress())
    expect(restoreProgress(snap)).toBeGreaterThan(0)
    expect(loadAppProgress().areas.market.done).toBe(1)
  })
})
