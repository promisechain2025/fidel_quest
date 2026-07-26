/* Child profiles + snapshots: ownership, validation, per-day idempotence. */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { store } from '../store.js'

const app = createApp()
beforeEach(() => store._reset())

async function parent(email) {
  const res = await request(app).post('/api/auth/register')
    .send({ name: 'Parent', email, password: 'longenough1' })
  return res.body.token
}
const auth = (tok) => ({ Authorization: `Bearer ${tok}` })
const MASK = '1'.repeat(5) + '0'.repeat(28)
const snap = (day, letters) => ({ day, letters, streak: 3, mask: MASK, nodesDone: 9, nodesTotal: 80 })

test('children CRUD is parent-scoped', async () => {
  const a = await parent('a@example.com')
  const b = await parent('b@example.com')
  assert.equal((await request(app).get('/api/children')).status, 401)

  const created = await request(app).post('/api/children').set(auth(a)).send({ name: 'Selam' })
  assert.equal(created.status, 201)
  const id = created.body.child.id

  assert.equal((await request(app).get('/api/children').set(auth(a))).body.children.length, 1)
  assert.equal((await request(app).get('/api/children').set(auth(b))).body.children.length, 0)
  // parent B cannot read or delete parent A's child
  assert.equal((await request(app).get(`/api/children/${id}/snapshots`).set(auth(b))).status, 404)
  assert.equal((await request(app).delete(`/api/children/${id}`).set(auth(b))).status, 404)

  assert.equal((await request(app).delete(`/api/children/${id}`).set(auth(a))).status, 200)
  assert.equal((await request(app).get('/api/children').set(auth(a))).body.children.length, 0)
})

test('snapshots: validated, one per day, sorted history', async () => {
  const tok = await parent('p@example.com')
  const { body } = await request(app).post('/api/children').set(auth(tok)).send({ name: 'Nahom' })
  const id = body.child.id

  assert.equal((await request(app).post(`/api/children/${id}/snapshots`).set(auth(tok))
    .send({ ...snap('2026-07-01', 35), mask: 'nonsense' })).status, 400)
  assert.equal((await request(app).post(`/api/children/${id}/snapshots`).set(auth(tok))
    .send({ ...snap('not-a-day', 35) })).status, 400)

  for (const [day, letters] of [['2026-07-01', 21], ['2026-07-10', 35], ['2026-07-10', 42]]) {
    const res = await request(app).post(`/api/children/${id}/snapshots`).set(auth(tok)).send(snap(day, letters))
    assert.equal(res.status, 201)
  }
  const hist = await request(app).get(`/api/children/${id}/snapshots`).set(auth(tok))
  assert.equal(hist.body.child.name, 'Nahom')
  assert.equal(hist.body.snapshots.length, 2, 'same-day save overwrites')
  assert.deepEqual(hist.body.snapshots.map((s) => s.letters), [21, 42])
  assert.equal(hist.body.snapshots[0].mask, MASK)
})

test('deleting a child removes their snapshots', async () => {
  const tok = await parent('p2@example.com')
  const { body } = await request(app).post('/api/children').set(auth(tok)).send({ name: 'Ruth' })
  await request(app).post(`/api/children/${body.child.id}/snapshots`).set(auth(tok)).send(snap('2026-07-01', 14))
  await request(app).delete(`/api/children/${body.child.id}`).set(auth(tok))
  const again = await request(app).post('/api/children').set(auth(tok)).send({ name: 'Ruth' })
  const hist = await request(app).get(`/api/children/${again.body.child.id}/snapshots`).set(auth(tok))
  assert.equal(hist.body.snapshots.length, 0)
})
