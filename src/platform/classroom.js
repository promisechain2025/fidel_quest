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
import { buildReviewQueue, addDays } from './coach'

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

/** Orders: a subset of the seven vocal orders; [1] = base letters only. */
const cleanOrders = (raw) => {
  const o = [...new Set((Array.isArray(raw) ? raw : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort()
  return o.length ? o : [1]
}

/**
 * {v:1, c: classCode, t: teacher, f: [familyIds], n: count, due, s: seed,
 *  o: [orders]} - every field re-validated on decode; family ids and orders
 * are clamped to the real abugida so a doctored link cannot smuggle
 * arbitrary keys into the quiz.
 */
export function encodeAssignment({ code, teacher, familyIds, count, due, seed, orders }) {
  const c = sanitizeClassCode(code)
  const t = sanitizeName(teacher)
  const f = [...new Set((familyIds || []).filter((id) => FAMILY_IDS.has(id)))]
  const n = Math.max(ASSIGN_MIN, Math.min(ASSIGN_MAX, Math.round(Number(count) || 0)))
  const s = Math.abs(Math.round(Number(seed) || 0)) % 1000000 || 1
  const o = cleanOrders(orders)
  if (!validClassCode(c) || !t || !f.length || !validDay(due)) return null
  return b64urlEncode(JSON.stringify({ v: 1, c, t, f, n, due, s, o }))
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
    return { code, teacher, familyIds, count, due: p.due, seed, orders: cleanOrders(p.o) }
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
 * answers the same questions. One buildReviewQueue batch asks each sound at
 * most once, so a small week (two families) would starve the count - cycle
 * deterministic batches (fresh seed each, so distractors and order differ)
 * until the assignment is full.
 */
export function buildAssignmentQueue(assignment) {
  const want = assignment.count
  const orders = assignment.orders || [1]
  const queue = []
  for (let k = 0; queue.length < want && k < 10; k++) {
    const batch = buildReviewQueue(assignment.seed + k * 131, assignment.familyIds, [], want - queue.length, orders)
    if (!batch.length) break
    queue.push(...batch)
  }
  return queue
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

/** Missed letters ride in the receipt as family ids (what the teacher can
   act on), capped so the link stays small. */
const cleanMissed = (raw) =>
  [...new Set((Array.isArray(raw) ? raw : []).filter((id) => FAMILY_IDS.has(id)))].slice(0, 12)

/** {v:1, c, b: student name, s: score, q: total, d: day, a: assignment seed,
    m: [missed familyIds]} */
export function encodeReceipt({ code, student, score, total, day, assignmentSeed, missed }) {
  const c = sanitizeClassCode(code)
  const b = sanitizeName(student)
  const q = Math.max(1, Math.min(ASSIGN_MAX, Math.round(Number(total) || 0)))
  const s = Math.max(0, Math.min(q, Math.round(Number(score) || 0)))
  const a = Math.abs(Math.round(Number(assignmentSeed) || 0)) % 1000000
  if (!validClassCode(c) || !b || !validDay(day)) return null
  return b64urlEncode(JSON.stringify({ v: 1, c, b, s, q, d: day, a, m: cleanMissed(missed) }))
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
    return { code, student, score, total, day: p.d, assignmentSeed, missed: cleanMissed(p.m) }
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

/* ── the teacher's memory: created assignments (fq.teacher.v1) ── */

/**
 * Remember an assignment this device created, so the SAME link (same seed,
 * so results stay comparable) can be re-shared to a latecomer and the
 * roster can group results per assignment. Keyed by (code, seed).
 */
export function saveAssignment(assignment) {
  if (!assignment) return null
  const t = loadTeacher()
  const list = (t.assignments || []).filter((a) => !(a.code === assignment.code && a.seed === assignment.seed))
  return writeJson(TEACHER_KEY, { ...t, assignments: [...list, assignment] })
}

/** This class's created assignments, newest first. */
export function assignmentsFor(code) {
  const c = sanitizeClassCode(code)
  return (loadTeacher().assignments || [])
    .filter((a) => a.code === c)
    .sort((a, b) => (a.due < b.due ? 1 : a.due > b.due ? -1 : b.seed - a.seed))
}

/**
 * Turn-in status for one assignment: who submitted (best receipt each) and,
 * judged against every student this class has EVER seen, who is missing.
 */
export function submissionStats(code, seed) {
  const c = sanitizeClassCode(code)
  const receipts = (loadTeacher().receipts || []).filter((r) => r.code === c)
  const submitted = receipts.filter((r) => r.assignmentSeed === seed)
  const known = [...new Set(receipts.map((r) => r.student))].sort()
  const names = new Set(submitted.map((r) => r.student))
  return {
    submitted: [...submitted].sort((a, b) => (a.student < b.student ? -1 : 1)),
    known,
    missing: known.filter((n) => !names.has(n)),
  }
}

/**
 * The class's trouble letters: missed family ids aggregated across all
 * receipts, worst first - "half the class confuses these". Pure over the
 * stored receipts. [{familyId, count, students}]
 */
export function classTroubleLetters(code, limit = 6) {
  const c = sanitizeClassCode(code)
  const byFamily = new Map()
  for (const r of loadTeacher().receipts || []) {
    if (r.code !== c) continue
    for (const id of r.missed || []) {
      const e = byFamily.get(id) || { familyId: id, count: 0, students: new Set() }
      e.count += 1
      e.students.add(r.student)
      byFamily.set(id, e)
    }
  }
  return [...byFamily.values()]
    .map((e) => ({ familyId: e.familyId, count: e.count, students: [...e.students].sort() }))
    .sort((a, b) => b.count - a.count || (a.familyId < b.familyId ? -1 : 1))
    .slice(0, limit)
}

/* ── the Term Plan: the class syllabus (fq.teacher.v1) ── */

/**
 * The organizing spine of Teacher Mode: the teacher picks a pace once and
 * the whole term lays itself out as weeks of letter families - each week
 * owns its TV lesson, its homework link, and its turn-ins. The week list is
 * derived, never stored; only {perWeek, startDay} persists per class.
 */
// The teacher chooses the pace freely (1-10 families a week) - presets are
// suggestions, not limits. 10 covers even an intensive summer program.
export const TERM_PER_WEEK_MAX = 10
export function termWeeks(perWeek) {
  const per = Math.max(1, Math.min(TERM_PER_WEEK_MAX, Math.round(Number(perWeek) || 0)))
  const ids = FIDEL_FAMILIES.map((f) => f.id)
  const weeks = []
  for (let i = 0; i < ids.length; i += per) weeks.push(ids.slice(i, i + per))
  return weeks
}

export function saveTermPlan(code, perWeek, startDay = dayStamp()) {
  const c = sanitizeClassCode(code)
  const t = loadTeacher()
  if (!t.classes[c]) return null
  const per = Math.max(1, Math.min(TERM_PER_WEEK_MAX, Math.round(Number(perWeek) || 0)))
  const prev = t.classes[c].plan
  t.classes = { ...t.classes, [c]: { ...t.classes[c], plan: { perWeek: per, startDay } } }
  // A pace change redraws the week boundaries, so week-linked assignments no
  // longer describe the same letters: unlink them. They stay in the sent
  // list and keep tracking turn-ins - `week` is local bookkeeping only, the
  // links already shared with families remain valid.
  if (prev && prev.perWeek !== per) {
    t.assignments = (t.assignments || []).map((a) => (a.code === c && a.week != null ? { ...a, week: null } : a))
  }
  return writeJson(TEACHER_KEY, t)
}

/** 0-based index of the week containing `today`; clamped to the term. */
export function currentWeekIndex(plan, today = dayStamp(), weekCount = termWeeks(plan?.perWeek || 1).length) {
  if (!plan?.startDay) return 0
  const toUtc = (s) => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1) }
  const days = Math.floor((toUtc(today) - toUtc(plan.startDay)) / 86400000)
  return Math.max(0, Math.min(weekCount - 1, Math.floor(days / 7)))
}

/** The due date of week i (0-based): the day before the next week starts. */
export function weekDue(plan, i) {
  return addDays(plan.startDay, (i + 1) * 7 - 1)
}
