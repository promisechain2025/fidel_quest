/* ============================================================================
   CLASSROOM — link + receipt teacher layer (no backend)
   ----------------------------------------------------------------------------
   Community and church teachers run classes without any server. Everything
   travels inside URL fragments (never sent to a host) and WhatsApp messages:

   1. CLASS LINK    #class=<token>   the teacher's invite. A student device
      that opens it stores {code, teacher} in fq.class.v1 and (via the
      caller) credits the community-partner code. Joining is a local fact.
   2. ASSIGNMENT    #assign=<token>  a seeded review quiz over chosen
      families. Deterministic: every student who opens the same link gets
      the same questions (buildReviewQueue), so results are comparable.
      The pending assignment lives in fq.assign.v1 until done.
   3. RECEIPT       #receipt=<token> the proof of completion the student
      sends BACK to the teacher (share sheet / WhatsApp). The teacher's
      device opens it and files it into the local roster fq.teacher.v1.

   All tokens are versioned (v:1) b64url JSON, decoded as UNTRUSTED input:
   every field is validated/clamped and malformed tokens return null, same
   contract as utils/challenge.js. The receipt shape is deliberately small
   and self-describing so it can later become an opt-in sync payload
   without redesign. Pure in inputs; wall clock only via default args.
   ========================================================================== */

import { b64urlEncode, b64urlDecode, sanitizeName } from '../utils/challenge'
import { dayStamp } from './streak'
import { FIDEL_FAMILIES } from './ethiopic'
import { buildReviewQueue } from './coach'

const CLASS_KEY = 'fq.class.v1'
const ASSIGN_KEY = 'fq.assign.v1'
const TEACHER_KEY = 'fq.teacher.v1'

export const ASSIGN_MIN = 3
export const ASSIGN_MAX = 20

const FAMILY_IDS = new Set(FIDEL_FAMILIES.map((f) => f.id))

/** Same origin normalization as challengeUrl. */
function rootOf(origin) {
  let root = String(origin || '')
  try {
    root = new URL(origin).origin
  } catch {
    root = root.replace(/[#?].*$/, '').replace(/\/+$/, '')
  }
  return root
}

/** Class codes are short human tokens: letters/digits, 4..12 chars. */
export function sanitizeClassCode(raw) {
  return String(raw || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12)
    .toUpperCase()
}
const validClassCode = (c) => typeof c === 'string' && /^[A-Z0-9]{4,12}$/.test(c)

const validDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* session-only */
  }
  return value
}

/* ── class membership (fq.class.v1) ── */

/** {v:1, c: classCode, t: teacherName} */
export function encodeClassInvite({ code, teacher }) {
  const c = sanitizeClassCode(code)
  const t = sanitizeName(teacher)
  if (!validClassCode(c) || !t) return null
  return b64urlEncode(JSON.stringify({ v: 1, c, t }))
}

export function decodeClassInvite(token) {
  try {
    const p = JSON.parse(b64urlDecode(token))
    if (!p || p.v !== 1) return null
    const code = sanitizeClassCode(p.c)
    const teacher = sanitizeName(p.t)
    if (!validClassCode(code) || !teacher) return null
    return { code, teacher }
  } catch {
    return null
  }
}

export function classUrl(invite, origin) {
  const token = encodeClassInvite(invite)
  return token ? `${rootOf(origin)}/#class=${token}` : null
}

export function loadClass() {
  const c = readJson(CLASS_KEY)
  return c && validClassCode(c.code) && typeof c.teacher === 'string' ? c : null
}

export function joinClass({ code, teacher }, today = dayStamp()) {
  const c = sanitizeClassCode(code)
  const t = sanitizeName(teacher)
  if (!validClassCode(c) || !t) return null
  return writeJson(CLASS_KEY, { code: c, teacher: t, joinedDay: today })
}

export function leaveClass() {
  try {
    localStorage.removeItem(CLASS_KEY)
  } catch {
    /* session-only */
  }
}

