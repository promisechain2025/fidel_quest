/* Introduction requests - the platform brokers the match.

   Privacy contract: a parent's email is shared with the teacher (and the
   teacher's with the parent) ONLY when the teacher accepts. Until then the
   teacher sees the request text and child first name, nothing else. The
   teacher owns their board profile by signing in with the same email their
   application used - no extra claiming ceremony. */
import { Router } from 'express'
import { store } from '../store.js'
import { sendTo, notifyOwner } from '../mailer.js'
import { requireAuth, rateLimit, str } from '../middleware.js'

const router = Router()
const limit = rateLimit({ max: 60, key: 'intros' })
const siteUrl = () => (process.env.SITE_URL || 'https://egeez.app').replace(/\/$/, '')

/** Parent asks for an introduction to an approved teacher. */
router.post('/teachers/:id/intros', requireAuth, limit, async (req, res, next) => {
  try {
    const app_ = await store.findApplicationById(req.params.id)
    if (!app_ || app_.status !== 'approved') return res.status(404).json({ error: 'Teacher not found' })
    if (await store.hasOpenIntro(req.user.id, app_.id)) {
      return res.status(409).json({ error: 'You already have an open request with this teacher' })
    }
    const childName = str(req.body?.childName, 40)
    const message = str(req.body?.message, 1000)
    if (!message) return res.status(400).json({ error: 'Tell the teacher a little about what you are looking for' })
    const intro = await store.createIntro({ teacherId: app_.id, parentId: req.user.id, childName, message })
    sendTo(app_.email, 'A family wants an introduction - eGeez', [
      `A family on eGeez asked to be introduced to you${childName ? ` for their child ${childName}` : ''}.`,
      '',
      `"${message}"`,
      '',
      `Respond in your teacher dashboard: ${siteUrl()}/teach`,
      'Their contact is shared with you only if you accept.',
    ])
    notifyOwner('Introduction requested - eGeez', [`Teacher: ${app_.name}`, `Child: ${childName || '-'}`, `Message: ${message}`])
    res.status(201).json({ ok: true, id: intro.id })
  } catch (err) { next(err) }
})

/** Parent's own requests with status. */
router.get('/my/intros', requireAuth, limit, async (req, res, next) => {
  try { res.json({ intros: await store.listIntrosForParent(req.user.id) }) } catch (err) { next(err) }
})

/** Teacher dashboard: board standing + the request inbox. Ownership =
    signed-in email matches an APPROVED application's email. */
router.get('/teacher/me', requireAuth, limit, async (req, res, next) => {
  try {
    const app_ = await store.findApplicationByEmail(req.user.email)
    if (!app_) return res.status(404).json({ error: 'No approved teacher profile for this account email', notTeacher: true })
    const board = (await store.listApprovedTeachers()).find((t) => t.id === app_.id) || null
    res.json({
      teacher: { id: app_.id, name: app_.name },
      board,
      reviews: await store.listApprovedComments(app_.id, 12),
      intros: await store.listIntrosForTeacher(app_.id),
    })
  } catch (err) { next(err) }
})

/** Teacher accepts or declines. Accept = the ONLY moment contacts cross. */
router.post('/teacher/intros/:id', requireAuth, limit, async (req, res, next) => {
  try {
    const app_ = await store.findApplicationByEmail(req.user.email)
    if (!app_) return res.status(403).json({ error: 'No approved teacher profile for this account email' })
    const intro = await store.findIntro(req.params.id)
    if (!intro || intro.teacherId !== app_.id) return res.status(404).json({ error: 'Request not found' })
    if (intro.status !== 'new') return res.status(409).json({ error: 'Already answered' })
    const action = req.body?.action === 'accept' ? 'accepted' : req.body?.action === 'decline' ? 'declined' : null
    if (!action) return res.status(400).json({ error: 'action must be accept or decline' })
    await store.setIntroStatus(intro.id, action)
    if (action === 'accepted') {
      const parent = await store.findUserById(intro.parentId)
      if (parent) {
        sendTo(parent.email, `${app_.name} accepted your introduction - eGeez`, [
          `Good news - ${app_.name} would love to hear from you${intro.childName ? ` about ${intro.childName}` : ''}.`,
          '',
          `You can reach them at: ${app_.email}`,
          '',
          'Tip: agree on a first session, and keep saving progress reports -',
          'they build the teacher\'s verified record and your child\'s history.',
        ])
        sendTo(app_.email, 'Introduction accepted - here is the family - eGeez', [
          `You accepted the introduction${intro.childName ? ` for ${intro.childName}` : ''}.`,
          '',
          `The family can be reached at: ${parent.email}`,
          '',
          `Their note: "${intro.message}"`,
        ])
      }
    }
    res.json({ ok: true, status: action })
  } catch (err) { next(err) }
})

export default router
