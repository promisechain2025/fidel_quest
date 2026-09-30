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

   PAID UPFRONT (v1.3.0+): dormant unless VITE_STORE_IAP=true AND the app
   runs natively AND that platform's RevenueCat public SDK key is set at
   build time (storeEnv.js iapAvailable):
     VITE_REVENUECAT_APPLE_KEY   (appl_...)
     VITE_REVENUECAT_GOOGLE_KEY  (goog_...)
   A test_ key talks only to RevenueCat's Test Store. It never creates an
   App Store or Play sale. Web and PWA builds never call the SDK.

   Product/entitlement names expected in the RevenueCat dashboard:
     entitlements: full_app, family_pack (attached to the store products).
     Both packages must be in the current offering. A package is the Family
     Pack when its store product id contains "family" (the documented id is
     family_pack); every other package is the app unlock. There is no
     separate store product id constant for the app — the entitlement
     checked after purchase is exactly full_app.
   The buy path never falls back to "the only package". Buying the app
   must not charge the Family Pack (and then report an error because
   full_app was not granted).
   Setup runbook: docs/store-purchases-iap.md. Diagnosis: FINDINGS.md.

   NO PLUGIN BUNDLED (1.3.0): @revenuecat/purchases-capacitor was removed
   from the app. Its iOS pod (RevenueCat via PurchasesHybridCommon 17.x) no
   longer compiles on Xcode 26/27 ("Ambiguous use of
   'init(stringRepresentation:)'"; fixed only in purchases-ios >= 5.78.0,
   which needs purchases-capacitor >= 12 and therefore Capacitor 8). The
   paid-upfront app never calls the SDK, so it was dead weight that broke the
   Xcode Cloud archive. This wrapper stays so the dormant flow can come back:
   to revive IAP, upgrade to Capacitor 8, `npm i @revenuecat/purchases-capacitor`,
   `npx cap sync`, and make loadPurchasesPlugin() below return
   `(await import('@revenuecat/purchases-capacitor')).Purchases`.
   Until then every call degrades to 'unavailable' / 'error' / '' and never
   throws, even if VITE_STORE_IAP=true is set by mistake.
   ========================================================================== */
import { revenueCatKey, iapAvailable } from './storeEnv'
import { unlockFamilyPack, familyPackUnlocked } from './familyPack'
import { markSupported } from './license'

export const FAMILY_PACK_ENTITLEMENT = 'family_pack'
export const FULL_APP_ENTITLEMENT = 'full_app'

export { iapAvailable }

function iapWarn(where, err) {
  const code = err?.code || err?.readableErrorCode || err?.data?.readableErrorCode || ''
  const message = typeof err?.message === 'string' ? err.message : ''
  console.warn(`[iap] ${where} failed${code ? ` (${code})` : ''}${message ? `: ${message}` : ''}`)
}

function errorBlob(e) {
  return [e?.message, e?.readableErrorCode, e?.code, e?.data?.readableErrorCode, e?.underlyingErrorMessage, e?.data?.underlyingErrorMessage]
    .filter((v) => v != null && v !== '')
    .join(' ')
}

function isUserCancel(e) {
  if (e?.userCancelled === true || e?.data?.userCancelled === true) return true
  const blob = errorBlob(e)
  return /cancell?ed/i.test(blob) && !/pending/i.test(blob)
}

function isPaymentPending(e) {
  return /pending|deferred|ask to buy/i.test(errorBlob(e))
}

function isAlreadyPurchased(e) {
  return /already purchased|already owned|receipt already/i.test(errorBlob(e))
}

/** Customer info arrives wrapped ({ customerInfo }) from get/purchase/restore
    and unwrapped from the update listener. */
function unwrapCustomerInfo(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.customerInfo && typeof payload.customerInfo === 'object') return payload.customerInfo
  if (payload.entitlements) return payload
  return null
}

/** Offerings are { current, all }. purchases-capacitor 11.3.2 has an open
    report that some runtimes wrap that as { offerings: { current, all } }
    (revenuecat/purchases-capacitor#657). Reading only `.current` then makes
    every buy return unavailable and the store never sees a transaction. */
function currentOffering(result) {
  if (!result || typeof result !== 'object') return null
  const offerings = result.offerings && typeof result.offerings === 'object'
    && ('current' in result.offerings || 'all' in result.offerings)
    ? result.offerings
    : result
  if (offerings.current?.availablePackages?.length) return offerings.current
  const all = offerings.all
  if (all && typeof all === 'object') {
    const list = Object.values(all).filter((o) => o?.availablePackages?.length)
    if (list.length === 1) return list[0]
  }
  return offerings.current || null
}

