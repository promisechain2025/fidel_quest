import { Router } from 'express'
import { store } from '../store.js'
import { notifyOwner } from '../mailer.js'
import { requireAdminToken, rateLimit, isEmail, str } from '../middleware.js'

const router = Router()
const formLimit = rateLimit({ max: 20, key: 'forms' })

/* A remote teacher raises their hand. */
router.post('/teachers/apply', formLimit, async (req, res, next) => {
  try {
    const app_ = {
      name: str(req.body?.name, 120),
      email: str(req.body?.email, 254).toLowerCase(),
      languages: Array.isArray(req.body?.languages) ? req.body.languages.map((l) => str(l, 24)).filter(Boolean).slice(0, 8) : [],
      subjects: str(req.body?.subjects, 300),
      experience: str(req.body?.experience, 2000),
      location: str(req.body?.location, 120),
      message: str(req.body?.message, 2000),
    }
    if (!app_.name) return res.status(400).json({ error: 'Name is required' })
    if (!isEmail(app_.email)) return res.status(400).json({ error: 'A valid email is required' })
    const saved = await store.addTeacherApplication(app_)
    notifyOwner('New teacher application - eGeez', [
      `Name: ${app_.name}`, `Email: ${app_.email}`, `Languages: ${app_.languages.join(', ') || '-'}`,
      `Subjects: ${app_.subjects || '-'}`, `Location: ${app_.location || '-'}`,
      app_.experience && `Experience: ${app_.experience}`, app_.message && `Message: ${app_.message}`,
    ])
    res.status(201).json({ ok: true, id: String(saved._id) })
  } catch (err) { next(err) }
})

/* Tigrinya (or future language) waitlist. */
router.post('/waitlist', formLimit, async (req, res, next) => {
  try {
    const entry = {
      email: str(req.body?.email, 254).toLowerCase(),
      language: str(req.body?.language, 24) || 'ti',
      name: str(req.body?.name, 120),
    }
    if (!isEmail(entry.email)) return res.status(400).json({ error: 'A valid email is required' })
    const saved = await store.addWaitlistEntry(entry)
    notifyOwner(`New ${entry.language} waitlist signup - eGeez`, [`Email: ${entry.email}`, entry.name && `Name: ${entry.name}`])
    res.status(201).json({ ok: true, id: String(saved._id) })
  } catch (err) { next(err) }
})

router.post('/contact', formLimit, async (req, res, next) => {
  try {
    const msg = { name: str(req.body?.name, 120), email: str(req.body?.email, 254).toLowerCase(), message: str(req.body?.message, 4000) }
    if (!msg.name) return res.status(400).json({ error: 'Name is required' })
    if (!isEmail(msg.email)) return res.status(400).json({ error: 'A valid email is required' })
    if (!msg.message) return res.status(400).json({ error: 'A message is required' })
    const saved = await store.addContactMessage(msg)
    notifyOwner('New contact message - eGeez', [`From: ${msg.name} <${msg.email}>`, '', msg.message])
    res.status(201).json({ ok: true, id: String(saved._id) })
  } catch (err) { next(err) }
})

/* PUBLIC teacher directory: approved applications only, never emails.
   Each entry carries the trust signals: family rating (stars) and
   progress-verified performance computed from linked children's saved
   snapshots - evidence, not claims. */
router.get('/teachers', async (_req, res, next) => {
  try { res.json({ teachers: await store.listApprovedTeachers() }) } catch (err) { next(err) }
})

/* Approved review comments for one teacher (public). */
router.get('/teachers/:id/reviews', async (req, res, next) => {
  try { res.json({ reviews: await store.listApprovedComments(req.params.id) }) } catch (err) { next(err) }
})

/* Owner-only lists (same shared-secret pattern as server/'s OWNER_TOKEN). */
router.get('/admin/:kind(teachers|waitlist|contact)', requireAdminToken, async (req, res, next) => {
  try { res.json({ items: await store.list(req.params.kind) }) } catch (err) { next(err) }
})

/* Review-comment moderation (stars count instantly; comments only appear
   in public after approval here or in the /admin panel). */
router.get('/admin/pending-comments', requireAdminToken, async (_req, res, next) => {
  try { res.json({ items: await store.listPendingComments() }) } catch (err) { next(err) }
})
router.patch('/admin/reviews/:id', requireAdminToken, async (req, res, next) => {
  try {
    const status = ['approved', 'rejected'].includes(req.body?.status) ? req.body.status : null
    if (!status) return res.status(400).json({ error: 'status must be approved or rejected' })
    const ok = await store.setCommentStatus(req.params.id, status)
    if (!ok) return res.status(404).json({ error: 'Review not found' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

/* Owner moderation: approve (-> public directory), un-approve, or archive. */
router.patch('/admin/teachers/:id', requireAdminToken, async (req, res, next) => {
  try {
    const status = ['approved', 'new', 'archived'].includes(req.body?.status) ? req.body.status : null
    if (!status) return res.status(400).json({ error: 'status must be approved, new, or archived' })
    const updated = await store.setTeacherStatus(req.params.id, status)
    if (!updated) return res.status(404).json({ error: 'Application not found' })
    res.json({ ok: true, status: updated.status })
  } catch (err) { next(err) }
})

export default router
