import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newCode, canonical, randSymbols, ALPHABET, ADMIN_EMAIL } from '../src/core.js'
import { memStore } from '../src/store-mem.js'
import { makeApp } from '../src/app.js'

function rig() {
  const store = memStore(); const mail = []
  const app = makeApp({ store, sendMail: async (to, otp) => mail.push({ to, otp }) })
  const call = (method, path, body, token, ip = '1.1.1.1', qs) => app({
    rawPath: path, requestContext: { http: { method, sourceIp: ip } }, queryStringParameters: qs,
    headers: { 'content-type': 'application/json' }, cookies: token ? [`egr_s=${token}`] : [], body: body && JSON.stringify(body),
  }).then((r) => ({ ...r, j: r.headers?.['content-type']?.includes('json') ? JSON.parse(r.body) : r.body }))
  const signIn = async (email) => {
    await call('POST', '/api/auth/start', { email })
    const otp = mail.filter((m) => m.to === email).at(-1)?.otp
    const r = await call('POST', '/api/auth/verify', { email, code: otp })
    if (r.statusCode !== 200) return null
    return /egr_s=([^;]+)/.exec(r.headers['set-cookie'])[1]
  }
  return { store, mail, call, signIn }
}
async function seeded() {
  const t = rig(); const admin = await t.signIn(ADMIN_EMAIL)
  await t.call('POST', '/api/admin/reps', { repId: 'TST1', name: 'Test Rep', city: 'Addis Ababa', country: 'ET', email: 'rep1@example.com', shown: true }, admin)
  await t.call('POST', '/api/admin/reps', { repId: 'TST2', name: 'Other Rep', country: 'ER', email: 'rep2@example.com' }, admin)
  const g1 = (await t.call('POST', '/api/admin/generate', { repId: 'TST1', pkg: 'core', quantity: 5 }, admin)).j
  const g2 = (await t.call('POST', '/api/admin/generate', { repId: 'TST2', pkg: 'bundle', quantity: 3 }, admin)).j
  return { ...t, admin, c1: g1.codes.map((c) => c.code), c2: g2.codes.map((c) => c.code) }
}

test('generation: format, alphabet, uniqueness, matches the web app regex', () => {
  const webRe = /^EGR[CPB][A-Z0-9]{2,6}[A-Z2-9]{8}$/
  const seen = new Set()
  for (let i = 0; i < 5000; i++) {
    const c = newCode('prayer', 'ET01')
    assert.match(c, /^EGR-PET01-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    assert.match(c.replace(/-/g, ''), webRe)
    assert.ok(!/[0O1IL]/.test(c.slice(10)))
    assert.equal(canonical(c.toLowerCase().replace(/-/g, ' ')), c)
    seen.add(c)
  }
  assert.equal(seen.size, 5000)
  const s = randSymbols(31000); for (const ch of s) assert.ok(ALPHABET.includes(ch))
})

test('single-use redeem, restore on same household, clear message for others', async () => {
  const { call, c1 } = await seeded()
  const a = await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'house-A' })
  assert.equal(a.statusCode, 200); assert.equal(a.j.pkg, 'core')
  const again = await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'house-A' })
  assert.equal(again.j.ok, true); assert.equal(again.j.restored, true)
  const b = await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'house-B' })
  assert.equal(b.statusCode, 409); assert.equal(b.j.reason, 'used'); assert.match(b.j.message, /already used/)
  const bad = await call('POST', '/api/repcodes/redeem', { code: 'EGR-CTST1-AAAA-AAAA', installId: 'x' })
  assert.equal(bad.j.reason, 'unknown')
})

test('concurrency: 25 simultaneous redeems from different households -> exactly one wins', async () => {
  const { call, c1 } = await seeded()
  const rs = await Promise.all(Array.from({ length: 25 }, (_, i) => call('POST', '/api/repcodes/redeem', { code: c1[1], installId: `h${i}` }, null, `9.9.9.${i}`)))
  assert.equal(rs.filter((r) => r.j.ok).length, 1)
  assert.ok(rs.filter((r) => !r.j.ok).every((r) => r.j.reason === 'used'))
})

