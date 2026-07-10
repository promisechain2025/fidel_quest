import { describe, it, expect, beforeEach } from 'vitest'
import { progressChanged, subscribeProgress, progressVersion } from './childModel'
import { saveJourney, loadJourney } from '../journey'
import { recordAnswer } from './telemetry'
import { markHuntDone } from './hunt'
import { markSupported } from './license'
import { wipeProgress } from './progress'

describe('childModel (reactive invalidation)', () => {
  beforeEach(() => localStorage.clear())

  it('notifies subscribers and ticks the version', () => {
    let calls = 0
    const off = subscribeProgress(() => { calls++ })
    const v0 = progressVersion()
    progressChanged()
    expect(calls).toBe(1)
    expect(progressVersion()).toBe(v0 + 1)
    off()
    progressChanged()
    expect(calls).toBe(1)
  })

  it('every child-state writer announces the change', () => {
    let calls = 0
    const off = subscribeProgress(() => { calls++ })
    const bumped = (fn) => {
      const before = calls
      fn()
      expect(calls).toBeGreaterThan(before)
    }
    bumped(() => saveJourney(loadJourney()))
    bumped(() => recordAnswer('ha-1', 'ha-1', 'test'))
    bumped(() => markHuntDone('2026-07-10'))
    bumped(() => markSupported('test'))
    bumped(() => wipeProgress())
    off()
  })

  it('a throwing listener does not stop the others', () => {
    let ok = false
    const off1 = subscribeProgress(() => { throw new Error('boom') })
    const off2 = subscribeProgress(() => { ok = true })
    progressChanged()
    expect(ok).toBe(true)
    off1(); off2()
  })
})
