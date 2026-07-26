/* Child profiles + snapshots: ownership, validation, per-day idempotence. */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { store } from '../store.js'
import { _resetRateLimits } from '../middleware.js'

const app = createApp()
beforeEach(() => { store._reset(); _resetRateLimits() })

async function parent(email) {
  const res = await request(app).post('/api/auth/register')
    .send({ name: 'Parent', email, password: 'longenough1' })
  return res.body.token
}
const auth = (tok) => ({ Authorization: `Bearer ${tok}` })
// letters must equal 7 x learned families (realism guard), so derive the mask.
const snap = (day, fams) => ({
  day, letters: fams * 7, streak: 3,
  mask: '1'.repeat(fams) + '0'.repeat(33 - fams), nodesDone: fams, nodesTotal: 80,
})

test('children CRUD is parent-scoped', async () => {
  const a = await parent('a@example.com')
  const b = await parent('b@example.com')
  assert.equal((await request(app).get('/api/children')).status, 401)

  const created = await request(app).post('/api/children').set(auth(a)).send({ name: 'Selam' })
  assert.equal(created.status, 201)
  const id = created.body.child.id

  assert.equal((await request(app).get('/api/children').set(auth(a))).body.children.length, 1)
  assert.equal((await request(app).get('/api/children').set(auth(b))).body.children.length, 0)
  assert.equal((await request(app).get(`/api/children/${id}/snapshots`).set(auth(b))).status, 404)
  assert.equal((await request(app).delete(`/api/children/${id}`).set(auth(b))).status, 404)

  assert.equal((await request(app).delete(`/api/children/${id}`).set(auth(a))).status, 200)
  assert.equal((await request(app).get('/api/children').set(auth(a))).body.children.length, 0)
})

test('snapshots: validated, one per day, sorted history', async () => {
  const tok = await parent('p@example.com')
  const { body } = await request(app).post('/api/children').set(auth(tok)).send({ name: 'Nahom' })
  const id = body.child.id

  // bad mask, bad day, future day, and letters != 7 x mask are all rejected
  assert.equal((await request(app).post(`/api/children/${id}/snapshots`).set(auth(tok))
    .send({ ...snap('2026-07-01', 5), mask: 'nonsense' })).status, 400)
  assert.equal((await request(app).post(`/api/children/${id}/snapshots`).set(auth(tok))
    .send({ ...snap('not-a-day', 5) })).status, 400)
  assert.equal((await request(app).post(`/api/children/${id}/snapshots`).set(auth(tok))
    .send({ ...snap('2999-01-01', 5) })).status, 400)
  assert.equal((await request(app).post(`/api/children/${id}/snapshots`).set(auth(tok))
    .send({ ...snap('2026-07-01', 5), letters: 100 })).status, 400)

  for (const [day, fams] of [['2026-07-01', 3], ['2026-07-10', 5], ['2026-07-10', 6]]) {
    const res = await request(app).post(`/api/children/${id}/snapshots`).set(auth(tok)).send(snap(day, fams))
    assert.equal(res.status, 201)
  }
  const hist = await request(app).get(`/api/children/${id}/snapshots`).set(auth(tok))
  assert.equal(hist.body.child.name, 'Nahom')
  assert.equal(hist.body.snapshots.length, 2, 'same-day save overwrites')
  assert.deepEqual(hist.body.snapshots.map((s) => s.letters), [21, 42])
})

test('deleting a child removes their snapshots', async () => {
  const tok = await parent('p2@example.com')
  const { body } = await request(app).post('/api/children').set(auth(tok)).send({ name: 'Ruth' })
  await request(app).post(`/api/children/${body.child.id}/snapshots`).set(auth(tok)).send(snap('2026-07-01', 2))
  await request(app).delete(`/api/children/${body.child.id}`).set(auth(tok))
  const again = await request(app).post('/api/children').set(auth(tok)).send({ name: 'Ruth' })
  const hist = await request(app).get(`/api/children/${again.body.child.id}/snapshots`).set(auth(tok))
  assert.equal(hist.body.snapshots.length, 0)
})
