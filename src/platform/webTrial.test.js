import { describe, it, expect, beforeEach } from 'vitest'
import {
  FREE_SESSIONS, noteWebSession, hasFullAccess, isWebTrialLimited, screenBlockedByTrial,
  redeemUnlockCode, deviceUnlockCode, loadWebTrial, TRIAL_KEY, TRIAL_BROWSE_SCREENS,
} from './webTrial'
import { mintAppCode, isValidAppCode } from './appCodes'

const web = { native: false, base: '/app/' }

describe('website trial (3 sessions, then the paywall)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('the first open is session 1 and three sessions stay open', () => {
    for (let i = 1; i <= FREE_SESSIONS; i++) {
      sessionStorage.clear()
      const s = noteWebSession(web)
      expect(s.sessions).toBe(i)
      expect(hasFullAccess(web)).toBe(true)
      expect(isWebTrialLimited(web)).toBe(false)
    }
  })

  it('a refresh in the same browser session does not count again', () => {
    noteWebSession(web)
    noteWebSession(web)
    expect(loadWebTrial().sessions).toBe(1)
  })

  it('session 4 limits play screens and still allows home and Grown-Ups', () => {
    for (let i = 0; i < FREE_SESSIONS; i++) {
      sessionStorage.clear()
      noteWebSession(web)
    }
    expect(hasFullAccess(web)).toBe(true)
    sessionStorage.clear()
    noteWebSession(web)
    expect(loadWebTrial().sessions).toBe(FREE_SESSIONS + 1)
    expect(isWebTrialLimited(web)).toBe(true)
    expect(screenBlockedByTrial('stories', web)).toBe(true)
    expect(screenBlockedByTrial('lesson', web)).toBe(true)
    expect(screenBlockedByTrial('stone', web)).toBe(true)
    expect(screenBlockedByTrial('bingo', web)).toBe(true)
    for (const name of TRIAL_BROWSE_SCREENS) expect(screenBlockedByTrial(name, web)).toBe(false)
  })

  it('a bad code does nothing and a real code unlocks this browser forever', () => {
    localStorage.setItem(TRIAL_KEY, JSON.stringify({ sessions: 9 }))
    expect(redeemUnlockCode('nonsense')).toBe(false)
    expect(redeemUnlockCode('EGZABCD')).toBe(false)
    expect(isWebTrialLimited(web)).toBe(true)
    const code = mintAppCode('WXYZ')
    expect(isValidAppCode(code)).toBe(true)
    expect(redeemUnlockCode(`  ${code.toLowerCase()}  `)).toBe(true)
    expect(hasFullAccess(web)).toBe(true)
    expect(screenBlockedByTrial('stories', web)).toBe(false)
    expect(loadWebTrial().unlocked).toBe(true)
  })

  it('the paid app code derived from an install id redeems on the web', () => {
    const code = deviceUnlockCode('install-abc')
    localStorage.setItem(TRIAL_KEY, JSON.stringify({ sessions: 9 }))
    expect(redeemUnlockCode(code)).toBe(true)
    expect(hasFullAccess(web)).toBe(true)
    expect(deviceUnlockCode('install-abc')).toBe(code)
  })

  it('native stays fully open and does not count sessions, even on the /app base', () => {
    localStorage.setItem(TRIAL_KEY, JSON.stringify({ sessions: 9 }))
    const native = { native: true, base: '/app/' }
    expect(noteWebSession(native).sessions).toBe(9)
    expect(hasFullAccess(native)).toBe(true)
    expect(isWebTrialLimited(native)).toBe(false)
    expect(screenBlockedByTrial('stories', native)).toBe(false)
    expect(screenBlockedByTrial('lesson', native)).toBe(false)
  })

  it('a web build that is not /app (native asset base, local dev) is not on the trial', () => {
    const dev = { native: false, base: '/' }
    noteWebSession(dev)
    noteWebSession(dev)
    expect(loadWebTrial().sessions).toBeUndefined()
    expect(hasFullAccess(dev)).toBe(true)
    localStorage.setItem(TRIAL_KEY, JSON.stringify({ sessions: 9 }))
    expect(hasFullAccess(dev)).toBe(true)
    expect(screenBlockedByTrial('stories', dev)).toBe(false)
  })

  it('resetting progress does not restart the trial or forget an unlock', async () => {
    localStorage.setItem(TRIAL_KEY, JSON.stringify({ sessions: 9, unlocked: true, installId: 'keep' }))
    localStorage.setItem('fq.journey.v1', '{"version":1}')
    const { resetEverything } = await import('../utils/devUnlock')
    resetEverything()
    expect(localStorage.getItem('fq.journey.v1')).toBeNull()
    expect(JSON.parse(localStorage.getItem(TRIAL_KEY))).toMatchObject({ sessions: 9, unlocked: true, installId: 'keep' })
    expect(hasFullAccess(web)).toBe(true)
  })
})
