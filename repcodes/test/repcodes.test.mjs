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
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'house-B' })).j.ok, true) // 2nd device allowed
  const c = await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'house-C' })
  assert.equal(c.statusCode, 409); assert.equal(c.j.reason, 'devices'); assert.match(c.j.message, /already used on 2 devices/)
  const bad = await call('POST', '/api/repcodes/redeem', { code: 'EGR-CTST1-AAAA-AAAA', installId: 'x' })
  assert.equal(bad.j.reason, 'unknown')
})

test('concurrency: 25 simultaneous redeems from different households -> one sale, at most 2 devices', async () => {
  const { call, c1, store } = await seeded()
  const rs = await Promise.all(Array.from({ length: 25 }, (_, i) => call('POST', '/api/repcodes/redeem', { code: c1[1], installId: `h${i}` }, null, `9.9.9.${i}`)))
  assert.equal(rs.filter((r) => r.j.ok && !r.j.restored).length, 1)
  assert.ok(rs.filter((r) => r.j.ok).length <= 2)
  assert.equal((await store.getCode(c1[1])).devices.length <= 2, true)
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

test('restore: a used code works on up to 2 devices, still one sale', async () => {
  const { call, c1, admin, signIn } = await seeded()
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'phone-A' })).j.ok, true)
  const b = await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'phone-B' })
  assert.equal(b.j.ok, true); assert.equal(b.j.restored, true)
  // both devices keep working
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'phone-A' })).j.ok, true)
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'phone-B' })).j.ok, true)
  const c = await call('POST', '/api/repcodes/redeem', { code: c1[0], installId: 'phone-C' })
  assert.equal(c.statusCode, 409); assert.equal(c.j.reason, 'devices')
  assert.equal(c.j.message, 'This code is already used on 2 devices. Contact your representative.')
  const rep = await signIn('rep1@example.com')
  const r = (await call('GET', '/api/rep/codes', null, rep)).j
  assert.equal(r.totals.used, 1)
  const row = r.codes.find((x) => x.code === c1[0])
  assert.equal(row.devices, 2); assert.equal(row.maxDevices, 2); assert.ok(row.lastRestoreAt)
  const a = (await call('GET', '/api/admin/codes', null, admin)).j.codes.find((x) => x.code === c1[0])
  assert.equal(a.devices, 2)
})

test('restore: concurrent new devices never exceed 2', async () => {
  const { call, c1 } = await seeded()
  await call('POST', '/api/repcodes/redeem', { code: c1[1], installId: 'first' })
  const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => call('POST', '/api/repcodes/redeem', { code: c1[1], installId: `n${i}` }, null, `8.8.8.${i}`)))
  assert.equal(rs.filter((r) => r.j.ok).length, 1)
  assert.ok(rs.filter((r) => !r.j.ok).every((r) => ['devices', 'limited'].includes(r.j.reason)))
})

test('restore: legacy rows with only household get a device list', async () => {
  const { call, c1, store } = await seeded()
  await call('POST', '/api/repcodes/redeem', { code: c1[2], installId: 'old' })
  // simulate a row written before this change
  await store.__patch(c1[2], (c) => { delete c.devices })
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[2], installId: 'old' })).j.ok, true)
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[2], installId: 'new' })).j.ok, true)
  assert.equal((await store.getCode(c1[2])).devices.length, 2)
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[2], installId: 'third' })).j.reason, 'devices')
})

test('restore: rate limited per code', async () => {
  const { call, c1, admin } = await seeded()
  await call('POST', '/api/repcodes/redeem', { code: c1[3], installId: 'a' })
  let last
  for (let i = 0; i < 6; i++) {
    last = await call('POST', '/api/repcodes/redeem', { code: c1[3], installId: 'b' + i }, null, `6.6.${i}.1`)
    await call('POST', '/api/admin/reset-devices', { code: c1[3] }, admin)
  }
  assert.equal(last.j.reason, 'limited')
})

test('admin reset devices: admin only, code stays used, room again', async () => {
  const { call, c1, admin, signIn } = await seeded()
  await call('POST', '/api/repcodes/redeem', { code: c1[4], installId: 'x1' })
  await call('POST', '/api/repcodes/redeem', { code: c1[4], installId: 'x2' })
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[4], installId: 'x3' })).j.reason, 'devices')
  const rep = await signIn('rep1@example.com')
  assert.equal((await call('POST', '/api/admin/reset-devices', { code: c1[4] }, rep)).statusCode, 403)
  assert.equal((await call('POST', '/api/admin/reset-devices', { code: c1[4] }, admin)).j.ok, true)
  assert.equal((await call('POST', '/api/repcodes/redeem', { code: c1[4], installId: 'x3' })).j.ok, true)
  const row = (await call('GET', '/api/admin/codes', null, admin)).j.codes.find((x) => x.code === c1[4])
  assert.equal(row.status, 'used'); assert.equal(row.devices, 1)
  // unused codes cannot be reset
  const fresh = (await call('POST', '/api/admin/generate', { repId: 'TST1', pkg: 'core', quantity: 1 }, admin)).j.codes[0].code
  assert.equal((await call('POST', '/api/admin/reset-devices', { code: fresh }, admin)).statusCode, 409)
})
