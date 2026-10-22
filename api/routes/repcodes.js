/* Representative unlock codes.
   Owner (x-admin-token):
     POST /api/admin/reps            {repId, name, country, active?} -> {rep}
     GET  /api/admin/reps            -> {reps}
     POST /api/admin/repcodes        {repId, pkg, count, maxUses?, days?} -> {batch, codes}
                                     (plain codes are returned ONCE)
     GET  /api/admin/repcodes        -> {batches, report}
     POST /api/admin/repcodes/revoke {batch} -> {revoked}
   Public (web app at easygeez.com/app, rate-limited):
     POST /api/repcodes/redeem       {code, installId} -> {ok, pkg, repId}
   Packages: core | prayer | bundle (core+prayer). */
import { Router } from 'express'
import { repCodeStore, PACKAGES } from '../repCodeStore.js'
import { requireAdminToken, rateLimit, str } from '../middleware.js'

const router = Router()
const redeemLimit = rateLimit({ max: 20, key: 'repcode-redeem' })
const REP_RE = /^[A-Z0-9]{2,6}$/
const CC_RE = /^[A-Z]{2}$/

router.post('/admin/reps', requireAdminToken, async (req, res) => {
  const repId = str(req.body?.repId, 6).toUpperCase()
  const country = str(req.body?.country, 2).toUpperCase()
  if (!REP_RE.test(repId)) return res.status(400).json({ error: 'repId: 2-6 letters/digits' })
  if (country && !CC_RE.test(country)) return res.status(400).json({ error: 'country: ISO 3166 alpha-2' })
  const rep = await repCodeStore.upsertRep({ repId, name: str(req.body?.name, 60), country, active: req.body?.active !== false })
  res.json({ rep })
})
router.get('/admin/reps', requireAdminToken, async (_req, res) => res.json({ reps: await repCodeStore.listReps() }))

router.post('/admin/repcodes', requireAdminToken, async (req, res) => {
  const repId = str(req.body?.repId, 6).toUpperCase()
  const pkg = str(req.body?.pkg, 10)
  const count = Math.round(Number(req.body?.count) || 0)
  const maxUses = Math.round(Number(req.body?.maxUses) || 1)
  const days = Math.round(Number(req.body?.days) || 0)
  if (!PACKAGES.includes(pkg)) return res.status(400).json({ error: `pkg: one of ${PACKAGES.join(', ')}` })
  if (count < 1 || count > 500) return res.status(400).json({ error: 'count: 1-500' })
  if (maxUses < 1 || maxUses > 50) return res.status(400).json({ error: 'maxUses: 1-50' })
  const rep = await repCodeStore.findRep(repId)
  if (!rep || !rep.active) return res.status(400).json({ error: 'unknown or inactive rep; add it first' })
  const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000) : null
  res.json(await repCodeStore.mint({ repId, pkg, count, maxUses, expiresAt }))
})
router.get('/admin/repcodes', requireAdminToken, async (_req, res) => {
  res.json({ batches: await repCodeStore.listBatches(), report: await repCodeStore.report() })
})
router.post('/admin/repcodes/revoke', requireAdminToken, async (req, res) => {
  const batch = str(req.body?.batch, 40)
  if (!batch) return res.status(400).json({ error: 'batch required' })
  res.json({ revoked: await repCodeStore.revokeBatch(batch) })
})

router.post('/repcodes/redeem', redeemLimit, async (req, res) => {
  const code = str(req.body?.code, 32)
  const installId = str(req.body?.installId, 64)
  if (!/^EGR/i.test(code.replace(/[^A-Za-z0-9]/g, ''))) return res.status(400).json({ ok: false, reason: 'format' })
  const r = await repCodeStore.redeem(code, installId)
  res.status(r.ok ? 200 : 409).json(r.ok ? { ok: true, pkg: r.pkg, repId: r.repId } : r)
})

export default router
