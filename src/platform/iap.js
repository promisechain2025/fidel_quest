/* ============================================================================
   IAP - kids-profile slots (StoreKit 2 / Google Play Billing)
   ----------------------------------------------------------------------------
   eGeez 1.3.1 is PAID UPFRONT: $12.99 at download on the App Store and
   Google Play. That price includes everything except extra kids profiles:
   the app includes ONE child profile, and each further child is a one-time,
   non-consumable in-app purchase, bought in order, up to 6:
     profile_slot_2 $4.99, profile_slot_3..profile_slot_6 $2.49 each
   (platform/profileSlots.js).

   This module can sell ONLY those five slot products. buyNextProfileSlot()
   takes no argument: it always buys the next slot in order, so a slot can
   never be skipped and nothing else can be bought. There is no full_app,
   no subscription, no consumable. "Buy the app in the app" is impossible by
   construction, and src/platform/paidUpfront.test.js plus
   ios/App/ci_scripts/ci_post_clone.sh (which greps the built bundle) fail
   if full_app ever appears. The legacy family_pack (1.2) is RECOGNISED on
   restore / sync and grants all 6 slots, but is never offered for sale.

   Plugin: @capgo/native-purchases 7.19.x (Capacitor 7). StoreKit 2 on iOS
   (transactions verified on-device by StoreKit), Play Billing 8 on Android
   (purchases acknowledged automatically so Google does not refund them after
   3 days). No RevenueCat, no server, no account, no analytics: purchases are
   between the family and Apple / Google.

   Entitlement flow:
     buy / restore / launch sync -> getPurchases() -> non-revoked slot
     transactions (Android: purchaseState "1") -> profileSlots.setOwnedSlots.
     Restore and the launch sync MIRROR the store's answer (so a refunded
     slot is dropped); a family_pack transaction grants all 6. 1.2 code /
     web Family Pack unlocks are never revoked.
     Ask to Buy / pending Play payments resolve later through the
     'transactionUpdated' listener or the next launch sync.

   Every call degrades to 'unavailable' / 'error' / '' and never throws -
   on the web, in tests, or if the plugin is missing from a native build.
   Owner setup: docs/store-purchases-iap.md.
   ========================================================================== */
import { iapAvailable as storeAvailable } from './storeEnv'
import { isApplePlatform } from './native'
import {
  SLOT_PRODUCTS, LEGACY_FAMILY_PACK_ID, nextSlot, slotProductId, setOwnedSlots, grantLegacyFamilyPack, revokeStoreLegacyPack,
} from './profileSlots'

export { SLOT_PRODUCTS }
/** The complete list of products this app can ever ask the store to SELL. */
export const SELLABLE_PRODUCTS = SLOT_PRODUCTS
const INAPP = 'inapp' // PURCHASE_TYPE.INAPP - one-time (non-consumable) products

// The loader resolves to the plugin MODULE ({ NativePurchases }), never to
// the plugin itself: a Capacitor plugin is a Proxy that answers every
// property - including `then` - so resolving a promise with it makes the
// promise treat it as a thenable and hang forever. The plugin is only ever
// passed around inside a plain holder object for the same reason.
let loadPlugin = () => import('@capgo/native-purchases')
let availableOverride = null
let pluginPromise = null
let listening = false

/** Tests only: inject a fake plugin module ({ NativePurchases }) and force
    availability. */
export function __setPluginForTests(loader, available = true) {
  loadPlugin = loader
  availableOverride = available
  pluginPromise = null
  listening = false
}

export function iapAvailable() {
  return availableOverride ?? storeAvailable()
}

/** Resolves to a holder { P } (see the note on loadPlugin). */
function plugin() {
  if (!pluginPromise) {
    pluginPromise = Promise.resolve()
      .then(() => loadPlugin())
      .then((mod) => {
        const P = mod?.NativePurchases
        if (!P) throw new Error('store plugin missing')
        return { P }
      })
      .catch((e) => {
        pluginPromise = null
        throw e
      })
  }
  return pluginPromise
}

function iapWarn(where, err) {
  const message = typeof err?.message === 'string' ? err.message : String(err || '')
  console.warn(`[iap] ${where} failed${message ? `: ${message}` : ''}`)
}

const errText = (e) => [e?.message, e?.code, e?.errorMessage, typeof e === 'string' ? e : ''].filter(Boolean).join(' ')
const isUserCancel = (e) => /cancel/i.test(errText(e)) || String(e?.code) === '1' // Play USER_CANCELED
const isPending = (e) => /pending|deferred|ask to buy/i.test(errText(e))
// Play Billing reports cancel AND already-owned as one generic rejection.
const isNotPurchased = (e) => /not purchased/i.test(errText(e))
const isAlreadyOwned = (e) => /already.?owned|already purchased|ITEM_ALREADY_OWNED/i.test(errText(e)) || String(e?.code) === '7'

/** A transaction that grants something: a known product, not revoked /
    refunded, and (Android) in the PURCHASED state. */
