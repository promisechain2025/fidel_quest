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
  const child = new mongoose.Schema({
    parentId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    teacherId: { type: String, default: '' }, // approved teacher this child learns with
    teacherSince: { type: String, default: '' }, // YYYY-MM-DD of the link
  }, { timestamps: true })
  const snapshot = new mongoose.Schema({
    childId: { type: String, required: true, index: true },
    parentId: { type: String, required: true, index: true },
    day: { type: String, required: true },
    letters: Number, streak: Number, mask: String, nodesDone: Number, nodesTotal: Number,
  }, { timestamps: true })
  snapshot.index({ childId: 1, day: 1 }, { unique: true })
  const review = new mongoose.Schema({
    teacherId: { type: String, required: true, index: true },
    parentId: { type: String, required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    commentStatus: { type: String, default: 'pending' }, // pending | approved | rejected
  }, { timestamps: true })
  review.index({ teacherId: 1, parentId: 1 }, { unique: true })
  const order = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    email: String,
    product: { type: String, default: 'app' },
    status: { type: String, default: 'paid' },
  }, { timestamps: true })
  return {
    User: mongoose.models.User || mongoose.model('User', user),
    TeacherApplication: mongoose.models.TeacherApplication || mongoose.model('TeacherApplication', teacherApplication),
    WaitlistEntry: mongoose.models.WaitlistEntry || mongoose.model('WaitlistEntry', waitlistEntry),
    ContactMessage: mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessage),
    Order: mongoose.models.Order || mongoose.model('Order', order),
    Child: mongoose.models.Child || mongoose.model('Child', child),
    Snapshot: mongoose.models.Snapshot || mongoose.model('Snapshot', snapshot),
    Review: mongoose.models.Review || mongoose.model('Review', review),
  }
}

