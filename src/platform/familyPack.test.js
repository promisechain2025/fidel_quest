import { describe, it, expect, beforeEach } from 'vitest'
import { familyPackUnlocked, unlockFamilyPack, isValidFamilyCode, redeemFamilyCode, mintFamilyCode, normalizeFamilyCode } from './familyPack'

beforeEach(() => localStorage.clear())

describe('family pack entitlement', () => {
  it('starts locked, unlocks, survives junk storage', () => {
    expect(familyPackUnlocked()).toBe(false)
    unlockFamilyPack('web')
    expect(familyPackUnlocked()).toBe(true)
    localStorage.setItem('fq.familypack.v1', 'garbage')
    expect(familyPackUnlocked()).toBe(false)
  })

  it('is not a progress key (resetting a child must not revoke a purchase)', async () => {
    const { PROGRESS_KEYS } = await import('./progress')
    expect(PROGRESS_KEYS).not.toContain('fq.familypack.v1')
  })
})

describe('family codes (offline checksum)', () => {
  it('minted codes validate, including lowercase/dashed entry', () => {
    const code = mintFamilyCode('KQ2X')
    expect(code).toMatch(/^FAM[A-Z2-9]{5}$/)
    expect(isValidFamilyCode(code)).toBe(true)
    expect(isValidFamilyCode(code.toLowerCase())).toBe(true)
    expect(isValidFamilyCode(`fam-${code.slice(3, 7)}-${code.slice(7)}`)).toBe(true)
  })

  it('rejects tampered, short, and wrong-alphabet codes', () => {
    const code = mintFamilyCode('KQ2X')
    const flipped = code.slice(0, 7) + (code[7] === 'A' ? 'B' : 'A')
    expect(isValidFamilyCode(flipped)).toBe(false)
    expect(isValidFamilyCode('FAMKQ2')).toBe(false)
    expect(isValidFamilyCode('')).toBe(false)
    expect(isValidFamilyCode('FAMO0I1L')).toBe(false) // excluded look-alikes
    expect(mintFamilyCode('O0I1')).toBeNull()
  })

  it('a valid redeem unlocks; an invalid one does not', () => {
    expect(redeemFamilyCode('FAMXXXXX')).toBe(false)
    expect(familyPackUnlocked()).toBe(false)
    expect(redeemFamilyCode(mintFamilyCode('ABCD'))).toBe(true)
    expect(familyPackUnlocked()).toBe(true)
  })

  it('normalize strips separators and case', () => {
    expect(normalizeFamilyCode(' fam-ab cd.e ')).toBe('FAMABCDE')
  })
})
