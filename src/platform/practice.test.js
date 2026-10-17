import { describe, it, expect, beforeEach } from 'vitest'
import {
  fold, emptyState, activeMinutes, accuracyPct, practiceStreak, lastDays, clampGoal, goalProgress,
  loadPractice, savePractice, setPracticeGoal, IDLE_MS, RAPID_RUN, LOOP_RUN, RANDOM_WINDOW, PRACTICE_KEY,
} from './practice'
import { PROGRESS_KEYS } from './progress'
import { SWAP_KEYS } from './profiles'
import { dayStamp } from './streak'

const T0 = new Date(2026, 9, 18, 10, 0, 0).getTime()
const DAY = dayStamp(new Date(T0))
const S = 1000
const row = (st, d = DAY) => st.days[d]
/** a tap every `every` ms for `dur` ms, at moving spots (normal play) */
const play = (start, dur, every = 5 * S) => {
  const out = []
  for (let t = start, i = 0; t < start + dur; t += every, i++) out.push({ type: 'tap', t, x: (i * 53) % 300, y: (i * 97) % 500 })
  return out
}

describe('active time', () => {
  it('counts steady play minute for minute', () => {
    const st = fold([...play(T0, 10 * 60 * S), { type: 'tick', t: T0 + 10 * 60 * S }])
    expect(activeMinutes(row(st))).toBe(10)
    expect(row(st).sessions).toBe(1)
  })

  it('stops the clock 30 s after the last interaction (app left open)', () => {
    const st = fold([{ type: 'tap', t: T0, x: 1, y: 1 }, { type: 'tick', t: T0 + 60 * 60 * S }])
    expect(row(st).activeMs).toBe(IDLE_MS)
    expect(activeMinutes(row(st))).toBe(0)
  })

  it('credits nothing while hidden (background / locked screen / other tab)', () => {
    const st = fold([
      ...play(T0, 60 * S),
      { type: 'hidden', t: T0 + 60 * S },
      { type: 'tick', t: T0 + 20 * 60 * S },
      { type: 'visible', t: T0 + 30 * 60 * S },
      { type: 'tick', t: T0 + 31 * 60 * S }, // coming back is not an interaction
    ])
    expect(row(st).activeMs).toBe(60 * S)
  })

  it('a hide cuts the open window immediately', () => {
    const st = fold([{ type: 'tap', t: T0, x: 0, y: 0 }, { type: 'hidden', t: T0 + 5 * S }, { type: 'visible', t: T0 + 10 * S }, { type: 'tick', t: T0 + 60 * S }])
    expect(row(st).activeMs).toBe(5 * S)
  })

  it('opens a new session after a 5+ minute gap', () => {
    const st = fold([...play(T0, 60 * S), ...play(T0 + 20 * 60 * S, 60 * S)])
    expect(row(st).sessions).toBe(2)
  })

  it('splits time across midnight', () => {
    const late = new Date(2026, 9, 18, 23, 59, 50).getTime()
    const st = fold([{ type: 'tap', t: late, x: 0, y: 0 }, { type: 'tick', t: late + 20 * S }])
    expect(st.days[DAY].activeMs).toBe(10 * S)
    expect(st.days['2026-10-19'].activeMs).toBe(10 * S)
  })

  it('ignores a clock that jumps backwards', () => {
    const a = fold(play(T0, 60 * S))
    const b = fold([{ type: 'tap', t: T0 - 3600 * S, x: 0, y: 0 }], a)
    expect(b).toBe(a)
  })
})

