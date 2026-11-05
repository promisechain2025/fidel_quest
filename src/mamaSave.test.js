import { describe, it, expect, beforeEach } from 'vitest'
import { MAMA_KEY, addBuilding, emptyMama, loadMama, normalizeMama, rememberSpeed } from './mamaSave'
import { PROGRESS_KEYS } from './platform/progress'
import { SWAP_KEYS } from './platform/profiles'

beforeEach(() => localStorage.clear())

describe('ማማ save', () => {
  it('is part of the child progress that swaps and backs up', () => {
    expect(PROGRESS_KEYS).toContain(MAMA_KEY)
    expect(SWAP_KEYS).toContain(MAMA_KEY)
  })

  it('drops junk and remembers one speed and each building once', () => {
    expect(normalizeMama({ speed: 'zoom', city: ['lam', 'LAM', 'lam', '', 'anbesa'] })).toEqual({ v: 1, speed: null, city: ['lam', 'anbesa'] })
    expect(rememberSpeed('slow').speed).toBe('slow')
    expect(loadMama().speed).toBe('slow')
    expect(addBuilding('anbesa').city).toEqual(['anbesa'])
    expect(addBuilding('anbesa').city).toEqual(['anbesa'])
    expect(addBuilding('biet').city).toEqual(['anbesa', 'biet'])
    expect(JSON.parse(localStorage.getItem(MAMA_KEY)).city).toEqual(['anbesa', 'biet'])
    expect(emptyMama().city).toEqual([])
  })
})
