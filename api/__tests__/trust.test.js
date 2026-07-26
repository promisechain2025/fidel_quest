/* The trust board: ratings gated on a real (accepted-intro) relationship,
   comment moderation, and family-reported progress stats. */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { store } from '../store.js'
import { _resetRateLimits } from '../middleware.js'

process.env.ADMIN_TOKEN ||= 'test-admin'
const app = createApp()
const admin = { 'x-admin-token': 'test-admin' }
beforeEach(() => { store._reset(); _resetRateLimits() })

const MASK = (n) => '1'.repeat(n) + '0'.repeat(33 - n)
const snap = (day, fams) => ({ day, letters: fams * 7, streak: 1, mask: MASK(fams), nodesDone: fams, nodesTotal: 80 })
const today = () => new Date().toISOString().slice(0, 10)
const future = (d) => new Date(Date.now() + 86400000 * d).toISOString().slice(0, 10)

async function verifiedAccount(email, role = 'parent') {
  const reg = await request(app).post('/api/auth/register').send({ name: 'U', email, password: 'longenough1', role })
  await request(app).post('/api/auth/verify').send({ token: store._peekVerifyToken(email) })
  return { auth: { Authorization: `Bearer ${reg.body.token}` } }
}
async function approvedTeacher(name, email, subjectTags) {
  const res = await request(app).post('/api/teachers/apply')
    .send({ name, email, languages: ['am'], subjects: 'Reading', location: 'Addis', ...(subjectTags ? { subjectTags } : {}) })
  await request(app).patch(`/api/admin/teachers/${res.body.id}`).set(admin).send({ status: 'approved' })
  return res.body.id
}
/** Establish a real relationship: parent requests, teacher accepts, parent links. */
async function linkedRelationship({ teacherId, teacherAuth, parentAuth, childId }) {
  await request(app).post(`/api/teachers/${teacherId}/intros`).set(parentAuth).send({ message: 'Please teach us' })
  const inbox = await request(app).get('/api/teacher/me').set(teacherAuth)
  await request(app).post(`/api/teacher/intros/${inbox.body.intros[0].id}`).set(teacherAuth).send({ action: 'accept' })
  const r = await request(app).put(`/api/children/${childId}/teacher`).set(parentAuth).send({ teacherId })
  assert.equal(r.status, 200)
}

test('rating requires an ACCEPTED-intro relationship, not a self-link', async () => {
  const teacherId = await approvedTeacher('Abel', 'abel@x.com')
  const teacher = await verifiedAccount('abel@x.com', 'teacher')
  const parent = await verifiedAccount('p1@x.com')
  const kid = await request(app).post('/api/children').set(parent.auth).send({ name: 'Selam' })
  const childId = kid.body.child.id

  // self-link without an accepted intro is refused
  assert.equal((await request(app).put(`/api/children/${childId}/teacher`).set(parent.auth).send({ teacherId })).status, 403)
  // and rating is refused because no link exists
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/reviews`).set(parent.auth).send({ stars: 5 })).status, 403)

  await linkedRelationship({ teacherId, teacherAuth: teacher.auth, parentAuth: parent.auth, childId })
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/reviews`).set(parent.auth).send({ stars: 9 })).status, 400)
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/reviews`).set(parent.auth).send({ stars: 5, comment: 'Wonderful with kids' })).status, 201)
  // re-rate stars only: replaces the star, keeps the (pending) comment
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/reviews`).set(parent.auth).send({ stars: 4 })).status, 201)

  const te = (await request(app).get('/api/teachers')).body.teachers.find((x) => x.id === teacherId)
  assert.deepEqual(te.rating, { avg: 4, count: 1 })
})

test('comments appear publicly only after owner approval; stars-only re-rate keeps the comment', async () => {
  const teacherId = await approvedTeacher('Abel', 'abel@x.com')
  const teacher = await verifiedAccount('abel@x.com', 'teacher')
  const parent = await verifiedAccount('p2@x.com')
  const kid = await request(app).post('/api/children').set(parent.auth).send({ name: 'Nahom' })
  await linkedRelationship({ teacherId, teacherAuth: teacher.auth, parentAuth: parent.auth, childId: kid.body.child.id })

  await request(app).post(`/api/teachers/${teacherId}/reviews`).set(parent.auth).send({ stars: 5, comment: 'Patient and joyful' })
  assert.equal((await request(app).get(`/api/teachers/${teacherId}/reviews`)).body.reviews.length, 0)
  const pending = await request(app).get('/api/admin/pending-comments').set(admin)
  assert.equal(pending.body.items.length, 1)
  await request(app).patch(`/api/admin/reviews/${pending.body.items[0].id}`).set(admin).send({ status: 'approved' })
  assert.deepEqual((await request(app).get(`/api/teachers/${teacherId}/reviews`)).body.reviews, [{ stars: 5, comment: 'Patient and joyful' }])

  // stars-only re-rate must not erase the approved comment
  await request(app).post(`/api/teachers/${teacherId}/reviews`).set(parent.auth).send({ stars: 3 })
  assert.deepEqual((await request(app).get(`/api/teachers/${teacherId}/reviews`)).body.reviews, [{ stars: 3, comment: 'Patient and joyful' }])
})

