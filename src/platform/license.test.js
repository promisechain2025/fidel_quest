import { describe, it, expect, beforeEach } from 'vitest'
import { licenseState, markAsked, grantFeedbackGrace, markSupported, redeemAppCode, daysSince, TRIAL_DAYS, FEEDBACK_GRACE_DAYS, APP_PRICE } from './license'
import { mintAppCode, isValidAppCode } from './appCodes'

// The trial exists when monetization is ON and the platform can sell:
// web always; native only once RevenueCat is live (storeSellable).
const web = (today) => licenseState(today, true, false)

describe('license (honest free trial)', () => {
  beforeEach(() => localStorage.clear())

  it('monetization OFF makes the whole app free (licensed, no asks)', () => {
    const s = licenseState('2026-07-10', false, false)
    expect(s.phase).toBe('licensed')
    expect(s.shouldAsk).toBe(false)
  })

  it('native build without live IAP stays licensed (nothing to sell yet)', () => {
    const s = licenseState('2026-07-10', true, true, false)
    expect(s.phase).toBe('licensed')
    expect(s.shouldAsk).toBe(false)
  })

  it('native build WITH live IAP runs the same trial as the web', () => {
    const s = licenseState('2026-07-10', true, true, true)
    expect(s.phase).toBe('trial')
    expect(s.daysLeft).toBe(TRIAL_DAYS)
    expect(licenseState('2026-09-01', true, true, true).phase).toBe('ended')
  })

  it('EGZ codes: mint validates, tampering fails, redeeming licenses forever', () => {
    const code = mintAppCode('ABCD')
    expect(isValidAppCode(code)).toBe(true)
    expect(isValidAppCode('egz abcd' + code.slice(-1))).toBe(isValidAppCode(code)) // normalization
    expect(isValidAppCode(code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A'))).toBe(false)
    expect(isValidAppCode('FAMABCD')).toBe(false) // a Family Pack code is not an app code
    web('2026-07-01')
    expect(redeemAppCode('nonsense')).toBe(false)
    expect(web('2026-08-01').phase).toBe('ended')
    expect(redeemAppCode(code)).toBe(true)
    expect(web('2027-01-01').phase).toBe('licensed')
  })

  it('exposes a display price', () => {
    expect(APP_PRICE).toMatch(/\d/)
  })

  it('first open starts a full trial', () => {
    const s = web('2026-07-10')
    expect(s.phase).toBe('trial')
    expect(s.daysLeft).toBe(TRIAL_DAYS)
    expect(s.shouldAsk).toBe(false)
  })

  it('the trial counts down day by day and then ends', () => {
    web('2026-07-01')
    const mid = web('2026-07-02')
    expect(mid.phase).toBe('trial')
    expect(mid.daysLeft).toBe(TRIAL_DAYS - 1)
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

  it('feedback grace redeemed mid-trial ADDS the full grace, not just today+N', () => {
    web('2026-07-01') // trial: 2026-07-01 .. 2026-07-04
    const before = web('2026-07-02')
    expect(before.phase).toBe('trial')
    expect(before.daysLeft).toBe(TRIAL_DAYS - 1)
    grantFeedbackGrace('2026-07-02') // still inside the trial
    const after = web('2026-07-02')
    // the grace is added to the END of the remaining window, so the child
    // genuinely gains FEEDBACK_GRACE_DAYS on top of the days still left.
    expect(after.daysLeft).toBe(TRIAL_DAYS - 1 + FEEDBACK_GRACE_DAYS)
  })

  it('the feedback extension works exactly once', () => {
    web('2026-07-01')
    expect(grantFeedbackGrace('2026-08-01')).toBe(FEEDBACK_GRACE_DAYS)
    expect(web('2026-08-01').feedbackAvailable).toBe(false)
    // grace over; a second attempt grants nothing
    expect(grantFeedbackGrace('2026-09-01')).toBe(0)
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
