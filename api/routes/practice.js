/* Practice class view: teachers see verified daily practice per student.

   Teacher side  (Bearer JWT, role teacher, verified email - the existing
                  accounts system):
     POST   /api/practice/classes                 {name, goalMin} -> {class}
     GET    /api/practice/classes                 -> {classes}
     PATCH  /api/practice/classes/:code           {goalMin?, name?}
     DELETE /api/practice/classes/:code           (deletes students + rows)
     GET    /api/practice/classes/:code/report?from=YYYY-MM-DD&to=YYYY-MM-DD
     DELETE /api/practice/classes/:code/students/:id
     POST   /api/practice/classes/:code/homework  {title, familyIds, count, due, orders?} -> {homework}
     GET    /api/practice/classes/:code/homework  -> {homework}
     DELETE /api/practice/classes/:code/homework/:seed
     GET    /api/practice/classes/:code/roster    -> live roster: per student last
            active day, week minutes, accuracy, homework turned in / missing,
            and per-student + class trouble letters (family ids)
   Child side (no account; the class join code is the invitation):
     POST   /api/practice/join   {code, name}  -> {token, className, goalMin}
     POST   /api/practice/sync   Authorization: Student <token>
            {days:[row], homework?:[{seed, score, total, missed:[familyId]}]}
            -> {ok, goalMin}
   Student data is a nickname (<= 16 chars) and learning counts only: no
   email, no birthday, no free text, no audio.
   A student token is 32 random bytes, returned once and stored only as a
   SHA-256 hash; it can write only its own rows. Rows are clamped to
   physically possible values (<= 1440 active minutes a day). */
import { Router } from 'express'
import crypto from 'node:crypto'
import { practiceStore, sha256 } from '../practiceStore.js'
import { requireAuth, requireVerified, rateLimit, str } from '../middleware.js'

const router = Router()
const teacherLimit = rateLimit({ max: 300, key: 'practice-teacher' })
const joinLimit = rateLimit({ max: 30, key: 'practice-join' })
const syncLimit = rateLimit({ max: 600, key: 'practice-sync' })

export const MAX_STUDENTS = 60
const CODE_RE = /^[A-Z0-9]{4,12}$/
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)))
const goal = (v) => int(v ?? 60, 5, 180)
const cleanName = (s, max) => str(s, 200).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const dayStr = (d) => d.toISOString().slice(0, 10)

function requireTeacher(req, res, next) {
  if (req.user?.role !== 'teacher') return res.status(403).json({ error: 'Teacher account required' })
  next()
}
const teacher = [requireAuth, teacherLimit, requireTeacher, requireVerified]

async function ownClass(req, res) {
  const code = String(req.params.code || '').toUpperCase()
  const c = CODE_RE.test(code) && (await practiceStore.findClass(code))
  if (!c || c.teacherId !== req.user.id) { res.status(404).json({ error: 'Class not found' }); return null }
  return c
}
const publicClass = (c) => ({ code: c.code, name: c.name, goalMin: c.goalMin })

router.post('/classes', ...teacher, async (req, res, next) => {
  try {
    if ((await practiceStore.listClasses(req.user.id)).length >= 20) return res.status(400).json({ error: 'Class limit reached' })
    const c = await practiceStore.createClass(req.user.id, { name: cleanName(req.body?.name, 40) || 'Class', goalMin: goal(req.body?.goalMin) })
    res.status(201).json({ class: publicClass(c) })
  } catch (err) { next(err) }
})

router.get('/classes', ...teacher, async (req, res, next) => {
  try { res.json({ classes: (await practiceStore.listClasses(req.user.id)).map(publicClass) }) } catch (err) { next(err) }
})

router.patch('/classes/:code', ...teacher, async (req, res, next) => {
  try {
    const c = await ownClass(req, res); if (!c) return
    const patch = {}
    if (req.body?.goalMin != null) patch.goalMin = goal(req.body.goalMin)
    if (req.body?.name != null) patch.name = cleanName(req.body.name, 40) || c.name
    res.json({ class: publicClass(await practiceStore.updateClass(c.code, patch)) })
  } catch (err) { next(err) }
})

