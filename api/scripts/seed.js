/* Demo seed - makes the go-live rehearsal (docs/go-live.md step 7) one
   command and gives a populated board for screenshots/demos.

   Creates one approved teacher and three linked families with real progress
   snapshots and ratings, so the board shows the rating stars, the
   family-reported progress badge (>= 2 verified families), and the "working
   with N families" signal.

   Usage:
     MONGO_URI="mongodb://.../egeez_staging" npm run seed

   Idempotent: keyed on the demo teacher's email - re-running is a no-op.
   Without MONGO_URI it seeds the in-memory store, which is per-process and
   vanishes on exit (useful only to check the script runs); set MONGO_URI to
   seed a database your running API shares.

   The demo accounts use fake @egeez.app addresses and a shared demo
   password. Do NOT run this against a production database you intend to keep
   clean - it inserts demo records (removable by their .demo@egeez.app
   emails). */
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { store, connect, disconnect } from '../store.js'

// Never against production: the seed publishes an approved teacher to the
// public board and creates logged-in accounts. One mistyped MONGO_URI
// should not be enough.
if (!process.env.SEED_CONFIRM) {
  console.error('Refusing to seed: set SEED_CONFIRM=yes (and point MONGO_URI at a staging database).')
  process.exit(1)
}
if (/prod/i.test(process.env.MONGO_URI || '')) {
  console.error('Refusing to seed: MONGO_URI looks like production.')
  process.exit(1)
}
const PW = process.env.SEED_PASSWORD || `demo-${crypto.randomBytes(6).toString('hex')}`
const TEACHER_EMAIL = 'hana.demo@egeez.app'
const snap = (day, fams) => ({
  day, letters: fams * 7, streak: 3,
  mask: '1'.repeat(fams) + '0'.repeat(33 - fams), nodesDone: fams, nodesTotal: 80,
})

async function ensureVerifiedUser({ name, email, role }) {
  const existing = await store.findUserByEmail(email)
  if (existing) return existing
  const token = `seed-${email}`
  await store.createUser({ name, email, passwordHash: await bcrypt.hash(PW, 10), role, verifyToken: token })
  await store.verifyEmailToken(token)
  return store.findUserByEmail(email)
}

async function seed() {
  const { backend } = await connect()
  console.log(`Seeding demo data into the ${backend} backend...`)
  if (backend === 'memory') {
    console.log('WARNING: no MONGO_URI set - seeding the in-memory store, which is per-process')
    console.log('         and vanishes when this script exits. Set MONGO_URI to seed a real DB.')
  }

  if (await store.findApplicationByEmail(TEACHER_EMAIL)) {
    console.log('Already seeded (demo teacher exists). Nothing to do.')
    await disconnect()
    return
  }

  const appDoc = await store.addTeacherApplication({
    name: 'Hana Demo', email: TEACHER_EMAIL, languages: ['am'],
    subjectTags: ['amharic', 'math'], subjects: 'Reading and early math, grades 1-4',
    location: 'Addis Ababa', experience: '6 years teaching fidel and numbers',
  })
  const teacherId = String(appDoc._id)
  await store.setTeacherStatus(teacherId, 'approved')
  await ensureVerifiedUser({ name: 'Hana Demo', email: TEACHER_EMAIL, role: 'teacher' })

  const families = [
    { email: 'lensa.demo@egeez.app', name: 'Lensa Demo', child: 'Soliana', stars: 5, comment: 'Patient and encouraging with our daughter.' },
    { email: 'dawit.demo@egeez.app', name: 'Dawit Demo', child: 'Nahom', stars: 4, comment: '' },
    { email: 'sara.demo@egeez.app', name: 'Sara Demo', child: 'Ruth', stars: 5, comment: 'Real progress in a few weeks.' },
  ]
  for (const f of families) {
    const parent = await ensureVerifiedUser({ name: f.name, email: f.email, role: 'parent' })
    const pid = String(parent._id)
    const kid = await store.createChild(pid, f.child)
    const intro = await store.createIntro({ teacherId, parentId: pid, childName: f.child, message: `Please help ${f.child} with reading.` })
    await store.setIntroStatus(intro.id, 'accepted')
    await store.setChildTeacher(pid, kid.id, teacherId, '2026-06-01')
    await store.saveSnapshot(pid, kid.id, snap('2026-06-01', 3)) // 21 letters at link
    await store.saveSnapshot(pid, kid.id, snap('2026-06-25', 8)) // 56 letters -> +35 gained
    if (f.stars) await store.upsertReview(pid, teacherId, { stars: f.stars, comment: f.comment })
  }

  console.log('')
  console.log('Seeded: 1 approved teacher (Hana Demo) + 3 linked families with progress and ratings.')
  console.log(`Demo logins (password: ${PW}):`)
  console.log(`  teacher: ${TEACHER_EMAIL}    -> sign in at /teach`)
  console.log('  parent:  lensa.demo@egeez.app   -> sign in at /family')
  console.log('Written reviews start as "pending"; approve them in /admin (needs ADMIN_TOKEN).')
  console.log('The board card should show 4/5 stars, "+35 letters/child, reported by 3 families", and "working with 3 families".')
  await disconnect()
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