test('void: only unused, voided code cannot be redeemed', async () => {
  const { call, admin, c1 } = await seeded()
  assert.equal((await call('POST', '/api/admin/void', { code: c1[2] }, admin)).statusCode, 200)
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[2], installId: 'h' })).j.reason, 'void')
  await call('POST', '/api/repcodes/redeem', { code: c1[3], installId: 'h' })
  assert.equal((await call('POST', '/api/admin/void', { code: c1[3] }, admin)).statusCode, 409)
})

test('rate limit: redeem attempts per IP', async () => {
  const { call } = await seeded()
  let last
  for (let i = 0; i < 21; i++) last = await call('POST', '/api/repcodes/redeem', { code: 'EGR-CTST1-AAAA-BBBB' }, null, '7.7.7.7')
  assert.equal(last.statusCode, 429)
})

test('auth: no session -> 401, unknown email gets no code, wrong OTP rejected, OTP is one-time', async () => {
  const t = rig()
  assert.equal((await t.call('GET', '/api/admin/reps')).statusCode, 401)
  await t.call('POST', '/api/auth/start', { email: 'stranger@example.com' })
  assert.equal(t.mail.length, 0)
  await t.call('POST', '/api/auth/start', { email: ADMIN_EMAIL })
  const otp = t.mail[0].otp
  const wrong = String((Number(otp) + 1) % 1e6).padStart(6, '0')
  assert.equal((await t.call('POST', '/api/auth/verify', { email: ADMIN_EMAIL, code: wrong })).statusCode, 401)
  assert.equal((await t.call('POST', '/api/auth/verify', { email: ADMIN_EMAIL, code: otp })).statusCode, 200)
  assert.equal((await t.call('POST', '/api/auth/verify', { email: ADMIN_EMAIL, code: otp })).statusCode, 401)
  assert.equal((await t.call('GET', '/api/admin/reps', null, 'forged-token')).statusCode, 401)
})

test('roles: rep cannot use admin API or create codes; disabled rep loses access', async () => {
  const { call, signIn, admin } = await seeded()
  const rep = await signIn('rep1@example.com')
  assert.ok(rep)
  assert.equal((await call('POST', '/api/admin/generate', { repId: 'TST1', pkg: 'core', quantity: 5 }, rep)).statusCode, 403)
  assert.equal((await call('GET', '/api/admin/codes', null, rep)).statusCode, 403)
  assert.equal((await call('GET', '/api/rep/codes', null, admin)).statusCode, 403)
  await call('PUT', '/api/admin/reps', { repId: 'TST1', active: false }, admin)
  assert.equal((await call('GET', '/api/rep/codes', null, rep)).statusCode, 401)
})

test('rep sees ONLY their own codes, with masked household', async () => {
  const { call, signIn, c1, c2 } = await seeded()
  await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'secret-install-id-123' })
  const rep = await signIn('rep1@example.com')
  const r = (await call('GET', '/api/rep/codes', null, rep, '1.1.1.1', { repId: 'TST2' })).j // repId param ignored
  assert.deepEqual(r.codes.map((c) => c.code).sort(), [...c1].sort())
  assert.ok(r.codes.every((c) => c.repId === 'TST1'))
  for (const c of c2) assert.ok(!JSON.stringify(r).includes(c))
  assert.deepEqual(r.totals, { issued: 5, used: 1, unused: 4, void: 0 })
  const used = r.codes.find((c) => c.status === 'used')
  assert.match(used.household, /^HH-••••[0-9A-F]{4}$/); assert.ok(!JSON.stringify(r).includes('secret-install'))
  const un = (await call('GET', '/api/rep/codes', null, rep, '1.1.1.1', { status: 'unused' })).j
  assert.equal(un.codes.length, 4)
})

test('public representatives list only shows reps marked shown + active; CSV export', async () => {
  const { call, admin } = await seeded()
  const p = (await call('GET', '/api/representatives')).j
  assert.deepEqual(p.representatives.map((r) => r.id), ['TST1'])
  const csv = await call('GET', '/api/admin/codes.csv', null, admin)
  assert.equal(csv.body.trim().split('\n').length, 9)
})
