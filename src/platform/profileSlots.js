/* ============================================================================
   PROFILE SLOTS — kids profiles are paid per child, in-app, in order
   ----------------------------------------------------------------------------
   eGeez is paid upfront ($12.99 in the App Store / Google Play) and that
   price includes ONE child profile. Each further child is a one-time,
   non-consumable in-app purchase, bought in order, up to MAX_PROFILES (6):

     profile 2  profile_slot_2  $4.99
     profile 3  profile_slot_3  $2.49   (50% off)
     profile 4  profile_slot_4  $2.49
     profile 5  profile_slot_5  $2.49
     profile 6  profile_slot_6  $2.49

   Slot N only counts once slots 2..N-1 are owned (the app only ever offers
   the NEXT slot, so in-order buying is the only path). Everything is bought
   and restored through the store (platform/iap.js): no unlock codes, no web
   checkout, no honour button. The store sets the real, localized prices;
   SLOT_PRICE_FALLBACK is only shown if the store price cannot be loaded.

   LEGACY: the old Family Pack (store product family_pack, or a FAM code /
   web unlock from 1.2) unlocked every profile, so its owners keep ALL 6
   slots. family_pack is recognised on restore but never sold again.

   Storage (device-level, deliberately NOT progress keys - resetting a child
   must never revoke a purchase):
     fq.profileslots.v1  { owned: ['profile_slot_2', ...], day }   (store)
     fq.familypack.v1    { unlocked, method }   legacy, written by 1.2
   ========================================================================== */

const KEY = 'fq.profileslots.v1'
const LEGACY_KEY = 'fq.familypack.v1'

export const MAX_SLOTS = 6
/** Profiles included with the paid app. */
export const FREE_PROFILES = 1
/** The old all-profiles product from 1.2: honoured, never sold. */
export const LEGACY_FAMILY_PACK_ID = 'family_pack'

export const slotProductId = (n) => `profile_slot_${n}`
/** Every product this app can ever SELL, in purchase order. */
export const SLOT_PRODUCTS = Object.freeze([2, 3, 4, 5, 6].map(slotProductId))
/** Shown only when the store price is unavailable. */
export const SLOT_PRICE_FALLBACK = Object.freeze({ 2: '$4.99', 3: '$2.49', 4: '$2.49', 5: '$2.49', 6: '$2.49' })

function readJson(key) {
  try {
    const s = JSON.parse(localStorage.getItem(key))
    return s && typeof s === 'object' ? s : {}
  } catch {
    return {}
  }
}

/** Old Family Pack owners (store or 1.2 code / web unlock) own all 6. */
export function legacyFamilyPack() {
  return !!readJson(LEGACY_KEY).unlocked
}

/** Slot product ids the store has confirmed on this device. */
export function ownedSlotProducts() {
  const owned = readJson(KEY).owned
  return Array.isArray(owned) ? owned.filter((id) => SLOT_PRODUCTS.includes(id)) : []
}

/** How many kids profiles this device may hold (1..6). Slots count only
    in order: owning slot 4 without slot 3 still allows 2 profiles. */
export function allowedProfiles() {
  if (legacyFamilyPack()) return MAX_SLOTS
  const owned = new Set(ownedSlotProducts())
  let n = FREE_PROFILES
  while (n < MAX_SLOTS && owned.has(slotProductId(n + 1))) n++
  return n
}

/** True when adding another child (with `count` profiles already on the
    device) needs a slot purchase first. Never true at the 6 cap (the cap
    itself stops adding). Existing children are never taken away. */
export function needsSlot(count) {
  return count < MAX_SLOTS && count >= allowedProfiles()
}

/** The slot number to buy next (2..6), or 0 when all are owned. */
export function nextSlot() {
  const n = allowedProfiles()
  return n >= MAX_SLOTS ? 0 : n + 1
}

/** Record store-confirmed slot ownership. mode 'add' merges (a purchase);
    mode 'replace' mirrors the store's full answer (launch sync / restore),
    which also drops refunded slots. */
export function setOwnedSlots(ids, mode = 'add') {
  const clean = (ids || []).filter((id) => SLOT_PRODUCTS.includes(id))
  const next = mode === 'replace' ? clean : [...new Set([...ownedSlotProducts(), ...clean])]
  try {
    localStorage.setItem(KEY, JSON.stringify({ owned: SLOT_PRODUCTS.filter((id) => next.includes(id)), day: new Date().toISOString().slice(0, 10) }))
  } catch {
    /* storage blocked */
  }
}

/** The store reported the legacy family_pack: all 6 slots. */
export function grantLegacyFamilyPack() {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ unlocked: true, method: 'store', day: new Date().toISOString().slice(0, 10) }))
  } catch {
    /* storage blocked */
  }
}

/** The store answered and no longer lists family_pack: drop a STORE legacy
    unlock (refund). 1.2 code / web unlocks are kept - those families paid
    outside the store, so the store cannot know about them. */
export function revokeStoreLegacyPack() {
  const s = readJson(LEGACY_KEY)
  if (!s.unlocked || s.method !== 'store') return false
  try { localStorage.removeItem(LEGACY_KEY) } catch { /* storage blocked */ }
  return true
}
