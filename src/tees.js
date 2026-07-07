/* ============================================================================
   TEE DESIGNS — the reward-to-merch loop (pure data + unlock logic)
   ----------------------------------------------------------------------------
   Each fidel chapter the child masters unlocks a new wearable T-shirt design
   featuring Anbessa in the child's own earned wardrobe plus their progress.
   Parents can save the print-ready design or order a real shirt (the store
   link is operator-configured via VITE_SHOP_URL) - a gentle, opt-in income
   stream that rides on the motivation the game already creates.

   This module is pure and seeded-free: the drawing lives in
   components/TeeCard.jsx, the screen in components/TeeShop.jsx. Unlock is a
   simple threshold on families-learned so it is trivially testable.
   ========================================================================== */

/** Ordered designs. `unlock` = families the child must have learned (of 33).
    The thresholds line up with the four journey chapters (8/16/24/33) plus a
    day-one starter, so a new shirt lands at every real milestone. */
export const TEE_DESIGNS = [
  { id: 'starter', name: 'Anbessa Starter', am: 'የአንበሳ ጀማሪ', unlock: 1, shirt: '#e0a856', ink: '#5b3a12', motif: 'ፊ' },
  { id: 'explorer', name: 'Fidel Explorer', am: 'የፊደል አሳሽ', unlock: 8, shirt: '#0f8f8a', ink: '#053b39', motif: 'ሀለመ' },
  { id: 'hero', name: 'Alphabet Hero', am: 'የፊደል ጀግና', unlock: 16, shirt: '#1f74d0', ink: '#0b2f52', motif: 'ሠቀበ' },
  { id: 'master', name: 'Fidel Master', am: 'የፊደል ሊቅ', unlock: 24, shirt: '#6d45c9', ink: '#2a1a55', motif: 'ተነከ' },
  { id: 'champion', name: '231 Champion', am: 'የ231 ሻምፒዮን', unlock: 33, shirt: '#c23a86', ink: '#4d1130', motif: 'ፊደል' },
]

export const TEE_BY_ID = new Map(TEE_DESIGNS.map((d) => [d.id, d]))

/** A design is unlocked once the child has learned `unlock` families. */
export const teeUnlocked = (design, families) => families >= design.unlock

/** The designs the child has earned so far, in order. */
export function unlockedTees(families) {
  return TEE_DESIGNS.filter((d) => teeUnlocked(d, families))
}

/** How many more families to reach the next locked design (null if all owned). */
export function nextTeeAt(families) {
  const next = TEE_DESIGNS.find((d) => !teeUnlocked(d, families))
  return next ? next.unlock : null
}

/* ── "new design" badge tracking (which unlocked tees the child has seen) ── */

const TEE_KEY = 'fq.tees.v1'

export function loadSeenTees() {
  try {
    return new Set(JSON.parse(localStorage.getItem(TEE_KEY)) || [])
  } catch {
    return new Set()
  }
}

export function markTeesSeen(ids) {
  try {
    const seen = loadSeenTees()
    for (const id of ids) seen.add(id)
    localStorage.setItem(TEE_KEY, JSON.stringify([...seen]))
  } catch {
    /* session-only */
  }
}

/** Count of unlocked designs the child has not opened yet (for the badge). */
export function newTeeCount(families) {
  const seen = loadSeenTees()
  return unlockedTees(families).filter((d) => !seen.has(d.id)).length
}