router.delete('/classes/:code', ...teacher, async (req, res, next) => {
  try {
    const c = await ownClass(req, res); if (!c) return
    await practiceStore.deleteClass(c.code)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

router.delete('/classes/:code/students/:id', ...teacher, async (req, res, next) => {
  try {
    const c = await ownClass(req, res); if (!c) return
    if (!(await practiceStore.removeStudent(c.code, req.params.id))) return res.status(404).json({ error: 'Student not found' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

/** Per-student per-day rows plus week totals for the dashboard. */
router.get('/classes/:code/report', ...teacher, async (req, res, next) => {
  try {
    const c = await ownClass(req, res); if (!c) return
    const to = DAY_RE.test(req.query.to) ? req.query.to : dayStr(new Date())
    const fromDefault = dayStr(new Date(Date.parse(`${to}T00:00:00Z`) - 6 * 86400000))
    let from = DAY_RE.test(req.query.from) ? req.query.from : fromDefault
    if (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`) > 62 * 86400000) from = fromDefault
    const [students, rows] = await Promise.all([practiceStore.listStudents(c.code), practiceStore.listDays(c.code, from, to)])
    const byStudent = new Map(students.map((s) => [s.id, []]))
    for (const r of rows) byStudent.get(r.studentId)?.push(r)
    res.json({
      class: publicClass(c), from, to,
      students: students.map((s) => {
        const days = (byStudent.get(s.id) || []).map(({ studentId, ...d }) => d).sort((a, b) => (a.day < b.day ? -1 : 1))
        const sum = (k) => days.reduce((n, d) => n + (d[k] || 0), 0)
        const answered = sum('answered')
        return {
          id: s.id, name: s.name, days,
          total: {
            activeMin: sum('activeMin'), prayerMin: sum('prayerMin'), sessions: sum('sessions'), items: sum('items'),
            accuracy: answered ? Math.round((100 * sum('correct')) / answered) : null,
            daysMetGoal: days.filter((d) => d.activeMin >= c.goalMin).length,
            flags: days.reduce((n, d) => n + d.flags.rapidTap + d.flags.randomTap + d.flags.audioLoop, 0),
          },
        }
      }),
    })
  } catch (err) { next(err) }
})

router.post('/join', joinLimit, async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    const name = cleanName(req.body?.name, 16)
    if (!CODE_RE.test(code) || !name) return res.status(400).json({ error: 'Class code and first name are required' })
    const c = await practiceStore.findClass(code)
    if (!c) return res.status(404).json({ error: 'Unknown class code' })
    if ((await practiceStore.countStudents(code)) >= MAX_STUDENTS) return res.status(409).json({ error: 'Class is full' })
    const token = crypto.randomBytes(32).toString('base64url')
    await practiceStore.addStudent(code, name, sha256(token))
    res.status(201).json({ token, className: c.name, goalMin: c.goalMin })
  } catch (err) { next(err) }
})

export function cleanRow(r) {
  if (!r || !DAY_RE.test(r.day)) return null
  const answered = int(r.answered, 0, 20000)
  const activeMin = int(r.activeMin, 0, 1440)
  return {
    day: r.day, prayerMin: int(r.prayerMin, 0, activeMin),
    activeMin: int(r.activeMin, 0, 1440), sessions: int(r.sessions, 0, 500), items: int(r.items, 0, 20000),
    answered, correct: int(r.correct, 0, answered), lessons: int(r.lessons, 0, 500), games: int(r.games, 0, 500),
    flags: { rapidTap: int(r.flags?.rapidTap, 0, 500), randomTap: int(r.flags?.randomTap, 0, 500), audioLoop: int(r.flags?.audioLoop, 0, 500) },
  }
}

router.post('/sync', syncLimit, async (req, res, next) => {
  try {
    const h = req.headers.authorization || ''
    if (!h.startsWith('Student ')) return res.status(401).json({ error: 'Missing student token' })
    const student = await practiceStore.findStudentByTokenHash(sha256(h.slice(8).trim()))
    if (!student) return res.status(401).json({ error: 'Unknown student token' })
    const c = await practiceStore.findClass(student.classCode)
    if (!c) return res.status(410).json({ error: 'Class was removed' })
    const days = Array.isArray(req.body?.days) ? req.body.days.slice(0, 60) : []
    // no future rows beyond tomorrow (timezones), nothing older than 62 days
    const max = dayStr(new Date(Date.now() + 86400000))
    const min = dayStr(new Date(Date.now() - 62 * 86400000))
    let saved = 0
    for (const raw of days) {
      const row = cleanRow(raw)
      if (!row || row.day > max || row.day < min) continue
      await practiceStore.upsertDay(student, row)
      saved += 1
    }
    // Homework results: only for homework this class actually set.
    let turnedIn = 0
    const hw = Array.isArray(req.body?.homework) ? req.body.homework.slice(0, 20) : []
    for (const raw of hw) {
      const seed = Math.round(Number(raw?.seed))
      const h = Number.isInteger(seed) && (await practiceStore.findHomework(c.code, seed))
      if (!h) continue
      const total = int(raw.total, 1, 20)
      await practiceStore.addSubmission(student, {
        seed, total, score: int(raw.score, 0, total), day: dayStr(new Date()),
        missed: cleanFamilies(raw.missed).filter((f) => h.familyIds.includes(f)).slice(0, 12),
      })
      turnedIn += 1
    }
    res.json({ ok: true, saved, turnedIn, goalMin: c.goalMin })
  } catch (err) { next(err) }
})

/* ── homework (set on the web dashboard; results arrive with /sync) ── */
const FAMILY_RE = /^[a-z]{1,6}$/
const cleanFamilies = (raw) => [...new Set((Array.isArray(raw) ? raw : []).map(String).filter((f) => FAMILY_RE.test(f)))].slice(0, 40)

router.post('/classes/:code/homework', ...teacher, async (req, res, next) => {
  try {
    const c = await ownClass(req, res); if (!c) return
    const familyIds = cleanFamilies(req.body?.familyIds)
    const due = String(req.body?.due || '')
    if (!familyIds.length || !DAY_RE.test(due)) return res.status(400).json({ error: 'Pick letter families and a due date' })
    const list = await practiceStore.listHomework(c.code)
    if (list.length >= 100) return res.status(400).json({ error: 'Homework limit reached' })
    let seed
    do seed = crypto.randomInt(1, 1000000); while (list.some((h) => h.seed === seed))
    const orders = [...new Set((Array.isArray(req.body?.orders) ? req.body.orders : [1]).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort()
    const hw = await practiceStore.addHomework(c.code, {
      seed, title: cleanName(req.body?.title, 60) || 'Homework', familyIds, count: int(req.body?.count ?? 10, 3, 20), due, orders: orders.length ? orders : [1],
    })
    res.status(201).json({ homework: hw })
  } catch (err) { next(err) }
})

router.get('/classes/:code/homework', ...teacher, async (req, res, next) => {
  try {
    const c = await ownClass(req, res); if (!c) return
    res.json({ homework: await practiceStore.listHomework(c.code) })
  } catch (err) { next(err) }
})

router.delete('/classes/:code/homework/:seed', ...teacher, async (req, res, next) => {
  try {
    const c = await ownClass(req, res); if (!c) return
    if (!(await practiceStore.deleteHomework(c.code, Number(req.params.seed)))) return res.status(404).json({ error: 'Homework not found' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

/** Tally family ids into [{id, misses, students}] sorted by misses. */
export function troubleLetters(subs, limit = 8) {
  const m = new Map()
  for (const s of subs) for (const f of s.missed || []) {
    const e = m.get(f) || { id: f, misses: 0, students: new Set() }
    e.misses += 1; e.students.add(s.studentId); m.set(f, e)
  }
  return [...m.values()].sort((a, b) => b.misses - a.misses || (a.id < b.id ? -1 : 1)).slice(0, limit)
    .map((e) => ({ id: e.id, misses: e.misses, students: e.students.size }))
}

/** The live roster: everything the dashboard table needs in one call. */
router.get('/classes/:code/roster', ...teacher, async (req, res, next) => {
  try {
    const c = await ownClass(req, res); if (!c) return
    const to = dayStr(new Date())
    const from = dayStr(new Date(Date.now() - 6 * 86400000))
    const [students, week, all, homework, subs] = await Promise.all([
      practiceStore.listStudents(c.code), practiceStore.listDays(c.code, from, to),
      practiceStore.listDays(c.code, '0000-00-00', to), practiceStore.listHomework(c.code), practiceStore.listSubmissions(c.code),
    ])
    res.json({
      class: publicClass(c), from, to,
      homework: homework.map((h) => {
        const got = subs.filter((s) => s.seed === h.seed)
        return { ...h, turnedIn: got.length, missing: students.length - got.length, overdue: h.due < to }
      }),
      trouble: troubleLetters(subs),
      students: students.map((s) => {
        const mine = week.filter((d) => d.studentId === s.id)
        const ever = all.filter((d) => d.studentId === s.id).map((d) => d.day).sort()
        const sum = (k) => mine.reduce((n, d) => n + (d[k] || 0), 0)
        const answered = sum('answered')
        const done = subs.filter((x) => x.studentId === s.id)
        return {
          id: s.id, name: s.name,
          lastActive: ever[ever.length - 1] || null,
          week: {
            activeMin: sum('activeMin'), prayerMin: sum('prayerMin'), sessions: sum('sessions'), lessons: sum('lessons'),
            accuracy: answered ? Math.round((100 * sum('correct')) / answered) : null,
            daysMetGoal: mine.filter((d) => d.activeMin >= c.goalMin).length,
          },
          homework: homework.map((h) => {
            const d = done.find((x) => x.seed === h.seed)
            return d ? { seed: h.seed, status: 'done', score: d.score, total: d.total } : { seed: h.seed, status: h.due < to ? 'missing' : 'open' }
          }),
          trouble: troubleLetters(done, 4).map((t) => t.id),
        }
      }),
    })
  } catch (err) { next(err) }
})

export default router
