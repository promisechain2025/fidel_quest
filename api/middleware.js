/* Auth (Bearer JWT), admin token gate, and a small in-memory sliding-window
   rate limiter - trimmed versions of the PROMISECHAIN_BE middleware.        */
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import config from './config.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing or invalid auth header' })
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret)
    req.user = { id: payload.sub, email: payload.email, role: payload.role }
    // 401 (not 403) for token problems, so the client can treat 401 as
    // "re-authenticate" and 403 as "permitted account, forbidden action".
    if (!req.user.email) return res.status(401).json({ error: 'Invalid token' })
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

/** Gate sensitive actions (esp. claiming/using a teacher board profile) on
    a confirmed email, so an account cannot act on an address it does not
    control. Requires requireAuth first. */
export async function requireVerified(req, res, next) {
  try {
    const { store } = await import('./store.js')
    const user = await store.findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Account not found' })
    if (!user.emailVerified) return res.status(403).json({ error: 'Confirm your email first (check your inbox for the link).', code: 'EMAIL_UNVERIFIED' })
    next()
  } catch (err) { next(err) }
}

export function requireAdminToken(req, res, next) {
  // Read at request time (not import time) so the secret can be set/rotated
  // without touching the frozen config - and so tests can set it late.
  const adminToken = process.env.ADMIN_TOKEN || config.adminToken
  if (!adminToken) return res.status(503).json({ error: 'Admin access not configured (set ADMIN_TOKEN)' })
  if (!timingSafeEqualStr(req.headers['x-admin-token'], adminToken)) return res.status(403).json({ error: 'Forbidden' })
  next()
}

/** Constant-time string compare (no length/timing oracle on the token). */
function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a ?? ''))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) { crypto.timingSafeEqual(bb, bb); return false }
  return crypto.timingSafeEqual(ba, bb)
}

const buckets = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k)
}, 5 * 60 * 1000).unref()

/** Test hook: clear the shared limiter state between cases. */
export function _resetRateLimits() { buckets.clear() }

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, key = 'rl' } = {}) {
  return (req, res, next) => {
    const id = `${key}:${req.ip}`
    const now = Date.now()
    let b = buckets.get(id)
    if (!b || now > b.resetAt) { b = { count: 0, resetAt: now + windowMs }; buckets.set(id, b) }
    b.count += 1
    if (b.count > max) return res.status(429).json({ error: 'Too many requests. Try again later.' })
    next()
  }
}

/* tiny validators */
export const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
export const str = (s, max = 2000) => (typeof s === 'string' ? s.trim().slice(0, max) : '')
