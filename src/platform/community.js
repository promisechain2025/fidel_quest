/* ============================================================================
   COMMUNITY / AFFILIATE CODE  (Phase 1, see docs/community-teacher.md)
   ----------------------------------------------------------------------------
   A short code a church / weekend school / community group hands to families so
   they get credit when a family joins through them. Stored locally as an
   attribution tag; if (and only if) the optional analytics URL is set, an
   anonymous "community:<CODE>" event is reported so the group can be credited
   toward more licenses. No PII, no child data, no payout logic here.
   ========================================================================== */
import { track } from './analytics'

const KEY = 'fq.community.v1'

/** Uppercase A–Z/0–9, max 12 chars. Pure + testable. */
export function normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export function communityCode() {
  try { return localStorage.getItem(KEY) || '' } catch { return '' }
}

/** Save (or clear) the code; reports it once when set. Returns the stored code. */
export function setCommunityCode(raw) {
  const code = normalizeCode(raw)
  try {
    if (code) localStorage.setItem(KEY, code)
    else localStorage.removeItem(KEY)
  } catch { /* session only */ }
  if (code) track(`community:${code}`)
  return code
}
