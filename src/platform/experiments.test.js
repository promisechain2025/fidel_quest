import { describe, it, expect, beforeEach } from 'vitest'
import { variantOf, activeVariant, EXPERIMENTS, ACTIVE, getUid, shareCtaLabel } from './experiments'

beforeEach(() => localStorage.clear())

describe('A/B experiments (privacy-safe, deterministic)', () => {
  it('mints a stable local uid that is never blank', () => {
    const a = getUid()
    expect(a).toBeTruthy()
    expect(getUid()).toBe(a) // stable across calls
    expect(localStorage.getItem('fq.uid.v1')).toBe(a)
  })

  it('assigns a valid, stable variant for a known experiment', () => {
    const v = variantOf('share_cta')
    expect(EXPERIMENTS.share_cta).toContain(v)
    expect(variantOf('share_cta')).toBe(v) // deterministic for this device
  })

  it('splits devices across both variants (not everyone in one bucket)', () => {
    const seen = new Set()
    for (let i = 0; i < 40; i++) {
      localStorage.clear()
      localStorage.setItem('fq.uid.v1', `device-${i}`)
      seen.add(variantOf('share_cta'))
    }
    expect(seen).toEqual(new Set(EXPERIMENTS.share_cta)) // both A and B occur
  })

  it('returns null for an unknown experiment', () => {
    expect(variantOf('nope')).toBe(null)
  })

  it('activeVariant tags the active experiment only', () => {
    const a = activeVariant()
    if (ACTIVE) {
      expect(a).toEqual({ key: ACTIVE, variant: variantOf(ACTIVE) })
    } else {
      expect(a).toBe(null)
    }
  })

  it('share CTA copy follows the variant', () => {
    const t = (key, fallback) => fallback
    localStorage.setItem('fq.uid.v1', 'device-forcesA')
    const label = shareCtaLabel(t)
    expect(['Share Anbessa', 'Show everyone!']).toContain(label)
    // and it matches the assigned variant
    const expected = variantOf('share_cta') === 'B' ? 'Show everyone!' : 'Share Anbessa'
    expect(label).toBe(expected)
  })
})
