/* ============================================================================
   IAP — native in-app purchases (RevenueCat): the app + the Family Pack
   ----------------------------------------------------------------------------
   Store builds must sell digital things through StoreKit / Play Billing.
   Under the paid-app model the store download is FREE and there are two
   one-time products:
     entitlement full_app     - the app itself (APP_PRICE, default $12.99);
                                writes the same `supported` flag the web
                                flow sets (license.js markSupported)
     entitlement family_pack  - the add-on pack (familyPack.js)
   so the rest of the app never knows which platform took the payment -
   and a family that bought on the web redeems their EGZ code here instead
   of paying again (license.js redeemAppCode).

   Dormant by default (repo pattern): every function no-ops unless the app
   runs natively AND the platform's RevenueCat key is configured:
     VITE_REVENUECAT_APPLE_KEY   (appl_...)
     VITE_REVENUECAT_GOOGLE_KEY  (goog_...)
   Product/entitlement names expected in the RevenueCat dashboard:
     entitlements: full_app, family_pack (attached to the store products;
     put both packages in the current offering - packages are matched by
     product identifier substring 'family' vs anything else).
   Setup runbook for the owner: docs/store-purchases-iap.md.

   The plugin is loaded via dynamic import so the web bundle never carries
   it and a plugin failure can never break app start.
   ========================================================================== */
import { revenueCatKey, iapAvailable } from './storeEnv'
import { unlockFamilyPack, familyPackUnlocked } from './familyPack'
import { markSupported } from './license'

export const FAMILY_PACK_ENTITLEMENT = 'family_pack'
export const FULL_APP_ENTITLEMENT = 'full_app'

export { iapAvailable }

let configured = false
async function purchases() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  if (!configured) {
    await Purchases.configure({ apiKey: revenueCatKey() })
    configured = true
  }
  return Purchases
}

const entitledTo = (customerInfo, ent) => !!customerInfo?.entitlements?.active?.[ent]

/** Apply whatever the store says this customer owns. Returns what changed. */
function syncEntitlements(customerInfo) {
  const owned = { app: false, familyPack: false }
  if (entitledTo(customerInfo, FULL_APP_ENTITLEMENT)) {
    owned.app = true
    markSupported('store') // idempotent
  }
  if (entitledTo(customerInfo, FAMILY_PACK_ENTITLEMENT)) {
    owned.familyPack = true
    unlockFamilyPack('store')
  }
  return owned
}

/** Called once at app start (native only). Syncs already-owned purchases -
    e.g. after a reinstall - without any user action. Never throws. */
export async function initIap() {
  if (!iapAvailable()) return
  try {
    const P = await purchases()
    const { customerInfo } = await P.getCustomerInfo()
    syncEntitlements(customerInfo)
  } catch {
    /* offline or store hiccup - the buy/restore buttons still work later */
  }
}

/** Pick the offering package for a product kind ('app' | 'family_pack'). */
function pickPackage(current, kind) {
  const pkgs = current?.availablePackages || []
  const isFamily = (p) => /family/i.test(p?.product?.identifier || p?.identifier || '')
  const match = pkgs.find((p) => (kind === 'family_pack' ? isFamily(p) : !isFamily(p)))
  return match || (pkgs.length === 1 ? pkgs[0] : null)
}

async function storePrice(kind) {
  if (!iapAvailable()) return ''
  try {
    const P = await purchases()
    const { current } = await P.getOfferings()
    return pickPackage(current, kind)?.product?.priceString || ''
  } catch {
    return ''
  }
}
/** Localized store price strings ("$12.99", "12,99 US$", ...) or ''. */
export const fullAppStorePrice = () => storePrice('app')
export const familyPackStorePrice = () => storePrice('family_pack')

async function buy(kind) {
  if (!iapAvailable()) return 'unavailable'
  try {
    const P = await purchases()
    const { current } = await P.getOfferings()
    const pkg = pickPackage(current, kind)
    if (!pkg) return 'unavailable'
    const { customerInfo } = await P.purchasePackage({ aPackage: pkg })
    const owned = syncEntitlements(customerInfo)
    return (kind === 'family_pack' ? owned.familyPack : owned.app) ? 'purchased' : 'error'
  } catch (e) {
    return e?.userCancelled || /cancell?ed/i.test(String(e?.message || '')) ? 'cancelled' : 'error'
  }
}
/**
 * Run the native purchase sheet. Resolves to:
 *   'purchased' | 'cancelled' | 'unavailable' | 'error'
 */
export const buyFullApp = () => buy('app')
export const buyFamilyPack = () => buy('family_pack')

/** Restore purchases made on another device / after reinstall. Syncs BOTH
    entitlements; resolves 'restored' (anything owned) | 'none' |
    'unavailable' | 'error'. */
export async function restorePurchasesAll() {
  if (!iapAvailable()) return 'unavailable'
  try {
    const P = await purchases()
    const { customerInfo } = await P.restorePurchases()
    const owned = syncEntitlements(customerInfo)
    return owned.app || owned.familyPack ? 'restored' : 'none'
  } catch {
    return 'error'
  }
}

/** Back-compat name used by the Grown-Ups profiles card. */
export async function restoreFamilyPack() {
  const r = await restorePurchasesAll()
  if (r !== 'restored') return r
  return familyPackUnlocked() ? 'restored' : 'none'
}