/** Resolves the RevenueCat `Purchases` plugin object. No plugin ships in
    this build, so the default loader rejects (callers catch and log). Tests
    inject a mock through __setPurchasesLoaderForTests. */
async function defaultPurchasesLoader() {
  throw new Error('RevenueCat plugin is not bundled in this build')
}
let loadPurchasesPlugin = defaultPurchasesLoader

/** Test seam: swap the plugin loader (pass nothing to restore the default). */
export function __setPurchasesLoaderForTests(loader) {
  loadPurchasesPlugin = typeof loader === 'function' ? loader : defaultPurchasesLoader
  ready = null
}

let ready = null
async function purchases() {
  if (!ready) {
    ready = (async () => {
      const key = revenueCatKey()
      if (/^test_/i.test(key)) {
        console.warn('[iap] RevenueCat Test Store key is set. Purchases from this build do not appear as live App Store or Play sales.')
      }
      const Purchases = await loadPurchasesPlugin()
      await Purchases.configure({ apiKey: key })
      try {
        await Purchases.addCustomerInfoUpdateListener((info) => {
          syncEntitlements(unwrapCustomerInfo(info))
        })
      } catch (e) {
        iapWarn('listener', e)
      }
      return Purchases
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
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

async function readCustomerInfo(P) {
  return unwrapCustomerInfo(await P.getCustomerInfo())
}

/** Called once at app start (native only). Syncs already-owned purchases -
    e.g. after a reinstall - without any user action. Never throws. */
export async function initIap() {
  if (!iapAvailable()) return
  try {
    const P = await purchases()
    syncEntitlements(await readCustomerInfo(P))
  } catch (e) {
    iapWarn('init', e)
  }
}

function packageId(p) {
  return String(p?.product?.identifier || p?.identifier || '')
}

/** Pick the offering package for a product kind ('app' | 'family_pack').
    Never substitutes the other product when this one is missing. */
function pickPackage(current, kind) {
  const pkgs = current?.availablePackages || []
  const isFamily = (p) => /family/i.test(packageId(p))
  return pkgs.find((p) => (kind === 'family_pack' ? isFamily(p) : !isFamily(p))) || null
}

async function storePrice(kind) {
  if (!iapAvailable()) return ''
  try {
    const P = await purchases()
    const offering = currentOffering(await P.getOfferings())
    return pickPackage(offering, kind)?.product?.priceString || ''
  } catch (e) {
    iapWarn('price', e)
    return ''
  }
}
/** Localized store price strings ("$12.99", "12,99 US$", ...) or ''. */
export const fullAppStorePrice = () => storePrice('app')
export const familyPackStorePrice = () => storePrice('family_pack')

async function ownedKind(P, kind) {
  const owned = syncEntitlements(await readCustomerInfo(P))
  return kind === 'family_pack' ? owned.familyPack : owned.app
}

async function buy(kind) {
  if (!iapAvailable()) return 'unavailable'
  try {
    const P = await purchases()
    const offering = currentOffering(await P.getOfferings())
    const pkg = pickPackage(offering, kind)
    if (!pkg) return 'unavailable'
    const result = await P.purchasePackage({ aPackage: pkg })
    let owned = syncEntitlements(unwrapCustomerInfo(result))
    let got = kind === 'family_pack' ? owned.familyPack : owned.app
    if (!got) got = await ownedKind(P, kind)
    return got ? 'purchased' : 'error'
  } catch (e) {
    if (isUserCancel(e)) return 'cancelled'
    if (isPaymentPending(e)) return 'pending'
    if (isAlreadyPurchased(e)) {
      try {
        const P = await purchases()
        return (await ownedKind(P, kind)) ? 'purchased' : 'error'
      } catch (e2) {
        iapWarn('already-owned', e2)
        return 'error'
      }
    }
    iapWarn('purchase', e)
    return 'error'
  }
}
/**
 * Run the native purchase sheet. Resolves to:
 *   'purchased' | 'cancelled' | 'pending' | 'unavailable' | 'error'
 * 'pending' is Ask to Buy: a grown-up still has to approve. The customer
 * info listener unlocks the app when they do.
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
    const owned = syncEntitlements(unwrapCustomerInfo(await P.restorePurchases()))
    return owned.app || owned.familyPack ? 'restored' : 'none'
  } catch (e) {
    iapWarn('restore', e)
    return 'error'
  }
}

/** Back-compat name used by the Grown-Ups profiles card. */
export async function restoreFamilyPack() {
  const r = await restorePurchasesAll()
  if (r !== 'restored') return r
  return familyPackUnlocked() ? 'restored' : 'none'
}
