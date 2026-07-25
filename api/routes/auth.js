import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import config from '../config.js'
import { store } from '../store.js'
import { requireAuth, rateLimit, isEmail, str } from '../middleware.js'

const router = Router()
const authLimit = rateLimit({ max: 10, key: 'auth' })

const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role })
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
    const user = await store.createUser({ name, email, passwordHash: await bcrypt.hash(password, 10), role })
    res.status(201).json({ token: signToken(user), user: publicUser(user) })
  } catch (err) { next(err) }
})

router.post('/login', authLimit, async (req, res, next) => {
  try {
    const email = str(req.body?.email, 254).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const user = email && (await store.findUserByEmail(email))
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Wrong email or password' })
    }
    res.json({ token: signToken(user), user: publicUser(user) })
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
