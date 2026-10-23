/* Pure logic for representative unlock codes. No AWS here: the store is
   injected (store-ddb.js in Lambda, store-mem.js in tests). */
import crypto from 'node:crypto'

export const PACKAGES = Object.freeze(['core', 'prayer', 'bundle'])
export const PKG_LETTER = { core: 'C', prayer: 'P', bundle: 'B' }
export const PKG_NAME = { core: 'Full course', prayer: 'Prayer Book', bundle: 'Full course + Prayer Book' }
// 31 symbols, no 0/O/1/I/L. 8 random symbols = ~39.6 bits per code.
export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ADMIN_EMAIL = 'promisechain.net@gmail.com'
export const REP_ID_RE = /^[A-Z0-9]{2,6}$/

export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
export const normalizeCode = (raw) => String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
export const normEmail = (e) => String(e || '').trim().toLowerCase().slice(0, 120)
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)

/** Unbiased random symbols (rejection sampling: 248 = 8*31). */
export function randSymbols(n, rnd = crypto.randomBytes) {
  let out = ''
  while (out.length < n) {
    for (const b of rnd(n * 2)) {
      if (b < 248 && out.length < n) out += ALPHABET[b % 31]
    }
  }
  return out
}
/** EGR-<C|P|B><REPID>-XXXX-XXXX (format the web app already checks). */
export function newCode(pkg, repId) {
  if (!PKG_LETTER[pkg]) throw new Error('bad pkg')
  const r = randSymbols(8)
  return `EGR-${PKG_LETTER[pkg]}${repId}-${r.slice(0, 4)}-${r.slice(4)}`
}
/** Canonical dashed form from any user input ("egrcet01abcd2345" -> "EGR-CET01-ABCD-2345"). */
export function canonical(raw) {
  const n = normalizeCode(raw)
  const m = /^EGR([CPB])([A-Z0-9]{2,6})([A-Z2-9]{4})([A-Z2-9]{4})$/.exec(n)
  return m ? `EGR-${m[1]}${m[2]}-${m[3]}-${m[4]}` : null
}
/** Household / device shown to reps: a short tag of a hash, never the raw id. */
export const maskHousehold = (hh) => (hh ? `HH-••••${String(hh).slice(-4).toUpperCase()}` : '')
export const householdTag = (installId) => sha256(`hh:${installId}`).slice(0, 16)

export function publicCode(c, { forAdmin = false } = {}) {
  const o = {
    code: c.code, repId: c.repId, pkg: c.pkg, status: c.status, createdAt: c.createdAt,
    usedAt: c.usedAt || null, household: maskHousehold(c.household), batch: c.batch, test: !!c.test,
  }
  if (forAdmin) o.voidedAt = c.voidedAt || null
  return o
}
export function totals(codes) {
  const t = { issued: 0, used: 0, unused: 0, void: 0 }
  for (const c of codes) { t.issued++; t[c.status] = (t[c.status] || 0) + 1 }
  return t
}
const S = (v, n) => String(v ?? '').trim().slice(0, n)
export function cleanRep(b, existing = {}) {
  const repId = S(b.repId ?? existing.repId, 6).toUpperCase()
  if (!REP_ID_RE.test(repId)) throw new HttpError(400, 'Rep ID: 2-6 letters or digits (e.g. ET01).')
  const country = S(b.country ?? existing.country, 2).toUpperCase()
  if (country && !/^[A-Z]{2}$/.test(country)) throw new HttpError(400, 'Country: 2-letter code (ET, ER, UG...).')
  const email = normEmail(b.email ?? existing.email)
  if (email && !isEmail(email)) throw new HttpError(400, 'Email looks wrong.')
  const name = S(b.name ?? existing.name, 60)
  if (!name) throw new HttpError(400, 'Name is required.')
  const pick = (k) => (b[k] !== undefined ? b[k] : existing[k])
  return {
    repId, name, country, email,
    city: S(pick('city'), 60), phone: S(pick('phone'), 30), whatsapp: S(pick('whatsapp'), 30),
    shown: !!pick('shown'), active: pick('active') === undefined ? true : !!pick('active'),
    test: !!pick('test'),
  }
}
export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status } }

export const REDEEM_MSG = {
  used: 'This code was already used on another device.',
  void: 'This code was cancelled by eGeez.',
  unknown: 'That code did not work. Check the letters.',
  format: 'That does not look like an eGeez code.',
  inactive: 'This representative is not active. Contact eGeez.',
  limited: 'Too many tries. Wait 15 minutes and try again.',
}

