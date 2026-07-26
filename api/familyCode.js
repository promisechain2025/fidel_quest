/* Unlock codes - server-side mint, byte-for-byte the app's algorithms:
   FAM (Family Pack, src/platform/familyPack.js) and EGZ (the app itself,
   src/platform/appCodes.js). The anti-drift tripwire lives in
   __tests__/pay.test.js, which validates api-minted codes with the APP's
   own validators.

   Honesty note: the mint/verify algorithm ships inside the app's client
   bundle and the app validates codes offline against the checksum only.
   A code is honor-system UX (a receipt for a small one-time purchase),
   not a security boundary - do not build anything that assumes otherwise. */
import { randomInt } from 'node:crypto'

export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
export const CODE_PREFIX = 'FAM'
export const APP_CODE_PREFIX = 'EGZ'

export const normalizeFamilyCode = (raw) =>
  String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

function isValidWithPrefix(raw, prefix) {
  const code = normalizeFamilyCode(raw)
  if (!code.startsWith(prefix) || code.length !== prefix.length + 5) return false
  const body = code.slice(prefix.length)
  let sum = 0
  for (let i = 0; i < 4; i++) {
    const v = ALPHABET.indexOf(body[i])
    if (v < 0) return false
    sum = (sum + v * (i + 3)) % ALPHABET.length
  }
  return ALPHABET[sum] === body[4]
}

function mintWithPrefix(payload4, prefix) {
  const body = normalizeFamilyCode(payload4).slice(0, 4)
  if (body.length !== 4 || [...body].some((c) => !ALPHABET.includes(c))) return null
  let sum = 0
  for (let i = 0; i < 4; i++) sum = (sum + ALPHABET.indexOf(body[i]) * (i + 3)) % ALPHABET.length
  return prefix + body + ALPHABET[sum]
}

export const isValidFamilyCode = (raw) => isValidWithPrefix(raw, CODE_PREFIX)
export const mintFamilyCode = (p) => mintWithPrefix(p, CODE_PREFIX)
export const isValidAppCode = (raw) => isValidWithPrefix(raw, APP_CODE_PREFIX)
export const mintAppCode = (p) => mintWithPrefix(p, APP_CODE_PREFIX)

/** Mint from a random payload (same RNG as the app's scripts). `rng` is
    injectable for tests (collision-retry coverage). */
export function mintRandomCode(prefix = CODE_PREFIX, rng = randomInt) {
  let body = ''
  for (let i = 0; i < 4; i++) body += ALPHABET[rng(ALPHABET.length)]
  return mintWithPrefix(body, prefix)
}
export const mintRandomFamilyCode = (rng = randomInt) => mintRandomCode(CODE_PREFIX, rng)
