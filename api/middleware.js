/* Auth (Bearer JWT), admin token gate, and a small in-memory sliding-window
   rate limiter - trimmed versions of the PROMISECHAIN_BE middleware.        */
import jwt from 'jsonwebtoken'
import config from './config.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing or invalid auth header' })
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret)
    req.user = { id: payload.sub, email: payload.email, role: payload.role }
    if (!req.user.email) return res.status(403).json({ error: 'Invalid token' })
    next()
  } catch {
    return res.status(403).json({ error: 'Invalid token' })
  }
}

export function requireAdminToken(req, res, next) {
  // Read at request time (not import time) so the secret can be set/rotated
  // without touching the frozen config - and so tests can set it late.
  const adminToken = process.env.ADMIN_TOKEN || config.adminToken
  if (!adminToken) return res.status(503).json({ error: 'Admin access not configured (set ADMIN_TOKEN)' })
  if (req.headers['x-admin-token'] !== adminToken) return res.status(403).json({ error: 'Forbidden' })
  next()
}

const buckets = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k)
}, 5 * 60 * 1000).unref()

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
