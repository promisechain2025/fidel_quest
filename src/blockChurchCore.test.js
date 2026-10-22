import { describe, it, expect } from 'vitest'
import { initRound, snap, target, isComplete, shuffled, ORDERS } from './blockChurchCore'

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
})
