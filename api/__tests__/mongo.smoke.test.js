/* Mongo path smoke test - the ONE test that runs the Mongoose branch.

   The rest of the suite runs in-memory (zero services), which is why the
   Mongoose-only `rawResult` money-path bug once slipped through. This test
   exercises the real database code end to end, but only when you point it at
   a disposable Mongo:

     TEST_MONGO_URI="mongodb://localhost:27017/egeez_smoke" npm test

   WITHOUT TEST_MONGO_URI it skips (so `npm test` stays service-free in CI and
   dev). TEST_MONGO_URI MUST be a throwaway database - the test drops it at
   the end. Run it against staging Mongo before every go-live. */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URI = process.env.TEST_MONGO_URI || ''
const RUN = Boolean(URI)

let store, connect, disconnect, mongoose

before(async () => {
  if (!RUN) return
  // config/store read MONGO_URI at import time, so set it before importing.
  process.env.MONGO_URI = URI
  ;({ store, connect, disconnect } = await import('../store.js'))
  mongoose = (await import('mongoose')).default
  const res = await connect()
  assert.equal(res.backend, 'mongo', 'smoke test must run against Mongo')
})

after(async () => {
  if (!RUN || !mongoose) return
  await mongoose.connection.dropDatabase() // disposable DB by contract
  await disconnect()
})

test('Mongo backend: full onboarding chain + idempotent money path', { skip: !RUN && 'set TEST_MONGO_URI to run' }, async () => {
  assert.equal(store.backend, 'mongo')

  // 1. Parent account + email verification
  const parent = await store.createUser({ name: 'P', email: 'p@smoke.test', passwordHash: 'x', role: 'parent', verifyToken: 'tok-parent' })
  assert.ok(parent._id)
  assert.equal(parent.emailVerified, false)
  assert.ok(await store.verifyEmailToken('tok-parent'))
  assert.equal((await store.findUserByEmail('p@smoke.test')).emailVerified, true)

  // 2. Teacher application -> approve -> appears on the board
  const appDoc = await store.addTeacherApplication({ name: 'Hana', email: 'h@smoke.test', languages: ['am'], subjectTags: ['amharic'], subjects: '', location: 'Addis' })
  const teacherId = String(appDoc._id)
  await store.setTeacherStatus(teacherId, 'approved')

  // 3. Intro request -> accept -> relationship exists
  const intro = await store.createIntro({ teacherId, parentId: String(parent._id), childName: 'K', message: 'Please teach us' })
  await store.setIntroStatus(intro.id, 'accepted')
  assert.equal(await store.hasAcceptedIntro(String(parent._id), teacherId), true)

  // 4. Child + link + snapshots -> subject-aware progress stats
  const kid = await store.createChild(String(parent._id), 'K')
  await store.setChildTeacher(String(parent._id), kid.id, teacherId, '2026-06-01')
  await store.saveSnapshot(String(parent._id), kid.id, { day: '2026-06-01', letters: 14, streak: 1, mask: '11' + '0'.repeat(31), nodesDone: 2, nodesTotal: 80 })
  await store.saveSnapshot(String(parent._id), kid.id, { day: '2026-06-20', letters: 56, streak: 1, mask: '1'.repeat(8) + '0'.repeat(25), nodesDone: 8, nodesTotal: 80 })
  const stats = await store.teacherProgressStats(teacherId, ['amharic'])
  assert.equal(stats.families, 1)
  assert.equal(stats.teachesLiteracy, true)
  assert.equal(stats.avgLettersGained, 42)

  const board = await store.listApprovedTeachers()
  const hana = board.find((t) => t.id === teacherId)
  assert.equal(hana.name, 'Hana')
  assert.equal(hana.email, undefined, 'directory never leaks emails')
  assert.deepEqual(hana.subjectTags, ['amharic'])

  // 5. The money path: exactly-once fulfillment. This is the exact shape the
  //    in-memory tests could not catch (findOneAndUpdate + includeResultMetadata).
  const first = await store.createOrderIfAbsent({ sessionId: 'cs_smoke', email: 'buyer@smoke.test', code: 'EGZTEST1', product: 'app' })
  assert.equal(first.created, true, 'first delivery creates the order')
  assert.ok(first.order && first.order.code === 'EGZTEST1')
  const second = await store.createOrderIfAbsent({ sessionId: 'cs_smoke', email: 'buyer@smoke.test', code: 'EGZOTHER', product: 'app' })
  assert.equal(second.created, false, 'duplicate delivery must NOT create a second order')
  assert.equal(second.order.code, 'EGZTEST1', 'idempotent: original code preserved')
  assert.equal((await store.findOrderBySessionId('cs_smoke')).code, 'EGZTEST1')
})
