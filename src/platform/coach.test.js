import { describe, it, expect } from 'vitest'
import { buildWarmup, etaStamp, addDays, makePlan, loadPlan, setRequireWarmup, warmupDoneToday, markWarmupDone, loadCoach, PACES, WARMUP_SIZE } from './coach'
import { INDEXES } from './ethiopic'

const ev = (k, p, d) => ({ k, p, m: 'test', d })

describe('buildWarmup', () => {
  const learned = ['ha', 'le', 'me', 'se', 're', 'be', 'te']
  it('is deterministic in (seed, learned, events)', () => {
    const a = buildWarmup(11, learned, [])
    const b = buildWarmup(11, learned, [])
    expect(a).toEqual(b)
    expect(buildWarmup(12, learned, []).map((q) => q.target).join()).not.toBe(a.map((q) => q.target).join())
  })
  it('is empty only when nothing is learned', () => {
    expect(buildWarmup(1, [], [])).toEqual([])
    expect(buildWarmup(1, ['ha'], []).length).toBe(1)
  })
  it('caps at WARMUP_SIZE and stays within/around the learned pool for targets', () => {
    const qs = buildWarmup(5, learned, [])
    expect(qs.length).toBe(WARMUP_SIZE)
    for (const q of qs) {
      expect(learned.map((id) => `${id}-1`)).toContain(q.target)
      expect(q.options).toContain(q.target)
    }
  })
  it('puts actually-missed letters into the set', () => {
    // The child keeps confusing se: heard se, picked re, twice.
    const events = [ev('se-1', 're-1', 20260701), ev('se-1', 're-1', 20260702), ev('se-1', 'se-1', 20260703)]
    const qs = buildWarmup(7, learned, events)
    expect(qs.some((q) => q.target === 'se-1')).toBe(true)
  })
  it('never seats two options with the same sound (twin-safe)', () => {
    const withTwins = ['ha', 'hha', 'kha', 'se', 'sse', 'a', 'ae']
    for (const q of buildWarmup(9, withTwins, [])) {
      const sounds = q.options.map((k) => INDEXES.byAudioKey.get(k).sound)
      expect(new Set(sounds).size).toBe(sounds.length)
    }
  })
  it('never seats an option from outside the scoped families', () => {
    const famOf = (k) => k.replace(/-\d+$/, '')
    for (const seed of [1, 5, 42]) {
      for (const q of buildWarmup(seed, ['ha', 'le'], [])) {
        expect(q.options.length).toBeGreaterThanOrEqual(2)
        for (const k of q.options) expect(['ha', 'le']).toContain(famOf(k))
      }
    }
    // even a single-family pool fills options from its own vocal orders
    for (const q of buildWarmup(3, ['ha'], [])) {
      expect(q.options.length).toBe(4)
      for (const k of q.options) expect(famOf(k)).toBe('ha')
    }
  })
  it('never asks the same SOUND twice across the warm-up (twins collapse)', () => {
    const withTwins = ['ha', 'hha', 'kha', 'se', 'sse', 'a', 'ae']
    for (const seed of [1, 9, 42, 77]) {
      const targetSounds = buildWarmup(seed, withTwins, []).map((q) => INDEXES.byAudioKey.get(q.target).sound)
      expect(new Set(targetSounds).size).toBe(targetSounds.length)
    }
  })
})

describe('plan + eta', () => {
  it('addDays crosses month/year boundaries', () => {
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08')
  })
  it('etaStamp scales with pace and clamps when finished', () => {
    // 33 families, 5 learned -> 28 remaining; 4/week -> 7 weeks.
    expect(etaStamp('2026-07-09', 5, 4)).toBe(addDays('2026-07-09', 49))
    expect(etaStamp('2026-07-09', 33, 4)).toBe('2026-07-09')
  })
  it('registers, validates, and toggles a plan', () => {
    expect(loadPlan()).toBeNull()
    makePlan('steady', { today: '2026-07-09' })
    expect(loadPlan()).toEqual({ pace: 'steady', requireWarmup: false, createdDay: '2026-07-09' })
    setRequireWarmup(true)
    expect(loadPlan().requireWarmup).toBe(true)
    expect(PACES.map((p) => p.id)).toContain(loadPlan().pace)
  })
})

describe('daily warm-up record', () => {
  it('marks once per day and counts distinct days', () => {
    expect(warmupDoneToday('2026-07-09')).toBe(false)
    markWarmupDone('2026-07-09')
    markWarmupDone('2026-07-09')
    expect(warmupDoneToday('2026-07-09')).toBe(true)
    expect(loadCoach().days).toBe(1)
    markWarmupDone('2026-07-10')
    expect(loadCoach().days).toBe(2)
  })
})
