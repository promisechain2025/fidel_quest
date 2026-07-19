import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/* The plugin is a native binary bridge; everything here mocks it. What we
   actually test is the wrapper's contract: dormancy without keys, the
   entitlement -> unlock write, and the outcome mapping for buy/restore. */

const purchasesMock = {
  configure: vi.fn(async () => {}),
  getCustomerInfo: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
  getOfferings: vi.fn(async () => ({ current: null })),
  purchasePackage: vi.fn(),
  restorePurchases: vi.fn(),
}
vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: purchasesMock }))
vi.mock('./native', () => ({ isNativePlatform: () => mockNative, isApplePlatform: () => true }))

let mockNative = true
const OWNED = { customerInfo: { entitlements: { active: { family_pack: { isActive: true } } } } }
const NOT_OWNED = { customerInfo: { entitlements: { active: {} } } }

async function fresh(env = { VITE_REVENUECAT_APPLE_KEY: 'appl_test' }) {
  vi.resetModules()
  vi.stubGlobal('__viteEnvOverride', null)
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  return import('./iap')
}

beforeEach(() => {
  localStorage.clear()
  mockNative = true
  Object.values(purchasesMock).forEach((f) => f.mockClear())
})
afterEach(() => vi.unstubAllEnvs())

describe('iap wrapper (dormant-until-keys store purchases)', () => {
  it('is unavailable on web or without a key, and every call no-ops', async () => {
    mockNative = false
    let iap = await fresh()
    expect(iap.iapAvailable()).toBe(false)
    mockNative = true
    iap = await fresh({ VITE_REVENUECAT_APPLE_KEY: '' })
    expect(iap.iapAvailable()).toBe(false)
    expect(await iap.buyFamilyPack()).toBe('unavailable')
    expect(await iap.restoreFamilyPack()).toBe('unavailable')
    expect(await iap.familyPackStorePrice()).toBe('')
    expect(purchasesMock.configure).not.toHaveBeenCalled()
  })

  it('initIap unlocks silently when the entitlement is already owned', async () => {
    const iap = await fresh()
    purchasesMock.getCustomerInfo.mockResolvedValueOnce(OWNED)
    await iap.initIap()
    const { familyPackUnlocked } = await import('./familyPack')
    expect(familyPackUnlocked()).toBe(true)
  })

  it('buy maps purchase, cancel, and no-offering outcomes', async () => {
    const iap = await fresh()
    const pkg = { identifier: 'p', product: { priceString: '$4.99' } }
    purchasesMock.getOfferings.mockResolvedValue({ current: { availablePackages: [pkg] } })
    purchasesMock.purchasePackage.mockResolvedValueOnce(OWNED)
    expect(await iap.buyFamilyPack()).toBe('purchased')
    const { familyPackUnlocked } = await import('./familyPack')
    expect(familyPackUnlocked()).toBe(true)

    localStorage.clear()
    purchasesMock.purchasePackage.mockRejectedValueOnce({ userCancelled: true })
    expect(await iap.buyFamilyPack()).toBe('cancelled')
    expect(familyPackUnlocked()).toBe(false)

    purchasesMock.getOfferings.mockResolvedValueOnce({ current: null })
    expect(await iap.buyFamilyPack()).toBe('unavailable')
  })

  it('restore maps restored vs none', async () => {
    const iap = await fresh()
    purchasesMock.restorePurchases.mockResolvedValueOnce(NOT_OWNED)
    expect(await iap.restoreFamilyPack()).toBe('none')
    purchasesMock.restorePurchases.mockResolvedValueOnce(OWNED)
    expect(await iap.restoreFamilyPack()).toBe('restored')
  })

  it('reports the localized store price', async () => {
    const iap = await fresh()
    purchasesMock.getOfferings.mockResolvedValueOnce({ current: { availablePackages: [{ product: { priceString: '4,99 US$' } }] } })
    expect(await iap.familyPackStorePrice()).toBe('4,99 US$')
  })
})
