import { describe, it, expect } from 'vitest'
import {
  encodeChallenge,
  decodeChallenge,
  challengeUrl,
  readChallengeFromHash,
  challengeOutcome,
  sanitizeName,
} from './challenge'

const base = { levelId: 'level-2', seed: 123457, accuracy: 90, streak: 4, by: 'Selam' }

describe('encode/decode round-trip', () => {
  it('preserves a valid payload', () => {
    const out = decodeChallenge(encodeChallenge(base))
    expect(out).toEqual({ levelId: 'level-2', seed: 123457, accuracy: 90, streak: 4, by: 'Selam' })
  })

  it('round-trips an Amharic nickname (UTF-8 safe)', () => {
    const out = decodeChallenge(encodeChallenge({ ...base, by: 'ሰላም' }))
    expect(out.by).toBe('ሰላም')
  })

  it('produces a url-safe token (no +, /, or =)', () => {
    const token = encodeChallenge({ ...base, by: 'ሰላም world' })
    expect(token).not.toMatch(/[+/=]/)
  })
})

describe('decode rejects bad input', () => {
  it('returns null for garbage', () => {
    expect(decodeChallenge('not-base64!!')).toBeNull()
    expect(decodeChallenge('')).toBeNull()
    expect(decodeChallenge(btoa('{"just":"json"}'))).toBeNull()
  })

  it('rejects a wrong version', () => {
    const tampered = btoa(JSON.stringify({ v: 2, l: 'level-1', s: 5, a: 50, k: 0, b: '' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(decodeChallenge(tampered)).toBeNull()
  })

  it('rejects an unsafe level id', () => {
    const bad = encodeChallenge({ ...base, levelId: '../etc/passwd' })
    expect(decodeChallenge(bad)).toBeNull()
  })

  it('rejects a non-positive or huge seed', () => {
    expect(decodeChallenge(encodeChallenge({ ...base, seed: 0 }))).toBeNull()
    expect(decodeChallenge(encodeChallenge({ ...base, seed: -5 }))).toBeNull()
    expect(decodeChallenge(encodeChallenge({ ...base, seed: 2 ** 40 }))).toBeNull()
  })
})

describe('clamping and sanitizing', () => {
  it('clamps accuracy into 0..100', () => {
    expect(decodeChallenge(encodeChallenge({ ...base, accuracy: 250 })).accuracy).toBe(100)
    expect(decodeChallenge(encodeChallenge({ ...base, accuracy: -10 })).accuracy).toBe(0)
  })

  it('clamps streak into 0..999', () => {
    expect(decodeChallenge(encodeChallenge({ ...base, streak: 99999 })).streak).toBe(999)
    expect(decodeChallenge(encodeChallenge({ ...base, streak: -3 })).streak).toBe(0)
  })

  it('sanitizes and length-caps a nickname', () => {
    expect(sanitizeName("a\u0000b <x>")).toBe("a b x") // control chars + angle brackets -> space
    expect(sanitizeName('   spaced   out   ')).toBe('spaced out')
    expect(sanitizeName('x'.repeat(50)).length).toBe(16)
    expect(sanitizeName(null)).toBe('')
  })
})

describe('urls and hashes', () => {
  it('builds a fragment url on the given origin', () => {
    const url = challengeUrl(base, 'https://app.example.com/some/path?q=1')
    expect(url.startsWith('https://app.example.com/#challenge=')).toBe(true)
  })

  it('round-trips through a hash', () => {
    const url = challengeUrl(base, 'https://app.example.com')
    const hash = url.slice(url.indexOf('#'))
    const out = readChallengeFromHash(hash)
    expect(out.levelId).toBe('level-2')
    expect(out.accuracy).toBe(90)
  })

  it('reads a challenge even alongside other hash params', () => {
    const token = encodeChallenge(base)
    expect(readChallengeFromHash(`#foo=1&challenge=${token}`).seed).toBe(123457)
  })

  it('returns null when no challenge is present', () => {
    expect(readChallengeFromHash('#home')).toBeNull()
    expect(readChallengeFromHash('')).toBeNull()
  })
})

describe('outcome', () => {
  it('compares accuracies', () => {
    expect(challengeOutcome(90, 80)).toBe('win')
    expect(challengeOutcome(70, 80)).toBe('lose')
    expect(challengeOutcome(80, 80)).toBe('tie')
  })
})
