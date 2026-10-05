import { describe, it, expect } from 'vitest'
import { mintAppCode, isValidAppCode, codeForInstall, normalizeCode, CODE_ALPHABET } from './appCodes'

describe('app unlock codes', () => {
  it('mints a code that validates, and rejects tampering and other products', () => {
    const code = mintAppCode('ABCD')
    expect(code.startsWith('EGZ')).toBe(true)
    expect(isValidAppCode(code)).toBe(true)
    expect(isValidAppCode('egz abcd' + code.slice(-1))).toBe(true)
    expect(normalizeCode('egz-abcd')).toBe('EGZABCD')
    expect(isValidAppCode(code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A'))).toBe(false)
    expect(isValidAppCode('FAMABCD')).toBe(false)
    expect(isValidAppCode('')).toBe(false)
    expect(mintAppCode('ABC')).toBeNull()
    expect(mintAppCode('AB0D')).toBeNull()
  })

  it('derives a stable code from an install id', () => {
    const a = codeForInstall('phone-install-1')
    expect(a).toBe(codeForInstall('phone-install-1'))
    expect(isValidAppCode(a)).toBe(true)
    expect(codeForInstall('phone-install-2')).not.toBe(a)
    for (const ch of a.slice(3)) expect(CODE_ALPHABET.includes(ch)).toBe(true)
  })
})
