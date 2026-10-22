/* ============================================================================
   PACKAGES - what a family owns (entitlements), from every source
   ----------------------------------------------------------------------------
   Plan: /workspace/egeez-free-iap-plan.md (approved 2026-10-18), §1-§2.

     core    core_unlock          letters, lessons, games, School Path, reader
     prayer  prayer_book          ጸሎት ዘዘወትር + ውዳሴ ማርያም (all 7 days)
     bundle  bundle_core_prayer   both of the above
     slots   profile_slot_2..6    unchanged (profileSlots.js)

   Sources of an entitlement (any one is enough, stored device-wide in
   fq.entitlements.v1 - never per child):
     store  - a verified App Store / Play transaction (iap.js mirrors it on
              buy / restore / launch sync; a refund drops it)
     rep    - a representative unlock code (EGR-..., repCodes.js), redeemed
              server-side; WEB BUILD ONLY (store rules, see docs/rep-codes.md)
     legacy - the paid-app buyer mark (paidBuyer.js) -> core only
     class  - a teacher class code (classUnlock.js) -> core only

   PACKAGES_ON is the 1.4 switch (VITE_PACKAGES=1). While it is off - every
   build shipping today - hasPackage() is true for everything, the paid app
   stays the whole product and SELLABLE_PRODUCTS stays the five slots
   (paidUpfront.test.js). Nothing changes for existing users until the
   owner flips the flag for the free-download release.
   ========================================================================== */
import { isPaidBuyer } from './paidBuyer'
import { classUnlockActive } from './classUnlock'
import { packagesEnabled, __setPackagesFlag } from './packagesFlag'

export { packagesEnabled, __setPackagesFlag }

export const ENT_KEY = 'fq.entitlements.v1'

export const PACKAGE_IDS = Object.freeze(['core', 'prayer', 'bundle'])
export const PACKAGE_PRODUCT = Object.freeze({ core: 'core_unlock', prayer: 'prayer_book', bundle: 'bundle_core_prayer' })
export const PACKAGE_PRODUCTS = Object.freeze(Object.values(PACKAGE_PRODUCT))
/** Which content each product id grants. */
export const GRANTS = Object.freeze({
  core_unlock: ['core'],
  prayer_book: ['prayer'],
  bundle_core_prayer: ['core', 'prayer'],
})
/** Store-side fallback prices (USD), shown only when the store is silent. */
export const PACKAGE_PRICE_FALLBACK = Object.freeze({ core: '$12.99', prayer: '$9.99', bundle: '$19.99' })

/** Prayer books that are free for everyone (plan §3). */
export const FREE_PRAYER_BOOK = 'tselot-zezewetir'
const WUDASE_BY_DAY = ['wudase-sunday', 'wudase-monday', 'wudase-tuesday', 'wudase-wednesday', 'wudase-thursday', 'wudase-friday', 'wudase-saturday']

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(ENT_KEY))
    return s && typeof s === 'object' ? s : {}
  } catch {
    return {}
  }
}
function save(s) {
  try { localStorage.setItem(ENT_KEY, JSON.stringify(s)) } catch { /* storage blocked */ }
}

/** Store-confirmed package product ids on this device. */
export function storePackageProducts() {
  const ids = load().store
  return Array.isArray(ids) ? ids.filter((id) => PACKAGE_PRODUCTS.includes(id)) : []
}

/** Mirror the store. 'add' merges (a purchase), 'replace' mirrors the
    store's full answer (restore / launch sync: drops refunds). */
export function setStorePackages(ids, mode = 'add') {
  const clean = (ids || []).filter((id) => PACKAGE_PRODUCTS.includes(id))
  const s = load()
  const next = mode === 'replace' ? clean : [...new Set([...storePackageProducts(), ...clean])]
  save({ ...s, store: PACKAGE_PRODUCTS.filter((id) => next.includes(id)) })
}

/** A representative code grant (already verified by the server). Never
    revoked locally: the family paid the rep. */
export function grantRepPackage(pkg, { repId = '', code = '' } = {}) {
  if (!PACKAGE_IDS.includes(pkg)) return false
  const s = load()
  const reps = Array.isArray(s.rep) ? s.rep.filter((r) => r && r.code !== code) : []
  reps.push({ pkg, repId: String(repId).slice(0, 6), code: String(code).slice(0, 32), day: new Date().toISOString().slice(0, 10) })
  save({ ...s, rep: reps })
  return true
}

export function repGrants() {
  const r = load().rep
  return Array.isArray(r) ? r.filter((x) => x && PACKAGE_IDS.includes(x.pkg)) : []
}

/** Content ids ('core' | 'prayer') owned from every source. */
export function ownedContent() {
  const out = new Set()
  for (const id of storePackageProducts()) for (const c of GRANTS[id]) out.add(c)
  for (const g of repGrants()) for (const c of GRANTS[PACKAGE_PRODUCT[g.pkg]]) out.add(c)
  if (isPaidBuyer()) out.add('core')
  if (classUnlockActive()) out.add('core')
  return out
}

/** The one question: may this device use `content` ('core' | 'prayer')? */
export function hasPackage(content) {
  if (!packagesEnabled()) return true
  return ownedContent().has(content)
}

/** Package ids still worth offering (bundle hidden once either part is owned). */
export function packagesToOffer() {
  const own = ownedContent()
  const out = []
  if (!own.has('core')) out.push('core')
  if (!own.has('prayer')) out.push('prayer')
  if (!own.has('core') && !own.has('prayer')) out.push('bundle')
  return out
}

/** Prayer book gate: ጸሎት ዘዘወትር is always free, plus today's ውዳሴ ማርያም. */
export function prayerBookOpen(bookId, now = new Date()) {
  if (hasPackage('prayer')) return true
  if (bookId === FREE_PRAYER_BOOK) return true
  return bookId === WUDASE_BY_DAY[now.getDay()]
}
