/* Storage layer with two backends behind one tiny surface:
   - Mongo (mongoose) when MONGO_URI is set - production.
   - In-memory maps otherwise - dev and tests run with zero services.
   The surface is deliberately small: users by unique email, plus three
   append-mostly collections with list().                                    */
import mongoose from 'mongoose'
import config from './config.js'

const useMongo = Boolean(config.mongoURI)

/* Bayesian-shrunk rating score for ranking: pulls small samples toward a
   neutral prior (PRIOR_MEAN with weight PRIOR_WEIGHT) so one 5-star cannot
   outrank an established track record. The prior is the 1-5 midpoint (3.0):
   an unproven teacher sits at neutral, and it takes PRIOR_WEIGHT reviews'
   worth of evidence to move halfway to the true average. This is what lets
   four honest 4-star reviews outrank a single (possibly self-dealt) 5-star.
   Returns 0 for unrated teachers. */
const PRIOR_MEAN = 3.0
const PRIOR_WEIGHT = 5
export function rankScore({ avg = 0, count = 0 } = {}) {
  if (!count) return 0
  return (avg * count + PRIOR_MEAN * PRIOR_WEIGHT) / (count + PRIOR_WEIGHT)
}

/* A teacher's verified badge is only shown once at least this many linked
   students have a measurable post-link gain - one data point is noise. */
export const MIN_VERIFIED_STUDENTS = 2

/* ---- mongoose schemas (only compiled when Mongo is in play) ---- */
let M = null
function buildModels() {
  const user = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['parent', 'teacher'], default: 'parent' },
    emailVerified: { type: Boolean, default: false },
    verifyToken: { type: String, default: '', index: true },
  }, { timestamps: true })
  const teacherApplication = new mongoose.Schema({
    name: String, email: String, languages: [String],
    // `subjectTags`: structured taxonomy ids (filterable board facet).
    // `subjects`: optional free-text focus/details (e.g. "grades 3-6").
    subjectTags: [String], subjects: String,
    experience: String, location: String, message: String,
    status: { type: String, default: 'new' },
  }, { timestamps: true })
  teacherApplication.index({ status: 1 })          // listApprovedTeachers
  teacherApplication.index({ email: 1, status: 1 }) // findApplicationByEmail
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
  review.index({ commentStatus: 1 }) // listPendingComments
  const introRequest = new mongoose.Schema({
    teacherId: { type: String, required: true, index: true },
    parentId: { type: String, required: true, index: true },
    childName: String,
    message: String,
    status: { type: String, default: 'new' }, // new | accepted | declined
  }, { timestamps: true })
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
    IntroRequest: mongoose.models.IntroRequest || mongoose.model('IntroRequest', introRequest),
  }
}

