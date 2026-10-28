import { describe, it, expect, vi, beforeEach } from 'vitest'

/* Content packages (plan 1.4): core_unlock, prayer_book, bundle_core_prayer.
   Off by default (paid builds): nothing gated, nothing new sellable. On
   (VITE_PACKAGES=1): buy / restore / refund mirror per package. */
vi.mock('./native', () => ({ isNativePlatform: () => true, isApplePlatform: () => true }))

const ptx = (id, extra = {}) => ({ transactionId: id, productIdentifier: id, purchaseDate: '2026-10-22', ...extra })
const P = {
  purchaseProduct: vi.fn(),
  restorePurchases: vi.fn(async () => {}),
  getPurchases: vi.fn(async () => ({ purchases: [] })),
  getProduct: vi.fn(async ({ productIdentifier }) => ({ product: { priceString: productIdentifier === 'core_unlock' ? '$12.99' : '$9.99' } })),
  addListener: vi.fn(async () => ({ remove() {} })),
}

async function fresh(flag) {
  vi.resetModules()
  const pk = await import('./packages')
  pk.__setPackagesFlag(flag)
  const iap = await import('./iap')
  iap.__setPluginForTests(async () => ({ NativePurchases: P }), true)
  return { pk, iap }
}

beforeEach(() => {
  localStorage.clear()
  Object.values(P).forEach((f) => f.mockClear())
  P.getPurchases.mockImplementation(async () => ({ purchases: [] }))
  P.purchaseProduct.mockReset()
})

describe('packages flag off (every build shipping today)', () => {
  it('gates nothing and sells only the five slots', async () => {
    const { pk, iap } = await fresh(false)
    expect(pk.hasPackage('core')).toBe(true)
    expect(pk.hasPackage('prayer')).toBe(true)
    expect(pk.prayerBookOpen('wudase-monday', new Date('2026-10-20T12:00:00'))).toBe(true)
    expect(iap.sellableProducts()).toEqual(iap.SELLABLE_PRODUCTS)
    expect(await iap.buyPackage('core')).toBe('unavailable')
    expect(P.purchaseProduct).not.toHaveBeenCalled()
  })
})

