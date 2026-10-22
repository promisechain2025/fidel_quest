import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockNative = false
vi.mock('./native', () => ({ isNativePlatform: () => mockNative, isApplePlatform: () => false }))

const ok = (body, status = 200) => vi.fn(async () => ({ ok: status < 300, status, json: async () => body }))

beforeEach(() => { localStorage.clear(); mockNative = false })

describe('rep codes (web only, server-verified)', () => {
  it('recognises the EGR shape', async () => {
    const { looksLikeRepCode } = await import('./repCodes')
    expect(looksLikeRepCode('EGR-CER01-ABCD-EF23')).toBe(true)
    expect(looksLikeRepCode('egr cer01 abcd ef23')).toBe(true)
    expect(looksLikeRepCode('EGZABCDE')).toBe(false)
    expect(looksLikeRepCode('EGR-XER01-ABCD-EF23')).toBe(false)
  })

  it('redeems through the API and grants the package', async () => {
    const { redeemRepCode } = await import('./repCodes')
    const { repGrants } = await import('./packages')
    const f = ok({ ok: true, pkg: 'prayer', repId: 'ER01' })
    expect(await redeemRepCode('EGR-PER01-ABCD-EF23', { fetchImpl: f, base: 'https://api.x', native: false })).toEqual({ ok: true, pkg: 'prayer' })
    expect(f).toHaveBeenCalledWith('https://api.x/api/repcodes/redeem', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(f.mock.calls[0][1].body).installId).toBeTruthy()
    expect(repGrants().map((g) => g.pkg)).toEqual(['prayer'])
  })

  it('passes the server reason through and grants nothing', async () => {
    const { redeemRepCode } = await import('./repCodes')
    const { repGrants } = await import('./packages')
    expect(await redeemRepCode('EGR-CER01-ABCD-EF23', { fetchImpl: ok({ ok: false, reason: 'used' }, 409), base: 'https://api.x', native: false })).toEqual({ ok: false, reason: 'used' })
    expect(await redeemRepCode('EGR-CER01-ABCD-EF23', { fetchImpl: vi.fn(async () => { throw new Error('net') }), base: 'https://api.x', native: false })).toEqual({ ok: false, reason: 'offline' })
    expect(repGrants()).toEqual([])
  })

  it('never works in the store apps', async () => {
    const { redeemRepCode, repCodesAvailable } = await import('./repCodes')
    const f = ok({ ok: true, pkg: 'core' })
    expect(await redeemRepCode('EGR-CER01-ABCD-EF23', { fetchImpl: f, base: 'https://api.x', native: true })).toEqual({ ok: false, reason: 'unavailable' })
    expect(f).not.toHaveBeenCalled()
    expect(repCodesAvailable({ native: true, web: true, base: 'https://api.x' })).toBe(false)
    expect(repCodesAvailable({ native: false, web: true, base: '' })).toBe(false)
    expect(repCodesAvailable({ native: false, web: true, base: 'https://api.x' })).toBe(true)
  })

  it('a core rep code opens the web trial', async () => {
    const { grantRepPackage } = await import('./packages')
    const { hasFullAccess } = await import('./webTrial')
    const state = { sessions: 9 }
    expect(hasFullAccess({ native: false, base: '/app/', state })).toBe(false)
    grantRepPackage('prayer', { code: 'a' })
    expect(hasFullAccess({ native: false, base: '/app/', state })).toBe(false)
    grantRepPackage('core', { code: 'b' })
    expect(hasFullAccess({ native: false, base: '/app/', state })).toBe(true)
  })
})
