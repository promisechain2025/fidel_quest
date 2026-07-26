/* Child profiles + progress snapshots, owned by the signed-in parent.

   Privacy stance: the app itself stays offline and account-free; nothing
   arrives here unless a parent explicitly saves a Progress Card on the
   website. We store the minimum a progress review needs: a first name
   chosen by the parent and dated learning counts (letters, streak, the
   33-family mastery mask). Deleting a child deletes their snapshots. */
import { Router } from 'express'
import { store } from '../store.js'
import { requireAuth, rateLimit, str } from '../middleware.js'

const router = Router()
const limit = rateLimit({ max: 120, key: 'children' })

const MASK_RE = /^[01]{33}$/
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)))

router.get('/children', requireAuth, limit, async (req, res, next) => {
  try { res.json({ children: await store.listChildren(req.user.id) }) } catch (err) { next(err) }
})

router.post('/children', requireAuth, limit, async (req, res, next) => {
  try {
    const name = str(req.body?.name, 40)
    if (!name) return res.status(400).json({ error: 'A name is required' })
    if ((await store.listChildren(req.user.id)).length >= 12) return res.status(400).json({ error: 'Profile limit reached' })
    res.status(201).json({ child: await store.createChild(req.user.id, name) })
  } catch (err) { next(err) }
})

router.delete('/children/:id', requireAuth, limit, async (req, res, next) => {
  try {
    const ok = await store.deleteChild(req.user.id, req.params.id)
    if (!ok) return res.status(404).json({ error: 'Child not found' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

/** Save a decoded Progress Card. One per child per day (idempotent). */
router.post('/children/:id/snapshots', requireAuth, limit, async (req, res, next) => {
  try {
    const child = await store.findChild(req.user.id, req.params.id)
    if (!child) return res.status(404).json({ error: 'Child not found' })
    const b = req.body || {}
    if (!DAY_RE.test(String(b.day))) return res.status(400).json({ error: 'Bad day' })
    if (!MASK_RE.test(String(b.mask))) return res.status(400).json({ error: 'Bad mask' })
    const snap = {
      day: b.day,
      letters: clampInt(b.letters, 0, 231),
      streak: clampInt(b.streak, 0, 9999),
      mask: b.mask,
      nodesDone: clampInt(b.nodesDone, 0, 9999),
      nodesTotal: clampInt(b.nodesTotal, 1, 9999),
    }
    await store.saveSnapshot(req.user.id, child.id, snap)
    res.status(201).json({ ok: true })
  } catch (err) { next(err) }
})

router.get('/children/:id/snapshots', requireAuth, limit, async (req, res, next) => {
  try {
    const child = await store.findChild(req.user.id, req.params.id)
    if (!child) return res.status(404).json({ error: 'Child not found' })
    res.json({ child, snapshots: await store.listSnapshots(req.user.id, child.id) })
  } catch (err) { next(err) }
})

export default router
