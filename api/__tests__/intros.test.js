/* Introduction requests: parent asks, teacher (claimed by application
   email) answers, contacts cross only on accept. */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { store } from '../store.js'

process.env.ADMIN_TOKEN ||= 'test-admin'
const app = createApp()
const admin = { 'x-admin-token': 'test-admin' }
beforeEach(() => store._reset())

async function approvedTeacher(email = 'teacher@x.com', name = 'Abel') {
  const res = await request(app).post('/api/teachers/apply')
    .send({ name, email, languages: ['am'], subjects: 'Reading', location: 'Addis' })
  await request(app).patch(`/api/admin/teachers/${res.body.id}`).set(admin).send({ status: 'approved' })
  return res.body.id
}
async function account(email, role = 'parent') {
  const reg = await request(app).post('/api/auth/register').send({ name: 'U', email, password: 'longenough1', role })
  return { auth: { Authorization: `Bearer ${reg.body.token}` } }
}

test('full lifecycle: request -> teacher inbox -> accept', async () => {
  const teacherId = await approvedTeacher('abel@x.com')
  const parent = await account('mom@x.com')
  const teacher = await account('abel@x.com', 'teacher')

  // request requires a message and auth
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/intros`).send({ message: 'hi' })).status, 401)
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/intros`).set(parent.auth).send({})).status, 400)
  const created = await request(app).post(`/api/teachers/${teacherId}/intros`).set(parent.auth)
    .send({ childName: 'Selam', message: 'Two lessons a week, beginner level.' })
  assert.equal(created.status, 201)
  // no duplicate open requests
  assert.equal((await request(app).post(`/api/teachers/${teacherId}/intros`).set(parent.auth).send({ message: 'again' })).status, 409)

  // parent sees status
  const mine = await request(app).get('/api/my/intros').set(parent.auth)
  assert.equal(mine.body.intros[0].status, 'new')
  assert.equal(mine.body.intros[0].teacherName, 'Abel')

  // teacher dashboard: claimed by matching email; parent contact NOT present
  const me = await request(app).get('/api/teacher/me').set(teacher.auth)
  assert.equal(me.status, 200)
  assert.equal(me.body.teacher.name, 'Abel')
  assert.equal(me.body.intros.length, 1)
  assert.ok(!JSON.stringify(me.body).includes('mom@x.com'), 'parent email must not leak before accept')

  // accept -> status flips; second answer blocked
  const act = await request(app).post(`/api/teacher/intros/${me.body.intros[0].id}`).set(teacher.auth).send({ action: 'accept' })
  assert.equal(act.status, 200)
  assert.equal(act.body.status, 'accepted')
  assert.equal((await request(app).post(`/api/teacher/intros/${me.body.intros[0].id}`).set(teacher.auth).send({ action: 'decline' })).status, 409)
  assert.equal((await request(app).get('/api/my/intros').set(parent.auth)).body.intros[0].status, 'accepted')
})

test('ownership: only the addressed teacher can answer; non-teachers get 404 dashboards', async () => {
  const teacherId = await approvedTeacher('abel@x.com')
  const otherId = await approvedTeacher('hana@x.com', 'Hana')
  const parent = await account('mom2@x.com')
  const other = await account('hana@x.com', 'teacher')
  const rando = await account('rando@x.com')

  await request(app).post(`/api/teachers/${teacherId}/intros`).set(parent.auth).send({ message: 'Please teach us' })
  const me = await request(app).get('/api/teacher/me').set(other.auth)
  assert.equal(me.body.teacher.name, 'Hana')
  assert.equal(me.body.intros.length, 0, 'requests are scoped to the addressed teacher')

  // Hana cannot answer Abel's request even by guessing ids
  const abelIntro = (await store.listIntrosForTeacher(teacherId))[0]
  assert.equal((await request(app).post(`/api/teacher/intros/${abelIntro.id}`).set(other.auth).send({ action: 'accept' })).status, 404)
  assert.equal((await request(app).get('/api/teacher/me').set(rando.auth)).status, 404)
  assert.equal(otherId !== teacherId, true)
})

test('requests to unapproved teachers are rejected', async () => {
  const res = await request(app).post('/api/teachers/apply')
    .send({ name: 'New', email: 'new@x.com', languages: ['am'], subjects: 'R', location: 'A' })
  const parent = await account('mom3@x.com')
  assert.equal((await request(app).post(`/api/teachers/${res.body.id}/intros`).set(parent.auth).send({ message: 'hello' })).status, 404)
})
