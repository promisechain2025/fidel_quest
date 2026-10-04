import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The store plugin is a native bridge; everything here mocks it. What is
   tested is the wrapper's contract: it can only ever sell the five
   profile_slot_N products, always the NEXT one in order; it maps store
   outcomes to buy / restore results; it grants only on a valid transaction;
   a legacy family_pack grants all 6; refunds are honoured without touching
   1.2 code / web unlocks. */

let mockApple = true
vi.mock('./native', () => ({ isNativePlatform: () => true, isApplePlatform: () => mockApple }))

const tx = (n, extra = {}) => ({ transactionId: String(n), productIdentifier: `profile_slot_${n}`, purchaseDate: '2026-10-05', ...extra })
const PACK_TX = { transactionId: 'fp', productIdentifier: 'family_pack', purchaseDate: '2025-06-01' }
const P = {
  purchaseProduct: vi.fn(),
  restorePurchases: vi.fn(async () => {}),
  getPurchases: vi.fn(async () => ({ purchases: [] })),
  getProduct: vi.fn(async ({ productIdentifier }) => ({ product: { identifier: productIdentifier, priceString: productIdentifier === 'profile_slot_2' ? '$4.99' : '$2.49' } })),
  addListener: vi.fn(async () => ({ remove() {} })),
}

async function fresh({ available = true, withPlugin = true } = {}) {
  vi.resetModules()
  const iap = await import('./iap')
  iap.__setPluginForTests(async () => (withPlugin ? { NativePurchases: P } : {}), available)
  const slots = await import('./profileSlots')
  return { iap, slots }
}
const legacy = () => JSON.parse(localStorage.getItem('fq.familypack.v1') || '{}')

beforeEach(() => {
  localStorage.clear()
  mockApple = true
  Object.values(P).forEach((f) => f.mockClear())
  P.getPurchases.mockImplementation(async () => ({ purchases: [] }))
  P.purchaseProduct.mockReset()
  P.restorePurchases.mockImplementation(async () => {})
})

