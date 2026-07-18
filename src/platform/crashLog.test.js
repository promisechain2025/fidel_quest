import { describe, it, expect } from 'vitest'
import { loadCrashes, recordCrash, clearCrashes } from './crashLog'

describe('crash log (local field diagnostics)', () => {
  it('starts empty and survives garbage in storage', () => {
    expect(loadCrashes()).toEqual([])
    localStorage.setItem('fq.crashlog.v1', 'not json')
    expect(loadCrashes()).toEqual([])
    localStorage.setItem('fq.crashlog.v1', '{"an":"object"}')
    expect(loadCrashes()).toEqual([])
  })

  it('records message, stack head, and component frame, truncated', () => {
    const err = new Error('x'.repeat(500))
    const rec = recordCrash(err, { componentStack: '\n    at Runner\n    at App' })
    expect(rec.msg.length).toBeLessThanOrEqual(200)
    expect(rec.at).toBe('at Runner')
    expect(loadCrashes()).toHaveLength(1)
  })

  it('keeps only the newest five crashes', () => {
    for (let i = 0; i < 8; i++) recordCrash(new Error(`crash ${i}`))
    const list = loadCrashes()
    expect(list).toHaveLength(5)
    expect(list[4].msg).toBe('crash 7')
    expect(list[0].msg).toBe('crash 3')
  })

  it('handles non-Error values and clears', () => {
    recordCrash('a string reason')
    expect(loadCrashes().at(-1).msg).toBe('a string reason')
    clearCrashes()
    expect(loadCrashes()).toEqual([])
  })
})
