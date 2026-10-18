/* Practice class view: teacher auth, join codes, student-token sync,
   ownership, clamping, and the dashboard report. */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { store } from '../store.js'
import { practiceStore } from '../practiceStore.js'
import { _resetRateLimits } from '../middleware.js'
import { cleanRow } from '../routes/practice.js'

const app = createApp()
beforeEach(() => { store._reset(); practiceStore._reset(); _resetRateLimits() })

const auth = (tok) => ({ Authorization: `Bearer ${tok}` })
const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

async function account(email, role = 'teacher', verify = true) {
  const res = await request(app).post('/api/auth/register').send({ name: 'T', email, password: 'longenough1', role })
  if (verify) await request(app).post('/api/auth/verify').send({ token: store._peekVerifyToken(email) })
  return res.body.token
}
const row = (day, activeMin, extra = {}) => ({ day, activeMin, prayerMin: 20, sessions: 2, items: 40, answered: 30, correct: 24, lessons: 1, games: 1, flags: { rapidTap: 0, randomTap: 0, audioLoop: 0 }, ...extra })

test('only verified teachers can create classes', async () => {
  assert.equal((await request(app).post('/api/practice/classes').send({})).status, 401)
  const parent = await account('p@example.com', 'parent')
  assert.equal((await request(app).post('/api/practice/classes').set(auth(parent)).send({})).status, 403)
  const unverified = await account('u@example.com', 'teacher', false)
  const r = await request(app).post('/api/practice/classes').set(auth(unverified)).send({})
  assert.equal(r.status, 403)
  assert.equal(r.body.code, 'EMAIL_UNVERIFIED')
})

test('teacher creates a class, child joins with the code and syncs; dashboard shows it', async () => {
  const t = await account('t@example.com')
  const created = await request(app).post('/api/practice/classes').set(auth(t)).send({ name: 'Grade 2', goalMin: 60 })
  assert.equal(created.status, 201)
  const { code } = created.body.class
  assert.match(code, /^[A-Z2-9]{6}$/)

  assert.equal((await request(app).post('/api/practice/join').send({ code: 'NOPE99', name: 'Selam' })).status, 404)
  assert.equal((await request(app).post('/api/practice/join').send({ code, name: '' })).status, 400)
  const joined = await request(app).post('/api/practice/join').send({ code: code.toLowerCase(), name: 'Selam' })
  assert.equal(joined.status, 201)
  assert.equal(joined.body.goalMin, 60)
  const stok = joined.body.token

  assert.equal((await request(app).post('/api/practice/sync').send({ days: [] })).status, 401)
  assert.equal((await request(app).post('/api/practice/sync').set('Authorization', 'Student wrong').send({ days: [] })).status, 401)
  const synced = await request(app).post('/api/practice/sync').set('Authorization', `Student ${stok}`)
    .send({ days: [row(today(), 62), row(daysAgo(1), 30, { flags: { rapidTap: 1, randomTap: 0, audioLoop: 2 } }), row('1999-01-01', 5)] })
  assert.equal(synced.status, 200)
  assert.equal(synced.body.saved, 2) // the ancient row is dropped
  // re-sync of a day overwrites, not duplicates
  await request(app).post('/api/practice/sync').set('Authorization', `Student ${stok}`).send({ days: [row(today(), 65)] })

  const rep = await request(app).get(`/api/practice/classes/${code}/report`).set(auth(t))
  assert.equal(rep.status, 200)
  assert.equal(rep.body.students.length, 1)
  const s = rep.body.students[0]
  assert.equal(s.name, 'Selam')
  assert.equal(s.days.length, 2)
  assert.equal(s.total.activeMin, 95)
  assert.equal(s.total.prayerMin, 40)
  assert.equal(s.total.daysMetGoal, 1)
  assert.equal(s.total.flags, 3)
  assert.equal(s.total.accuracy, 80)

  // the teacher changes the goal; the child picks it up on the next sync
  await request(app).patch(`/api/practice/classes/${code}`).set(auth(t)).send({ goalMin: 45 })
  const next = await request(app).post('/api/practice/sync').set('Authorization', `Student ${stok}`).send({ days: [] })
  assert.equal(next.body.goalMin, 45)
})

test('classes are teacher-scoped; removing a student revokes their token', async () => {
  const a = await account('a@example.com')
  const b = await account('b@example.com')
  const { code } = (await request(app).post('/api/practice/classes').set(auth(a)).send({ name: 'A' })).body.class
  assert.equal((await request(app).get(`/api/practice/classes/${code}/report`).set(auth(b))).status, 404)
  assert.equal((await request(app).get('/api/practice/classes').set(auth(b))).body.classes.length, 0)
  const stok = (await request(app).post('/api/practice/join').send({ code, name: 'Abel' })).body.token
  const sid = (await request(app).get(`/api/practice/classes/${code}/report`).set(auth(a))).body.students[0].id
  assert.equal((await request(app).delete(`/api/practice/classes/${code}/students/${sid}`).set(auth(b))).status, 404)
  assert.equal((await request(app).delete(`/api/practice/classes/${code}/students/${sid}`).set(auth(a))).status, 200)
  assert.equal((await request(app).post('/api/practice/sync').set('Authorization', `Student ${stok}`).send({ days: [] })).status, 401)
  // deleting the class tells a still-joined device it is gone (410)
  const stok2 = (await request(app).post('/api/practice/join').send({ code, name: 'Hana' })).body.token
  await request(app).delete(`/api/practice/classes/${code}`).set(auth(a))
  assert.equal((await request(app).post('/api/practice/sync').set('Authorization', `Student ${stok2}`).send({ days: [] })).status, 401)
})

test('rows are clamped to possible values', () => {
  const r = cleanRow({ day: '2026-10-18', activeMin: 5000, answered: 10, correct: 50, flags: { rapidTap: -3 } })
  assert.equal(r.activeMin, 1440)
  assert.equal(r.correct, 10)
  assert.equal(r.flags.rapidTap, 0)
  assert.equal(cleanRow({ day: '2026-10-18', activeMin: 10, prayerMin: 50 }).prayerMin, 10)
  assert.equal(cleanRow({ day: 'nope' }), null)
})
