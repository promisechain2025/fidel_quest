import { describe, it, expect, beforeEach } from 'vitest'
import {
  mintPaidBuyerCode, verifyPaidBuyerCode, looksLikePaidBuyerCode, formatPaidBuyerCode, redeemPaidBuyerCode,
  ensurePaidBuyerMark, loadPaidBuyer, isPaidBuyer, verifyStoredPaidBuyer, PAID_BUYER_KEY, _setAppTransactionReader,
} from './paidBuyer'
import { fullSnapshot, restoreFull } from './backup'

const NOW = Date.UTC(2026, 9, 18)
beforeEach(() => { localStorage.clear(); _setAppTransactionReader(null) })

describe('paid-buyer re-entry codes', () => {
  it('mints a well-formed code that verifies', async () => {
    const c = await mintPaidBuyerCode({ platform: 'android', id: 'ABCDEF', now: NOW })
    expect(c).toMatch(/^EGL-ABCDEF-A[A-Z0-9]{6}$/)
    expect(looksLikePaidBuyerCode(c)).toBe(true)
    expect(await verifyPaidBuyerCode(c)).toEqual({ id: 'ABCDEF', platform: 'android', day: 290 })
    expect(await verifyPaidBuyerCode(c.toLowerCase().replace(/-/g, ' '))).not.toBeNull()
  })
  it('rejects forged / edited codes', async () => {
    const c = await mintPaidBuyerCode({ platform: 'ios', id: 'QWERTY', now: NOW })
    const last = c.slice(-1)
    expect(await verifyPaidBuyerCode(c.slice(0, -1) + (last === 'A' ? 'B' : 'A'))).toBeNull()
    expect(await verifyPaidBuyerCode(c.replace('QWERTY', 'QWERTZ'))).toBeNull()
    expect(await verifyPaidBuyerCode(c.replace('-I', '-A'))).toBeNull()
    expect(await verifyPaidBuyerCode('EGZ12345')).toBeNull()
    expect(await mintPaidBuyerCode({ platform: 'web', id: 'ABCDEF' })).toBeNull()
    expect(await mintPaidBuyerCode({ platform: 'android', id: 'ABC0EF' })).toBeNull() // 0 not in alphabet
    expect(formatPaidBuyerCode('nope')).toBe('')
  })
})

describe('mark on launch', () => {
  it('web: no mark is created', async () => {
    expect(await ensurePaidBuyerMark({ native: false })).toBeNull()
    expect(isPaidBuyer()).toBe(false)
  })
  it('android: creates one stable mark (idempotent) and re-arms today\'s backup', async () => {
    localStorage.setItem('fq.backup.day', '2026-10-18')
    const m = await ensurePaidBuyerMark({ native: true, platform: 'android', now: NOW })
    expect(m.source).toBe('paid-app-1.3.3')
    expect(m.code).toMatch(/^EGL-[A-Z0-9]{6}-A/)
    expect(localStorage.getItem('fq.backup.day')).toBeNull()
    const again = await ensurePaidBuyerMark({ native: true, platform: 'android', now: NOW + 1000 })
    expect(again.code).toBe(m.code)
    expect(again.markedAt).toBe(NOW)
  })
  it('ios: stores Apple\'s originalAppVersion when the AppTransaction read succeeds', async () => {
    _setAppTransactionReader(async () => ({ verified: true, originalAppVersion: '7', originalPurchaseDate: '2026-09-01T00:00:00Z', environment: 'Production' }))
    const m = await ensurePaidBuyerMark({ native: true, platform: 'ios', now: NOW })
    expect(m.code).toMatch(/^EGL-[A-Z0-9]{6}-I/)
    expect(m.appTransaction).toEqual({ originalAppVersion: '7', originalPurchaseDate: '2026-09-01T00:00:00Z', environment: 'Production' })
  })
  it('ios: a failed read still marks the device (retried next launch)', async () => {
    _setAppTransactionReader(async () => { throw new Error('offline') })
    const m = await ensurePaidBuyerMark({ native: true, platform: 'ios', now: NOW })
    expect(m.appTransaction).toBeUndefined()
    _setAppTransactionReader(async () => ({ verified: true, originalAppVersion: '8' }))
    expect((await ensurePaidBuyerMark({ native: true, platform: 'ios', now: NOW })).appTransaction.originalAppVersion).toBe('8')
  })
  it('a tampered stored mark is dropped and replaced', async () => {
    localStorage.setItem(PAID_BUYER_KEY, JSON.stringify({ v: 1, code: 'EGL-AAAAAA-AAAAAAA', source: 'x' }))
    expect(await verifyStoredPaidBuyer()).toBeNull()
    expect(loadPaidBuyer()).toBeNull()
  })
})

describe('re-entry and backup', () => {
  it('a code typed on a fresh install restores the mark', async () => {
    const c = await mintPaidBuyerCode({ platform: 'android', id: 'HJKMNP', now: NOW })
    expect(await redeemPaidBuyerCode('garbage')).toBe(false)
    expect(isPaidBuyer()).toBe(false)
    expect(await redeemPaidBuyerCode(c.toLowerCase())).toBe(true)
    expect(loadPaidBuyer()).toMatchObject({ code: c, platform: 'android', source: 'code' })
  })
  it('the household backup carries the mark and restore brings it back', async () => {
    const m = await ensurePaidBuyerMark({ native: true, platform: 'android', now: NOW })
    const snap = fullSnapshot()
    expect(snap.extra[PAID_BUYER_KEY]).toBeTruthy()
    localStorage.clear()
    restoreFull(snap)
    expect(loadPaidBuyer().code).toBe(m.code)
    expect(await verifyStoredPaidBuyer()).not.toBeNull()
  })
})
