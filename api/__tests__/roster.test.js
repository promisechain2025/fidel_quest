/* Web teacher dashboard: homework set on the dashboard, results via /sync,
   and the live roster (turned in / missing, trouble letters, minimal data). */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { store } from '../store.js'
import { practiceStore } from '../practiceStore.js'
import { _resetRateLimits } from '../middleware.js'
import { troubleLetters } from '../routes/practice.js'

const app = createApp()
beforeEach(() => { store._reset(); practiceStore._reset(); _resetRateLimits() })
const auth = (tok) => ({ Authorization: `Bearer ${tok}` })
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

async function teacher(email = 't@example.com') {
  const res = await request(app).post('/api/auth/register').send({ name: 'T', email, password: 'longenough1', role: 'teacher' })
  await request(app).post('/api/auth/verify').send({ token: store._peekVerifyToken(email) })
  return res.body.token
}
async function setup() {
  const t = await teacher()
  const { code } = (await request(app).post('/api/practice/classes').set(auth(t)).send({ name: 'Sunday', goalMin: 10 })).body.class
  const join = async (name) => (await request(app).post('/api/practice/join').send({ code, name })).body.token
  return { t, code, join }
}

test('teacher sets homework; only valid families and a due date', async () => {
  const { t, code } = await setup()
  assert.equal((await request(app).post(`/api/practice/classes/${code}/homework`).set(auth(t)).send({ familyIds: [], due: day(3) })).status, 400)
  const r = await request(app).post(`/api/practice/classes/${code}/homework`).set(auth(t)).send({ title: 'Week 1', familyIds: ['ha', 'le', 'BAD!'], count: 99, due: day(3) })
  assert.equal(r.status, 201)
  assert.deepEqual(r.body.homework.familyIds, ['ha', 'le'])
  assert.equal(r.body.homework.count, 20)
  const list = await request(app).get(`/api/practice/classes/${code}/homework`).set(auth(t))
  assert.equal(list.body.homework.length, 1)
})

test('another teacher cannot see or change the class', async () => {
  const { code } = await setup()
  const other = await teacher('o@example.com')
  assert.equal((await request(app).get(`/api/practice/classes/${code}/roster`).set(auth(other))).status, 404)
  assert.equal((await request(app).post(`/api/practice/classes/${code}/homework`).set(auth(other)).send({ familyIds: ['ha'], due: day(1) })).status, 404)
})

test('live roster: turned in, missing, open, trouble letters', async () => {
  const { t, code, join } = await setup()
  const hwOld = (await request(app).post(`/api/practice/classes/${code}/homework`).set(auth(t)).send({ familyIds: ['ha', 'le'], due: day(-1) })).body.homework
  const hwNew = (await request(app).post(`/api/practice/classes/${code}/homework`).set(auth(t)).send({ familyIds: ['me'], due: day(5) })).body.homework
  const abel = await join('Abel'); const ruth = await join('Ruth')
  const s = await request(app).post('/api/practice/sync').set('Authorization', `Student ${abel}`).send({
    days: [{ day: day(0), activeMin: 15, answered: 10, correct: 8, sessions: 1, flags: {} }],
    homework: [{ seed: hwOld.seed, score: 7, total: 10, missed: ['le', 'ha', 'xx'] }, { seed: 424242, score: 1, total: 1 }],
  })
  assert.equal(s.status, 200)
  assert.equal(s.body.turnedIn, 1) // unknown seed ignored
  // turning in twice keeps the first result
  await request(app).post('/api/practice/sync').set('Authorization', `Student ${abel}`).send({ homework: [{ seed: hwOld.seed, score: 10, total: 10 }] })
  await request(app).post('/api/practice/sync').set('Authorization', `Student ${ruth}`).send({ homework: [{ seed: hwNew.seed, score: 5, total: 5, missed: ['me'] }] })

  const r = await request(app).get(`/api/practice/classes/${code}/roster`).set(auth(t))
  assert.equal(r.status, 200)
  const old = r.body.homework.find((h) => h.seed === hwOld.seed)
  assert.equal(old.turnedIn, 1); assert.equal(old.missing, 1); assert.equal(old.overdue, true)
  const a = r.body.students.find((x) => x.name === 'Abel')
  const ru = r.body.students.find((x) => x.name === 'Ruth')
  assert.deepEqual(a.homework.find((h) => h.seed === hwOld.seed), { seed: hwOld.seed, status: 'done', score: 7, total: 10 })
  assert.equal(a.homework.find((h) => h.seed === hwNew.seed).status, 'open')
  assert.equal(ru.homework.find((h) => h.seed === hwOld.seed).status, 'missing')
  assert.equal(a.lastActive, day(0)); assert.equal(ru.lastActive, null)
  assert.equal(a.week.activeMin, 15); assert.equal(a.week.accuracy, 80); assert.equal(a.week.daysMetGoal, 1)
  assert.deepEqual(a.trouble.sort(), ['ha', 'le'])
  assert.deepEqual(r.body.trouble.map((x) => x.id).sort(), ['ha', 'le', 'me'])
  // minimal data: nickname + counts only, never a token, hash or email
  const json = JSON.stringify(r.body)
  assert.ok(!/token|Hash|email/i.test(json))
})

test('deleting homework, a student or the class removes their results', async () => {
  const { t, code, join } = await setup()
  const hw = (await request(app).post(`/api/practice/classes/${code}/homework`).set(auth(t)).send({ familyIds: ['ha'], due: day(1) })).body.homework
  const k = await join('Kidus')
  await request(app).post('/api/practice/sync').set('Authorization', `Student ${k}`).send({ homework: [{ seed: hw.seed, score: 3, total: 3 }] })
  assert.equal((await practiceStore.listSubmissions(code)).length, 1)
  const sid = (await request(app).get(`/api/practice/classes/${code}/roster`).set(auth(t))).body.students[0].id
  await request(app).delete(`/api/practice/classes/${code}/students/${sid}`).set(auth(t))
  assert.equal((await practiceStore.listSubmissions(code)).length, 0)
  assert.equal((await request(app).delete(`/api/practice/classes/${code}/homework/${hw.seed}`).set(auth(t))).status, 200)
  assert.equal((await practiceStore.listHomework(code)).length, 0)
})

test('troubleLetters ranks by misses and counts students', () => {
  const r = troubleLetters([{ studentId: '1', missed: ['ha', 'le'] }, { studentId: '2', missed: ['ha'] }, { studentId: '2', missed: ['ha'] }])
  assert.deepEqual(r[0], { id: 'ha', misses: 3, students: 2 })
})
