/* API tests over the in-memory backend (MONGO_URI unset) via supertest.
   Run: npm test (node --test).                                            */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { store } from '../store.js'

process.env.ADMIN_TOKEN ||= 'test-admin'
const app = createApp()

beforeEach(() => store._reset())

test('healthz reports the memory backend', async () => {
  const res = await request(app).get('/healthz')
  assert.equal(res.status, 200)
  assert.equal(res.body.backend, 'memory')
})

test('register -> login -> me round-trip', async () => {
  const reg = await request(app).post('/api/auth/register')
    .send({ name: 'Mekdes', email: 'mekdes@example.com', password: 'longenough1', role: 'teacher' })
  assert.equal(reg.status, 201)
  assert.equal(reg.body.user.role, 'teacher')
  assert.ok(reg.body.token)

  const dup = await request(app).post('/api/auth/register')
    .send({ name: 'Again', email: 'MEKDES@example.com', password: 'longenough1' })
  assert.equal(dup.status, 409) // email unique, case-insensitive

  const bad = await request(app).post('/api/auth/login').send({ email: 'mekdes@example.com', password: 'wrong' })
  assert.equal(bad.status, 401)

  const login = await request(app).post('/api/auth/login').send({ email: 'mekdes@example.com', password: 'longenough1' })
  assert.equal(login.status, 200)

  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`)
  assert.equal(me.status, 200)
  assert.equal(me.body.user.email, 'mekdes@example.com')

  const noAuth = await request(app).get('/api/auth/me')
  assert.equal(noAuth.status, 401)
})

test('register validation: name, email, short password', async () => {
  const cases = [
    [{ email: 'a@b.co', password: 'longenough1' }, 'Name'],
    [{ name: 'X', email: 'not-an-email', password: 'longenough1' }, 'email'],
    [{ name: 'X', email: 'a@b.co', password: 'short' }, 'Password'],
  ]
  for (const [body, needle] of cases) {
    const res = await request(app).post('/api/auth/register').send(body)
    assert.equal(res.status, 400)
    assert.match(res.body.error, new RegExp(needle, 'i'))
  }
})

test('teacher application: stores and appears in the admin list', async () => {
  const res = await request(app).post('/api/teachers/apply').send({
    name: 'Abel', email: 'abel@example.com', languages: ['am', 'ti'],
    subjects: 'Amharic reading', location: 'Addis Ababa', experience: '5 years', message: 'Hello',
  })
  assert.equal(res.status, 201)

  const forbidden = await request(app).get('/api/admin/teachers')
  assert.equal(forbidden.status, 403)

  const list = await request(app).get('/api/admin/teachers').set('x-admin-token', 'test-admin')
  assert.equal(list.status, 200)
  assert.equal(list.body.items.length, 1)
  assert.equal(list.body.items[0].email, 'abel@example.com')
  assert.deepEqual(list.body.items[0].languages, ['am', 'ti'])
})

test('waitlist + contact validate email and store', async () => {
  assert.equal((await request(app).post('/api/waitlist').send({ email: 'nope' })).status, 400)
  assert.equal((await request(app).post('/api/waitlist').send({ email: 'fam@example.com' })).status, 201)

  assert.equal((await request(app).post('/api/contact').send({ name: 'P', email: 'p@example.com' })).status, 400)
  assert.equal((await request(app).post('/api/contact').send({ name: 'P', email: 'p@example.com', message: 'Hi' })).status, 201)

  const wl = await request(app).get('/api/admin/waitlist').set('x-admin-token', 'test-admin')
  assert.equal(wl.body.items.length, 1)
  assert.equal(wl.body.items[0].language, 'ti') // default language

  const ct = await request(app).get('/api/admin/contact').set('x-admin-token', 'test-admin')
  assert.equal(ct.body.items.length, 1)
})

test('unknown routes 404 as JSON', async () => {
  const res = await request(app).get('/api/nope')
  assert.equal(res.status, 404)
  assert.equal(res.body.error, 'Not found')
})
