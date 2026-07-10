import { describe, it, expect, beforeEach } from 'vitest'
import { TEE_DESIGNS, teeUnlocked, unlockedTees, nextTeeAt, loadSeenTees, markTeesSeen, newTeeCount } from './tees'

describe('tee designs', () => {
  it('has ordered, ascending unlock thresholds ending at the full 33', () => {
    expect(TEE_DESIGNS.length).toBeGreaterThanOrEqual(4)
    const ups = TEE_DESIGNS.map((d) => d.unlock)
    expect(ups).toEqual([...ups].sort((a, b) => a - b))
    expect(ups[0]).toBe(1) // a day-one starter
    expect(ups[ups.length - 1]).toBe(33) // a champion at mastery
    expect(new Set(TEE_DESIGNS.map((d) => d.id)).size).toBe(TEE_DESIGNS.length)
  })

  it('unlocks by families learned', () => {
    expect(teeUnlocked(TEE_DESIGNS[0], 0)).toBe(false)
    expect(teeUnlocked(TEE_DESIGNS[0], 1)).toBe(true)
    expect(unlockedTees(0)).toHaveLength(0)
    expect(unlockedTees(8).map((d) => d.id)).toEqual(['starter', 'explorer'])
    expect(unlockedTees(33)).toHaveLength(TEE_DESIGNS.length)
  })

  it('reports the next locked threshold, null once all are unlocked', () => {
    expect(nextTeeAt(0)).toBe(1)
    expect(nextTeeAt(8)).toBe(16)
    expect(nextTeeAt(33)).toBeNull()
  })
})

describe('new-design badge tracking', () => {
  beforeEach(() => localStorage.clear())

  it('counts unlocked-but-unseen designs and clears once seen', () => {
    expect(newTeeCount(8)).toBe(2) // starter + explorer, unseen
    markTeesSeen(unlockedTees(8).map((d) => d.id))
    expect(newTeeCount(8)).toBe(0)
    // learning more re-badges only the newly unlocked one
    expect(newTeeCount(16)).toBe(1)
  })

  it('survives corrupt storage', () => {
    localStorage.setItem('fq.tees.v1', 'not json')
    expect(loadSeenTees().size).toBe(0)
    expect(newTeeCount(33)).toBe(TEE_DESIGNS.length)
  })
})
