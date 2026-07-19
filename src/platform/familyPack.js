/* ============================================================================
   FAMILY PACK — the paid unlock for per-child profiles
   ----------------------------------------------------------------------------
   One purchase covers the whole household: profiles for up to MAX_PROFILES
   children on this device, instead of buying the app again for a sibling.
   Same philosophy as the app license (platform/license.js): no server, no
   account, honest enforcement.

   Unlock paths:
     - Web/PWA: open the payment link (VITE_FAMILY_PACK_URL, falling back to
       the app's buy link), then an honest "I paid" confirmation - identical
       trust model to the app's own trial.
     - Native (App Store / Play): NO purchase link and no price talk in-app
       (store rules forbid steering to external payment). The family redeems
       a code they received with a web purchase or from their community.
     - Code: offline-checkable FAM-XXXXX codes (mod-37 checksum, minted with
       scripts/gen-family-codes.mjs). Honor-level security, by design.

   fq.familypack.v1: { unlocked, method, day } - device-level, deliberately
   NOT a progress key: resetting a child must never revoke a purchase.
   ========================================================================== */

const KEY = 'fq.familypack.v1'

export const FAMILY_PACK_PRICE = (import.meta.env?.VITE_FAMILY_PACK_PRICE || '$4.99').trim()

export function familyPackUrl() {
  const env = import.meta.env?.VITE_FAMILY_PACK_URL
  if (typeof env === 'string' && env.trim()) return env.trim()
  return ''
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s && typeof s === 'object' ? s : {}
  } catch {
    return {}
  }
}

export function familyPackUnlocked() {
  return !!load().unlocked
}

export function unlockFamilyPack(method) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ unlocked: true, method: String(method || 'web'), day: new Date().toISOString().slice(0, 10) }))
  } catch {
    /* storage blocked */
  }
  return true
}

/* ── redeem codes ───────────────────────────────────────────────────── */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
export const CODE_PREFIX = 'FAM'

export const normalizeFamilyCode = (raw) =>
  String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/** FAM + 4 payload chars + 1 checksum char over the code alphabet. */
export function isValidFamilyCode(raw) {
  const code = normalizeFamilyCode(raw)
  if (!code.startsWith(CODE_PREFIX) || code.length !== CODE_PREFIX.length + 5) return false
  const body = code.slice(CODE_PREFIX.length)
  let sum = 0
  for (let i = 0; i < 4; i++) {
    const v = ALPHABET.indexOf(body[i])
    if (v < 0) return false
    sum = (sum + v * (i + 3)) % ALPHABET.length
  }
  return ALPHABET[sum] === body[4]
}

/** Redeem a code; unlocks on success. Returns true/false. */
export function redeemFamilyCode(raw) {
  if (!isValidFamilyCode(raw)) return false
  unlockFamilyPack('code')
  return true
}

/** Mint a code from 4 payload chars (used by scripts/gen-family-codes.mjs
    and the tests; exported so minting and checking can never drift). */
export function mintFamilyCode(payload4) {
  const body = normalizeFamilyCode(payload4).slice(0, 4)
  if (body.length !== 4 || [...body].some((c) => !ALPHABET.includes(c))) return null
  let sum = 0
  for (let i = 0; i < 4; i++) sum = (sum + ALPHABET.indexOf(body[i]) * (i + 3)) % ALPHABET.length
  return CODE_PREFIX + body + ALPHABET[sum]
}
