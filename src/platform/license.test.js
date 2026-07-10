import { describe, it, expect, beforeEach } from 'vitest'
import { licenseState, markAsked, grantFeedbackGrace, markSupported, daysSince, TRIAL_DAYS, FEEDBACK_GRACE_DAYS } from './license'

const web = (today) => licenseState(today, false)

describe('license (honest free trial)', () => {
  beforeEach(() => localStorage.clear())

  it('native store builds are licensed - no trial, no asks', () => {
    const s = licenseState('2026-07-10', true)
    expect(s.phase).toBe('licensed')
    expect(s.shouldAsk).toBe(false)
  })

  it('first open starts a full trial', () => {
    const s = web('2026-07-10')
    expect(s.phase).toBe('trial')
    expect(s.daysLeft).toBe(TRIAL_DAYS)
    expect(s.shouldAsk).toBe(false)
  })

  it('the trial counts down day by day and then ends', () => {
    web('2026-07-01')
    const mid = web('2026-07-05')
    expect(mid.phase).toBe('trial')
    expect(mid.daysLeft).toBe(TRIAL_DAYS - 4)
    const after = web(`2026-07-${String(1 + TRIAL_DAYS).padStart(2, '0')}`)
    expect(after.phase).toBe('ended')
    expect(after.shouldAsk).toBe(true)
  })

  it('asks at most once per calendar day', () => {
    web('2026-07-01')
    const day = '2026-07-30'
    expect(web(day).shouldAsk).toBe(true)
    markAsked(day)
    expect(web(day).shouldAsk).toBe(false)
    expect(web('2026-07-31').shouldAsk).toBe(true)
  })

  it('honest feedback grants more free days', () => {
    web('2026-07-01')
    expect(web('2026-08-01').phase).toBe('ended')
    grantFeedbackGrace('2026-08-01')
    const s = web('2026-08-01')
    expect(s.phase).toBe('trial')
    expect(s.daysLeft).toBe(FEEDBACK_GRACE_DAYS)
    expect(web('2026-09-01').phase).toBe('ended')
  })

  it('supported is permanent and silences all asks', () => {
    web('2026-07-01')
    markSupported('test')
    const s = web('2027-01-01')
    expect(s.phase).toBe('licensed')
    expect(s.shouldAsk).toBe(false)
  })

  it('daysSince does whole calendar days', () => {
    expect(daysSince('2026-07-01', '2026-07-01')).toBe(0)
    expect(daysSince('2026-07-01', '2026-07-15')).toBe(14)
    expect(daysSince('2026-06-30', '2026-07-01')).toBe(1)
  })

  it('progress reset does not restart the trial (license key survives)', async () => {
    web('2026-07-01')
    const { resetEverything } = await import('../utils/devUnlock')
    resetEverything()
    expect(localStorage.getItem('fq.license.v1')).not.toBeNull()
    expect(web('2026-08-01').phase).toBe('ended')
  })
})
