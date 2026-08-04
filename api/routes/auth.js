import { Router } from 'express'
import crypto from 'node:crypto'
import { hash as hashPassword, verify as verifyPassword, needsRehash, DUMMY_HASH } from '../password.js'
import jwt from 'jsonwebtoken'
import config from '../config.js'
import { store } from '../store.js'
import { sendTo } from '../mailer.js'
import { requireAuth, rateLimit, isEmail, str } from '../middleware.js'

const router = Router()


// Register/login share a tight bucket - that is the credential-guessing
// surface. Email verification is a separate, low-risk action (token is
// single-use and unguessable), so it gets its own looser budget rather than
// eating into the brute-force allowance a shared IP already needs.
const authLimit = rateLimit({ max: 10, key: 'auth' })
const verifyLimit = rateLimit({ max: 30, key: 'verify' })
const siteUrl = () => (process.env.SITE_URL || 'https://easygeez.com').replace(/\/$/, '')

const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, emailVerified: !!u.emailVerified })
const signToken = (u) => jwt.sign({ sub: String(u._id), email: u.email, role: u.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })

router.post('/register', authLimit, async (req, res, next) => {
  try {
    const name = str(req.body?.name, 120)
    const email = str(req.body?.email, 254).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const role = req.body?.role === 'teacher' ? 'teacher' : 'parent'
    if (!name) return res.status(400).json({ error: 'Name is required' })
    if (!isEmail(email)) return res.status(400).json({ error: 'A valid email is required' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    if (await store.findUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists' })
    // Email verification proves the registrant controls the address - which
    // is what lets a teacher account safely own a board profile by email,
    // and raises the cost of throwaway accounts. Sensitive teacher actions
    // require it; basic browsing does not, so we still return a session.
    const verifyToken = crypto.randomBytes(24).toString('hex')
    const user = await store.createUser({ name, email, passwordHash: await hashPassword(password), role, verifyToken })
    sendTo(email, 'Confirm your email - eGeez', [
      `Welcome to eGeez, ${name}.`,
      '',
      `Confirm this email to finish setting up your account:`,
      `${siteUrl()}/verify?token=${verifyToken}`,
      '',
      'If you did not create an eGeez account, ignore this message.',
    ])
    res.status(201).json({ token: signToken(user), user: publicUser(user) })
  } catch (err) { next(err) }
})

router.post('/login', authLimit, async (req, res, next) => {
  try {
    const email = str(req.body?.email, 254).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const user = email && (await store.findUserByEmail(email))
    // Always pay the hashing cost. Skipping it for an unknown email makes
    // login a timing oracle: a missing account answers ~60x faster than a
    // real one, which enumerates the parent/teacher list.
    const ok = user
      ? await verifyPassword(password, user.passwordHash)
      : (await verifyPassword(password, DUMMY_HASH), false)
    if (!ok) return res.status(401).json({ error: 'Wrong email or password' })
    // Quietly upgrade a legacy bcrypt hash now that we know the password is
    // right. Failure here must never block a valid sign-in.
    if (needsRehash(user.passwordHash) && store.updateUserPassword) {
      try { await store.updateUserPassword(user._id ?? user.id, await hashPassword(password)) } catch { /* try again next login */ }
    }
    res.json({ token: signToken(user), user: publicUser(user) })
  } catch (err) { next(err) }
})

/** Consume an email-verification token (from the emailed link). */
router.post('/verify', verifyLimit, async (req, res, next) => {
  try {
    const user = await store.verifyEmailToken(str(req.body?.token, 128))
    if (!user) return res.status(400).json({ error: 'This verification link is invalid or already used' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

/** Re-send the verification email for the signed-in account. */
router.post('/resend-verification', requireAuth, verifyLimit, async (req, res, next) => {
  try {
    const user = await store.findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Account not found' })
    if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true })
    let token = user.verifyToken
    if (!token) { token = crypto.randomBytes(24).toString('hex'); await store.setVerifyToken(user._id, token) }
    sendTo(user.email, 'Confirm your email - eGeez', [
      `Confirm your email to finish setting up your eGeez account:`,
      `${siteUrl()}/verify?token=${token}`,
    ])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await store.findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Account not found' })
    res.json({ user: publicUser(user) })
  } catch (err) { next(err) }
})

export default router
