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
vi.mock('./native', () => ({ isNativePlatform: () => mockNative, isApplePlatform: () => true }))

let mockNative = true
const APP_OWNED = { customerInfo: { entitlements: { active: { full_app: { isActive: true } } } } }
const NOT_OWNED = { customerInfo: { entitlements: { active: {} } } }
const APP_PKG = { identifier: 'lifetime', product: { identifier: 'full_app', priceString: '$12.99' }, presentedOfferingContext: { offeringIdentifier: 'default' } }

async function fresh(env = { VITE_STORE_IAP: 'true', VITE_REVENUECAT_APPLE_KEY: 'appl_test' }, withPlugin = true) {
  vi.resetModules()
  vi.stubGlobal('__viteEnvOverride', null)
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  const iap = await import('./iap')
  if (withPlugin) iap.__setPurchasesLoaderForTests(async () => purchasesMock)
  return iap
}

beforeEach(() => {
  localStorage.clear()
  mockNative = true
  Object.values(purchasesMock).forEach((f) => f.mockClear())
})
afterEach(() => vi.unstubAllEnvs())

const supported = () => !!JSON.parse(localStorage.getItem('fq.license.v1') || '{}').supported

describe('iap wrapper (dormant, fail-closed; the app sells no in-app purchases)', () => {
  it('is unavailable on web or without a key, and every call no-ops', async () => {
    mockNative = false
    let iap = await fresh()
    expect(iap.iapAvailable()).toBe(false)
    mockNative = true
    iap = await fresh({ VITE_STORE_IAP: 'true', VITE_REVENUECAT_APPLE_KEY: '' })
    expect(iap.iapAvailable()).toBe(false)
    expect(await iap.buyFullApp()).toBe('unavailable')
    expect(await iap.restorePurchasesAll()).toBe('unavailable')
    expect(await iap.fullAppStorePrice()).toBe('')
    expect(purchasesMock.configure).not.toHaveBeenCalled()
  })

  it('stays dormant in the paid-upfront build even with a RevenueCat key set', async () => {
    const iap = await fresh({ VITE_STORE_IAP: '', VITE_REVENUECAT_APPLE_KEY: 'appl_live' })
    expect(iap.iapAvailable()).toBe(false)
    await iap.initIap()
    expect(await iap.buyFullApp()).toBe('unavailable')
    expect(await iap.restorePurchasesAll()).toBe('unavailable')
    expect(purchasesMock.configure).not.toHaveBeenCalled()
  })

  it('exposes no Family Pack surface', async () => {
    const iap = await fresh()
    for (const gone of ['buyFamilyPack', 'restoreFamilyPack', 'familyPackStorePrice', 'FAMILY_PACK_ENTITLEMENT']) expect(iap[gone], gone).toBeUndefined()
  })

  it('(if ever revived) maps purchase, cancel, pending and no-offering outcomes', async () => {
    const iap = await fresh()
    purchasesMock.getOfferings.mockResolvedValue({ offerings: { current: { availablePackages: [APP_PKG] } } })
    purchasesMock.purchasePackage.mockResolvedValueOnce(APP_OWNED)
    expect(await iap.buyFullApp()).toBe('purchased')
    expect(purchasesMock.purchasePackage).toHaveBeenCalledWith({ aPackage: APP_PKG })
    expect(supported()).toBe(true)
    purchasesMock.purchasePackage.mockRejectedValueOnce({ data: { userCancelled: true }, message: 'Purchase cancelled' })
    expect(await iap.buyFullApp()).toBe('cancelled')
    purchasesMock.purchasePackage.mockRejectedValueOnce({ message: 'The payment is pending.' })
    expect(await iap.buyFullApp()).toBe('pending')
    purchasesMock.getOfferings.mockResolvedValueOnce({ current: null })
    expect(await iap.buyFullApp()).toBe('unavailable')
  })

  it('(if ever revived) restore maps restored vs none, and reads the price', async () => {
    const iap = await fresh()
    purchasesMock.restorePurchases.mockResolvedValueOnce(NOT_OWNED)
    expect(await iap.restorePurchasesAll()).toBe('none')
    purchasesMock.restorePurchases.mockResolvedValueOnce(APP_OWNED)
    expect(await iap.restorePurchasesAll()).toBe('restored')
    purchasesMock.getOfferings.mockResolvedValueOnce({ current: null, all: { default: { availablePackages: [APP_PKG] } } })
    expect(await iap.fullAppStorePrice()).toBe('$12.99')
  })

  it('degrades without throwing when no RevenueCat plugin is bundled (this build), even with IAP forced on', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const iap = await fresh(undefined, false)
    expect(iap.iapAvailable()).toBe(true)
    await expect(iap.initIap()).resolves.toBeUndefined()
    expect(await iap.buyFullApp()).toBe('error')
    expect(await iap.restorePurchasesAll()).toBe('error')
    expect(await iap.fullAppStorePrice()).toBe('')
    expect(purchasesMock.configure).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not bundled'))
    warn.mockRestore()
  })
})
