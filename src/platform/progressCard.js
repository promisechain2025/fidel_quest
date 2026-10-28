/* ============================================================================
   PROGRESS CARD — a shareable, reviewable snapshot of a child's progress
   ----------------------------------------------------------------------------
   The parent taps "Share progress report" in the Grown-ups corner and gets a
   link they can send to the other parent, a grandparent, or the teacher.
   Everything travels INSIDE the URL fragment (never sent to any server -
   same contract as classroom.js): the eGeez website's /progress page decodes
   it locally and renders the report. Sharing is always the parent's explicit
   choice; the payload contains only what the report shows.

   Token: versioned (v:1) b64url JSON, decoded as UNTRUSTED input everywhere
   (the website carries a ported decoder; the vitest suite cross-checks the
   two so they cannot drift).
     { v:1, n?: child first name, d: 'YYYY-MM-DD', s: streak days,
       L: letters learned (0..231), m: 33- (Amharic) or 34-char (Tigrinya, +ቐ after
       qe) '01' mask of learned families in FIDEL_FAMILIES order, c: journey nodes done,
       T: total journey nodes,
       a?: 30-char '01' mask of the app areas tried (AREA_IDS order),
       r?: [prayer minutes in the last 7 days, prayer pages turned] }
   `a` and `r` are optional: older links still decode, and a malformed
   `a`/`r` is dropped (never fails the whole card). Only counts travel -
   no per-answer data, no timestamps beyond the card day.
   ========================================================================== */
import { b64urlEncode, b64urlDecode, sanitizeName } from '../utils/challenge'
import { dayStamp, currentStreak } from './streak'
import { FIDEL_FAMILIES } from './ethiopic'
import { JOURNEY, NodeKind, loadJourney, isDone } from '../journey'
import { activeProfile } from './profiles'
import { AREA_IDS, AREA_GROUPS, loadAppProgress, summarize } from './appProgress'

const FAMILY_COUNT = FIDEL_FAMILIES.length // 33
export const TOTAL_LETTERS = FAMILY_COUNT * 7 // 231 (Amharic pack)
/* The Tigrinya pack adds one family (qhe/ቐ, right after qe), so a Tigrinya
   child's mask is 34 long and 238 letters is a full house. A card may carry
   either; the website must decode both (it did not: every Tigrinya card was
   rejected as "No report in this link"). */
export const CARD_FAMILY_COUNTS = Object.freeze([33, 34])
export const MAX_CARD_LETTERS = 34 * 7 // 238
export const APP_AREA_COUNT = AREA_IDS.length // 30
export const APP_GROUP_SIZES = AREA_GROUPS.map((g) => g.areas.length) // [9,13,2,6]
const MAX_PRAYER_MIN = 7 * 24 * 60
const clampInt = (x, max) => Math.max(0, Math.min(max, Math.round(Number(x) || 0)))

/** Snapshot of the active child's real progress (reads local stores). */
export function buildProgressSnapshot(p = loadJourney(), today = dayStamp()) {
  const learnNodes = JOURNEY.filter((n) => n.kind === NodeKind.LEARN)
  const doneFamilies = new Set(
    learnNodes.filter((n) => isDone(p, n.id)).map((n) => n.familyId),
  )
  const mask = FIDEL_FAMILIES.map((f) => (doneFamilies.has(f.id) ? '1' : '0')).join('')
  const profile = activeProfile()
  const app = summarize(loadAppProgress(), today)
  return {
    name: (profile?.name || '').trim(),
    day: today,
    streak: currentStreak(),
    letters: doneFamilies.size * 7,
    mask,
    nodesDone: JOURNEY.filter((n) => isDone(p, n.id)).length,
    nodesTotal: JOURNEY.length,
    apps: app.mask,
    prayerMin: app.prayer.minutes,
    prayerPages: app.prayer.pages,
  }
}

export function encodeProgressCard(s) {
  if (!s || typeof s.mask !== 'string' || !CARD_FAMILY_COUNTS.includes(s.mask.length) || !/^[01]+$/.test(s.mask)) return null
  const hasApps = typeof s.apps === 'string' && s.apps.length === APP_AREA_COUNT && /^[01]+$/.test(s.apps)
  return b64urlEncode(JSON.stringify({
    v: 1,
    n: sanitizeName(s.name || '').slice(0, 24),
    d: s.day,
    s: Math.max(0, Math.min(9999, Math.round(Number(s.streak) || 0))),
    L: Math.max(0, Math.min(s.mask.length * 7, Math.round(Number(s.letters) || 0))),
    m: s.mask,
    c: Math.max(0, Math.round(Number(s.nodesDone) || 0)),
    T: Math.max(1, Math.round(Number(s.nodesTotal) || 1)),
    ...(hasApps ? { a: s.apps, r: [clampInt(s.prayerMin, MAX_PRAYER_MIN), clampInt(s.prayerPages, 99999)] } : {}),
  }))
}

/** Untrusted-input decoder; the website ports this logic verbatim. */
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

/** Where the report lives: the marketing site's /progress page. */
export function progressCardUrl(snapshot = buildProgressSnapshot(), site = import.meta.env?.VITE_SITE_URL || 'https://easygeez.com') {
  const token = encodeProgressCard(snapshot)
  if (!token) return null
  const root = String(site).replace(/[#?].*$/, '').replace(/\/+$/, '')
  return `${root}/progress#p=${token}`
}