test('progress stats: only post-link gains count; badge hidden below the threshold', async () => {
  const teacherId = await approvedTeacher('Abel', 'abel@x.com')
  const teacher = await verifiedAccount('abel@x.com', 'teacher')
  const parent = await verifiedAccount('p3@x.com')
  const kid = await request(app).post('/api/children').set(parent.auth).send({ name: 'Ruth' })
  const childId = kid.body.child.id
  await linkedRelationship({ teacherId, teacherAuth: teacher.auth, parentAuth: parent.auth, childId })

  // Multi-day post-link history can't be simulated through the route (the
  // no-future guard means real gains accrue over real calendar days), so
  // seed dated snapshots + a past link day directly on the store. The
  // 2020 snapshot predates the link and must be ignored.
  const parentUser = await store.findUserByEmail('p3@x.com')
  const pid = String(parentUser._id)
  await store.setChildTeacher(pid, childId, teacherId, '2026-06-01')
  await store.saveSnapshot(pid, childId, snap('2020-01-01', 1))
  await store.saveSnapshot(pid, childId, snap('2026-06-01', 3))
  await store.saveSnapshot(pid, childId, snap('2026-06-20', 8))

  const te = (await request(app).get('/api/teachers')).body.teachers.find((x) => x.id === teacherId)
  assert.equal(te.progress.students, 1)
  assert.equal(te.progress.families, 1, 'one distinct family')
  assert.equal(te.progress.verified, 1)
  assert.equal(te.progress.avgLettersGained, 35, 'gain = 56-21 post-link, ignoring 2020')
  assert.equal(te.progress.show, false, 'one student is below the badge threshold')
})

test('subject scoping: a math tutor is not credited with a child\'s fidel letters', async () => {
  const teacherId = await approvedTeacher('Dawit', 'dawit@x.com', ['math'])
  const teacher = await verifiedAccount('dawit@x.com', 'teacher')
  const parent = await verifiedAccount('pm@x.com')
  const kid = await request(app).post('/api/children').set(parent.auth).send({ name: 'Yon' })
  const childId = kid.body.child.id
  await linkedRelationship({ teacherId, teacherAuth: teacher.auth, parentAuth: parent.auth, childId })

  // Two post-link fidel snapshots would clear the letters threshold for a
  // literacy teacher - but Dawit teaches math, so the child's app play is
  // not his doing and must not surface as a letters badge.
  const pu = await store.findUserByEmail('pm@x.com')
  const pid = String(pu._id)
  await store.setChildTeacher(pid, childId, teacherId, '2026-06-01')
  await store.saveSnapshot(pid, childId, snap('2026-06-01', 2))
  await store.saveSnapshot(pid, childId, snap('2026-06-20', 9))

  const te = (await request(app).get('/api/teachers')).body.teachers.find((x) => x.id === teacherId)
  assert.equal(te.progress.teachesLiteracy, false)
  assert.equal(te.progress.show, false, 'no fidel-letters badge for a math tutor')
  assert.equal(te.progress.families, 1, 'but the honest all-subject family count still shows')
  // and the math tutor is filterable on the board
  const mathBoard = (await request(app).get('/api/teachers?subject=math')).body.teachers
  assert.deepEqual(mathBoard.map((t) => t.name), ['Dawit'])
})

test('directory ranks by shrunk score: a large 4-star sample beats a single 5-star', async () => {
  const many = await approvedTeacher('Hana', 'hana@x.com')
  const one = await approvedTeacher('Lulit', 'lulit@x.com')
  const manyTeacher = await verifiedAccount('hana@x.com', 'teacher')
  const oneTeacher = await verifiedAccount('lulit@x.com', 'teacher')

  // Hana: four honest 4-star reviews from four linked families
  for (let i = 0; i < 4; i++) {
    const p = await verifiedAccount(`fam${i}@x.com`)
    const kid = await request(app).post('/api/children').set(p.auth).send({ name: `K${i}` })
    await linkedRelationship({ teacherId: many, teacherAuth: manyTeacher.auth, parentAuth: p.auth, childId: kid.body.child.id })
    await request(app).post(`/api/teachers/${many}/reviews`).set(p.auth).send({ stars: 4 })
  }
  // Lulit: a single 5-star
  const solo = await verifiedAccount('solo@x.com')
  const soloKid = await request(app).post('/api/children').set(solo.auth).send({ name: 'S' })
  await linkedRelationship({ teacherId: one, teacherAuth: oneTeacher.auth, parentAuth: solo.auth, childId: soloKid.body.child.id })
  await request(app).post(`/api/teachers/${one}/reviews`).set(solo.auth).send({ stars: 5 })

  const names = (await request(app).get('/api/teachers')).body.teachers.map((t) => t.name)
  assert.deepEqual(names, ['Hana', 'Lulit'], 'shrunk score ranks the larger honest sample first')
})
