import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/* The plugin is a native binary bridge; everything here mocks it. What we
   actually test is the wrapper's contract: dormancy without keys, the
   entitlement -> unlock write, and the outcome mapping for buy/restore. */

const purchasesMock = {
  configure: vi.fn(async () => {}),
  addCustomerInfoUpdateListener: vi.fn(async () => 'listener'),
  getCustomerInfo: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
  getOfferings: vi.fn(async () => ({ current: null })),
  purchasePackage: vi.fn(),
  restorePurchases: vi.fn(),
}
vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: purchasesMock }))
vi.mock('./native', () => ({ isNativePlatform: () => mockNative, isApplePlatform: () => true }))

let mockNative = true
const OWNED = { customerInfo: { entitlements: { active: { family_pack: { isActive: true } } } } }
const APP_OWNED = { customerInfo: { entitlements: { active: { full_app: { isActive: true } } } } }
const NOT_OWNED = { customerInfo: { entitlements: { active: {} } } }
const FAMILY_PKG = { identifier: 'family', product: { identifier: 'family_pack', priceString: '$4.99' }, presentedOfferingContext: { offeringIdentifier: 'default' } }
const APP_PKG = { identifier: 'lifetime', product: { identifier: 'full_app', priceString: '$12.99' }, presentedOfferingContext: { offeringIdentifier: 'default' } }

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
    purchasesMock.getOfferings.mockResolvedValue({ current: { availablePackages: [FAMILY_PKG, APP_PKG] } })
    purchasesMock.purchasePackage.mockResolvedValueOnce(OWNED)
    expect(await iap.buyFamilyPack()).toBe('purchased')
    expect(purchasesMock.purchasePackage).toHaveBeenCalledWith({ aPackage: FAMILY_PKG })
    const { familyPackUnlocked } = await import('./familyPack')
    expect(familyPackUnlocked()).toBe(true)

    localStorage.clear()
    purchasesMock.purchasePackage.mockRejectedValueOnce({ userCancelled: true })
    expect(await iap.buyFamilyPack()).toBe('cancelled')
    expect(familyPackUnlocked()).toBe(false)

    purchasesMock.getOfferings.mockResolvedValueOnce({ current: null })
    expect(await iap.buyFamilyPack()).toBe('unavailable')
  })

  it('buys the app package, not the family pack, and reads a wrapped offerings payload', async () => {
    const iap = await fresh()
    purchasesMock.getOfferings.mockResolvedValueOnce({ offerings: { current: { availablePackages: [FAMILY_PKG, APP_PKG] } } })
    purchasesMock.purchasePackage.mockResolvedValueOnce(APP_OWNED)
    expect(await iap.buyFullApp()).toBe('purchased')
    expect(purchasesMock.purchasePackage).toHaveBeenCalledWith({ aPackage: APP_PKG })
    const { familyPackUnlocked } = await import('./familyPack')
    expect(familyPackUnlocked()).toBe(false)
  })

  it('does not charge the family pack when the app product is missing', async () => {
    const iap = await fresh()
    purchasesMock.getOfferings.mockResolvedValueOnce({ current: { availablePackages: [FAMILY_PKG] } })
    expect(await iap.buyFullApp()).toBe('unavailable')
    expect(purchasesMock.purchasePackage).not.toHaveBeenCalled()
  })

  it('uses the only offering when none is marked current', async () => {
    const iap = await fresh()
    purchasesMock.getOfferings.mockResolvedValueOnce({ current: null, all: { default: { availablePackages: [APP_PKG] } } })
    expect(await iap.fullAppStorePrice()).toBe('$12.99')
  })

  it('unlocks from the customer info listener and from an already-owned retry', async () => {
    const iap = await fresh()
    let listener
    purchasesMock.addCustomerInfoUpdateListener.mockImplementationOnce(async (cb) => { listener = cb })
    await iap.initIap()
    listener({ entitlements: { active: { family_pack: { isActive: true } } } })
    const { familyPackUnlocked } = await import('./familyPack')
    expect(familyPackUnlocked()).toBe(true)

    localStorage.clear()
    purchasesMock.getOfferings.mockResolvedValue({ current: { availablePackages: [APP_PKG] } })
    purchasesMock.purchasePackage.mockRejectedValueOnce({ message: 'This product is already purchased.', code: '7' })
    purchasesMock.getCustomerInfo.mockResolvedValueOnce(APP_OWNED)
    expect(await iap.buyFullApp()).toBe('purchased')
  })

  it('maps Ask to Buy as pending and a cancel buried on error.data as cancelled', async () => {
    const iap = await fresh()
    purchasesMock.getOfferings.mockResolvedValue({ current: { availablePackages: [APP_PKG] } })
    purchasesMock.purchasePackage.mockRejectedValueOnce({ message: 'The payment is pending.' })
    expect(await iap.buyFullApp()).toBe('pending')
    purchasesMock.purchasePackage.mockRejectedValueOnce({ data: { userCancelled: true }, message: 'Purchase cancelled' })
    expect(await iap.buyFullApp()).toBe('cancelled')
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
    purchasesMock.getOfferings.mockResolvedValueOnce({ current: { availablePackages: [{ product: { identifier: 'family_pack', priceString: '4,99 US$' } }] } })
    expect(await iap.familyPackStorePrice()).toBe('4,99 US$')
  })
})
