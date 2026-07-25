/* Storage layer with two backends behind one tiny surface:
   - Mongo (mongoose) when MONGO_URI is set - production.
   - In-memory maps otherwise - dev and tests run with zero services.
   The surface is deliberately small: users by unique email, plus three
   append-mostly collections with list().                                    */
import mongoose from 'mongoose'
import config from './config.js'

const useMongo = Boolean(config.mongoURI)

/* ---- mongoose schemas (only compiled when Mongo is in play) ---- */
let M = null
function buildModels() {
  const user = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['parent', 'teacher'], default: 'parent' },
  }, { timestamps: true })
  const teacherApplication = new mongoose.Schema({
    name: String, email: String, languages: [String], subjects: String,
    experience: String, location: String, message: String,
    status: { type: String, default: 'new' },
  }, { timestamps: true })
  const waitlistEntry = new mongoose.Schema({
    email: String, language: { type: String, default: 'ti' }, name: String,
  }, { timestamps: true })
  const contactMessage = new mongoose.Schema({
    name: String, email: String, message: String,
  }, { timestamps: true })
  return {
    User: mongoose.models.User || mongoose.model('User', user),
    TeacherApplication: mongoose.models.TeacherApplication || mongoose.model('TeacherApplication', teacherApplication),
    WaitlistEntry: mongoose.models.WaitlistEntry || mongoose.model('WaitlistEntry', waitlistEntry),
    ContactMessage: mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessage),
  }
}

/* ---- in-memory backend ---- */
const mem = { users: [], teacherApplications: [], waitlistEntries: [], contactMessages: [], seq: 0 }
const clone = (o) => JSON.parse(JSON.stringify(o))
const memDoc = (data) => ({ ...data, _id: String(++mem.seq), createdAt: new Date().toISOString() })

export async function connect() {
  if (!useMongo) return { backend: 'memory' }
  await mongoose.connect(config.mongoURI)
  M = buildModels()
  return { backend: 'mongo' }
}

export async function disconnect() {
  if (useMongo) await mongoose.disconnect()
}

export const store = {
  get backend() { return useMongo ? 'mongo' : 'memory' },

  async findUserByEmail(email) {
    const e = String(email).toLowerCase().trim()
    if (useMongo) return M.User.findOne({ email: e }).lean()
    return clone(mem.users.find((u) => u.email === e) || null)
  },
  async findUserById(id) {
    if (useMongo) return M.User.findById(id).lean().catch(() => null)
    return clone(mem.users.find((u) => u._id === String(id)) || null)
  },
  async createUser({ name, email, passwordHash, role }) {
    const e = String(email).toLowerCase().trim()
    if (useMongo) return (await M.User.create({ name, email: e, passwordHash, role })).toObject()
    const doc = memDoc({ name, email: e, passwordHash, role })
    mem.users.push(doc)
    return clone(doc)
  },

  async addTeacherApplication(data) {
    if (useMongo) return (await M.TeacherApplication.create({ ...data, status: 'new' })).toObject()
    const doc = memDoc({ ...data, status: 'new' }); mem.teacherApplications.push(doc); return clone(doc)
  },
  async addWaitlistEntry(data) {
    if (useMongo) return (await M.WaitlistEntry.create(data)).toObject()
    const doc = memDoc(data); mem.waitlistEntries.push(doc); return clone(doc)
  },
  async addContactMessage(data) {
    if (useMongo) return (await M.ContactMessage.create(data)).toObject()
    const doc = memDoc(data); mem.contactMessages.push(doc); return clone(doc)
  },

  async list(kind) {
    if (useMongo) {
      const model = { teachers: 'TeacherApplication', waitlist: 'WaitlistEntry', contact: 'ContactMessage' }[kind]
      return M[model].find().sort({ createdAt: -1 }).limit(500).lean()
    }
    const arr = { teachers: mem.teacherApplications, waitlist: mem.waitlistEntries, contact: mem.contactMessages }[kind]
    return clone([...arr].reverse())
  },

  /* test helper - memory backend only */
  _reset() { mem.users = []; mem.teacherApplications = []; mem.waitlistEntries = []; mem.contactMessages = []; mem.seq = 0 },
}