describe('iap: kids-profile slots only', () => {
  it('can only ever sell profile_slot_2..6 - never full_app, never family_pack', async () => {
    const { iap } = await fresh()
    expect(iap.SELLABLE_PRODUCTS).toEqual(['profile_slot_2', 'profile_slot_3', 'profile_slot_4', 'profile_slot_5', 'profile_slot_6'])
    expect(iap.SELLABLE_PRODUCTS).not.toContain('family_pack')
    for (const gone of ['buyFullApp', 'buyFamilyPack', 'fullAppStorePrice', 'FULL_APP_ENTITLEMENT']) expect(iap[gone], gone).toBeUndefined()
    expect(iap.buyNextProfileSlot.length).toBe(0) // no product argument
  })

  it('buys strictly in order: 2 ($4.99), then 3..6 ($2.49), then nothing', async () => {
    const { iap, slots } = await fresh()
    P.purchaseProduct.mockImplementation(async ({ productIdentifier }) => ({ transactionId: 'x', productIdentifier, purchaseState: '1' }))
    for (let n = 2; n <= 6; n++) {
      expect(await iap.slotStorePrice(n)).toBe(n === 2 ? '$4.99' : '$2.49')
      expect(await iap.buyNextProfileSlot()).toBe('purchased')
      expect(P.purchaseProduct.mock.calls.at(-1)[0]).toEqual({ productIdentifier: `profile_slot_${n}`, productType: 'inapp', quantity: 1 })
      expect(slots.allowedProfiles()).toBe(n)
    }
    expect(await iap.buyNextProfileSlot()).toBe('purchased')
    expect(P.purchaseProduct).toHaveBeenCalledTimes(5)
  })

  it('a pending Play payment / Ask to Buy does not unlock', async () => {
    const { iap, slots } = await fresh()
    P.purchaseProduct.mockResolvedValue(tx(2, { purchaseState: '0' }))
    expect(await iap.buyNextProfileSlot()).toBe('pending')
    P.purchaseProduct.mockRejectedValue(new Error('Transaction pending'))
    expect(await iap.buyNextProfileSlot()).toBe('pending')
    expect(slots.allowedProfiles()).toBe(1)
  })

  it('cancel is quiet; an Android "not purchased" that is really already-owned unlocks', async () => {
    const { iap, slots } = await fresh()
    P.purchaseProduct.mockRejectedValue(new Error('User cancelled'))
    expect(await iap.buyNextProfileSlot()).toBe('cancelled')
    P.purchaseProduct.mockRejectedValue(new Error('Purchase is not purchased'))
    expect(await iap.buyNextProfileSlot()).toBe('cancelled')
    P.getPurchases.mockResolvedValue({ purchases: [tx(2, { purchaseState: '1' })] })
    expect(await iap.buyNextProfileSlot()).toBe('purchased')
    expect(slots.allowedProfiles()).toBe(2)
  })

  it('a transaction for another product never unlocks anything', async () => {
    const { iap, slots } = await fresh()
    P.purchaseProduct.mockResolvedValue({ ...tx(2), productIdentifier: 'full_app' })
    expect(await iap.buyNextProfileSlot()).toBe('error')
    expect(slots.allowedProfiles()).toBe(1)
    expect(iap.validTransaction({ ...tx(2), productIdentifier: 'profile_slot_7' })).toBe(false)
  })

  it('Restore purchases: restored / none / error, mirrors every slot', async () => {
    const { iap, slots } = await fresh()
    expect(await iap.restoreProfileSlots()).toBe('none')
    expect(P.restorePurchases).toHaveBeenCalled()
    P.getPurchases.mockResolvedValue({ purchases: [tx(2), tx(3), tx(4)] })
    expect(await iap.restoreProfileSlots()).toBe('restored')
    expect(slots.allowedProfiles()).toBe(4)
    P.restorePurchases.mockRejectedValue(new Error('network down'))
    expect(await iap.restoreProfileSlots()).toBe('error')
  })

  it('a legacy family_pack (1.2 buyer) restores as all 6 slots', async () => {
    const { iap, slots } = await fresh()
    P.getPurchases.mockResolvedValue({ purchases: [PACK_TX] })
    expect(await iap.restoreProfileSlots()).toBe('restored')
    expect(slots.allowedProfiles()).toBe(6)
    expect(await iap.buyNextProfileSlot()).toBe('purchased')
    expect(P.purchaseProduct).not.toHaveBeenCalled()
  })

  it('revoked / refunded transactions do not count', async () => {
    const { iap } = await fresh()
    P.getPurchases.mockResolvedValue({ purchases: [tx(2, { revocationDate: '2026-10-06' })] })
    expect(await iap.restoreProfileSlots()).toBe('none')
    expect(iap.validTransaction(tx(2, { purchaseState: '2' }))).toBe(false)
  })

  it('launch sync: picks up slots, drops refunded ones, revokes a refunded STORE family_pack, keeps 1.2 code unlocks', async () => {
    let { iap, slots } = await fresh()
    P.getPurchases.mockResolvedValue({ purchases: [tx(2), tx(3)] })
    await iap.initIap()
    expect(slots.allowedProfiles()).toBe(3)
    expect(P.addListener).toHaveBeenCalledWith('transactionUpdated', expect.any(Function))
    expect(P.restorePurchases).not.toHaveBeenCalled() // iOS: never AppStore.sync on launch
    P.getPurchases.mockResolvedValue({ purchases: [tx(2)] })
    ;({ iap, slots } = await fresh())
    await iap.initIap()
    expect(slots.allowedProfiles()).toBe(2)
    localStorage.setItem('fq.familypack.v1', JSON.stringify({ unlocked: true, method: 'store' }))
    ;({ iap, slots } = await fresh())
    await iap.initIap()
    expect(legacy().unlocked).toBeUndefined()
    localStorage.setItem('fq.familypack.v1', JSON.stringify({ unlocked: true, method: 'code' }))
    ;({ iap, slots } = await fresh())
    await iap.initIap()
    expect(slots.allowedProfiles()).toBe(6)
  })

  it('Android launch acknowledges finished purchases via restorePurchases', async () => {
    mockApple = false
    const { iap } = await fresh()
    await iap.initIap()
    expect(P.restorePurchases).toHaveBeenCalled()
  })

  it('offline launch never revokes', async () => {
    localStorage.setItem('fq.profileslots.v1', JSON.stringify({ owned: ['profile_slot_2'] }))
    const { iap, slots } = await fresh()
    P.getPurchases.mockRejectedValue(new Error('offline'))
    await expect(iap.initIap()).resolves.toBeUndefined()
    expect(slots.allowedProfiles()).toBe(2)
  })

  it('Ask to Buy approved later unlocks through transactionUpdated', async () => {
    const { iap, slots } = await fresh()
    await iap.initIap()
    const cb = P.addListener.mock.calls[0][1]
    cb({ ...tx(2), productIdentifier: 'something_else' })
    expect(slots.allowedProfiles()).toBe(1)
    cb(tx(2))
    expect(slots.allowedProfiles()).toBe(2)
  })

  it('works with a real Capacitor plugin proxy (answers every property, including then)', async () => {
    // A Capacitor plugin is a Proxy: P.then exists and never settles. If the
    // wrapper ever resolved a promise WITH the plugin, every call would hang.
    const proxy = new Proxy({}, { get: (_, k) => (k === 'then' ? () => {} : P[k]) })
    vi.resetModules()
    const iap = await import('./iap')
    iap.__setPluginForTests(async () => ({ NativePurchases: proxy }), true)
    P.purchaseProduct.mockResolvedValue(tx(2, { purchaseState: '1' }))
    const settle = (p) => Promise.race([p, new Promise((r) => setTimeout(() => r('HUNG'), 500))])
    expect(await settle(iap.slotStorePrice(2))).toBe('$4.99')
    expect(await settle(iap.buyNextProfileSlot())).toBe('purchased')
    expect(await settle(iap.restoreProfileSlots())).toBe('none')
  })

  it('fails closed: web / no plugin -> unavailable, never throws, never unlocks', async () => {
    let { iap, slots } = await fresh({ available: false })
    expect(await iap.buyNextProfileSlot()).toBe('unavailable')
    expect(await iap.restoreProfileSlots()).toBe('unavailable')
    expect(await iap.slotStorePrice(2)).toBe('')
    ;({ iap, slots } = await fresh({ withPlugin: false }))
    expect(await iap.buyNextProfileSlot()).toBe('error')
    await expect(iap.initIap()).resolves.toBeUndefined()
    expect(slots.allowedProfiles()).toBe(1)
  })
})
