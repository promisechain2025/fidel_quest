import { describe, it, expect } from 'vitest'
import { advanceStreak, prevDay, dayStamp } from './streak'

describe('streak transitions', () => {
  it('starts a streak at 1 on first play', () => {
    const { state, incremented } = advanceStreak(null, '2026-07-09')
    expect(state).toEqual({ count: 1, best: 1, lastDay: '2026-07-09' })
    expect(incremented).toBe(true)
  })

  it('does not change on a second play the same day', () => {
    const start = { count: 3, best: 5, lastDay: '2026-07-09' }
    const { state, incremented } = advanceStreak(start, '2026-07-09')
    expect(state).toBe(start)
    expect(incremented).toBe(false)
  })

  it('increments when played the next day', () => {
    const { state } = advanceStreak({ count: 3, best: 3, lastDay: '2026-07-08' }, '2026-07-09')
    expect(state).toEqual({ count: 4, best: 4, lastDay: '2026-07-09' })
  })

  it('resets to 1 after a missed day, keeping best', () => {
    const { state } = advanceStreak({ count: 6, best: 6, lastDay: '2026-07-06' }, '2026-07-09')
    expect(state).toEqual({ count: 1, best: 6, lastDay: '2026-07-09' })
  })

  it('prevDay crosses month boundaries', () => {
    expect(prevDay('2026-07-01')).toBe('2026-06-30')
    expect(prevDay('2026-01-01')).toBe('2025-12-31')
  })

  it('dayStamp zero-pads', () => {
    expect(dayStamp(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
