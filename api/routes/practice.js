/* Practice class view: teachers see verified daily practice per student.

   Teacher side  (Bearer JWT, role teacher, verified email - the existing
                  accounts system):
     POST   /api/practice/classes                 {name, goalMin} -> {class}
     GET    /api/practice/classes                 -> {classes}
     PATCH  /api/practice/classes/:code           {goalMin?, name?}
     DELETE /api/practice/classes/:code           (deletes students + rows)
     GET    /api/practice/classes/:code/report?from=YYYY-MM-DD&to=YYYY-MM-DD
     DELETE /api/practice/classes/:code/students/:id
   Child side (no account; the class join code is the invitation):
     POST   /api/practice/join   {code, name}  -> {token, className, goalMin}
     POST   /api/practice/sync   Authorization: Student <token>  {days:[row]}
            -> {ok, goalMin}
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
            activeMin: sum('activeMin'), sessions: sum('sessions'), items: sum('items'),
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
  return {
    day: r.day,
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
    res.json({ ok: true, saved, goalMin: c.goalMin })
  } catch (err) { next(err) }
})

export default router