/* ---- in-memory backend ---- */
const mem = { users: [], teacherApplications: [], waitlistEntries: [], contactMessages: [], orders: [], children: [], snapshots: [], reviews: [], intros: [], seq: 0 }
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
  async createUser({ name, email, passwordHash, role, verifyToken }) {
    const e = String(email).toLowerCase().trim()
    const fields = { name, email: e, passwordHash, role, emailVerified: false, verifyToken }
    if (useMongo) return (await M.User.create(fields)).toObject()
    const doc = memDoc(fields)
    mem.users.push(doc)
    return clone(doc)
  },
  async setVerifyToken(id, token) {
    if (useMongo) { await M.User.findByIdAndUpdate(id, { verifyToken: token }); return }
    const u = mem.users.find((x) => x._id === String(id))
    if (u) u.verifyToken = token
  },
  /** Consume a verification token: marks the account verified. Returns the
      user (or null for an unknown/spent token). */
  async verifyEmailToken(token) {
    if (!token) return null
    if (useMongo) {
      const u = await M.User.findOneAndUpdate({ verifyToken: token }, { emailVerified: true, verifyToken: '' }, { new: true }).lean()
      return u || null
    }
    const u = mem.users.find((x) => x.verifyToken === token)
    if (!u) return null
    u.emailVerified = true
    u.verifyToken = ''
    return clone(u)
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
    const pick = ({ _id, name, languages, subjectTags, subjects, location }) => ({ id: String(_id), name, languages, subjectTags: subjectTags || [], subjects, location })
    const base = useMongo
      ? (await M.TeacherApplication.find({ status: 'approved' }).sort({ updatedAt: -1 }).limit(200).lean()).map(pick)
      : [...mem.teacherApplications].filter((t) => t.status === 'approved').reverse().map(pick)
    // The trust board: attach rating + progress-verified performance.
    const enriched = await Promise.all(base.map(async (te) => ({
      ...te,
      rating: await this.teacherRating(te.id),
      progress: await this.teacherProgressStats(te.id, te.subjectTags),
    })))
    // Rank by a shrunk score, not raw average: a single 5-star must not
    // outrank a large honest sample (Bayesian pull toward a neutral prior).
    // Verified-progress students never rank a teacher (they are gameable);
    // a stable name tiebreak keeps both backends deterministic.
    const rank = (t) => rankScore(t.rating)
    return enriched.sort((a, b) => (rank(b) - rank(a)) || a.name.localeCompare(b.name))
  },

  /* ---- reviews (one per parent per teacher; stars aggregate instantly,
          comments appear only after owner approval) -------------------- */
  async upsertReview(parentId, teacherId, { stars, comment }) {
    // Only overwrite the comment when one is actually supplied, so a
    // stars-only re-rate never erases a previously written (or approved)
    // review.
    const doc = { teacherId: String(teacherId), parentId, stars }
    if (comment) { doc.comment = comment; doc.commentStatus = 'pending' }
    if (useMongo) {
      await M.Review.findOneAndUpdate({ teacherId: String(teacherId), parentId }, doc, { upsert: true, setDefaultsOnInsert: true })
      return doc
    }
    const i = mem.reviews.findIndex((r) => r.teacherId === String(teacherId) && r.parentId === parentId)
    if (i >= 0) mem.reviews[i] = { ...mem.reviews[i], ...doc }
    else mem.reviews.push(memDoc({ comment: '', commentStatus: 'approved', ...doc }))
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
  /** Family-reported performance, now subject-aware.

      Two signals, both gated on a real (accepted-intro) relationship:

      1. `families` - the number of distinct families with a child linked to
         this teacher. An honest, non-gameable breadth signal for ANY subject
         (families vote with their feet), shown from the first link.

      2. The fidel LETTERS gain (the app-derived progress badge) - only
         meaningful for a teacher who actually teaches literacy. A child's
         fidel gameplay is the app's doing, so crediting a pure math tutor
         with "+letters" would be misattribution. We therefore scope the
         letters badge to literacy teachers (amharic/tigrinya, or legacy
         teachers with no tags, who predate the taxonomy and are assumed
         fidel). Per contributing child: letters gained between their first
         and latest snapshot AFTER the link day, with >= 2 post-link
         snapshots. `verified` counts contributing children; `show` gates the
         public letters badge until enough contribute (one point is noise).

      Credible per-subject gameplay progress for non-fidel subjects arrives
      with the in-app content tracks (see docs/general-learning-platform.md);
      we deliberately do NOT accept a family-typed score, which would be the
      exact gameable signal the trust review removed. */
  async teacherProgressStats(teacherId, subjectTags) {
    const kids = useMongo
      ? await M.Child.find({ teacherId: String(teacherId) }).lean()
      : mem.children.filter((c) => c.teacherId === String(teacherId))
    const families = new Set(kids.map((k) => String(k.parentId))).size
    const tags = Array.isArray(subjectTags) ? subjectTags : []
    const teachesLiteracy = tags.length === 0 || tags.includes('amharic') || tags.includes('tigrinya')
    const gains = []
    for (const kid of kids) {
      const snaps = (useMongo
        ? await M.Snapshot.find({ childId: String(kid._id) }).sort({ day: 1 }).lean()
        : mem.snapshots.filter((s) => s.childId === String(kid._id)).sort((a, b) => a.day.localeCompare(b.day)))
        .filter((s) => !kid.teacherSince || s.day >= kid.teacherSince)
      if (snaps.length >= 2) gains.push(snaps[snaps.length - 1].letters - snaps[0].letters)
    }
    const verified = gains.length
    return {
      students: kids.length,
      families,
      verified,
      teachesLiteracy,
      avgLettersGained: verified ? Math.round(gains.reduce((a, b) => a + b, 0) / verified) : 0,
      show: teachesLiteracy && verified >= MIN_VERIFIED_STUDENTS,
    }
  },

  /* ---- intro-gated linking: a parent may only link a teacher their child
          actually works with, i.e. an introduction the teacher accepted. -- */
  async hasAcceptedIntro(parentId, teacherId) {
    if (useMongo) return !!(await M.IntroRequest.exists({ parentId, teacherId: String(teacherId), status: 'accepted' }))
    return mem.intros.some((i) => i.parentId === parentId && i.teacherId === String(teacherId) && i.status === 'accepted')
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
      // Mongoose 8 dropped `rawResult`; `includeResultMetadata` returns the
      // ModifyResult ({ value, lastErrorObject }). Without this the money
      // path returns undefined and the exactly-once email guard inverts.
      const res = await M.Order.findOneAndUpdate(
        { sessionId },
        { $setOnInsert: { sessionId, email, code, product, status: 'paid' } },
        { upsert: true, new: true, includeResultMetadata: true },
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

  /* ---- introduction requests (the match broker) ----------------------- */
  /** The application row IS the teacher's board identity; a signed-in user
      whose account email equals the application email owns it. */
  async findApplicationByEmail(email) {
    const e = String(email).toLowerCase().trim()
    if (useMongo) {
      const a = await M.TeacherApplication.findOne({ email: e, status: 'approved' }).lean()
      return a ? { id: String(a._id), name: a.name, email: a.email } : null
    }
    const a = mem.teacherApplications.find((t) => t.email === e && t.status === 'approved')
    return a ? { id: a._id, name: a.name, email: a.email } : null
  },
  async findApplicationById(id) {
    if (useMongo) {
      const a = await M.TeacherApplication.findById(id).lean().catch(() => null)
      return a ? { id: String(a._id), name: a.name, email: a.email, status: a.status } : null
    }
    const a = mem.teacherApplications.find((t) => t._id === String(id))
    return a ? { id: a._id, name: a.name, email: a.email, status: a.status } : null
  },
  async createIntro({ teacherId, parentId, childName, message }) {
    const doc = { teacherId: String(teacherId), parentId, childName: childName || '', message: message || '', status: 'new' }
    if (useMongo) { const d = await M.IntroRequest.create(doc); return { ...doc, id: String(d._id) } }
    const d = memDoc(doc); mem.intros.push(d); return { ...doc, id: d._id }
  },
  async hasOpenIntro(parentId, teacherId) {
    if (useMongo) return !!(await M.IntroRequest.exists({ parentId, teacherId: String(teacherId), status: 'new' }))
    return mem.intros.some((i) => i.parentId === parentId && i.teacherId === String(teacherId) && i.status === 'new')
  },
  async findIntro(id) {
    if (useMongo) {
      const i = await M.IntroRequest.findById(id).lean().catch(() => null)
      return i ? { id: String(i._id), teacherId: i.teacherId, parentId: i.parentId, childName: i.childName, message: i.message, status: i.status } : null
    }
    const i = mem.intros.find((x) => x._id === String(id))
    return i ? { id: i._id, teacherId: i.teacherId, parentId: i.parentId, childName: i.childName, message: i.message, status: i.status } : null
  },
  async setIntroStatus(id, status) {
    if (useMongo) { await M.IntroRequest.findByIdAndUpdate(id, { status }); return true }
    const i = mem.intros.find((x) => x._id === String(id))
    if (!i) return false
    i.status = status
    return true
  },
  async listIntrosForParent(parentId) {
    const rows = useMongo
      ? await M.IntroRequest.find({ parentId }).sort({ createdAt: -1 }).limit(100).lean()
      : [...mem.intros].filter((i) => i.parentId === parentId).reverse()
    return Promise.all(rows.map(async (i) => {
      const app = await this.findApplicationById(i.teacherId)
      return { id: String(i._id), teacherId: String(i.teacherId), teacherName: app?.name || 'Teacher', childName: i.childName, status: i.status }
    }))
  },
  async listIntrosForTeacher(teacherId) {
    const rows = useMongo
      ? await M.IntroRequest.find({ teacherId: String(teacherId) }).sort({ createdAt: -1 }).limit(200).lean()
      : [...mem.intros].filter((i) => i.teacherId === String(teacherId)).reverse()
    return rows.map((i) => ({ id: String(i._id), childName: i.childName, message: i.message, status: i.status }))
  },

  /* test helpers - memory backend only */
  _peekVerifyToken(email) {
    const e = String(email).toLowerCase().trim()
    return mem.users.find((u) => u.email === e)?.verifyToken || ''
  },
  _reset() { mem.users = []; mem.teacherApplications = []; mem.waitlistEntries = []; mem.contactMessages = []; mem.orders = []; mem.children = []; mem.snapshots = []; mem.reviews = []; mem.intros = []; mem.seq = 0 },
}
