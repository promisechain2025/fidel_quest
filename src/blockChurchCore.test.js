import { describe, it, expect } from 'vitest'
import { initRound, snap, target, isComplete, shuffled, ORDERS, nextFamilyId, builtCount } from './blockChurchCore'

describe('blockChurchCore', () => {
  it('shuffles all 7 orders deterministically', () => {
    expect([...shuffled(ORDERS, 7)].sort()).toEqual(ORDERS)
    expect(shuffled(ORDERS, 7)).toEqual(shuffled(ORDERS, 7))
  })
  it('wrong pieces do not build, right pieces build until complete', () => {
    let s = initRound(3)
    const first = target(s)
    s = snap(s, first === 1 ? 2 : 1)
    expect(s.last).toBe('wrong')
    expect(s.built).toBe(0)
    for (let i = 0; i < 7; i++) s = snap(s, target(s))
    expect(isComplete(s)).toBe(true)
    expect(s.last).toBe('done')
    expect(target(s)).toBe(null)
    expect(snap(s, 1)).toBe(s)
  })
  it('suggests the next unbuilt family in order, wrapping, null when all built', () => {
    const ids = ['ha', 'le', 'hha', 'me']
    expect(nextFamilyId(ids, {})).toBe('ha')
    expect(nextFamilyId(ids, { ha: 3 })).toBe('le')
    expect(nextFamilyId(ids, { ha: 3, le: 1 }, 'le')).toBe('hha')
    expect(nextFamilyId(ids, { le: 2, hha: 2, me: 2 }, 'me')).toBe('ha')
    expect(nextFamilyId(ids, { ha: 1, le: 1, hha: 1, me: 1 }, 'le')).toBe(null)
    expect(builtCount(ids, { ha: 1, me: 3, zz: 2 })).toBe(2)
  })
})
