import { describe, it, expect, beforeEach } from 'vitest'
import { churchStore, withFamilyBuilt, starsForMisses, CHURCH_KEY } from './churchProgress'
import { PROGRESS_KEYS } from './progress'

beforeEach(() => localStorage.clear())

describe('churchProgress', () => {
  it('is in the per-child progress registry', () => {
    expect(PROGRESS_KEYS).toContain(CHURCH_KEY)
  })
  it('starts empty and round-trips', () => {
    expect(churchStore.load()).toEqual({ done: {} })
    const s = withFamilyBuilt(withFamilyBuilt({ done: {} }, 'le', 3), 'ha', 1)
    churchStore.save(s)
    expect(churchStore.load()).toEqual({ done: { le: 3, ha: 1 } })
  })
  it('keeps the best stars and ignores bad ids', () => {
    let s = withFamilyBuilt({ done: {} }, 'le', 3)
    s = withFamilyBuilt(s, 'le', 1)
    expect(s.done.le).toBe(3)
    expect(withFamilyBuilt(s, '../x', 2)).toBe(s)
  })
  it('sanitises corrupt storage', () => {
    localStorage.setItem(CHURCH_KEY, JSON.stringify({ done: { le: 9, ha: 2, 'BAD ID': 2, me: 'x' } }))
    expect(churchStore.load()).toEqual({ done: { ha: 2 } })
    localStorage.setItem(CHURCH_KEY, '{nope')
    expect(churchStore.load()).toEqual({ done: {} })
  })
  it('stars from misses', () => {
    expect([0, 1, 2, 3, 9].map(starsForMisses)).toEqual([3, 2, 2, 1, 1])
  })
})