describe('anti-cheat flags (never block, only report)', () => {
  it('rapid same-spot tapping is flagged once and stops counting time', () => {
    const taps = []
    for (let i = 0; i < 2000; i++) taps.push({ type: 'tap', t: T0 + i * 100, x: 50, y: 50 }) // autoclicker, 200 s
    const st = fold([...taps, { type: 'tick', t: T0 + 2000 * 100 }])
    expect(row(st).flags.rapidTap).toBe(1)
    // only the first RAPID_RUN-1 taps open windows
    expect(row(st).activeMs).toBeLessThanOrEqual((RAPID_RUN * 100) + IDLE_MS)
  })

  it('fast taps on different spots are normal play', () => {
    const taps = []
    for (let i = 0; i < 40; i++) taps.push({ type: 'tap', t: T0 + i * 100, x: i * 40, y: 10 })
    expect(row(fold(taps)).flags.rapidTap).toBe(0)
  })

  it('random fast low-accuracy answering is flagged', () => {
    const ev = []
    for (let i = 0; i < RANDOM_WINDOW + 4; i++) ev.push({ type: 'answer', t: T0 + i * 600, correct: i % 6 === 0 })
    const st = fold(ev)
    expect(row(st).flags.randomTap).toBe(1)
    expect(row(st).answered).toBe(RANDOM_WINDOW + 4)
  })

  it('slow honest mistakes are not "random"', () => {
    const ev = []
    for (let i = 0; i < 30; i++) ev.push({ type: 'answer', t: T0 + i * 4000, correct: i % 5 === 0 })
    expect(row(fold(ev)).flags.randomTap).toBe(0)
  })

  it('audio looping with no input is flagged and stops extending time', () => {
    const ev = [{ type: 'tap', t: T0, x: 0, y: 0 }]
    for (let i = 1; i <= 40; i++) ev.push({ type: 'listen', t: T0 + i * 20 * S })
    ev.push({ type: 'tick', t: T0 + 900 * S })
    const st = fold(ev)
    expect(row(st).flags.audioLoop).toBe(1)
    expect(row(st).activeMs).toBeLessThanOrEqual(3 * 20 * S + IDLE_MS)
  })

  it('a few listens between taps are fine', () => {
    const ev = []
    for (let i = 0; i < 20; i++) ev.push({ type: 'tap', t: T0 + i * 10 * S, x: i, y: i * 30 }, { type: 'listen', t: T0 + i * 10 * S + 2 * S })
    expect(row(fold(ev)).flags.audioLoop).toBe(0)
    expect(LOOP_RUN).toBeGreaterThan(1)
  })
})

describe('daily numbers', () => {
  it('items, accuracy, lessons, games', () => {
    const st = fold([
      { type: 'answer', t: T0, correct: true }, { type: 'answer', t: T0 + 3 * S, correct: false },
      { type: 'answer', t: T0 + 6 * S, correct: true }, { type: 'trace', t: T0 + 9 * S },
      { type: 'lesson', t: T0 + 10 * S }, { type: 'game', t: T0 + 11 * S },
    ])
    const r = row(st)
    expect(r.items).toBe(4)
    expect(accuracyPct(r)).toBe(67)
    expect([r.lessons, r.games]).toEqual([1, 1])
  })

  it('streak counts consecutive days with an active minute', () => {
    const days = {}
    for (const d of ['2026-10-15', '2026-10-16', '2026-10-17']) days[d] = { day: d, activeMs: 120000 }
    expect(practiceStreak(days, '2026-10-18')).toBe(3) // today still empty
    days['2026-10-18'] = { day: '2026-10-18', activeMs: 60000 }
    expect(practiceStreak(days, '2026-10-18')).toBe(4)
    expect(practiceStreak(days, '2026-10-20')).toBe(0)
    expect(lastDays(days, '2026-10-18', 7).map((r) => r.day)[0]).toBe('2026-10-12')
  })

  it('goal is clamped and progress capped at 1', () => {
    expect(clampGoal(60)).toBe(60)
    expect(clampGoal(1)).toBe(5)
    expect(clampGoal(999)).toBe(180)
    expect(clampGoal('x')).toBe(null)
    expect(goalProgress({ activeMs: 90 * 60000 }, 60)).toBe(1)
  })
})

describe('storage', () => {
  beforeEach(() => localStorage.clear())
  it('round-trips and rejects junk', () => {
    savePractice({ days: { [DAY]: { day: DAY, activeMs: 5000 }, bad: { day: 'x' } }, goal: 60 })
    const p = loadPractice()
    expect(Object.keys(p.days)).toEqual([DAY])
    expect(p.goal).toBe(60)
    localStorage.setItem(PRACTICE_KEY, '{nope')
    expect(loadPractice()).toEqual({ days: {}, goal: null })
    expect(setPracticeGoal(45)).toBe(45)
  })
  it('is per child: registered in the progress registry and swap keys', () => {
    expect(PROGRESS_KEYS).toContain(PRACTICE_KEY)
    expect(SWAP_KEYS).toContain('fq.classSync.v1')
  })
  it('state starts empty', () => { expect(emptyState().days).toEqual({}) })
})
