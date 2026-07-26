/* Progress Card DECODER - ported verbatim from the app's
   src/platform/progressCard.js + src/utils/challenge.js. The app's vitest
   suite imports THIS file and cross-checks it against the app encoder, so
   the two cannot drift. Tokens are untrusted input: validate everything,
   return null on anything off. */

export const TOTAL_LETTERS = 231
const FAMILY_COUNT = 33

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
    if (typeof p.m !== 'string' || !/^[01]+$/.test(p.m) || p.m.length !== FAMILY_COUNT) return null
    if (typeof p.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.d)) return null
    const L = Math.round(Number(p.L))
    if (!Number.isFinite(L) || L < 0 || L > TOTAL_LETTERS) return null
    return {
      name: sanitizeName(p.n || ''),
      day: p.d,
      streak: Math.max(0, Math.min(9999, Math.round(Number(p.s) || 0))),
      letters: L,
      mask: p.m,
      nodesDone: Math.max(0, Math.round(Number(p.c) || 0)),
      nodesTotal: Math.max(1, Math.round(Number(p.T) || 1)),
    }
  } catch {
    return null
  }
}