/** Service: everything the HTTP layer calls. */
export function makeService(store, { now = () => new Date().toISOString(), sendMail = async () => {} } = {}) {
  return {
    async saveRep(body, { create }) {
      const existing = create ? null : await store.getRep(S(body.repId, 6).toUpperCase())
      if (!create && !existing) throw new HttpError(404, 'No such rep.')
      if (create && (await store.getRep(S(body.repId, 6).toUpperCase()))) throw new HttpError(409, 'That Rep ID already exists.')
      const rep = cleanRep(body, existing || {})
      if (rep.email) {
        const other = (await store.listReps()).find((r) => r.email === rep.email && r.repId !== rep.repId)
        if (other) throw new HttpError(409, `That email already belongs to ${other.repId}.`)
      }
      rep.createdAt = existing?.createdAt || now(); rep.updatedAt = now()
      await store.putRep(rep)
      return rep
    },
    async generate({ repId, pkg, quantity, test }) {
      repId = S(repId, 6).toUpperCase()
      const n = Math.round(Number(quantity) || 0)
      if (!PACKAGES.includes(pkg)) throw new HttpError(400, 'Package: core, prayer or bundle.')
      if (n < 1 || n > 500) throw new HttpError(400, 'Quantity: 1-500.')
      const rep = await store.getRep(repId)
      if (!rep || !rep.active) throw new HttpError(400, 'Unknown or disabled rep.')
      const t = now()
      const batch = `${repId}-${Date.now().toString(36).toUpperCase()}`
      const out = []
      for (let i = 0; i < n; i++) {
        for (let tries = 0; tries < 5; tries++) {
          const c = { code: newCode(pkg, repId), repId, pkg, status: 'unused', createdAt: t, batch, test: !!(test || rep.test) }
          if (await store.putCodeIfNew(c)) { out.push(c); break }
        }
      }
      return { batch, codes: out.map((c) => publicCode(c, { forAdmin: true })) }
    },
    async voidCode(raw) {
      const code = canonical(raw)
      if (!code) throw new HttpError(400, 'Bad code.')
      const r = await store.voidIfUnused(code, now())
      if (!r) throw new HttpError(409, 'Only unused codes can be voided.')
      return { ok: true }
    },
    /** Single-use, atomic. Same household re-entering its own code = restore. */
    async redeem(raw, installId) {
      const code = canonical(raw)
      if (!code) return { ok: false, reason: 'format' }
      const hh = installId ? householdTag(String(installId).slice(0, 64)) : null
      const c = await store.getCode(code)
      if (!c) return { ok: false, reason: 'unknown' }
      if (c.status === 'void') return { ok: false, reason: 'void' }
      const rep = await store.getRep(c.repId)
      if (!rep || !rep.active) return { ok: false, reason: 'inactive' }
      if (c.status === 'used') {
        return hh && c.household === hh ? { ok: true, pkg: c.pkg, repId: c.repId, restored: true } : { ok: false, reason: 'used' }
      }
      const won = await store.markUsedIfUnused(code, now(), hh)
      if (won) return { ok: true, pkg: c.pkg, repId: c.repId }
      const again = await store.getCode(code) // lost a race: maybe the same household double-tapped
      if (again?.status === 'used' && hh && again.household === hh) return { ok: true, pkg: c.pkg, repId: c.repId, restored: true }
      return { ok: false, reason: again?.status === 'void' ? 'void' : 'used' }
    },
    async codesFor(user, { repId, status } = {}) {
      let rows
      if (user.role === 'admin') rows = repId ? await store.listCodesByRep(repId) : await store.listAllCodes()
      else rows = await store.listCodesByRep(user.repId) // a rep only ever sees their own
      if (status) rows = rows.filter((c) => c.status === status)
      rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      return rows
    },
    async perRepTotals() {
      const [reps, codes] = await Promise.all([store.listReps(), store.listAllCodes()])
      return reps.map((r) => ({ repId: r.repId, name: r.name, test: !!r.test, ...totals(codes.filter((c) => c.repId === r.repId)) }))
    },
    async publicReps() {
      return (await store.listReps()).filter((r) => r.shown && r.active)
        .map((r) => ({ id: r.repId, name: r.name, country: r.country, city: r.city, phone: r.phone, whatsapp: r.whatsapp, email: r.email, test: !!r.test }))
    },
    // ---- auth: email one-time code, no passwords ----
    async roleFor(email) {
      email = normEmail(email)
      if (email === ADMIN_EMAIL) return { role: 'admin', email }
      const rep = (await store.listReps()).find((r) => r.email === email && r.active)
      return rep ? { role: 'rep', email, repId: rep.repId, name: rep.name } : null
    },
    async startLogin(email) {
      email = normEmail(email)
      if (!isEmail(email)) throw new HttpError(400, 'Enter your email.')
      const who = await this.roleFor(email)
      // Same answer either way, so the form does not reveal who is a rep.
      if (!who) return { ok: true }
      const otp = String(crypto.randomInt(0, 1e6)).padStart(6, '0')
      await store.putOtp(email, { hash: sha256(`${email}:${otp}`), exp: Date.now() + 10 * 60e3, tries: 0 })
      await sendMail(email, otp)
      return { ok: true }
    },
    async finishLogin(email, otp) {
      email = normEmail(email)
      const rec = await store.getOtp(email)
      if (!rec || rec.exp < Date.now() || rec.tries >= 5) throw new HttpError(401, 'Code expired. Ask for a new one.')
      const a = Buffer.from(rec.hash), b = Buffer.from(sha256(`${email}:${String(otp).trim()}`))
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        await store.putOtp(email, { ...rec, tries: rec.tries + 1 })
        throw new HttpError(401, 'Wrong code.')
      }
      await store.deleteOtp(email)
      const who = await this.roleFor(email)
      if (!who) throw new HttpError(403, 'No access.')
      const token = crypto.randomBytes(32).toString('base64url')
      await store.putSession(sha256(token), { email, exp: Date.now() + 7 * 864e5 })
      return { token, ...who }
    },
    /** Role is re-derived every request, so disabling a rep cuts access at once. */
    async userFromToken(token) {
      if (!token) return null
      const s = await store.getSession(sha256(token))
      if (!s || s.exp < Date.now()) return null
      return this.roleFor(s.email)
    },
    async logout(token) { if (token) await store.deleteSession(sha256(token)) },
  }
}

export function toCsv(rows, cols) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n'
}
