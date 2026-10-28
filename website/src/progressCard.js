/* Progress Card DECODER - ported verbatim from the app's
   src/platform/progressCard.js + src/utils/challenge.js. The app's vitest
   suite imports THIS file and cross-checks it against the app encoder, so
   the two cannot drift. Tokens are untrusted input: validate everything,
   return null on anything off. */

export const TOTAL_LETTERS = 231
/* Amharic cards carry a 33-family mask; Tigrinya cards 34 (qhe/ቐ right after
   qe). Both are valid - rejecting 34 made every Tigrinya link unreadable. */
export const CARD_FAMILY_COUNTS = [33, 34]
export const QHE_AFTER = 8 // index of 'Qe' in the 33 shared families
export const QHE_CHARS = 'ቐቑቒቓቔቕቖ'
/* App-level tracker: 30 areas in 4 groups (learn, games, read, explore).
   The app's vitest suite asserts these equal the app's own constants. */
export const APP_AREA_COUNT = 30
export const APP_GROUP_SIZES = [9, 13, 2, 6]
const MAX_PRAYER_MIN = 7 * 24 * 60
const clampInt = (x, max) => Math.max(0, Math.min(max, Math.round(Number(x) || 0)))

function b64urlDecode(s) {
  let t = String(s).replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  const bin = atob(t)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function sanitizeName(raw) {
  return String(raw == null ? '' : raw)
    .replace(/[\u0000-\u001f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

export function decodeProgressCard(token) {
  try {
    const p = JSON.parse(b64urlDecode(token))
    if (!p || p.v !== 1) return null
    if (typeof p.m !== 'string' || !/^[01]+$/.test(p.m) || !CARD_FAMILY_COUNTS.includes(p.m.length)) return null
    if (typeof p.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.d)) return null
    const L = Math.round(Number(p.L))
    if (!Number.isFinite(L) || L < 0 || L > p.m.length * 7) return null
    const apps = typeof p.a === 'string' && /^[01]+$/.test(p.a) && p.a.length === APP_AREA_COUNT ? p.a : null
    const r = apps && Array.isArray(p.r) ? p.r : []
    return {
      name: sanitizeName(p.n || ''),
      day: p.d,
      streak: Math.max(0, Math.min(9999, Math.round(Number(p.s) || 0))),
      letters: L,
      mask: p.m,
      nodesDone: Math.max(0, Math.round(Number(p.c) || 0)),
      nodesTotal: Math.max(1, Math.round(Number(p.T) || 1)),
      apps,
      prayerMin: clampInt(r[0], MAX_PRAYER_MIN),
      prayerPages: clampInt(r[1], 99999),
    }
  } catch {
    return null
  }
}
