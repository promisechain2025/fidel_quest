/* ============================================================================
   DAILY GIFT (retention, guilt-free)
   ----------------------------------------------------------------------------
   A return reason that suits pre-readers: each calendar day the child opens
   the app, Anbessa has a wrapped present. You never LOSE anything by missing a
   day (no streaks, no punishment) - you just get a nice surprise when you come
   back. The gift is a wardrobe item the child does not own yet, so it feeds
   straight into the Closet -> share loop; once everything is collected it
   becomes a warm "happy you came back" moment.

   The real calendar date only enters at the boundary (todayKey's default arg);
   giftAvailable / pickGift are pure functions of (state, today) so they test
   deterministically, honoring the "no wall clock in logic" convention.
   ========================================================================== */

import { REWARD_TABLE } from './journey'

const KEY = 'fq.gift.v1'

/** Local calendar day key. Pass a Date in tests; defaults to now at the edge. */
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function loadGift() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { lastClaimed: null }
  } catch {
    return { lastClaimed: null }
  }
}
export function saveGift(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* session-only */
  }
}

/** A gift is waiting if we have not already claimed one today. Pure. */
export function giftAvailable(state, today) {
  return !state || state.lastClaimed !== today
}

/** The day's gift: a stable un-owned wearable (or null once all are owned).
    Deterministic in (owned, today) so it does not change if reopened. Pure. */
export function pickGift(owned, today) {
  const pool = REWARD_TABLE.filter((r) => !owned.includes(r.id))
  if (!pool.length) return null
  let h = 0
  for (let i = 0; i < today.length; i++) h = (h * 31 + today.charCodeAt(i)) & 0x7fffffff
  return pool[h % pool.length]
}
