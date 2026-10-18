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
       L: letters learned (0..231), m: 33-char '01' mask of learned
       families in FIDEL_FAMILIES order, c: journey nodes done,
       T: total journey nodes }
   ========================================================================== */
import { b64urlEncode, b64urlDecode, sanitizeName } from '../utils/challenge'
import { dayStamp, currentStreak } from './streak'
import { FIDEL_FAMILIES } from './ethiopic'
import { JOURNEY, NodeKind, loadJourney, isDone } from '../journey'
import { activeProfile, profileLabel } from './profiles'

const FAMILY_COUNT = FIDEL_FAMILIES.length // 33
export const TOTAL_LETTERS = FAMILY_COUNT * 7 // 231

/** Snapshot of the active child's real progress (reads local stores). */
export function buildProgressSnapshot(p = loadJourney(), today = dayStamp()) {
  const learnNodes = JOURNEY.filter((n) => n.kind === NodeKind.LEARN)
  const doneFamilies = new Set(
    learnNodes.filter((n) => isDone(p, n.id)).map((n) => n.familyId),
  )
  const mask = FIDEL_FAMILIES.map((f) => (doneFamilies.has(f.id) ? '1' : '0')).join('')
  const profile = activeProfile()
  return {
    name: profile ? profileLabel(profile, '') : '',
    day: today,
    streak: currentStreak(),
    letters: doneFamilies.size * 7,
    mask,
    nodesDone: JOURNEY.filter((n) => isDone(p, n.id)).length,
    nodesTotal: JOURNEY.length,
  }
}

export function encodeProgressCard(s) {
  if (!s || typeof s.mask !== 'string' || s.mask.length !== FAMILY_COUNT) return null
  return b64urlEncode(JSON.stringify({
    v: 1,
    n: sanitizeName(s.name || '').slice(0, 24),
    d: s.day,
    s: Math.max(0, Math.min(9999, Math.round(Number(s.streak) || 0))),
    L: Math.max(0, Math.min(TOTAL_LETTERS, Math.round(Number(s.letters) || 0))),
    m: s.mask,
    c: Math.max(0, Math.round(Number(s.nodesDone) || 0)),
    T: Math.max(1, Math.round(Number(s.nodesTotal) || 1)),
  }))
}

/** Untrusted-input decoder; the website ports this logic verbatim. */
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

/** Where the report lives: the marketing site's /progress page. */
export function progressCardUrl(snapshot = buildProgressSnapshot(), site = import.meta.env?.VITE_SITE_URL || 'https://easygeez.com') {
  const token = encodeProgressCard(snapshot)
  if (!token) return null
  const root = String(site).replace(/[#?].*$/, '').replace(/\/+$/, '')
  return `${root}/progress#p=${token}`
}
