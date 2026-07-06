import { describe, it, expect, beforeEach } from 'vitest'
import { medianFps, perfVerdict, loadPerf, savePerf, isDegraded } from './quality'

beforeEach(() => localStorage.clear())

describe('perf degradation math (P4)', () => {
  it('takes the median of frame samples', () => {
    expect(medianFps([60, 60, 60])).toBe(60)
    expect(medianFps([10, 20, 30])).toBe(20)
    expect(medianFps([10, 20, 30, 40])).toBe(25)
    expect(medianFps([])).toBe(60) // safe default: assume capable
  })

  it('flags low only below the floor', () => {
    expect(perfVerdict(59)).toBe('ok')
    expect(perfVerdict(30)).toBe('ok')
    expect(perfVerdict(29)).toBe('low')
    expect(perfVerdict(12)).toBe('low')
  })

  it('persists and reads the sticky verdict', () => {
    expect(loadPerf()).toBe(null)
    savePerf('low')
    expect(loadPerf()).toBe('low')
    expect(isDegraded()).toBe(true)
  })

  it('lets fq.quality force the verdict for testing', () => {
    localStorage.setItem('fq.quality', 'low')
    expect(loadPerf()).toBe('low')
    localStorage.setItem('fq.quality', 'high')
    expect(loadPerf()).toBe('ok')
  })
})
