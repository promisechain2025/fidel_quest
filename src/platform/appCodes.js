/* App unlock codes: EGZ + 4 payload chars + 1 checksum char - the same
   scheme and alphabet as the Family Pack's FAM codes (familyPack.js), with
   a different prefix so the two products can never be confused. Sold on the
   website (Stripe) and redeemable on EVERY platform, so nobody who bought
   the app once - web or store - ever pays twice.

   Deliberately pure and dependency-free: node scripts (scripts/
   gen-app-codes.mjs) and the api server import it directly. Keep in sync
   with api/familyCode.js (the API's copy is tripwire-tested against this
   file). Honesty note: validation is an offline checksum, honor-system by
   design - there is no server check. */

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
export const APP_CODE_PREFIX = 'EGZ'

export const normalizeCode = (raw) =>
  String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

export function isValidAppCode(raw) {
  const code = normalizeCode(raw)
  if (!code.startsWith(APP_CODE_PREFIX) || code.length !== APP_CODE_PREFIX.length + 5) return false
  const body = code.slice(APP_CODE_PREFIX.length)
  let sum = 0
  for (let i = 0; i < 4; i++) {
    const v = CODE_ALPHABET.indexOf(body[i])
    if (v < 0) return false
    sum = (sum + v * (i + 3)) % CODE_ALPHABET.length
  }
  return CODE_ALPHABET[sum] === body[4]
}

export function mintAppCode(payload4) {
  const body = normalizeCode(payload4).slice(0, 4)
  if (body.length !== 4 || [...body].some((c) => !CODE_ALPHABET.includes(c))) return null
  let sum = 0
  for (let i = 0; i < 4; i++) sum = (sum + CODE_ALPHABET.indexOf(body[i]) * (i + 3)) % CODE_ALPHABET.length
  return APP_CODE_PREFIX + body + CODE_ALPHABET[sum]
}
