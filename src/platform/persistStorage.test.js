import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('./native', () => ({ isNativePlatform: () => false, isApplePlatform: () => false }))
import { requestPersistentStorage } from './persistStorage'
import { redeemRepCode } from './repCodes'

describe('requestPersistentStorage', () => {
  it('asks once and returns the answer', async () => {
    const nav = { storage: { persisted: vi.fn(async () => false), persist: vi.fn(async () => true) } }
    expect(await requestPersistentStorage({ nav, native: false })).toBe(true)
    expect(nav.storage.persist).toHaveBeenCalledTimes(1)
  })
  it('skips when already persisted, native, or unsupported', async () => {
    const nav = { storage: { persisted: async () => true, persist: vi.fn() } }
    expect(await requestPersistentStorage({ nav, native: false })).toBe(true)
    expect(nav.storage.persist).not.toHaveBeenCalled()
    expect(await requestPersistentStorage({ nav, native: true })).toBe(false)
    expect(await requestPersistentStorage({ nav: {}, native: false })).toBe(false)
  })
})

describe('redeem asks for persistent storage', () => {
  beforeEach(() => localStorage.clear())
  it('on success (including restore)', async () => {
    const persist = vi.fn(async () => true)
    Object.defineProperty(navigator, 'storage', { value: { persist, persisted: async () => false }, configurable: true })
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, pkg: 'core', repId: 'ET01', restored: true }) }))
    const r = await redeemRepCode('EGR-CET01-ABCD-EFGH', { fetchImpl, base: 'https://x', native: false })
    expect(r).toEqual({ ok: true, pkg: 'core', restored: true })
    await new Promise((s) => setTimeout(s, 0))
    expect(persist).toHaveBeenCalled()
  })
  it('maps the over-limit reason', async () => {
    const fetchImpl = async () => ({ ok: false, json: async () => ({ ok: false, reason: 'devices' }) })
    expect(await redeemRepCode('EGR-CET01-ABCD-EFGH', { fetchImpl, base: 'https://x', native: false })).toEqual({ ok: false, reason: 'devices' })
  })
})
