/* Practice class-view storage (teacher classes, students, daily rows).
   Same two-backend contract as store.js: Mongo when MONGO_URI is set,
   in-memory otherwise. Privacy-light by design: a student is a first
   name/nickname inside one class; the only secret is the SHA-256 hash of
   the student's sync token (the raw token lives only on the child device). */
import crypto from 'node:crypto'
import mongoose from 'mongoose'
import config from './config.js'

const useMongo = Boolean(config.mongoURI)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')

export function newJoinCode(len = 6) {
  const bytes = crypto.randomBytes(len)
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

let M = null
function models() {
  if (M) return M
  const pclass = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    teacherId: { type: String, required: true, index: true },
    name: { type: String, maxlength: 40 },
    goalMin: { type: Number, default: 60 },
  }, { timestamps: true })
  const pstudent = new mongoose.Schema({
    classCode: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 16 },
    tokenHash: { type: String, required: true, unique: true },
  }, { timestamps: true })
  const pday = new mongoose.Schema({
    studentId: { type: String, required: true },
    classCode: { type: String, required: true, index: true },
    day: { type: String, required: true },
    activeMin: Number, prayerMin: Number, sessions: Number, items: Number, answered: Number, correct: Number,
    lessons: Number, games: Number,
    flags: { rapidTap: Number, randomTap: Number, audioLoop: Number },
  }, { timestamps: true })
  pday.index({ studentId: 1, day: 1 }, { unique: true })
  pday.index({ classCode: 1, day: 1 })
  M = {
    PClass: mongoose.models.PracticeClass || mongoose.model('PracticeClass', pclass),
    PStudent: mongoose.models.PracticeStudent || mongoose.model('PracticeStudent', pstudent),
    PDay: mongoose.models.PracticeDay || mongoose.model('PracticeDay', pday),
  }
  return M
}

const mem = { classes: [], students: [], days: [], seq: 0 }
const id = () => String(++mem.seq)
const pickClass = (c) => ({ code: c.code, name: c.name || '', goalMin: c.goalMin, teacherId: c.teacherId })
const pickStudent = (s) => ({ id: String(s._id), name: s.name, classCode: s.classCode })
const DAY_FIELDS = ['day', 'activeMin', 'prayerMin', 'sessions', 'items', 'answered', 'correct', 'lessons', 'games', 'flags']
const pickDay = (d) => Object.fromEntries(DAY_FIELDS.map((k) => [k, k === 'flags' ? { rapidTap: d.flags?.rapidTap || 0, randomTap: d.flags?.randomTap || 0, audioLoop: d.flags?.audioLoop || 0 } : d[k]]))

const withDefaults = (d) => ({ ...d, prayerMin: d.prayerMin || 0 })
export const practiceStore = {
  async createClass(teacherId, { name, goalMin }) {
    for (let i = 0; i < 8; i++) {
      const code = newJoinCode()
      if (await this.findClass(code)) continue
      const doc = { code, teacherId, name, goalMin }
      if (useMongo) await models().PClass.create(doc)
      else mem.classes.push({ ...doc, _id: id() })
      return pickClass(doc)
    }
    throw new Error('could not allocate a join code')
  },
  async findClass(code) {
    const c = useMongo ? await models().PClass.findOne({ code }).lean() : mem.classes.find((x) => x.code === code)
    return c ? pickClass(c) : null
  },
  async listClasses(teacherId) {
    const rows = useMongo ? await models().PClass.find({ teacherId }).sort({ createdAt: 1 }).lean() : mem.classes.filter((c) => c.teacherId === teacherId)
    return rows.map(pickClass)
  },
  async updateClass(code, patch) {
    if (useMongo) await models().PClass.updateOne({ code }, patch)
    else Object.assign(mem.classes.find((c) => c.code === code) || {}, patch)
    return this.findClass(code)
  },
  async deleteClass(code) {
    if (useMongo) {
      const m = models()
      await Promise.all([m.PDay.deleteMany({ classCode: code }), m.PStudent.deleteMany({ classCode: code }), m.PClass.deleteOne({ code })])
      return
    }
    mem.days = mem.days.filter((d) => d.classCode !== code)
    mem.students = mem.students.filter((s) => s.classCode !== code)
    mem.classes = mem.classes.filter((c) => c.code !== code)
  },
  async countStudents(code) {
    return useMongo ? models().PStudent.countDocuments({ classCode: code }) : mem.students.filter((s) => s.classCode === code).length
  },
  async addStudent(code, name, tokenHash) {
    if (useMongo) { const s = await models().PStudent.create({ classCode: code, name, tokenHash }); return pickStudent(s) }
    const s = { _id: id(), classCode: code, name, tokenHash }
    mem.students.push(s)
    return pickStudent(s)
  },
  async findStudentByTokenHash(tokenHash) {
    const s = useMongo ? await models().PStudent.findOne({ tokenHash }).lean() : mem.students.find((x) => x.tokenHash === tokenHash)
    return s ? pickStudent(s) : null
  },
  async listStudents(code) {
    const rows = useMongo ? await models().PStudent.find({ classCode: code }).sort({ name: 1 }).lean() : mem.students.filter((s) => s.classCode === code)
    return rows.map(pickStudent)
  },
  async removeStudent(code, studentId) {
    if (useMongo) {
      const m = models()
      const r = await m.PStudent.deleteOne({ _id: studentId, classCode: code }).catch(() => ({ deletedCount: 0 }))
      await m.PDay.deleteMany({ studentId: String(studentId) })
      return r.deletedCount > 0
    }
    const before = mem.students.length
    mem.students = mem.students.filter((s) => !(s._id === String(studentId) && s.classCode === code))
    mem.days = mem.days.filter((d) => d.studentId !== String(studentId))
    return mem.students.length < before
  },
  /** One row per student per day; re-syncing a day overwrites it. */
  async upsertDay(student, row) {
    const doc = { studentId: student.id, classCode: student.classCode, ...row }
    if (useMongo) { await models().PDay.findOneAndUpdate({ studentId: student.id, day: row.day }, doc, { upsert: true }); return }
    const i = mem.days.findIndex((d) => d.studentId === student.id && d.day === row.day)
    if (i >= 0) mem.days[i] = doc
    else mem.days.push(doc)
  },
  async listDays(code, from, to) {
    const rows = useMongo
      ? await models().PDay.find({ classCode: code, day: { $gte: from, $lte: to } }).lean()
      : mem.days.filter((d) => d.classCode === code && d.day >= from && d.day <= to)
    return rows.map((d) => withDefaults({ studentId: d.studentId, ...pickDay(d) }))
  },
  _reset() { mem.classes = []; mem.students = []; mem.days = []; mem.seq = 0 },
}
