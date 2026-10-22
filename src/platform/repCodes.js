/* Representative unlock codes (EGR-...) - client side.
   A local representative (Ethiopia, Eritrea and other African countries
   where App Store / Play payments are hard) sells a family a code for one
   package (core | prayer | bundle). The hub API (api/routes/repcodes.js)
   is the authority: codes are single-use (or N-use) and tied to the rep,
   so the server is asked every time; there is no offline fallback.

   WEB BUILD ONLY (easygeez.com/app). The iOS / Android apps never show or
   accept these codes: Apple 3.1.1 forbids unlocking content with license
   keys, and Google Play Payments policy requires Play Billing for in-app
   digital content. See docs/rep-codes.md. */
import { apiBase } from './practiceSync'
import { ensureInstallId, webTrialActive } from './webTrial'
import { isNativePlatform } from './native'
import { grantRepPackage } from './packages'

export const looksLikeRepCode = (raw) => /^EGR[CPB][A-Z0-9]{2,6}[A-Z2-9]{8}$/.test(String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))

/** Can this build take a rep code at all? */
export function repCodesAvailable({ native = isNativePlatform(), web = webTrialActive(), base = apiBase() } = {}) {
  return !native && web && !!base
}

/** Resolves { ok, pkg } or { ok:false, reason: 'format'|'used'|'expired'|'revoked'|'unknown'|'offline'|'unavailable' }. */
export async function redeemRepCode(raw, { fetchImpl = globalThis.fetch, base = apiBase(), native = isNativePlatform() } = {}) {
  if (native) return { ok: false, reason: 'unavailable' }
  if (!looksLikeRepCode(raw)) return { ok: false, reason: 'format' }
  if (!base || typeof fetchImpl !== 'function') return { ok: false, reason: 'unavailable' }
  const code = String(raw).trim().toUpperCase()
  let res
  try {
    res = await fetchImpl(`${base}/api/repcodes/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, installId: ensureInstallId() }),
    })
  } catch {
    return { ok: false, reason: 'offline' }
  }
  let body = {}
  try { body = await res.json() } catch { /* empty */ }
  if (!res.ok || !body.ok) return { ok: false, reason: body.reason || 'unknown' }
  grantRepPackage(body.pkg, { repId: body.repId, code })
  return { ok: true, pkg: body.pkg }
}
