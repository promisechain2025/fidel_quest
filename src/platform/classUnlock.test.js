import { describe, it, expect, beforeEach } from 'vitest'
import { mintClassUnlock, verifyClassUnlock, redeemClassUnlock, classUnlockActive, applyClassUnlockPolicy, classTag, looksLikeClassUnlock, loadClassUnlock } from './classUnlock'
import { hasFullAccess, TRIAL_KEY } from './webTrial'
import { encodeClassInvite, decodeClassInvite } from './classroom'

const NOW = Date.UTC(2026, 9, 18, 9)
const DAY = 86400000
beforeEach(() => localStorage.clear())

describe('class unlock codes', () => {
  it('mints a per-class, typo-proof code that verifies', async () => {
    const c = await mintClassUnlock({ classCode: 'STMARY1', days: 30, now: NOW })
    expect(c).toMatch(/^EGC-[A-Z2-9]{6}-[A-Z2-9]{7}$/)
    expect(c).not.toMatch(/[01OIL]/)
    expect(looksLikeClassUnlock(c)).toBe(true)
    const v = await verifyClassUnlock(c, NOW)
    expect(v.classTag).toBe(classTag('STMARY1'))
    expect(v.gen).toBe(0)
    expect(classTag('STMARY1')).not.toBe(classTag('STMARY2'))
  })
  it('rejects forged, edited and expired codes', async () => {
    const c = await mintClassUnlock({ classCode: 'ABCD', days: 30, now: NOW })
    const flip = c.slice(0, -1) + (c.endsWith('A') ? 'B' : 'A')
    expect(await verifyClassUnlock(flip, NOW)).toBe(null)
    // extending the expiry without re-signing fails
    const tail = c.split('-')[2]
    expect(await verifyClassUnlock(`EGC-${c.split('-')[1]}-ZZ${tail.slice(2)}`, NOW)).toBe(null)
    expect(await verifyClassUnlock(c, NOW + 31 * DAY)).toBe(null)
    expect(await verifyClassUnlock('EGZABCD2', NOW)).toBe(null)
  })
  it('expiry is capped at 180 days', async () => {
    const c = await mintClassUnlock({ classCode: 'ABCD', days: 9999, now: NOW })
    expect(await verifyClassUnlock(c, NOW + 179 * DAY)).not.toBe(null)
    expect(await verifyClassUnlock(c, NOW + 182 * DAY)).toBe(null)
  })
})

describe('web access', () => {
  const base = '/app/'
  const limited = () => localStorage.setItem(TRIAL_KEY, JSON.stringify({ sessions: 9 }))
  it('a redeemed class code gives full access until it expires', async () => {
    limited()
    expect(hasFullAccess({ native: false, base })).toBe(false)
    const c = await mintClassUnlock({ classCode: 'K7Q2MP', days: 30, now: Date.now() })
    expect(await redeemClassUnlock(c)).toBe(true)
    expect(hasFullAccess({ native: false, base })).toBe(true)
    expect(classUnlockActive(Date.now() + 40 * DAY)).toBe(false)
  })
  it('rotation: a newer generation is kept; class sync can revoke old generations', async () => {
    const g0 = await mintClassUnlock({ classCode: 'K7Q2MP', days: 30, gen: 0, now: Date.now() })
    const g1 = await mintClassUnlock({ classCode: 'K7Q2MP', days: 30, gen: 1, now: Date.now() })
    await redeemClassUnlock(g1)
    await redeemClassUnlock(g0) // an old shared code does not downgrade
    expect(loadClassUnlock().gen).toBe(1)
    applyClassUnlockPolicy({ code: 'K7Q2MP', minGen: 2 })
    expect(classUnlockActive()).toBe(false)
  })
  it('rides in the class invite link and survives decode', async () => {
    const u = await mintClassUnlock({ classCode: 'K7Q2MP', days: 30, now: Date.now() })
    const inv = decodeClassInvite(encodeClassInvite({ code: 'K7Q2MP', teacher: 'Dawit', unlock: u }))
    expect(inv.unlock).toBe(u)
    expect(decodeClassInvite(encodeClassInvite({ code: 'K7Q2MP', teacher: 'Dawit', unlock: 'junk' })).unlock).toBeUndefined()
  })
})