/* ---- in-memory backend ---- */
const mem = { users: [], teacherApplications: [], waitlistEntries: [], contactMessages: [], orders: [], children: [], snapshots: [], reviews: [], seq: 0 }
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

  /** Owner moderation: approve/archive a teacher application. Approved ones
      appear in the PUBLIC directory (listApprovedTeachers - no emails). */
  async setTeacherStatus(id, status) {
    if (useMongo) return M.TeacherApplication.findByIdAndUpdate(id, { status }, { new: true }).lean().catch(() => null)
    const doc = mem.teacherApplications.find((t) => t._id === String(id))
    if (!doc) return null
    doc.status = status
    return clone(doc)
  },
  async listApprovedTeachers() {
    const pick = ({ _id, name, languages, subjects, location }) => ({ id: String(_id), name, languages, subjects, location })
    const base = useMongo
      ? (await M.TeacherApplication.find({ status: 'approved' }).sort({ updatedAt: -1 }).limit(200).lean()).map(pick)
      : mem.teacherApplications.filter((t) => t.status === 'approved').map(pick)
    // The trust board: attach rating + progress-verified performance.
    const enriched = await Promise.all(base.map(async (te) => ({
      ...te,
      rating: await this.teacherRating(te.id),
      progress: await this.teacherProgressStats(te.id),
    })))
    // Best-evidenced teachers first: rating, then verified progress.
    return enriched.sort((a, b) =>
      (b.rating.avg - a.rating.avg) || (b.rating.count - a.rating.count) || (b.progress.students - a.progress.students))
  },

  /* ---- reviews (one per parent per teacher; stars aggregate instantly,
          comments appear only after owner approval) -------------------- */
  async upsertReview(parentId, teacherId, { stars, comment }) {
    const doc = {
      teacherId: String(teacherId), parentId, stars,
      comment: comment || '',
      commentStatus: comment ? 'pending' : 'approved',
    }
    if (useMongo) {
      await M.Review.findOneAndUpdate({ teacherId: String(teacherId), parentId }, doc, { upsert: true })
      return doc
    }
    const i = mem.reviews.findIndex((r) => r.teacherId === String(teacherId) && r.parentId === parentId)
    if (i >= 0) mem.reviews[i] = { ...mem.reviews[i], ...doc }
    else mem.reviews.push(memDoc(doc))
    return doc
  },
  async teacherRating(teacherId) {
    const rows = useMongo
      ? await M.Review.find({ teacherId: String(teacherId) }).lean()
      : mem.reviews.filter((r) => r.teacherId === String(teacherId))
    if (!rows.length) return { avg: 0, count: 0 }
    const avg = rows.reduce((s, r) => s + r.stars, 0) / rows.length
    return { avg: Math.round(avg * 10) / 10, count: rows.length }
  },
  async listApprovedComments(teacherId, limit = 6) {
    const rows = useMongo
      ? await M.Review.find({ teacherId: String(teacherId), commentStatus: 'approved', comment: { $ne: '' } }).sort({ updatedAt: -1 }).limit(limit).lean()
      : mem.reviews.filter((r) => r.teacherId === String(teacherId) && r.commentStatus === 'approved' && r.comment).slice(-limit).reverse()
    return rows.map((r) => ({ stars: r.stars, comment: r.comment }))
  },
  async listPendingComments() {
    const rows = useMongo
      ? await M.Review.find({ commentStatus: 'pending', comment: { $ne: '' } }).limit(200).lean()
      : mem.reviews.filter((r) => r.commentStatus === 'pending' && r.comment)
    return rows.map((r) => ({ id: String(r._id), teacherId: r.teacherId, stars: r.stars, comment: r.comment }))
  },
  async setCommentStatus(reviewId, status) {
    if (useMongo) return !!(await M.Review.findByIdAndUpdate(reviewId, { commentStatus: status }).catch(() => null))
    const r = mem.reviews.find((x) => x._id === String(reviewId))
    if (!r) return false
    r.commentStatus = status
    return true
  },

  /* ---- child <-> teacher link + progress-verified performance --------- */
  async setChildTeacher(parentId, childId, teacherId, sinceDay) {
    const owned = await this.findChild(parentId, childId)
    if (!owned) return null
    if (useMongo) {
      await M.Child.findByIdAndUpdate(childId, { teacherId: teacherId || '', teacherSince: teacherId ? sinceDay : '' })
      return this.findChild(parentId, childId)
    }
    const c = mem.children.find((x) => x._id === String(childId))
    c.teacherId = teacherId || ''
    c.teacherSince = teacherId ? sinceDay : ''
    return this.findChild(parentId, childId)
  },
  /** Verified performance: for every child linked to this teacher, the
      letters gained between their first and latest snapshot AFTER the link
      day. Children need at least 2 post-link snapshots to contribute a
      gain; all linked children count as students. */
  async teacherProgressStats(teacherId) {
    const kids = useMongo
      ? await M.Child.find({ teacherId: String(teacherId) }).lean()
      : mem.children.filter((c) => c.teacherId === String(teacherId))
    let students = 0
    const gains = []
    for (const kid of kids) {
      students += 1
      const snaps = (useMongo
        ? await M.Snapshot.find({ childId: String(kid._id) }).sort({ day: 1 }).lean()
        : mem.snapshots.filter((s) => s.childId === String(kid._id)).sort((a, b) => (a.day < b.day ? -1 : 1)))
        .filter((s) => !kid.teacherSince || s.day >= kid.teacherSince)
      if (snaps.length >= 2) gains.push(snaps[snaps.length - 1].letters - snaps[0].letters)
    }
    return {
      students,
      verified: gains.length,
      avgLettersGained: gains.length ? Math.round(gains.reduce((a, b) => a + b, 0) / gains.length) : 0,
    }
  },

  async findOrderBySessionId(sessionId) {
    if (useMongo) return M.Order.findOne({ sessionId }).lean()
    return clone(mem.orders.find((o) => o.sessionId === sessionId) || null)
  },
  async orderCodeExists(code) {
    if (useMongo) return !!(await M.Order.exists({ code }))
    return mem.orders.some((o) => o.code === code)
  },

  /** Atomic claim shared by the webhook and the success-page poll: create the
      order only if this sessionId has never been fulfilled. Returns
      { order, created } - the caller must email the buyer ONLY when
      created === true (exactly-once across webhook, retries, and polling).
      Mongo: $setOnInsert upsert against the unique sessionId index.
      Memory: synchronous check-and-push (no await between find and push),
      atomic on Node's single-threaded event loop. */
  async createOrderIfAbsent({ sessionId, email, code, product = 'app' }) {
    if (useMongo) {
      const res = await M.Order.findOneAndUpdate(
        { sessionId },
        { $setOnInsert: { sessionId, email, code, product, status: 'paid' } },
        { upsert: true, new: true, rawResult: true },
      )
      const order = res.value?.toObject ? res.value.toObject() : res.value
      return { order, created: !res.lastErrorObject?.updatedExisting }
    }
    const existing = mem.orders.find((o) => o.sessionId === sessionId)
    if (existing) return { order: clone(existing), created: false }
    const doc = memDoc({ sessionId, email, code, product, status: 'paid' })
    mem.orders.push(doc)
    return { order: clone(doc), created: true }
  },

  /* ---- child profiles + progress snapshots (parent-owned) ------------- */
  async listChildren(parentId) {
    const pick = (c) => ({ id: String(c._id), name: c.name, teacherId: c.teacherId || '', teacherSince: c.teacherSince || '' })
    if (useMongo) return (await M.Child.find({ parentId }).sort({ createdAt: 1 }).lean()).map(pick)
    return mem.children.filter((c) => c.parentId === parentId).map(pick)
  },
  async createChild(parentId, name) {
    if (useMongo) { const c = await M.Child.create({ parentId, name }); return { id: String(c._id), name: c.name } }
    const doc = memDoc({ parentId, name }); mem.children.push(doc); return { id: doc._id, name: doc.name }
  },
  async findChild(parentId, childId) {
    if (useMongo) {
      const c = await M.Child.findById(childId).lean().catch(() => null)
      return c && c.parentId === parentId ? { id: String(c._id), name: c.name, teacherId: c.teacherId || '', teacherSince: c.teacherSince || '' } : null
    }
    const c = mem.children.find((x) => x._id === String(childId) && x.parentId === parentId)
    return c ? { id: c._id, name: c.name, teacherId: c.teacherId || '', teacherSince: c.teacherSince || '' } : null
  },
  async deleteChild(parentId, childId) {
    const owned = await this.findChild(parentId, childId)
    if (!owned) return false
    if (useMongo) {
      await M.Snapshot.deleteMany({ childId: String(childId), parentId })
      await M.Child.deleteOne({ _id: childId })
      return true
    }
    mem.snapshots = mem.snapshots.filter((s) => s.childId !== String(childId))
    mem.children = mem.children.filter((c) => c._id !== String(childId))
    return true
  },
  /** One snapshot per child per day - re-saving the same day overwrites. */
  async saveSnapshot(parentId, childId, snap) {
    const doc = { childId: String(childId), parentId, ...snap }
    if (useMongo) {
      await M.Snapshot.findOneAndUpdate({ childId: String(childId), day: snap.day }, doc, { upsert: true })
      return doc
    }
    const i = mem.snapshots.findIndex((s) => s.childId === String(childId) && s.day === snap.day)
    if (i >= 0) mem.snapshots[i] = { ...mem.snapshots[i], ...doc }
    else mem.snapshots.push(memDoc(doc))
    return doc
  },
  async listSnapshots(parentId, childId) {
    const pick = ({ day, letters, streak, mask, nodesDone, nodesTotal }) => ({ day, letters, streak, mask, nodesDone, nodesTotal })
    if (useMongo) return (await M.Snapshot.find({ childId: String(childId), parentId }).sort({ day: 1 }).limit(400).lean()).map(pick)
    return mem.snapshots.filter((s) => s.childId === String(childId) && s.parentId === parentId)
      .sort((a, b) => (a.day < b.day ? -1 : 1)).map(pick)
  },

  /* test helper - memory backend only */
  _reset() { mem.users = []; mem.teacherApplications = []; mem.waitlistEntries = []; mem.contactMessages = []; mem.orders = []; mem.children = []; mem.snapshots = []; mem.reviews = []; mem.seq = 0 },
}
