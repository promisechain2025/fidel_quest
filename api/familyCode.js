/* FAM unlock codes - server-side mint, byte-for-byte the app's algorithm
   (src/platform/familyPack.js). The anti-drift tripwire lives in
   __tests__/pay.test.js, which validates api-minted codes with the APP's own
   isValidFamilyCode.

   Honesty note: the mint/verify algorithm ships inside the app's client
   bundle and the app validates codes offline against the checksum only.
   A code is honor-system UX (a nice receipt for a $4.99 purchase), not a
   security boundary - do not build anything that assumes otherwise.        */
import { randomInt } from 'node:crypto'

export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
export const CODE_PREFIX = 'FAM'

export const normalizeFamilyCode = (raw) =>
  String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

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

export function mintFamilyCode(payload4) {
  const body = normalizeFamilyCode(payload4).slice(0, 4)
  if (body.length !== 4 || [...body].some((c) => !ALPHABET.includes(c))) return null
  let sum = 0
  for (let i = 0; i < 4; i++) sum = (sum + ALPHABET.indexOf(body[i]) * (i + 3)) % ALPHABET.length
  return CODE_PREFIX + body + ALPHABET[sum]
}

/** Mint from a random payload (same RNG as scripts/gen-family-codes.mjs).
    `rng` is injectable for tests (collision-retry coverage). */
export function mintRandomFamilyCode(rng = randomInt) {
  let body = ''
  for (let i = 0; i < 4; i++) body += ALPHABET[rng(ALPHABET.length)]
  return mintFamilyCode(body)
}
