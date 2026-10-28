/* App unlock codes: EGZ + 4 payload chars + 1 checksum char.
   A code bought with the phone app (or minted by hand for support) unlocks
   the website trial on a browser. It does not sell or unlock anything inside
   the paid iOS/Android app — that app is already the whole product.

   Deliberately pure and dependency-free so node scripts/gen-app-codes.mjs
   can mint with the same function the app checks. Honesty note: validation
   is an offline checksum. There is no server. The alphabet skips 0/O/1/I/L
   so a code read off a phone is hard to mistype. */

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
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

/** payload4 is four alphabet characters. Returns null when they are not. */
export function mintAppCode(payload4) {
  const body = normalizeCode(payload4).slice(0, 4)
  if (body.length !== 4 || [...body].some((c) => !CODE_ALPHABET.includes(c))) return null
  let sum = 0
  for (let i = 0; i < 4; i++) sum = (sum + CODE_ALPHABET.indexOf(body[i]) * (i + 3)) % CODE_ALPHABET.length
  return APP_CODE_PREFIX + body + CODE_ALPHABET[sum]
}

/** Four alphabet characters derived from a stable install id. Same id
    always yields the same payload, so the phone can show one code forever. */
export function payloadFromInstall(id) {
  let h = 2166136261
  const str = String(id || '')
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let x = h >>> 0
  let body = ''
  for (let i = 0; i < 4; i++) {
    body += CODE_ALPHABET[x % CODE_ALPHABET.length]
    x = (Math.imul(x, 1664525) + 1013904223 + i) >>> 0
  }
  return body
}

/** The code this install should display. Deterministic. */
export function codeForInstall(id) {
  return mintAppCode(payloadFromInstall(id))
}
