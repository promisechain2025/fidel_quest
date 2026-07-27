/* Child profiles + progress snapshots, owned by the signed-in parent.

   Privacy stance: the app itself stays offline and account-free; nothing
   arrives here unless a parent explicitly saves a Progress Card on the
   website. We store the minimum a progress review needs: a first name
   chosen by the parent and dated learning counts (letters, streak, the
   33-family mastery mask). Deleting a child deletes their snapshots. */
import { Router } from 'express'
import { store } from '../store.js'
import { requireAuth, requireVerified, rateLimit, str } from '../middleware.js'

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

/** Link (or unlink with teacherId:'') the approved teacher this child
    learns with. The link day anchors progress-verified teacher stats:
    only snapshots from that day on count toward the teacher's record. */
router.put('/children/:id/teacher', requireAuth, requireVerified, limit, async (req, res, next) => {
  try {
    const teacherId = str(req.body?.teacherId, 64)
    if (teacherId) {
      // A parent may only link a teacher they actually work with - i.e. one
      // who ACCEPTED their introduction. This is the gate that makes ratings
      // and family-reported progress reflect real relationships (an approved
      // teacher alone is not enough - that let anyone self-link and farm).
      if (!(await store.hasAcceptedIntro(req.user.id, teacherId))) {
        return res.status(403).json({ error: 'Request an introduction and have the teacher accept before linking them' })
      }
    }
    const today = new Date().toISOString().slice(0, 10)
    const child = await store.setChildTeacher(req.user.id, req.params.id, teacherId, today)
    if (!child) return res.status(404).json({ error: 'Child not found' })
    res.json({ child })
  } catch (err) { next(err) }
})

/** Rate the teacher this child learns with: stars 1-5 now, optional
    comment held for moderation. One review per parent per teacher. */
router.post('/teachers/:id/reviews', requireAuth, requireVerified, limit, async (req, res, next) => {
  try {
    const stars = Math.round(Number(req.body?.stars))
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) return res.status(400).json({ error: 'stars must be 1-5' })
    // only parents whose child actually learns with this teacher may rate
    const children = await store.listChildren(req.user.id)
    if (!children.some((c) => c.teacherId === req.params.id)) {
      return res.status(403).json({ error: 'Link this teacher to one of your children first' })
    }
    await store.upsertReview(req.user.id, req.params.id, { stars, comment: str(req.body?.comment, 600) })
    res.status(201).json({ ok: true })
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
    // Realism guards so a snapshot cannot be crudely forged: no future dates,
    // and letters must equal 7 x (learned families in the mask). These keep
    // the rendered report and the family-reported progress honest.
    if (b.day > new Date().toISOString().slice(0, 10)) return res.status(400).json({ error: 'Day cannot be in the future' })
    const letters = clampInt(b.letters, 0, 231)
    const learned = (String(b.mask).match(/1/g) || []).length
    if (letters !== learned * 7) return res.status(400).json({ error: 'letters must equal 7 x learned families' })
    const snap = {
      day: b.day,
      letters,
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
