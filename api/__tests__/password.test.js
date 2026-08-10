import { test } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { hash, verify, needsRehash, DUMMY_HASH } from '../password.js'

test('scrypt: a correct password verifies, a wrong one does not', async () => {
  const h = await hash('correct horse battery staple')
  assert.ok(h.startsWith('scrypt$'))
  assert.equal(await verify('correct horse battery staple', h), true)
  assert.equal(await verify('correct horse battery stapl', h), false)
  assert.equal(await verify('', h), false)
})

test('every hash is salted - the same password never produces the same string', async () => {
  const a = await hash('same-password')
  const b = await hash('same-password')
  assert.notEqual(a, b)
  assert.equal(await verify('same-password', a), true)
  assert.equal(await verify('same-password', b), true)
})

test('legacy bcrypt hashes still verify, and are flagged for upgrade', async () => {
  const legacy = bcrypt.hashSync('old-password', 10)
  assert.equal(await verify('old-password', legacy), true)
  assert.equal(await verify('wrong', legacy), false)
  assert.equal(needsRehash(legacy), true)
  assert.equal(needsRehash(await hash('x')), false)
})

test('junk stored values are rejected, never thrown on', async () => {
  for (const junk of ['', null, undefined, 'not-a-hash', 'scrypt$only$three', 'scrypt$a$b$c$d$e']) {
    assert.equal(await verify('anything', junk), false)
  }
})

test('the dummy hash is real, and matches nothing a caller can send', async () => {
  assert.ok(DUMMY_HASH.startsWith('scrypt$'))
  assert.equal(await verify('unknown-account-placeholder', DUMMY_HASH), false)
  assert.equal(await verify('', DUMMY_HASH), false)
})

test('hashing does not block the event loop', async () => {
  // The whole point of moving off bcryptjs: the timer below must still fire
  // roughly on time while several hashes are in flight on the threadpool.
  let lateBy = 0
  const started = process.hrtime.bigint()
  const timer = new Promise((resolve) => setTimeout(() => {
    lateBy = Number(process.hrtime.bigint() - started) / 1e6 - 20
    resolve()
  }, 20))
  await Promise.all([timer, ...Array.from({ length: 4 }, () => hash('concurrent'))])
  assert.ok(lateBy < 150, `event loop was blocked for ${lateBy.toFixed(0)}ms`)
})
