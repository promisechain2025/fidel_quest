/* The trust board: ratings gated on real links, comment moderation, and
   progress-verified teacher stats computed from linked children's
   snapshots. */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { store } from '../store.js'

process.env.ADMIN_TOKEN ||= 'test-admin'
const app = createApp()
const admin = { 'x-admin-token': 'test-admin' }
beforeEach(() => store._reset())

const MASK = (n) => '1'.repeat(n) + '0'.repeat(33 - n)
const snap = (day, letters, fams) => ({ day, letters, streak: 1, mask: MASK(fams), nodesDone: fams, nodesTotal: 80 })

async function approvedTeacher(name = 'Abel') {
  const res = await request(app).post('/api/teachers/apply')
    .send({ name, email: `${name.toLowerCase()}@x.com`, languages: ['am'], subjects: 'Reading', location: 'Addis' })
  await request(app).patch(`/api/admin/teachers/${res.body.id}`).set(admin).send({ status: 'approved' })
  return res.body.id
}
async function parentWithChild(email, childName) {
  const reg = await request(app).post('/api/auth/register').send({ name: 'P', email, password: 'longenough1' })
  const tok = reg.body.token
  const kid = await request(app).post('/api/children').set({ Authorization: `Bearer ${tok}` }).send({ name: childName })
  return { tok, childId: kid.body.child.id, auth: { Authorization: `Bearer ${tok}` } }
}

test('rating requires a real child-teacher link; one review per parent', async () => {
  const teacherId = await approvedTeacher()
  const { auth, childId } = await parentWithChild('p1@x.com', 'Selam')

  // not linked yet -> cannot rate
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/reviews`).set(auth).send({ stars: 5 })).status, 403)

  // linking requires an APPROVED teacher
  assert.equal((await request(app).put(`/api/children/${childId}/teacher`).set(auth).send({ teacherId: 'bogus' })).status, 400)
  assert.equal((await request(app).put(`/api/children/${childId}/teacher`).set(auth).send({ teacherId })).status, 200)

  assert.equal((await request(app).post(`/api/teachers/${teacherId}/reviews`).set(auth).send({ stars: 9 })).status, 400)
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/reviews`).set(auth).send({ stars: 5, comment: 'Wonderful with kids' })).status, 201)
  // re-rating replaces, never duplicates
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/reviews`).set(auth).send({ stars: 4 })).status, 201)

  const dir = await request(app).get('/api/teachers')
  const te = dir.body.teachers.find((x) => x.id === teacherId)
  assert.deepEqual(te.rating, { avg: 4, count: 1 })
})

test('comments appear publicly only after owner approval', async () => {
  const teacherId = await approvedTeacher()
  const { auth, childId } = await parentWithChild('p2@x.com', 'Nahom')
  await request(app).put(`/api/children/${childId}/teacher`).set(auth).send({ teacherId })
  await request(app).post(`/api/teachers/${teacherId}/reviews`).set(auth).send({ stars: 5, comment: 'Patient and joyful' })

  assert.equal((await request(app).get(`/api/teachers/${teacherId}/reviews`)).body.reviews.length, 0)
  const pending = await request(app).get('/api/admin/pending-comments').set(admin)
  assert.equal(pending.body.items.length, 1)
  await request(app).patch(`/api/admin/reviews/${pending.body.items[0].id}`).set(admin).send({ status: 'approved' })
  const pub = await request(app).get(`/api/teachers/${teacherId}/reviews`)
  assert.deepEqual(pub.body.reviews, [{ stars: 5, comment: 'Patient and joyful' }])
})

test('progress-verified stats: only post-link snapshot gains count', async () => {
  const teacherId = await approvedTeacher()
  const { auth, childId } = await parentWithChild('p3@x.com', 'Ruth')

  // history BEFORE the teacher: must not credit the teacher
  await request(app).post(`/api/children/${childId}/snapshots`).set(auth).send(snap('2020-01-01', 7, 1))
  await request(app).put(`/api/children/${childId}/teacher`).set(auth).send({ teacherId })
  // link day is today, so post-link snapshots must be >= today
  const today = new Date().toISOString().slice(0, 10)
  const later = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
  await request(app).post(`/api/children/${childId}/snapshots`).set(auth).send(snap(today, 21, 3))
  await request(app).post(`/api/children/${childId}/snapshots`).set(auth).send(snap(later, 56, 8))

  const dir = await request(app).get('/api/teachers')
  const te = dir.body.teachers.find((x) => x.id === teacherId)
  assert.equal(te.progress.students, 1)
  assert.equal(te.progress.verified, 1)
  assert.equal(te.progress.avgLettersGained, 35, 'gain = 56-21 post-link, ignoring the 2020 snapshot')

  // unlink clears the stats
  await request(app).put(`/api/children/${childId}/teacher`).set(auth).send({ teacherId: '' })
  const dir2 = await request(app).get('/api/teachers')
  assert.equal(dir2.body.teachers.find((x) => x.id === teacherId).progress.students, 0)
})

test('directory sorts best-evidenced teachers first', async () => {
  const low = await approvedTeacher('Lulit')
  const high = await approvedTeacher('Hana')
  const a = await parentWithChild('p4@x.com', 'A')
  const b = await parentWithChild('p5@x.com', 'B')
  await request(app).put(`/api/children/${a.childId}/teacher`).set(a.auth).send({ teacherId: low })
  await request(app).put(`/api/children/${b.childId}/teacher`).set(b.auth).send({ teacherId: high })
  await request(app).post(`/api/teachers/${low}/reviews`).set(a.auth).send({ stars: 3 })
  await request(app).post(`/api/teachers/${high}/reviews`).set(b.auth).send({ stars: 5 })
  const dir = await request(app).get('/api/teachers')
  assert.deepEqual(dir.body.teachers.map((t) => t.name), ['Hana', 'Lulit'])
})
