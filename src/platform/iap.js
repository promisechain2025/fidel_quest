/* ============================================================================
   IAP — native in-app purchase for the Family Pack (RevenueCat)
   ----------------------------------------------------------------------------
   Store builds must sell digital features through StoreKit / Play Billing;
   this wraps RevenueCat's Capacitor plugin around the same entitlement the
   web flow writes (familyPack.js), so the rest of the app never knows which
   path paid.

   Dormant by default (repo pattern): every function no-ops unless the app
   runs natively AND the platform's RevenueCat key is configured:
     VITE_REVENUECAT_APPLE_KEY   (appl_...)
     VITE_REVENUECAT_GOOGLE_KEY  (goog_...)
   Product/entitlement names expected in the RevenueCat dashboard:
     entitlement: family_pack   (attached to the store products)
   Setup runbook for the owner: docs/family-pack-iap.md.

   The plugin is loaded via dynamic import so the web bundle never carries
   it and a plugin failure can never break app start.
   ========================================================================== */
import { isNativePlatform, isApplePlatform } from './native'
import { unlockFamilyPack, familyPackUnlocked } from './familyPack'

export const FAMILY_PACK_ENTITLEMENT = 'family_pack'

function platformKey() {
  const key = isApplePlatform() ? import.meta.env?.VITE_REVENUECAT_APPLE_KEY : import.meta.env?.VITE_REVENUECAT_GOOGLE_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : ''
}

/** True when the native store purchase path exists on this build. */
export function iapAvailable() {
  return isNativePlatform() && !!platformKey()
}

let configured = false
async function purchases() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  if (!configured) {
    await Purchases.configure({ apiKey: platformKey() })
    configured = true
  }
  return Purchases
}

const entitled = (customerInfo) => !!customerInfo?.entitlements?.active?.[FAMILY_PACK_ENTITLEMENT]

/** Called once at app start (native only). Syncs an already-owned pack -
    e.g. after a reinstall - without any user action. Never throws. */
export async function initIap() {
  if (!iapAvailable() || familyPackUnlocked()) return
  try {
    const P = await purchases()
    const { customerInfo } = await P.getCustomerInfo()
    if (entitled(customerInfo)) unlockFamilyPack('store')
  } catch {
    /* offline or store hiccup - the buy/restore buttons still work later */
  }
}

/** The localized store price ("$4.99", "4,99 US$", ...) of the default
    offering's first package, or '' when unavailable. */
export async function familyPackStorePrice() {
  if (!iapAvailable()) return ''
  try {
    const P = await purchases()
    const { current } = await P.getOfferings()
    const pkg = current?.availablePackages?.[0]
    return pkg?.product?.priceString || ''
  } catch {
    return ''
  }
}

/**
 * Run the native purchase sheet. Resolves to:
 *   'purchased'  - entitlement active, pack unlocked
 *   'cancelled'  - the user closed the sheet
 *   'unavailable'- IAP not configured / no offering
 *   'error'      - anything else (store outage, billing problem)
 */
export async function buyFamilyPack() {
  if (!iapAvailable()) return 'unavailable'
  try {
    const P = await purchases()
    const { current } = await P.getOfferings()
    const pkg = current?.availablePackages?.[0]
    if (!pkg) return 'unavailable'
    const { customerInfo } = await P.purchasePackage({ aPackage: pkg })
    if (entitled(customerInfo)) {
      unlockFamilyPack('store')
      return 'purchased'
    }
    return 'error'
  } catch (e) {
    return e?.userCancelled || /cancell?ed/i.test(String(e?.message || '')) ? 'cancelled' : 'error'
  }
}

/** Restore a purchase made on another device / after reinstall.
    Resolves 'restored' | 'none' | 'unavailable' | 'error'. */
export async function restoreFamilyPack() {
  if (!iapAvailable()) return 'unavailable'
  try {
    const P = await purchases()
    const { customerInfo } = await P.restorePurchases()
    if (entitled(customerInfo)) {
      unlockFamilyPack('store')
      return 'restored'
    }
    return 'none'
  } catch {
    return 'error'
  }
}
