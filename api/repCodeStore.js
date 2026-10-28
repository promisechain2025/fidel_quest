/* Representative unlock codes (Africa, where store payments are hard).
   Same two-backend contract as store.js / practiceStore.js: Mongo when
   MONGO_URI is set, in-memory otherwise.

   A rep is a local representative (id, name, country). The owner mints
   codes for one rep + one package; each code has maxUses (default 1) and an
   optional expiry. Only the SHA-256 of a code is stored, so a database leak
   does not leak usable codes. Redemptions record the install id (a random
   per-browser id, no PII) so the same browser re-entering its own code is
   not counted twice. */
import crypto from 'node:crypto'
import mongoose from 'mongoose'
import config from './config.js'

const useMongo = Boolean(config.mongoURI)
export const PACKAGES = Object.freeze(['core', 'prayer', 'bundle'])
const PKG_LETTER = { core: 'C', prayer: 'P', bundle: 'B' }
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
export const normalizeRepCode = (raw) => String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

const rand = (n) => Array.from(crypto.randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join('')
/** EGR-<pkg letter><rep id>-<8 random>. The visible parts are for humans
    (a rep can tell which package a code is); the server is the authority. */
export function newRepCode(pkg, repId) {
  return `EGR-${PKG_LETTER[pkg]}${repId}-${rand(4)}-${rand(4)}`
}

let M = null
function models() {
  if (M) return M
  const rep = new mongoose.Schema({
    repId: { type: String, required: true, unique: true },
    name: { type: String, maxlength: 60 },
    country: { type: String, maxlength: 2 },
    active: { type: Boolean, default: true },
  }, { timestamps: true })
  const code = new mongoose.Schema({
    hash: { type: String, required: true, unique: true },
    repId: { type: String, required: true, index: true },
    pkg: { type: String, required: true },
    maxUses: { type: Number, default: 1 },
    uses: { type: Number, default: 0 },
    installs: [String],
    expiresAt: Date,
    revoked: { type: Boolean, default: false },
    batch: String,
  }, { timestamps: true })
  M = {
    Rep: mongoose.models.Rep || mongoose.model('Rep', rep),
    RepCode: mongoose.models.RepCode || mongoose.model('RepCode', code),
  }
  return M
}

const mem = { reps: [], codes: [] }
const pickRep = (r) => ({ repId: r.repId, name: r.name || '', country: r.country || '', active: r.active !== false })
const pickCode = (c) => ({ repId: c.repId, pkg: c.pkg, maxUses: c.maxUses, uses: c.uses, expiresAt: c.expiresAt || null, revoked: !!c.revoked, batch: c.batch || '', createdAt: c.createdAt || null })

export const repCodeStore = {
  async upsertRep({ repId, name, country, active = true }) {
    const doc = { repId, name, country, active }
    if (useMongo) await models().Rep.updateOne({ repId }, doc, { upsert: true })
    else {
      const r = mem.reps.find((x) => x.repId === repId)
      if (r) Object.assign(r, doc)
      else mem.reps.push(doc)
    }
    return pickRep(doc)
  },
  async findRep(repId) {
    const r = useMongo ? await models().Rep.findOne({ repId }).lean() : mem.reps.find((x) => x.repId === repId)
    return r ? pickRep(r) : null
  },
  async listReps() {
    const rows = useMongo ? await models().Rep.find().sort({ repId: 1 }).lean() : [...mem.reps]
    return rows.map(pickRep)
  },
  /** Returns the plain codes ONCE; only hashes are kept. */
  async mint({ repId, pkg, count, maxUses = 1, expiresAt = null }) {
    const batch = `${repId}-${Date.now().toString(36)}`
    const codes = []
    for (let i = 0; i < count; i++) {
      const code = newRepCode(pkg, repId)
      const doc = { hash: sha256(normalizeRepCode(code)), repId, pkg, maxUses, uses: 0, installs: [], expiresAt, revoked: false, batch, createdAt: new Date() }
      if (useMongo) await models().RepCode.create(doc)
      else mem.codes.push(doc)
      codes.push(code)
    }
    return { batch, codes }
  },
  /** Atomic redeem. Returns { ok, pkg, repId } or { ok:false, reason }. */
  async redeem(rawCode, installId) {
    const hash = sha256(normalizeRepCode(rawCode))
    const now = new Date()
    const c = useMongo ? await models().RepCode.findOne({ hash }).lean() : mem.codes.find((x) => x.hash === hash)
    if (!c) return { ok: false, reason: 'unknown' }
    if (c.revoked) return { ok: false, reason: 'revoked' }
    if (c.expiresAt && new Date(c.expiresAt) < now) return { ok: false, reason: 'expired' }
    const rep = await this.findRep(c.repId)
    if (rep && !rep.active) return { ok: false, reason: 'revoked' }
    if (installId && (c.installs || []).includes(installId)) return { ok: true, pkg: c.pkg, repId: c.repId, again: true }
    if (useMongo) {
      const r = await models().RepCode.updateOne(
        { hash, revoked: false, $expr: { $lt: ['$uses', '$maxUses'] } },
        { $inc: { uses: 1 }, ...(installId ? { $push: { installs: installId } } : {}) },
      )
      if (!r.modifiedCount) return { ok: false, reason: 'used' }
    } else {
      if (c.uses >= c.maxUses) return { ok: false, reason: 'used' }
      c.uses++
      if (installId) c.installs.push(installId)
    }
    return { ok: true, pkg: c.pkg, repId: c.repId }
  },
  async revokeBatch(batch) {
    if (useMongo) return (await models().RepCode.updateMany({ batch }, { revoked: true })).modifiedCount
    let n = 0
    for (const c of mem.codes) if (c.batch === batch && !c.revoked) { c.revoked = true; n++ }
    return n
  },
  async report() {
    const rows = useMongo ? await models().RepCode.find().lean() : mem.codes
    const out = {}
    for (const c of rows) {
      const k = `${c.repId}|${c.pkg}`
      out[k] ||= { repId: c.repId, pkg: c.pkg, minted: 0, redeemed: 0, revoked: 0 }
      out[k].minted++
      out[k].redeemed += c.uses
      if (c.revoked) out[k].revoked++
    }
    return Object.values(out)
  },
  async listBatches() {
    const rows = useMongo ? await models().RepCode.find().lean() : mem.codes
    const out = {}
    for (const c of rows) {
      out[c.batch] ||= { batch: c.batch, ...pickCode(c), count: 0, redeemed: 0 }
      out[c.batch].count++
      out[c.batch].redeemed += c.uses
    }
    return Object.values(out)
  },
  _reset() { mem.reps = []; mem.codes = [] },
}
