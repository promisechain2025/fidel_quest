import { describe, it, expect } from 'vitest'
import {
  sanitizeClassCode,
  encodeClassInvite, decodeClassInvite, classUrl, joinClass, loadClass, leaveClass,
  encodeAssignment, decodeAssignment, assignmentUrl, buildAssignmentQueue,
  loadPendingAssignment, storePendingAssignment, markAssignmentDone,
  encodeReceipt, decodeReceipt, receiptUrl, readClassroomFromHash,
  loadTeacher, createClass, removeClass, addReceipt, rosterByStudent,
  saveAssignment, assignmentsFor, submissionStats, classTroubleLetters,
  termWeeks, saveTermPlan, currentWeekIndex, weekDue,
  ASSIGN_MIN, ASSIGN_MAX,
} from './classroom'
import { INDEXES, FIDEL_FAMILIES } from './ethiopic'

const INVITE = { code: 'ABEBA1', teacher: 'Mekdes' }
const ASSIGN = { code: 'ABEBA1', teacher: 'Mekdes', familyIds: ['ha', 'le', 'me', 'se'], count: 5, due: '2026-07-20', seed: 42 }
const RECEIPT = { code: 'ABEBA1', student: 'Lulit', score: 4, total: 5, day: '2026-07-15', assignmentSeed: 42 }

describe('class invites', () => {
  it('round-trips through the token', () => {
    expect(decodeClassInvite(encodeClassInvite(INVITE))).toEqual({ code: 'ABEBA1', teacher: 'Mekdes' })
  })
  it('normalizes the code and sanitizes the teacher name', () => {
    const token = encodeClassInvite({ code: ' abe-ba 1! ', teacher: '<b>Mekdes</b> from Addis with a very long suffix' })
    const inv = decodeClassInvite(token)
    expect(inv.code).toBe('ABEBA1')
    expect(inv.teacher).not.toMatch(/[<>]/)
    expect(inv.teacher.length).toBeLessThanOrEqual(16)
  })
  it('rejects malformed input on both sides', () => {
    expect(encodeClassInvite({ code: 'AB', teacher: 'Mekdes' })).toBeNull() // too short
    expect(encodeClassInvite({ code: 'ABEBA1', teacher: '   ' })).toBeNull()
    expect(decodeClassInvite('not-a-token')).toBeNull()
    expect(decodeClassInvite(btoa(JSON.stringify({ v: 2, c: 'ABEBA1', t: 'X' })))).toBeNull()
  })
  it('joins and leaves on the student device', () => {
    expect(loadClass()).toBeNull()
    joinClass(INVITE, '2026-07-09')
    expect(loadClass()).toEqual({ code: 'ABEBA1', teacher: 'Mekdes', joinedDay: '2026-07-09' })
    leaveClass()
    expect(loadClass()).toBeNull()
  })
  it('sanitizeClassCode strips and uppercases', () => {
    expect(sanitizeClassCode(' st-mary 2026 extra! ')).toBe('STMARY2026EX')
  })
})

