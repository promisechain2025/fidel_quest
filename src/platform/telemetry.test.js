import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordAnswer,
  loadLedger,
  clearLedger,
  letterStats,
  troubleLetters,
  confusions,
  tipFor,
  accuracyOf,
} from './telemetry'

const ev = (k, p, m = 'lesson', d = 20260705) => ({ k, p, m, d })

describe('ledger persistence', () => {
  beforeEach(() => clearLedger())

  it('appends and reloads events', () => {
    recordAnswer('ha-1', 'ha-1', 'lesson')
    recordAnswer('le-1', 'me-1', 'runner')
    const events = loadLedger()
    expect(events).toHaveLength(2)
    expect(events[1]).toMatchObject({ k: 'le-1', p: 'me-1', m: 'runner' })
  })

  it('caps the ledger instead of growing forever', () => {
    for (let i = 0; i < 650; i++) recordAnswer('ha-1', 'ha-1', 'lesson')
    expect(loadLedger().length).toBeLessThanOrEqual(600)
  })
})

describe('selectors', () => {
  const events = [
    ev('ha-1', 'ha-1'),
    ev('ha-1', 'se-1'),
    ev('ha-1', 'se-1'),
    ev('ha-1', 'ha-1'),
    ev('le-1', 'le-1'),
    ev('le-1', 'le-1'),
    ev('le-1', 'le-1'),
    ev('me-1', 'be-1', 'runner'),
    ev('me-1', 'be-1', 'runner'),
    ev('me-1', 'me-1', 'runner'),
  ]

  it('computes per-letter stats', () => {
    const stats = letterStats(events)
    expect(stats.get('ha-1')).toMatchObject({ seen: 4, correct: 2, wrong: 2 })
    expect(stats.get('le-1')).toMatchObject({ seen: 3, correct: 3, wrong: 0 })
  })

  it('surfaces trouble letters, worst first, ignoring the barely-seen', () => {
    const trouble = troubleLetters(events)
    expect(trouble.map((t) => t.key)).toEqual(['me-1', 'ha-1'])
    expect(trouble.find((t) => t.key === 'le-1')).toBeUndefined()
  })

  it('builds the confusion matrix', () => {
    const pairs = confusions(events)
    expect(pairs[0]).toMatchObject({ heard: 'ha-1', picked: 'se-1', count: 2 })
    expect(pairs.find((c) => c.heard === 'me-1')).toMatchObject({ picked: 'be-1', count: 2 })
  })

  it('writes an actionable tip with the confusion named', () => {
    const formOf = (key) =>
      ({
        'ha-1': { char: 'ሀ', sound: 'ha', familyName: 'Ha', familyId: 'ha', familyIndex: 0 },
        'se-1': { char: 'ሰ', sound: 'sa', familyName: 'Se', familyId: 'se', familyIndex: 6 },
      })[key]
    const tip = tipFor('ha-1', confusions(events), formOf, (i) => Math.min(4, Math.floor(i / 8) + 1))
    expect(tip.text).toContain('ሰ')
    expect(tip.text).toContain('Ha family')
    expect(tip.level).toBe(1)
    expect(tip.familyId).toBe('ha')
  })

  it('computes accuracy per mode and overall', () => {
    expect(accuracyOf(events)).toBe(60)
    expect(accuracyOf(events, 'runner')).toBe(33)
    expect(accuracyOf([], 'lesson')).toBeNull()
  })
})
