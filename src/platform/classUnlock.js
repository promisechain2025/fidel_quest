/* ============================================================================
   CLASS UNLOCK - a teacher's class code unlocks the full web app (/app)
   ----------------------------------------------------------------------------
   For Android families without the 1.3.1 website unlock code: the teacher
   generates a per-class code in Teacher Mode; students who open the class
   link (or a grown-up who types the code behind the gate) get full access on
   that browser until the code expires.

   Code:  EGC-<TAG>-<E1E2><G><S1S2S3S4>
     TAG    6 chars derived from the class code (classTag), so any class
            code works and the unlock alphabet stays typo-proof
     E1E2   expiry, in days since 2026-01-01, base-31 (covers ~2.6 years)
     G      generation (0..30): Rotate bumps it, so a leaked code can be
            replaced and, once class sync exists, older generations revoked
     S1..S4 HMAC-SHA256(key, "EGC|CLASS|E|G") -> 4 alphabet chars (~923k)

   Abuse limits (client-side, no server yet):
     - per class and teacher-generated (Teacher Mode, behind the gate/class key)
     - expires: 30/90/180 days max; access ends at expiry on every device
     - rotation: a new generation; the teacher shares the new code
     - revocation hook for class sync: applyClassUnlockPolicy({code, minGen})
       drops access granted by an older generation
   Honest limit (same as the EGZ app codes): the key ships in the app, so
   this deters casual sharing rather than a determined reverse-engineer.
   ========================================================================== */
import { CODE_ALPHABET } from './appCodes'

export const CLASS_UNLOCK_PREFIX = 'EGC'
export const UNLOCK_KEY = 'fq.classUnlock.v1'
export const DURATIONS = Object.freeze([30, 90, 180])
export const MAX_DAYS = 180
const EPOCH = Date.UTC(2026, 0, 1)
const DAY = 86400000
const KEY = 'egeez-class-unlock-v1:3b8e51c7a9d4'
const N = CODE_ALPHABET.length

const dayNum = (ms) => Math.floor((ms - EPOCH) / DAY)
const enc2 = (n) => CODE_ALPHABET[Math.floor(n / N) % N] + CODE_ALPHABET[n % N]
const dec2 = (s) => {
  const a = CODE_ALPHABET.indexOf(s[0]); const b = CODE_ALPHABET.indexOf(s[1])
  return a < 0 || b < 0 ? null : a * N + b
}
const cleanClass = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const validClass = (c) => /^[A-Z0-9]{6}$/.test(c) && [...c].every((ch) => CODE_ALPHABET.includes(ch))

/** Stable 6-char tag of a class code (FNV-1a -> unlock alphabet). */
export function classTag(classCode) {
  const str = cleanClass(classCode)
  if (str.length < 4) return null
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  let x = h >>> 0
  let out = ''
  for (let i = 0; i < 6; i++) { out += CODE_ALPHABET[x % N]; x = (Math.imul(x, 1664525) + 1013904223 + i) >>> 0 }
  return out
}

async function sig4(text) {
  const te = new TextEncoder()
  const k = await crypto.subtle.importKey('raw', te.encode(KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const b = new Uint8Array(await crypto.subtle.sign('HMAC', k, te.encode(text)))
  let x = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0
  let out = ''
  for (let i = 0; i < 4; i++) { out += CODE_ALPHABET[x % N]; x = Math.floor(x / N) }
  return out
}

/** Teacher side. Resolves the code string, or null. */
export async function mintClassUnlock({ classCode, days = 30, gen = 0, now = Date.now() }) {
  const c = classTag(classCode)
  const d = Math.max(1, Math.min(MAX_DAYS, Math.round(Number(days) || 30)))
  const g = Math.max(0, Math.round(Number(gen) || 0)) % N
  if (!c) return null
  const e = dayNum(now) + d
  if (e < 0 || e >= N * N) return null
  return `${CLASS_UNLOCK_PREFIX}-${c}-${enc2(e)}${CODE_ALPHABET[g]}${await sig4(`EGC|${c}|${e}|${g}`)}`
}

export const looksLikeClassUnlock = (raw) => /^EGC[-\s]?[A-Z0-9]{6}[-\s]?[A-Z0-9]{7}$/i.test(String(raw || '').trim())

/** Verify. Resolves {classCode, expiresAt, gen} or null (bad, forged, expired). */
export async function verifyClassUnlock(raw, now = Date.now()) {
  try {
    const s = String(raw || '').toUpperCase().replace(/\s+/g, '-').trim()
    const m = /^EGC-?([A-Z0-9]{6})-?([A-Z0-9]{7})$/.exec(s.replace(/-+/g, '-'))
    if (!m) return null
    const c = m[1]; const tail = m[2]
    const e = dec2(tail.slice(0, 2)); const g = CODE_ALPHABET.indexOf(tail[2])
    if (!validClass(c) || e == null || g < 0) return null
    if ((await sig4(`EGC|${c}|${e}|${g}`)) !== tail.slice(3)) return null
    const expiresAt = EPOCH + e * DAY + DAY // usable through the expiry day
    if (now >= expiresAt) return null
    if (expiresAt - now > (MAX_DAYS + 2) * DAY) return null // cannot be minted that long
    return { classTag: c, expiresAt, gen: g }
  } catch {
    return null
  }
}

export function loadClassUnlock() {
  try { const u = JSON.parse(localStorage.getItem(UNLOCK_KEY)); return u && u.classTag && u.expiresAt ? u : null } catch { return null }
}

/** Is a class unlock granting access right now? */
export function classUnlockActive(now = Date.now()) {
  const u = loadClassUnlock()
  return !!u && now < u.expiresAt && !u.revoked
}

/** Redeem (link or typed). Resolves true when stored. A newer generation or
    later expiry for the same class replaces the stored one. */
export async function redeemClassUnlock(raw, now = Date.now()) {
  const v = await verifyClassUnlock(raw, now)
  if (!v) return false
  const cur = loadClassUnlock()
  if (cur && cur.classTag === v.classTag && cur.gen > v.gen && now < cur.expiresAt) return true // keep the newer one
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify({ ...v, redeemedAt: now })) } catch { return false }
  return true
}

/** Class-sync hook (later): the server says which generations are valid. */
export function applyClassUnlockPolicy({ code, minGen = 0, revoked = false } = {}) {
  const u = loadClassUnlock()
  if (!u || u.classTag !== classTag(code)) return
  if (revoked || u.gen < minGen) {
    try { localStorage.setItem(UNLOCK_KEY, JSON.stringify({ ...u, revoked: true })) } catch { /* ignore */ }
  }
}
