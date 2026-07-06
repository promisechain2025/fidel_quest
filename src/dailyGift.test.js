import { describe, it, expect } from 'vitest'
import { todayKey, giftAvailable, pickGift } from './dailyGift'
import { REWARD_TABLE } from './journey'

describe('daily gift (retention, guilt-free)', () => {
  it('formats a stable local calendar key', () => {
    expect(todayKey(new Date(2026, 6, 6))).toBe('2026-07-06') // month is 0-based
    expect(todayKey(new Date(2026, 0, 9))).toBe('2026-01-09') // zero-padded
  })

  it('is available only when today has not been claimed', () => {
    expect(giftAvailable({ lastClaimed: null }, '2026-07-06')).toBe(true)
    expect(giftAvailable({ lastClaimed: '2026-07-05' }, '2026-07-06')).toBe(true) // a new day
    expect(giftAvailable({ lastClaimed: '2026-07-06' }, '2026-07-06')).toBe(false) // already today
    expect(giftAvailable(null, '2026-07-06')).toBe(true) // first ever
  })

  it('gives an un-owned wearable, stable within a day, and never one you own', () => {
    const today = '2026-07-06'
    const g1 = pickGift([], today)
    const g2 = pickGift([], today)
    expect(g1).toBeTruthy()
    expect(g1.id).toBe(g2.id) // deterministic within the day
    expect([].includes(g1.id)).toBe(false)
    // Owning that item makes the next pick a different, still-un-owned one.
    const g3 = pickGift([g1.id], today)
    expect(g3.id).not.toBe(g1.id)
  })

  it('returns null once every wearable is collected (warm come-back moment)', () => {
    const allOwned = REWARD_TABLE.map((r) => r.id)
    expect(pickGift(allOwned, '2026-07-06')).toBe(null)
  })
})
