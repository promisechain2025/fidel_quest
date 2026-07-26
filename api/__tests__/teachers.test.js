/* Teacher directory: apply -> approve -> public listing (no email leak). */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { store } from '../store.js'

process.env.ADMIN_TOKEN ||= 'test-admin'
const app = createApp()
const admin = { 'x-admin-token': 'test-admin' }

beforeEach(() => store._reset())

async function apply(name, email) {
  const res = await request(app).post('/api/teachers/apply')
    .send({ name, email, languages: ['am'], subjects: 'Reading', location: 'Addis Ababa', experience: 'private' })
  assert.equal(res.status, 201)
  return res.body.id
}

test('directory shows only approved teachers and never emails', async () => {
  const idA = await apply('Abel', 'abel@example.com')
  await apply('Hana', 'hana@example.com')

  // empty until someone is approved
  let dir = await request(app).get('/api/teachers')
  assert.equal(dir.status, 200)
  assert.equal(dir.body.teachers.length, 0)

  const patch = await request(app).patch(`/api/admin/teachers/${idA}`).set(admin).send({ status: 'approved' })
  assert.equal(patch.status, 200)

  dir = await request(app).get('/api/teachers')
  assert.equal(dir.body.teachers.length, 1)
  const t = dir.body.teachers[0]
  assert.equal(t.name, 'Abel')
  assert.equal(t.location, 'Addis Ababa')
  assert.equal(t.email, undefined, 'public directory must never expose emails')
  assert.equal(t.experience, undefined, 'private fields stay private')

  // unpublish removes from the directory
  await request(app).patch(`/api/admin/teachers/${idA}`).set(admin).send({ status: 'new' })
  dir = await request(app).get('/api/teachers')
  assert.equal(dir.body.teachers.length, 0)
})

test('moderation requires the admin token and a valid status', async () => {
  const id = await apply('Abel', 'abel@example.com')
  assert.equal((await request(app).patch(`/api/admin/teachers/${id}`).send({ status: 'approved' })).status, 403)
  assert.equal((await request(app).patch(`/api/admin/teachers/${id}`).set(admin).send({ status: 'nonsense' })).status, 400)
  assert.equal((await request(app).patch('/api/admin/teachers/999').set(admin).send({ status: 'approved' })).status, 404)
})

test('the owner panel page serves without a token (data calls still gated)', async () => {
  const res = await request(app).get('/admin')
  assert.equal(res.status, 200)
  assert.match(res.headers['content-type'], /html/)
  assert.match(res.text, /owner panel/)
})
