import { describe, it, expect, beforeEach } from 'vitest'
import { makeChallenge, recordMiss, recordPass, lockRemaining, MAX_MISSES, BASE_LOCK_MS, MAX_LOCK_MS } from './gateCore'

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length] }

beforeEach(() => localStorage.removeItem('fq.gate.v1'))

describe('parental gate challenges', () => {
  it('are random arithmetic with the right answer', () => {
    const seen = new Set()
    for (let i = 0; i < 200; i++) {
      const c = makeChallenge()
      const m = /^(\d+) ([×+]) (\d+)$/.exec(c.text)
      expect(m).not.toBeNull()
      const [a, op, b] = [Number(m[1]), m[2], Number(m[3])]
      expect(c.answer).toBe(op === '×' ? a * b : a + b)
      expect(c.answer).toBeGreaterThanOrEqual(12) // never a single-digit, guessable answer
      if (op === '+') expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10) // always carries
      seen.add(c.text)
    }
    expect(seen.size).toBeGreaterThan(30) // not a short fixed rotation
  })
  it('is deterministic for a given random source', () => {
    expect(makeChallenge(seq([0.1, 0.5, 0.5]))).toEqual(makeChallenge(seq([0.1, 0.5, 0.5])))
  })
})

describe('wrong-answer lockout', () => {
  it('locks after MAX_MISSES misses and doubles each time, capped', () => {
    const t0 = 1_000_000
    for (let i = 1; i < MAX_MISSES; i++) expect(recordMiss(t0)).toBe(0)
    expect(lockRemaining(t0)).toBe(0)
    expect(recordMiss(t0)).toBe(BASE_LOCK_MS)
    expect(lockRemaining(t0 + 1000)).toBe(BASE_LOCK_MS - 1000)
    expect(lockRemaining(t0 + BASE_LOCK_MS)).toBe(0)
    for (let i = 0; i < MAX_MISSES - 1; i++) recordMiss(t0)
    expect(recordMiss(t0)).toBe(BASE_LOCK_MS * 2)
    for (let k = 0; k < 10; k++) for (let i = 0; i < MAX_MISSES; i++) recordMiss(t0)
    expect(lockRemaining(t0)).toBe(MAX_LOCK_MS)
  })
  it('a pass clears misses and escalation', () => {
    recordMiss(0)
    recordPass()
    expect(recordMiss(0)).toBe(0)
  })
})
