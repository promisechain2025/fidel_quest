import { describe, it, expect, beforeEach } from 'vitest'
import { licenseState, markAsked, grantFeedbackGrace, markSupported, redeemAppCode, daysSince, dailyPass, startDailyPass, fullAccess, TRIAL_DAYS, DAILY_PASS_MINUTES, FEEDBACK_GRACE_DAYS, APP_PRICE } from './license'
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

/* ── the daily free window ───────────────────────────────────────────────
   After the trial the app is not a wall: DAILY_PASS_MINUTES of everything,
   once a day, forever. It is what a family who cannot pay still gets, and
   what lets anyone demo the whole app to a friend on the spot. */
describe('daily free window (after the trial)', () => {
  beforeEach(() => localStorage.clear())

  const T0 = 1_760_000_000_000 // fixed epoch ms; nothing here reads the clock
  const ended = { phase: 'ended', daysLeft: 0, shouldAsk: true, feedbackAvailable: true }
  const min = (n) => n * 60000

  it('starts closed, with today unused', () => {
    const p = dailyPass('2026-08-01', T0)
    expect(p.active).toBe(false)
    expect(p.available).toBe(true)
    expect(p.msLeft).toBe(0)
  })

  it('opens for exactly DAILY_PASS_MINUTES and then closes', () => {
    startDailyPass('2026-08-01', T0)
    expect(dailyPass('2026-08-01', T0).msLeft).toBe(min(DAILY_PASS_MINUTES))
    expect(dailyPass('2026-08-01', T0 + min(DAILY_PASS_MINUTES) - 1).active).toBe(true)
    expect(dailyPass('2026-08-01', T0 + min(DAILY_PASS_MINUTES)).active).toBe(false)
    expect(dailyPass('2026-08-01', T0 + min(DAILY_PASS_MINUTES)).msLeft).toBe(0)
  })

  it('tapping again does not buy more time', () => {
    startDailyPass('2026-08-01', T0)
    const again = startDailyPass('2026-08-01', T0 + min(3))
    expect(again.msLeft).toBe(min(DAILY_PASS_MINUTES) - min(3))
    expect(again.available).toBe(false)
  })

  it('is one per calendar day, and comes back the next day', () => {
    startDailyPass('2026-08-01', T0)
    const late = dailyPass('2026-08-01', T0 + min(60))
    expect(late.active).toBe(false)
    expect(late.available).toBe(false) // used up today
    expect(dailyPass('2026-08-02', T0 + min(60)).available).toBe(true)
  })

  it('a device clock pushed backwards cannot stretch the window', () => {
    startDailyPass('2026-08-01', T0)
    expect(dailyPass('2026-08-01', T0 - min(600)).msLeft).toBe(min(DAILY_PASS_MINUTES))
  })

  it('survives a reload (it is wall-clock, not session, based)', () => {
    startDailyPass('2026-08-01', T0)
    const raw = localStorage.getItem('fq.license.v1')
    localStorage.setItem('fq.license.v1', raw) // as a fresh load would read it
    expect(dailyPass('2026-08-01', T0 + min(2)).msLeft).toBe(min(3))
  })

  it('fullAccess: open during the window, shut before and after it', () => {
    expect(fullAccess('2026-08-01', T0, ended)).toBe(false)
    startDailyPass('2026-08-01', T0)
    expect(fullAccess('2026-08-01', T0 + min(1), ended)).toBe(true)
    expect(fullAccess('2026-08-01', T0 + min(DAILY_PASS_MINUTES), ended)).toBe(false)
  })

  it('fullAccess is always true while licensed or still in the trial', () => {
    const trial = { phase: 'trial', daysLeft: 2, shouldAsk: false, feedbackAvailable: true }
    const paid = { phase: 'licensed', daysLeft: Infinity, shouldAsk: false, feedbackAvailable: false }
    expect(fullAccess('2026-08-01', T0, trial)).toBe(true)
    expect(fullAccess('2026-08-01', T0, paid)).toBe(true)
  })

  it('the window does not touch the trial clock or the purchase flag', () => {
    const before = web('2026-07-10')
    startDailyPass('2026-07-10', T0)
    expect(web('2026-07-10').phase).toBe(before.phase)
    expect(web('2026-07-10').daysLeft).toBe(before.daysLeft)
    markSupported('code')
    expect(web('2026-07-10').phase).toBe('licensed')
  })
})