export function validTransaction(tx) {
  if (!tx || typeof tx.productIdentifier !== 'string') return false
  if (!SLOT_PRODUCTS.includes(tx.productIdentifier) && tx.productIdentifier !== LEGACY_FAMILY_PACK_ID) return false
  if (tx.revocationDate) return false
  if (tx.purchaseState != null && String(tx.purchaseState) !== '1') return false
  return true
}

/** Apply ONE store transaction (purchase result / listener). */
function grant(tx) {
  if (!validTransaction(tx)) return false
  if (tx.productIdentifier === LEGACY_FAMILY_PACK_ID) grantLegacyFamilyPack()
  else setOwnedSlots([tx.productIdentifier], 'add')
  return true
}

/** Ask the store for everything this account owns and mirror it locally.
    Throws if the store cannot be asked (so "offline" is never mistaken for
    "refunded"). Returns the owned slot ids. */
async function syncFromStore(P) {
  const res = await P.getPurchases({ productType: INAPP })
  const txs = (Array.isArray(res?.purchases) ? res.purchases : []).filter(validTransaction)
  const ids = txs.map((t) => t.productIdentifier)
  if (ids.includes(LEGACY_FAMILY_PACK_ID)) grantLegacyFamilyPack()
  else revokeStoreLegacyPack()
  const slots = ids.filter((id) => SLOT_PRODUCTS.includes(id))
  setOwnedSlots(slots, 'replace')
  return { slots, legacy: ids.includes(LEGACY_FAMILY_PACK_ID) }
}

async function listen(P) {
  if (listening || typeof P.addListener !== 'function') return
  listening = true
  try {
    // Ask to Buy approvals and pending payments land here later.
    await P.addListener('transactionUpdated', (tx) => { grant(tx) })
  } catch (e) {
    listening = false
    iapWarn('listen', e)
  }
}

/** Launch: pick up purchases made on another device / approved later, and
    honour refunds. Silent; never throws. */
export async function initIap() {
  if (!iapAvailable()) return
  try {
    const { P } = await plugin()
    await listen(P)
    // Android: a pending Play payment that completed while the app was
    // closed must be ACKNOWLEDGED or Google refunds it after 3 days; the
    // plugin's restorePurchases() acknowledges every finished purchase.
    // (On iOS restorePurchases is AppStore.sync, which can prompt for the
    // Apple ID, so it only ever runs from the Restore purchases button.)
    if (!isApplePlatform()) await P.restorePurchases()
    await syncFromStore(P)
  } catch (e) {
    iapWarn('init', e)
  }
}

/** Localized store price for slot n ("$2.49", "2,49 €", ...) or ''. */
export async function slotStorePrice(n) {
  if (!iapAvailable() || n < 2 || n > SLOT_PRODUCTS.length + 1) return ''
  try {
    const { P } = await plugin()
    const res = await P.getProduct({ productIdentifier: slotProductId(n), productType: INAPP })
    return res?.product?.priceString || ''
  } catch (e) {
    iapWarn('price', e)
    return ''
  }
}

/**
 * Buy the NEXT profile slot (in order). Resolves to:
 *   'purchased' | 'cancelled' | 'pending' | 'unavailable' | 'error'
 * 'pending' is Ask to Buy (iOS) or a slow Play payment: it unlocks via the
 * transactionUpdated listener / the next launch sync once approved.
 */
export async function buyNextProfileSlot() {
  if (!iapAvailable()) return 'unavailable'
  const n = nextSlot()
  if (!n) return 'purchased' // all 6 already owned
  const productId = slotProductId(n)
  if (!SELLABLE_PRODUCTS.includes(productId)) return 'error'
  let P
  try {
    P = (await plugin()).P
    await listen(P)
    const tx = await P.purchaseProduct({ productIdentifier: productId, productType: INAPP, quantity: 1 })
    if (tx?.productIdentifier === productId && grant(tx)) return 'purchased'
    if (tx && String(tx.purchaseState) === '0') return 'pending'
    return (await syncFromStore(P)).slots.includes(productId) ? 'purchased' : 'error'
  } catch (e) {
    if (isPending(e)) return 'pending'
    if (isUserCancel(e)) return 'cancelled'
    if ((isAlreadyOwned(e) || isNotPurchased(e)) && P) {
      try {
        const got = await syncFromStore(P)
        if (got.legacy || got.slots.includes(productId)) return 'purchased'
        return isNotPurchased(e) ? 'cancelled' : 'error'
      } catch (e2) {
        iapWarn('already-owned', e2)
        return 'error'
      }
    }
    iapWarn('purchase', e)
    return 'error'
  }
}

/** Restore Purchases (required by Apple for non-consumables): re-sync with
    the store account and mirror every slot (and a legacy family_pack).
    Resolves to 'restored' | 'none' | 'cancelled' | 'unavailable' | 'error'. */
export async function restoreProfileSlots() {
  if (!iapAvailable()) return 'unavailable'
  try {
    const { P } = await plugin()
    await P.restorePurchases()
    const got = await syncFromStore(P)
    return got.legacy || got.slots.length ? 'restored' : 'none'
  } catch (e) {
    if (isUserCancel(e)) return 'cancelled'
    iapWarn('restore', e)
    return 'error'
  }
}
