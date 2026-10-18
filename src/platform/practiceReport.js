/* ============================================================================
   PRACTICE REPORT — tamper-evident share link (#report=)
   ----------------------------------------------------------------------------
   The parent's Share button turns the last 7 days into a link (and QR):
     #report=<payload>.<sig>
   payload = b64url JSON {v:1, n: name, c: classCode|'', g: goalMin|0,
             at: day made, d: [[day, min, sessions, items, answered, correct,
             lessons, games, flags, prayerMin], ...]} (prayerMin optional:
             older links decode it as 0)
   sig     = HMAC-SHA256(REPORT_KEY, payload), first 12 bytes, b64url.
   The teacher's device recomputes the HMAC: any edit to a number, name or
   day breaks it and the viewer says so. The human check code (first 8 sig
   chars) lets a teacher compare a screenshot with a link by eye.

   Honest limit (also in docs/practice-tracking.md): the key ships inside the
   app, so this stops casual edits of a forwarded link, not a determined
   adult who extracts the key. The class-view sync is the strong path -
   those rows are written with a per-student server token and are what the
   teacher dashboard shows.
   ========================================================================== */
import { b64urlEncode, b64urlDecode, sanitizeName } from '../utils/challenge'
import { sanitizeClassCode } from './classroom'
import { lastDays, activeMinutes, prayerMinutes, flagCount, clampGoal } from './practice'
import { linkBase } from '../utils/linkBase'

const REPORT_KEY = 'egeez-practice-report-v1:7f3a9c1e5b2d'
const SIG_BYTES = 12

const b64urlBytes = (bytes) => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(text) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(REPORT_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(text)))
  return b64urlBytes(sig.slice(0, SIG_BYTES))
}

const n0 = (x) => Math.max(0, Math.min(100000, Math.round(Number(x) || 0)))
const validDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)

export function reportPayload({ name, code = '', goal = null, days, today }) {
  return {
    v: 1, n: sanitizeName(name) || '?', c: sanitizeClassCode(code), g: clampGoal(goal) || 0, at: today,
    d: lastDays(days, today, 7).map((r) => [r.day, activeMinutes(r), r.sessions, r.items, r.answered, r.correct, r.lessons, r.games, flagCount(r), prayerMinutes(r)]),
  }
}

/** Resolves the token "<payload>.<sig>". */
export async function signReport(payload) {
  const body = b64urlEncode(JSON.stringify(payload))
  return `${body}.${await hmac(body)}`
}

export const checkCode = (token) => {
  const sig = String(token).split('.')[1] || ''
  return sig.slice(0, 8).toUpperCase().replace(/(.{4})/, '$1-')
}

export async function reportUrl(payload, origin) {
  return `${linkBase(origin)}/#report=${await signReport(payload)}`
}

/** Decode + verify. Resolves {report, verified} or null when unreadable. */
export async function verifyReport(token) {
  try {
    const [body, sig] = String(token).split('.')
    if (!body || !sig) return null
    const p = JSON.parse(b64urlDecode(body))
    if (!p || p.v !== 1 || !Array.isArray(p.d)) return null
    const report = {
      name: sanitizeName(p.n) || '?', code: sanitizeClassCode(p.c), goal: clampGoal(p.g), at: validDay(p.at) ? p.at : '',
      days: p.d.filter((r) => Array.isArray(r) && validDay(r[0])).slice(0, 7).map((r) => ({
        day: r[0], minutes: n0(r[1]), sessions: n0(r[2]), items: n0(r[3]), answered: n0(r[4]), correct: n0(r[5]), lessons: n0(r[6]), games: n0(r[7]), flags: n0(r[8]), prayer: n0(r[9]),
      })),
    }
    const verified = (await hmac(body)) === sig
    return { report, verified, check: checkCode(token) }
  } catch {
    return null
  }
}

export function readReportFromHash(hash) {
  const m = /[#&]report=([^&]+)/.exec(hash || '')
  if (!m) return null
  try { return decodeURIComponent(m[1]) } catch { return m[1] }
}
