import { describe, it, expect } from 'vitest'
import { normalizeCode } from './community'

describe('community code normalization', () => {
  it('uppercases and strips punctuation/spaces', () => {
    expect(normalizeCode('debre selam!')).toBe('DEBRESELAM')
    expect(normalizeCode('  asmara-2026 ')).toBe('ASMARA2026')
  })
  it('caps length at 12', () => {
    expect(normalizeCode('abcdefghijklmnop')).toBe('ABCDEFGHIJKL')
  })
  it('handles empty / nullish input', () => {
    expect(normalizeCode('')).toBe('')
    expect(normalizeCode(null)).toBe('')
    expect(normalizeCode(undefined)).toBe('')
  })
})
