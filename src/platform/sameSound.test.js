import { describe, it, expect } from 'vitest'
import { soundKeyOf, sameSound, uniqueBySound } from './sameSound'
import { AM_PACK } from '../packs/am'
import { TI_PACK } from '../packs/ti'

describe('sameSound (Amharic)', () => {
  const am = AM_PACK
  it('folds the order remap: ሀ (ha-1) is heard as ሃ (ha-4)', () => {
    expect(sameSound('ha-1', 'ha-4', am)).toBe(true)
    expect(sameSound('a-1', 'a-4', am)).toBe(true)
  })
  it('folds declared twins: ሐ/ኀ/ሀ, ሠ/ሰ, ዐ/አ, ፀ/ጸ', () => {
    expect(sameSound('hha-1', 'ha-1', am)).toBe(true)
    expect(sameSound('kha-3', 'ha-3', am)).toBe(true)
    expect(sameSound('kha-1', 'ha-4', am)).toBe(true)
    expect(sameSound('sse-1', 'se-1', am)).toBe(true)
    expect(sameSound('ae-2', 'a-2', am)).toBe(true)
    expect(sameSound('ttse-1', 'tse-1', am)).toBe(true)
  })
  it('folds audio aliases: ኸ shares ከ recordings until re-recorded', () => {
    expect(sameSound('khe-4', 'ke-4', am)).toBe(true)
  })
  it('keeps genuinely different sounds apart', () => {
    expect(sameSound('ha-1', 'ha-2', am)).toBe(false)
    expect(sameSound('le-1', 'le-4', am)).toBe(false)
    expect(sameSound('se-1', 'she-1', am)).toBe(false)
    expect(sameSound('tse-1', 'te-1', am)).toBe(false)
  })
  it('uniqueBySound keeps the first of each sound, in order', () => {
    expect(uniqueBySound(['tse-1', 'le-1', 'ttse-1', 'ha-1', 'hha-1', 'ha-4'], am)).toEqual(['tse-1', 'le-1', 'ha-1'])
  })
  it('soundKeyOf passes non-letter keys through', () => {
    expect(soundKeyOf('x1', am)).toBe('x1')
  })
})

describe('sameSound (Tigrinya keeps its distinctions)', () => {
  const ti = TI_PACK
  it('ሀ and ሐ are different in Tigrinya; ጸ/ፀ and ሰ/ሠ are still twins', () => {
    expect(sameSound('ha-1', 'hha-1', ti)).toBe(false)
    expect(sameSound('ha-1', 'ha-4', ti)).toBe(false)
    expect(sameSound('tse-1', 'ttse-1', ti)).toBe(true)
    expect(sameSound('se-3', 'sse-3', ti)).toBe(true)
  })
})
