/* Phase-1 "challenge a friend" links (see docs/social-play.md).

   A whole challenge rides in the URL *fragment* (after #), so it never reaches
   any server: the level id + the exact seed that fixes the question set, plus
   the challenger's score. The recipient replays the same seeded round (our quiz
   is a pure function of level+seed) and compares locally. No accounts, no
   backend, and no personal data beyond an optional short nickname the parent
   chose to share.

   A link is untrusted input — anyone can hand-craft one — so decodeChallenge
   validates and clamps every field and returns null on anything malformed. */

const V = 1
const MAX_NAME = 16

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

/** Keep a shared nickname harmless: printable, single-line, length-capped.
   React escapes on render, so this is about sanity/length, not XSS. */
export function sanitizeName(raw) {
  return String(raw == null ? '' : raw)
    .replace(/[\u0000-\u001f<>]/g, " ") // control chars + angle brackets
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME)
}

/* UTF-8-safe base64url (nicknames may be Amharic). */
function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s) {
  let t = s.replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  const bin = atob(t)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Encode a challenge payload to a compact base64url token. */
export function encodeChallenge(p) {
  const safe = {
    v: V,
    l: String(p.levelId),
    s: Math.trunc(p.seed),
    a: clamp(Math.round(p.accuracy), 0, 100),
    k: clamp(Math.round(p.streak || 0), 0, 999),
    b: sanitizeName(p.by || ''),
  }
  return b64urlEncode(JSON.stringify(safe))
}

/** Decode + validate a token. Returns a normalized challenge or null. */
export function decodeChallenge(token) {
  try {
    const o = JSON.parse(b64urlDecode(token))
    if (!o || o.v !== V) return null
    if (typeof o.l !== 'string' || !/^[a-z0-9-]{1,20}$/.test(o.l)) return null
    const seed = Math.trunc(Number(o.s))
    if (!Number.isInteger(seed) || seed <= 0 || seed >= 2 ** 31) return null
    const accuracy = Number(o.a)
    if (!Number.isFinite(accuracy)) return null
    return {
      levelId: o.l,
      seed,
      accuracy: clamp(Math.round(accuracy), 0, 100),
      streak: clamp(Math.round(Number(o.k) || 0), 0, 999),
      by: sanitizeName(o.b || ''),
    }
  } catch {
    return null
  }
}

/** Build a shareable challenge URL from a payload + an origin (or full href). */
export function challengeUrl(payload, origin) {
  let root = String(origin || '')
  try {
    root = new URL(origin).origin
  } catch {
    root = root.replace(/[#?].*$/, '').replace(/\/+$/, '')
  }
  return `${root}/#challenge=${encodeChallenge(payload)}`
}

/** Pull a challenge out of a location.hash (or full URL), or null. */
export function readChallengeFromHash(hash) {
  if (!hash) return null
  const m = /[#&]challenge=([^&]+)/.exec(hash)
  if (!m) return null
  let token = m[1]
  try { token = decodeURIComponent(token) } catch { /* already raw */ }
  return decodeChallenge(token)
}

/** Compare the player's accuracy to the challenger's. */
export function challengeOutcome(mine, theirs) {
  if (mine > theirs) return 'win'
  if (mine < theirs) return 'lose'
  return 'tie'
}
