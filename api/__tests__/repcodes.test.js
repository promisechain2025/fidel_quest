import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { repCodeStore } from '../repCodeStore.js'
import { _resetRateLimits } from '../middleware.js'

process.env.ADMIN_TOKEN ||= 'test-admin'
const app = createApp()
const admin = { 'x-admin-token': process.env.ADMIN_TOKEN }
beforeEach(() => { repCodeStore._reset(); _resetRateLimits() })

const addRep = (body = { repId: 'ER01', name: 'Asmara rep', country: 'ER' }) => request(app).post('/api/admin/reps').set(admin).send(body)
const mint = (body) => request(app).post('/api/admin/repcodes').set(admin).send(body)
const redeem = (code, installId = 'install-a') => request(app).post('/api/repcodes/redeem').send({ code, installId })

test('admin endpoints need the token', async () => {
  assert.equal((await request(app).post('/api/admin/reps').send({ repId: 'ER01' })).status, 403)
  assert.equal((await request(app).post('/api/admin/repcodes').send({})).status, 403)
})

test('mint needs a known rep and a real package', async () => {
  assert.equal((await mint({ repId: 'ER01', pkg: 'core', count: 1 })).status, 400)
  await addRep()
  assert.equal((await mint({ repId: 'ER01', pkg: 'gold', count: 1 })).status, 400)
  const r = await mint({ repId: 'ER01', pkg: 'prayer', count: 3 })
  assert.equal(r.status, 200)
  assert.equal(r.body.codes.length, 3)
  assert.match(r.body.codes[0], /^EGR-PER01-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
})

test('single-use: second install is refused, same install re-entry is ok', async () => {
  await addRep()
  const [code] = (await mint({ repId: 'ER01', pkg: 'core', count: 1 })).body.codes
  const a = await redeem(code.toLowerCase().replace(/-/g, ' '))
  assert.deepEqual(a.body, { ok: true, pkg: 'core', repId: 'ER01' })
  assert.equal((await redeem(code)).body.ok, true) // same browser again
  const b = await redeem(code, 'install-b')
  assert.equal(b.status, 409)
  assert.equal(b.body.reason, 'used')
})

test('maxUses, unknown, revoke, inactive rep, and report', async () => {
  await addRep()
  const m = (await mint({ repId: 'ER01', pkg: 'bundle', count: 1, maxUses: 2 })).body
  assert.equal((await redeem(m.codes[0], 'x1')).body.ok, true)
  assert.equal((await redeem(m.codes[0], 'x2')).body.ok, true)
  assert.equal((await redeem(m.codes[0], 'x3')).body.reason, 'used')
  assert.equal((await redeem('EGR-CER01-AAAA-AAAA')).body.reason, 'unknown')
  const m2 = (await mint({ repId: 'ER01', pkg: 'core', count: 2 })).body
  assert.equal((await request(app).post('/api/admin/repcodes/revoke').set(admin).send({ batch: m2.batch })).body.revoked, 2)
  assert.equal((await redeem(m2.codes[0])).body.reason, 'revoked')
  const m3 = (await mint({ repId: 'ER01', pkg: 'core', count: 1 })).body
  await addRep({ repId: 'ER01', active: false })
  assert.equal((await redeem(m3.codes[0])).body.reason, 'revoked')
  const rep = (await request(app).get('/api/admin/repcodes').set(admin)).body.report
  assert.deepEqual(rep.find((r) => r.pkg === 'bundle'), { repId: 'ER01', pkg: 'bundle', minted: 1, redeemed: 2, revoked: 0 })
})

test('redeem rejects non-EGR input without a lookup', async () => {
  assert.equal((await redeem('EGZABCDE')).status, 400)
})
