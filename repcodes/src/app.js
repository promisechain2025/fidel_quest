/* HTTP layer (Lambda Function URL, payload v2). Kept free of AWS imports so
   tests drive it with the memory store. */
import { makeService, HttpError, publicCode, totals, toCsv, REDEEM_MSG, PKG_NAME } from './core.js'
import { PAGE } from './page.js'

const ORIGINS = new Set(['https://easygeez.com', 'https://www.easygeez.com', 'http://localhost:5173', 'http://localhost:4173'])

export function makeApp({ store, sendMail, log = () => {} }) {
  const svc = makeService(store, { sendMail })
  const json = (status, body, extra = {}) => ({ statusCode: status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra }, body: JSON.stringify(body) })

  async function handle(ev) {
    const method = ev.requestContext?.http?.method || 'GET'
    const path = (ev.rawPath || '/').replace(/\/+$/, '') || '/'
    const ip = ev.requestContext?.http?.sourceIp || 'unknown'
    const origin = ev.headers?.origin || ''
    const cors = ORIGINS.has(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, GET, OPTIONS', vary: 'origin' } : {}
    const qs = ev.queryStringParameters || {}
    let body = {}
    if (ev.body) {
      try { body = JSON.parse(ev.isBase64Encoded ? Buffer.from(ev.body, 'base64').toString() : ev.body) } catch { return json(400, { error: 'Bad JSON.' }) }
    }
    const cookies = Object.fromEntries((ev.cookies || []).map((c) => { const i = c.indexOf('='); return [c.slice(0, i).trim(), c.slice(i + 1)] }))
    const token = cookies.egr_s || ''

    if (method === 'OPTIONS') return { statusCode: 204, headers: cors }
    if (method === 'GET' && ['/', '/admin', '/rep', '/login'].includes(path)) {
      return { statusCode: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'" }, body: PAGE }
    }

    // ---- public ----
    if (path === '/api/repcodes/redeem' && method === 'POST') {
      const n = await store.hit(`redeem:${ip}`, 900)
      if (n > 20) return json(429, { ok: false, reason: 'limited', message: REDEEM_MSG.limited }, cors)
      const r = await svc.redeem(body.code, body.installId)
      log('redeem', { ok: r.ok, reason: r.reason || '', restored: !!r.restored }) // never logs the code
      return r.ok
        ? json(200, { ok: true, pkg: r.pkg, repId: r.repId, restored: !!r.restored, message: `Unlocked: ${PKG_NAME[r.pkg]}` }, cors)
        : json(409, { ok: false, reason: r.reason, message: REDEEM_MSG[r.reason] || REDEEM_MSG.unknown }, cors)
    }
    if ((path === '/api/representatives' || path === '/api/representatives.json') && method === 'GET') {
      return json(200, { updated: new Date().toISOString().slice(0, 10), representatives: await svc.publicReps() }, { ...cors, 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' })
    }

    // ---- auth ----
    if (path === '/api/auth/start' && method === 'POST') {
      if ((await store.hit(`login:${ip}`, 900)) > 10) throw new HttpError(429, 'Too many tries. Wait 15 minutes.')
      if ((await store.hit(`loginmail:${String(body.email || '').toLowerCase()}`, 900)) > 5) throw new HttpError(429, 'Too many tries. Wait 15 minutes.')
      return json(200, await svc.startLogin(body.email))
    }
    if (path === '/api/auth/verify' && method === 'POST') {
      if ((await store.hit(`verify:${ip}`, 900)) > 20) throw new HttpError(429, 'Too many tries. Wait 15 minutes.')
      const r = await svc.finishLogin(body.email, body.code)
      return json(200, { role: r.role, email: r.email, repId: r.repId || null }, { 'set-cookie': `egr_s=${r.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 86400}` })
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      await svc.logout(token)
      return json(200, { ok: true }, { 'set-cookie': 'egr_s=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' })
    }
    const user = await svc.userFromToken(token)
    if (path === '/api/me') return json(200, { user })
    if (!user) throw new HttpError(401, 'Please sign in.')
    if (method === 'POST' && !String(ev.headers?.['content-type'] || '').includes('application/json')) throw new HttpError(415, 'JSON only.')

    // ---- representative (own codes only) ----
    if (path === '/api/rep/codes' && method === 'GET') {
      if (user.role !== 'rep') throw new HttpError(403, 'Representatives only.')
      const all = await svc.codesFor(user)
      const rows = qs.status ? all.filter((c) => c.status === qs.status) : all
      const rep = await store.getRep(user.repId)
      return json(200, { rep: { repId: rep.repId, name: rep.name, city: rep.city, country: rep.country }, totals: totals(all), codes: rows.map((c) => publicCode(c)) })
    }

    // ---- admin ----
    if (path.startsWith('/api/admin/')) {
      if (user.role !== 'admin') throw new HttpError(403, 'Admin only.')
      const p = path.slice('/api/admin/'.length)
      if (p === 'reps' && method === 'GET') return json(200, { reps: await store.listReps(), totals: await svc.perRepTotals() })
      if (p === 'reps' && method === 'POST') return json(200, { rep: await svc.saveRep(body, { create: true }) })
      if (p === 'reps' && method === 'PUT') return json(200, { rep: await svc.saveRep(body, { create: false }) })
      if (p === 'generate' && method === 'POST') { const r = await svc.generate(body); log('generate', { repId: body.repId, pkg: body.pkg, n: r.codes.length }); return json(200, r) }
      if (p === 'void' && method === 'POST') return json(200, await svc.voidCode(body.code))
      if (p === 'codes' && method === 'GET') {
        const rows = await svc.codesFor(user, qs)
        return json(200, { codes: rows.map((c) => publicCode(c, { forAdmin: true })), totals: totals(rows) })
      }
      if (p === 'codes.csv' && method === 'GET') {
        const rows = (await svc.codesFor(user, qs)).map((c) => publicCode(c, { forAdmin: true }))
        return { statusCode: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="egeez-codes-${qs.repId || 'all'}.csv"`, 'cache-control': 'no-store' }, body: toCsv(rows, ['code', 'repId', 'pkg', 'status', 'createdAt', 'usedAt', 'household', 'batch', 'voidedAt', 'test']) }
      }
      if (p === 'totals.csv' && method === 'GET') {
        return { statusCode: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="egeez-rep-totals.csv"' }, body: toCsv(await svc.perRepTotals(), ['repId', 'name', 'issued', 'used', 'unused', 'void', 'test']) }
      }
    }
    return json(404, { error: 'Not found.' })
  }

  return async (ev) => {
    try { return await handle(ev) } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message })
      log('error', { msg: String(e?.message || e).slice(0, 200) })
      return json(500, { error: 'Server error.' })
    }
  }
}