describe('assignments', () => {
  it('round-trips and clamps every field', () => {
    const a = decodeAssignment(encodeAssignment(ASSIGN))
    expect(a).toEqual({ code: 'ABEBA1', teacher: 'Mekdes', familyIds: ['ha', 'le', 'me', 'se'], count: 5, due: '2026-07-20', seed: 42, orders: [1] })
  })
  it('drops unknown family ids and rejects when none survive', () => {
    const a = decodeAssignment(encodeAssignment({ ...ASSIGN, familyIds: ['ha', 'bogus', 'ha'] }))
    expect(a.familyIds).toEqual(['ha'])
    expect(encodeAssignment({ ...ASSIGN, familyIds: ['bogus'] })).toBeNull()
  })
  it('clamps count into the allowed band', () => {
    expect(decodeAssignment(encodeAssignment({ ...ASSIGN, count: 1 })).count).toBe(ASSIGN_MIN)
    expect(decodeAssignment(encodeAssignment({ ...ASSIGN, count: 99 })).count).toBe(ASSIGN_MAX)
  })
  it('rejects a doctored token with smuggled family keys', () => {
    const raw = JSON.stringify({ v: 1, c: 'ABEBA1', t: 'M', f: ['../../etc'], n: 5, due: '2026-07-20', s: 1 })
    expect(decodeAssignment(btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))).toBeNull()
  })
  it('builds the same queue for every student (deterministic)', () => {
    const a = decodeAssignment(encodeAssignment(ASSIGN))
    const q1 = buildAssignmentQueue(a)
    const q2 = buildAssignmentQueue(a)
    expect(q1).toEqual(q2)
    expect(q1.length).toBeGreaterThan(0)
    for (const q of q1) {
      expect(q.options).toContain(q.target)
      const sounds = q.options.map((k) => INDEXES.byAudioKey.get(k).sound)
      expect(new Set(sounds).size).toBe(sounds.length)
    }
  })
  it('fills the full count even when the week has few families', () => {
    const a = decodeAssignment(encodeAssignment({ ...ASSIGN, familyIds: ['ha', 'le'], count: 8 }))
    const qs = buildAssignmentQueue(a)
    expect(qs.length).toBe(8) // 2 distinct sounds, cycled with fresh draws
    expect(new Set(qs.map((q) => q.target)).size).toBe(2)
    expect(buildAssignmentQueue(a)).toEqual(qs) // still deterministic
  })
  it('carries vocal orders, clamped to the real 1..7', () => {
    expect(decodeAssignment(encodeAssignment(ASSIGN)).orders).toEqual([1])
    const a = decodeAssignment(encodeAssignment({ ...ASSIGN, orders: [3, 1, 9, 'x', 3] }))
    expect(a.orders).toEqual([1, 3])
    const qs = buildAssignmentQueue(decodeAssignment(encodeAssignment({ ...ASSIGN, orders: [1, 2, 3, 4, 5, 6, 7], count: 10 })))
    expect(qs.length).toBe(10)
    expect(qs.some((q) => !q.target.endsWith('-1'))).toBe(true) // beyond the base form
    for (const q of qs) {
      const sounds = q.options.map((k) => INDEXES.byAudioKey.get(k).sound)
      expect(new Set(sounds).size).toBe(sounds.length)
    }
  })
  it('stores, surfaces, and retires the pending assignment', () => {
    expect(loadPendingAssignment()).toBeNull()
    storePendingAssignment(decodeAssignment(encodeAssignment(ASSIGN)), '2026-07-10')
    expect(loadPendingAssignment().code).toBe('ABEBA1')
    markAssignmentDone()
    expect(loadPendingAssignment()).toBeNull()
  })
})

describe('receipts + roster', () => {
  it('round-trips and clamps the score to the total', () => {
    expect(decodeReceipt(encodeReceipt(RECEIPT))).toEqual({ ...RECEIPT, missed: [] })
    expect(decodeReceipt(encodeReceipt({ ...RECEIPT, score: 9 })).score).toBe(5)
    expect(decodeReceipt('garbage')).toBeNull()
  })
  it('carries missed letters as validated family ids, capped', () => {
    const r = decodeReceipt(encodeReceipt({ ...RECEIPT, missed: ['se', 'bogus', 'se', 'ha'] }))
    expect(r.missed).toEqual(['se', 'ha'])
    const many = FIDEL_FAMILIES.map((f) => f.id)
    expect(decodeReceipt(encodeReceipt({ ...RECEIPT, missed: many })).missed.length).toBe(12)
  })
  it('files receipts only for classes this device owns, deduped by retake', () => {
    expect(addReceipt(RECEIPT)).toBeNull() // no class yet
    createClass('ABEBA1', 'Mekdes', '2026-07-01')
    addReceipt(RECEIPT)
    addReceipt(RECEIPT) // same link opened twice
    expect(loadTeacher().receipts.length).toBe(1)
    addReceipt({ ...RECEIPT, score: 5 }) // retake of the same assignment
    expect(loadTeacher().receipts.length).toBe(1)
    expect(loadTeacher().receipts[0].score).toBe(5)
    addReceipt({ ...RECEIPT, assignmentSeed: 7 }) // a different assignment
    expect(loadTeacher().receipts.length).toBe(2)
  })
  it('groups the roster by student with best score', () => {
    createClass('ABEBA1', 'Mekdes')
    addReceipt(RECEIPT)
    addReceipt({ ...RECEIPT, student: 'Biruk', score: 2 })
    addReceipt({ ...RECEIPT, student: 'Biruk', assignmentSeed: 7, score: 5 })
    const roster = rosterByStudent('ABEBA1')
    expect(roster.map((r) => r.student)).toEqual(['Biruk', 'Lulit'])
    expect(roster[0].receipts.length).toBe(2)
    expect(roster[0].best).toBe(1)
  })
  it('removeClass drops the class and its receipts', () => {
    createClass('ABEBA1', 'Mekdes')
    addReceipt(RECEIPT)
    removeClass('ABEBA1')
    expect(loadTeacher().classes.ABEBA1).toBeUndefined()
    expect(loadTeacher().receipts.length).toBe(0)
  })
})