/* ── assignment links (#assign=) ── */

/**
 * {v:1, c: classCode, t: teacher, f: [familyIds], n: count, due, s: seed}
 * Every field re-validated on decode; family ids are clamped to the real
 * abugida so a doctored link cannot smuggle arbitrary keys into the quiz.
 */
export function encodeAssignment({ code, teacher, familyIds, count, due, seed }) {
  const c = sanitizeClassCode(code)
  const t = sanitizeName(teacher)
  const f = [...new Set((familyIds || []).filter((id) => FAMILY_IDS.has(id)))]
  const n = Math.max(ASSIGN_MIN, Math.min(ASSIGN_MAX, Math.round(Number(count) || 0)))
  const s = Math.abs(Math.round(Number(seed) || 0)) % 1000000 || 1
  if (!validClassCode(c) || !t || !f.length || !validDay(due)) return null
  return b64urlEncode(JSON.stringify({ v: 1, c, t, f, n, due, s }))
}

export function decodeAssignment(token) {
  try {
    const p = JSON.parse(b64urlDecode(token))
    if (!p || p.v !== 1) return null
    const code = sanitizeClassCode(p.c)
    const teacher = sanitizeName(p.t)
    const familyIds = Array.isArray(p.f) ? [...new Set(p.f.filter((id) => FAMILY_IDS.has(id)))] : []
    const count = Math.max(ASSIGN_MIN, Math.min(ASSIGN_MAX, Math.round(Number(p.n) || 0)))
    const seed = Math.abs(Math.round(Number(p.s) || 0)) % 1000000 || 1
    if (!validClassCode(code) || !teacher || !familyIds.length || !validDay(p.due)) return null
    return { code, teacher, familyIds, count, due: p.due, seed }
  } catch {
    return null
  }
}

export function assignmentUrl(assignment, origin) {
  const token = encodeAssignment(assignment)
  return token ? `${rootOf(origin)}/#assign=${token}` : null
}

/**
 * The quiz itself: deterministic in the assignment, so the whole class
 * answers the same questions. Count may exceed distinct sounds in the
 * chosen families; buildReviewQueue caps it safely.
 */
export function buildAssignmentQueue(assignment) {
  return buildReviewQueue(assignment.seed, assignment.familyIds, [], assignment.count)
}

/* ── pending assignment on the student device (fq.assign.v1) ── */

export function loadPendingAssignment() {
  const a = readJson(ASSIGN_KEY)
  if (!a || a.done) return null
  return validClassCode(a.code) && Array.isArray(a.familyIds) && a.familyIds.length ? a : null
}

export function storePendingAssignment(assignment, today = dayStamp()) {
  if (!assignment) return null
  return writeJson(ASSIGN_KEY, { ...assignment, openedDay: today, done: false })
}

export function markAssignmentDone() {
  const a = readJson(ASSIGN_KEY)
  if (a) writeJson(ASSIGN_KEY, { ...a, done: true })
}

/* ── receipts (#receipt=) ── */

/** {v:1, c, b: student name, s: score, q: total, d: day, a: assignment seed} */
export function encodeReceipt({ code, student, score, total, day, assignmentSeed }) {
  const c = sanitizeClassCode(code)
  const b = sanitizeName(student)
  const q = Math.max(1, Math.min(ASSIGN_MAX, Math.round(Number(total) || 0)))
  const s = Math.max(0, Math.min(q, Math.round(Number(score) || 0)))
  const a = Math.abs(Math.round(Number(assignmentSeed) || 0)) % 1000000
  if (!validClassCode(c) || !b || !validDay(day)) return null
  return b64urlEncode(JSON.stringify({ v: 1, c, b, s, q, d: day, a }))
}

