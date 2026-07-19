import { describe, it, expect, beforeEach } from 'vitest'
import { reviewEntry, srsReview, loadSrs, dueForms, dueKeys, srsSize, EASE_START, EASE_MIN, EASE_MAX, epochDay } from './srs'
import { recordAnswer } from './telemetry'

beforeEach(() => localStorage.clear())

describe('SM-2-lite entry transitions (pure)', () => {
  it('grows the interval 1 -> 3 -> ease-multiplied on consecutive correct', () => {
    const D = 1000
    let e = reviewEntry(undefined, true, D)
    expect(e).toEqual([1, EASE_START + 5, 1, D + 1, D])
    e = reviewEntry(e, true, D + 1)
    expect(e[2]).toBe(3)
    e = reviewEntry(e, true, D + 4)
    expect(e[2]).toBeGreaterThanOrEqual(7) // ~3 * 2.6
    expect(e[3]).toBe(D + 4 + e[2])
  })

  it('a miss resets reps and schedules for tomorrow, lowering ease', () => {
    const D = 1000
    let e = reviewEntry(undefined, true, D)
    e = reviewEntry(e, true, D + 1)
    const ease = e[1]
    e = reviewEntry(e, false, D + 4)
    expect(e[0]).toBe(0)
    expect(e[1]).toBe(ease - 20)
    expect(e[2]).toBe(1)
    expect(e[3]).toBe(D + 5)
  })

  it('ease stays clamped to [EASE_MIN, EASE_MAX]', () => {
    let e
    for (let i = 0; i < 30; i++) e = reviewEntry(e, false, 1000 + i)
    expect(e[1]).toBe(EASE_MIN)
    // Reviews at the due day (the spacing guard ignores crammed successes).
    for (let i = 0; i < 60; i++) e = reviewEntry(e, true, e[3])
    expect(e[1]).toBe(EASE_MAX)
  })

  it('intervals always advance on correct (never stall)', () => {
    let e = [5, EASE_MIN, 4, 0, 0] // low ease could round to the same ivl
    e = reviewEntry(e, true, 3000)
    expect(e[2]).toBeGreaterThan(4)
  })

  it('spacing guard: crammed same-session successes cannot inflate the schedule', () => {
    const D = 1000
    let e = reviewEntry(undefined, true, D) // new form: due D+1
    const before = [...e]
    // Four more correct touches in the same session - a normal lesson.
    for (let i = 0; i < 4; i++) e = reviewEntry(e, true, D)
    expect(e).toEqual(before) // unchanged: no time has passed
    // A miss before due ALWAYS counts (forgetting is evidence).
    e = reviewEntry(e, false, D)
    expect(e[0]).toBe(0)
    // Once due, a correct advances normally.
    e = reviewEntry(e, true, e[3])
    expect(e[0]).toBe(1)
  })
})

describe('schedule table + due selection', () => {
  it('stores per-form entries and reports due forms most-overdue first', () => {
    const D = epochDay()
    srsReview('ha-1', true, D - 10) // due D-9 -> overdue 9
    srsReview('le-1', true, D - 3) // due D-2 -> overdue 2
    srsReview('me-1', true, D) // due D+1 -> not due
    const due = dueForms(loadSrs(), D)
    expect(due.map((d) => d.key)).toEqual(['ha-1', 'le-1'])
    expect(dueKeys(D)).toEqual(['ha-1', 'le-1'])
    expect(srsSize()).toBe(3)
  })

  it('survives garbage in storage', () => {
    localStorage.setItem('fq.srs.v1', 'nope')
    expect(loadSrs()).toEqual({ v: 1, f: {} })
    expect(dueKeys()).toEqual([])
  })

  it('every telemetry answer advances the schedule (the seam)', () => {
    recordAnswer('ha-1', 'ha-1', 'lesson')
    recordAnswer('le-1', 'me-1', 'lesson')
    const t = loadSrs()
    expect(t.f['ha-1'][0]).toBe(1) // correct: one rep
    expect(t.f['le-1'][0]).toBe(0) // miss: reset, due tomorrow
    expect(t.f['le-1'][3]).toBe(epochDay() + 1)
  })
})