describe('teacher memory: assignments, turn-ins, trouble, term plan', () => {
  const A1 = { code: 'ABEBA1', teacher: 'Mekdes', familyIds: ['ha', 'le'], count: 5, due: '2026-07-20', seed: 11, orders: [1] }
  const A2 = { ...A1, due: '2026-07-27', seed: 22 }
  it('remembers created assignments once per (code, seed), newest first', () => {
    createClass('ABEBA1', 'Mekdes')
    saveAssignment(A1)
    saveAssignment(A1) // re-save must not duplicate
    saveAssignment(A2)
    const list = assignmentsFor('ABEBA1')
    expect(list.length).toBe(2)
    expect(list[0].seed).toBe(22) // newest due first
  })
  it('reports who submitted and who is missing', () => {
    createClass('ABEBA1', 'Mekdes')
    saveAssignment(A1)
    addReceipt({ ...RECEIPT, assignmentSeed: 11, student: 'Lulit' })
    addReceipt({ ...RECEIPT, assignmentSeed: 99, student: 'Biruk' }) // other assignment
    const s = submissionStats('ABEBA1', 11)
    expect(s.submitted.map((r) => r.student)).toEqual(['Lulit'])
    expect(s.known).toEqual(['Biruk', 'Lulit'])
    expect(s.missing).toEqual(['Biruk'])
  })
  it('aggregates the class trouble letters worst-first', () => {
    createClass('ABEBA1', 'Mekdes')
    addReceipt({ ...RECEIPT, student: 'Lulit', assignmentSeed: 1, missed: ['se', 'ha'] })
    addReceipt({ ...RECEIPT, student: 'Biruk', assignmentSeed: 1, missed: ['se'] })
    addReceipt({ ...RECEIPT, student: 'Biruk', assignmentSeed: 2, missed: ['se'] })
    const t = classTroubleLetters('ABEBA1')
    expect(t[0]).toEqual({ familyId: 'se', count: 3, students: ['Biruk', 'Lulit'] })
    expect(t[1].familyId).toBe('ha')
  })
  it('lays the term out as weeks and tracks the current one', () => {
    expect(termWeeks(2).length).toBe(Math.ceil(FIDEL_FAMILIES.length / 2))
    expect(termWeeks(2)[0]).toEqual(FIDEL_FAMILIES.slice(0, 2).map((f) => f.id))
    createClass('ABEBA1', 'Mekdes')
    saveTermPlan('ABEBA1', 2, '2026-07-06')
    const plan = loadTeacher().classes.ABEBA1.plan
    expect(plan).toEqual({ perWeek: 2, startDay: '2026-07-06' })
    expect(currentWeekIndex(plan, '2026-07-06')).toBe(0)
    expect(currentWeekIndex(plan, '2026-07-14')).toBe(1)
    expect(currentWeekIndex(plan, '2030-01-01')).toBe(termWeeks(2).length - 1) // clamped
    expect(weekDue(plan, 0)).toBe('2026-07-12')
    expect(weekDue(plan, 1)).toBe('2026-07-19')
  })
  it('rejects a term plan for a class this device does not own', () => {
    expect(saveTermPlan('NOPE99', 2, '2026-07-06')).toBeNull()
  })
})

describe('hash reader + urls', () => {
  it('reads each token kind from a hash', () => {
    expect(readClassroomFromHash(`#class=${encodeClassInvite(INVITE)}`).kind).toBe('class')
    expect(readClassroomFromHash(`#assign=${encodeAssignment(ASSIGN)}`).kind).toBe('assign')
    expect(readClassroomFromHash(`#receipt=${encodeReceipt(RECEIPT)}`).kind).toBe('receipt')
    expect(readClassroomFromHash('#class=garbage')).toBeNull()
    expect(readClassroomFromHash('#other=x')).toBeNull()
    expect(readClassroomFromHash('')).toBeNull()
  })
  it('builds urls off a clean origin', () => {
    expect(classUrl(INVITE, 'https://fidelquest.app/some/path')).toMatch(/^https:\/\/fidelquest\.app\/#class=/)
    expect(assignmentUrl(ASSIGN, 'https://fidelquest.app')).toMatch(/#assign=/)
    expect(receiptUrl(RECEIPT, 'https://fidelquest.app')).toMatch(/#receipt=/)
    expect(assignmentUrl({ ...ASSIGN, familyIds: [] }, 'https://x.y')).toBeNull()
  })
})