export function decodeReceipt(token) {
  try {
    const p = JSON.parse(b64urlDecode(token))
    if (!p || p.v !== 1) return null
    const code = sanitizeClassCode(p.c)
    const student = sanitizeName(p.b)
    const total = Math.max(1, Math.min(ASSIGN_MAX, Math.round(Number(p.q) || 0)))
    const score = Math.max(0, Math.min(total, Math.round(Number(p.s) || 0)))
    const assignmentSeed = Math.abs(Math.round(Number(p.a) || 0)) % 1000000
    if (!validClassCode(code) || !student || !validDay(p.d)) return null
    return { code, student, score, total, day: p.d, assignmentSeed }
  } catch {
    return null
  }
}

export function receiptUrl(receipt, origin) {
  const token = encodeReceipt(receipt)
  return token ? `${rootOf(origin)}/#receipt=${token}` : null
}

/**
 * Pull whichever classroom token a location.hash carries, or null.
 * Returns {kind: 'class'|'assign'|'receipt', data} with data already
 * decoded and validated; a recognized key with a malformed token is null.
 */
export function readClassroomFromHash(hash) {
  if (!hash) return null
  const kinds = [
    ['class', decodeClassInvite],
    ['assign', decodeAssignment],
    ['receipt', decodeReceipt],
  ]
  for (const [kind, decode] of kinds) {
    const m = new RegExp(`[#&]${kind}=([^&]+)`).exec(hash)
    if (!m) continue
    let token = m[1]
    try { token = decodeURIComponent(token) } catch { /* already raw */ }
    const data = decode(token)
    return data ? { kind, data } : null
  }
  return null
}

/* ── teacher roster (fq.teacher.v1) ── */

/**
 * {classes: {CODE: {teacher, createdDay}}, receipts: [receipt]}
 * One device can run several classes (a teacher with two grades).
 */
export function loadTeacher() {
  const t = readJson(TEACHER_KEY)
  return t && typeof t === 'object' && t.classes ? t : { classes: {}, receipts: [] }
}

export function createClass(code, teacher, today = dayStamp()) {
  const c = sanitizeClassCode(code)
  const name = sanitizeName(teacher)
  if (!validClassCode(c) || !name) return null
  const t = loadTeacher()
  t.classes = { ...t.classes, [c]: t.classes[c] || { teacher: name, createdDay: today } }
  return writeJson(TEACHER_KEY, t)
}

export function removeClass(code) {
  const t = loadTeacher()
  const c = sanitizeClassCode(code)
  if (!t.classes[c]) return t
  const classes = { ...t.classes }
  delete classes[c]
  const receipts = (t.receipts || []).filter((r) => r.code !== c)
  return writeJson(TEACHER_KEY, { ...t, classes, receipts })
}

/**
 * File a receipt into the roster. Dedupe on (student, assignmentSeed, code):
 * re-opening the same WhatsApp link twice must not double-count, but a
 * better retake of the SAME assignment replaces the old score.
 */
export function addReceipt(receipt) {
  if (!receipt) return null
  const t = loadTeacher()
  if (!t.classes[receipt.code]) return null // not one of this device's classes
  const same = (r) => r.code === receipt.code && r.student === receipt.student && r.assignmentSeed === receipt.assignmentSeed
  const receipts = [...(t.receipts || []).filter((r) => !same(r)), receipt]
  return writeJson(TEACHER_KEY, { ...t, receipts })
}

/** Roster grouped by student for one class: [{student, receipts, best}] */
export function rosterByStudent(code) {
  const c = sanitizeClassCode(code)
  const byName = new Map()
  for (const r of loadTeacher().receipts || []) {
    if (r.code !== c) continue
    if (!byName.has(r.student)) byName.set(r.student, [])
    byName.get(r.student).push(r)
  }
  return [...byName.entries()]
    .map(([student, receipts]) => ({
      student,
      receipts: [...receipts].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)),
      best: Math.max(...receipts.map((r) => (r.total ? r.score / r.total : 0))),
    }))
    .sort((a, b) => (a.student < b.student ? -1 : 1))
}
