/* Release 1.3.0 is PAID UPFRONT: whatever a CI workflow leaves in the env
   (VITE_MONETIZE, RevenueCat keys - e.g. Xcode Cloud custom variables), a
   native store build must stay fully unlocked with no trial, no daily
   free-minutes gate, and no purchase UI switches. */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

let mockNative = true
vi.mock('./native', () => ({ isNativePlatform: () => mockNative, isApplePlatform: () => true }))

async function load(env) {
  vi.resetModules()
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  return import('./license')
}

describe('paid upfront (v1.3.0)', () => {
  beforeEach(() => {
    localStorage.clear()
    // An old 1.2 trial that ended long ago.
    localStorage.setItem('fq.license.v1', JSON.stringify({ startDay: '2026-01-01' }))
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    mockNative = true
  })

  it('native + VITE_MONETIZE + RevenueCat key (no VITE_STORE_IAP) is fully unlocked', async () => {
    mockNative = true
    const lic = await load({ VITE_MONETIZE: 'true', VITE_REVENUECAT_APPLE_KEY: 'appl_live_looking', VITE_STORE_IAP: '' })
    expect(lic.MONETIZE).toBe(false)
    const s = lic.licenseState('2026-09-30')
    expect(s.phase).toBe('licensed')
    expect(s.shouldAsk).toBe(false)
    expect(lic.fullAccess('2026-09-30')).toBe(true)
  })

  it('web default build (committed .env) is fully unlocked too', async () => {
    mockNative = false
    const lic = await load({ VITE_MONETIZE: '' })
    expect(lic.MONETIZE).toBe(false)
    expect(lic.licenseState('2026-09-30').phase).toBe('licensed')
  })
})