describe('packages flag on (free-download build)', () => {
  it('sells exactly slots + core/prayer/bundle, never full_app', async () => {
    const { iap } = await fresh(true)
    expect(iap.sellableProducts()).toEqual(['profile_slot_2', 'profile_slot_3', 'profile_slot_4', 'profile_slot_5', 'profile_slot_6', 'core_unlock', 'prayer_book', 'bundle_core_prayer'])
    expect(iap.sellableProducts()).not.toContain('full_app')
    expect(await iap.buyPackage('gold')).toBe('error')
  })

  it('a fresh install owns nothing; prayer: ጸሎት ዘዘወትር + today only', async () => {
    const { pk } = await fresh(true)
    expect(pk.hasPackage('core')).toBe(false)
    expect(pk.hasPackage('prayer')).toBe(false)
    const tue = new Date('2026-10-20T12:00:00')
    expect(pk.prayerBookOpen('tselot-zezewetir', tue)).toBe(true)
    expect(pk.prayerBookOpen('wudase-tuesday', tue)).toBe(true)
    expect(pk.prayerBookOpen('wudase-monday', tue)).toBe(false)
    expect(pk.packagesToOffer()).toEqual(['core', 'prayer', 'bundle'])
  })

  it('buying each package unlocks exactly its content', async () => {
    const { pk, iap } = await fresh(true)
    P.purchaseProduct.mockImplementationOnce(async () => ptx('prayer_book'))
    expect(await iap.buyPackage('prayer')).toBe('purchased')
    expect(P.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({ productIdentifier: 'prayer_book' }))
    expect(pk.hasPackage('prayer')).toBe(true)
    expect(pk.hasPackage('core')).toBe(false)
    expect(pk.packagesToOffer()).toEqual(['core'])
    P.purchaseProduct.mockImplementationOnce(async () => ptx('core_unlock'))
    expect(await iap.buyPackage('core')).toBe('purchased')
    expect(pk.hasPackage('core')).toBe(true)
    expect(pk.packagesToOffer()).toEqual([])
  })

  it('bundle grants both', async () => {
    const { pk, iap } = await fresh(true)
    P.purchaseProduct.mockImplementationOnce(async () => ptx('bundle_core_prayer'))
    expect(await iap.buyPackage('bundle')).toBe('purchased')
    expect(pk.hasPackage('core') && pk.hasPackage('prayer')).toBe(true)
  })

  it('pending / cancel / already-owned', async () => {
    const { pk, iap } = await fresh(true)
    P.purchaseProduct.mockImplementationOnce(async () => ptx('core_unlock', { purchaseState: '0' }))
    expect(await iap.buyPackage('core')).toBe('pending')
    expect(pk.hasPackage('core')).toBe(false)
    P.purchaseProduct.mockImplementationOnce(async () => { throw new Error('User cancelled') })
    expect(await iap.buyPackage('core')).toBe('cancelled')
    P.purchaseProduct.mockImplementationOnce(async () => { throw new Error('ITEM_ALREADY_OWNED') })
    P.getPurchases.mockImplementation(async () => ({ purchases: [ptx('core_unlock')] }))
    expect(await iap.buyPackage('core')).toBe('purchased')
    expect(pk.hasPackage('core')).toBe(true)
  })

  it('restore brings packages back; a refund drops them; legacy mark keeps core', async () => {
    const { pk, iap } = await fresh(true)
    P.getPurchases.mockImplementation(async () => ({ purchases: [ptx('prayer_book'), ptx('profile_slot_2')] }))
    expect(await iap.restorePurchases()).toBe('restored')
    expect(pk.hasPackage('prayer')).toBe(true)
    P.getPurchases.mockImplementation(async () => ({ purchases: [ptx('prayer_book', { revocationDate: '2026-10-23' })] }))
    await iap.initIap()
    expect(pk.hasPackage('prayer')).toBe(false)
    expect(await iap.restorePurchases()).toBe('none')
  })

  it('a rep code grant is ignored by the store app (3.1.1) and survives store sync', async () => {
    const { pk, iap } = await fresh(true)
    pk.grantRepPackage('bundle', { repId: 'ER01', code: 'EGR-BER01-AAAA-BBBB' })
    await iap.initIap()
    // native shell: EGR never unlocks
    expect(pk.hasPackage('core')).toBe(false)
    expect(pk.hasPackage('prayer')).toBe(false)
    // the stored grant is untouched by the store mirror; the web app honours it
    expect(pk.repGrants({ native: false }).map((g) => g.pkg)).toEqual(['bundle'])
    expect(pk.grantRepPackage('gold')).toBe(false)
  })

  it('core gate: first unit free, later units and games locked, prayer/explore free', async () => {
    const { pk } = await fresh(true)
    const J = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }, { id: 'g' }]
    expect(pk.coreNodeOpen({ id: 'x', unitIndex: 1 }, J)).toBe(true)
    expect(pk.coreNodeOpen({ id: 'y', unitIndex: 2 }, J)).toBe(false)
    expect(pk.coreNodeOpen({ id: 'f' }, J)).toBe(true)
    expect(pk.coreNodeOpen({ id: 'g' }, J)).toBe(false)
    expect(pk.coreScreenOpen({ name: 'prayer' })).toBe(true)
    expect(pk.coreScreenOpen({ name: 'explore' })).toBe(true)
    expect(pk.coreScreenOpen({ name: 'arcade' })).toBe(false)
    expect(pk.coreScreenOpen({ name: 'stone', freeNode: true })).toBe(true)
    pk.setStorePackages(['core_unlock'])
    expect(pk.coreNodeOpen({ id: 'y', unitIndex: 2 }, J)).toBe(true)
    expect(pk.coreScreenOpen({ name: 'arcade' })).toBe(true)
  })

  it('core gate is off when the flag is off', async () => {
    const { pk } = await fresh(false)
    expect(pk.coreNodeOpen({ id: 'y', unitIndex: 9 }, [])).toBe(true)
    expect(pk.coreScreenOpen({ name: 'arcade' })).toBe(true)
  })
})
