/* ============================================================================
   INSTALL-SEEN SNAPSHOT (1.4) - was this device already using eGeez before
   the free-download build (VITE_PACKAGES=1) first launched?
   ----------------------------------------------------------------------------
   Every pre-1.4 native install was a PAID download, but builds before 1.3.3
   never wrote the paid-buyer mark (paidBuyer.js) - Play production went
   straight from 1.3.1 to 1.4. So the free build checks, synchronously and
   before the app writes anything, whether this device already holds
   household data from an older version. The answer is written once
   (fq.installSeen.v1) and never changes, so a fresh 1.4 install that later
   creates profiles is never mistaken for an upgrade.
   ========================================================================== */
export const INSTALL_SEEN_KEY = 'fq.installSeen.v1'

/** Household data an older eGeez would have left behind. */
function hasPriorData(ls) {
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i)
    if (k === 'fq.profiles.v1' || /^fq\.profile\.p\d+$/.test(k) || k === 'fq.backup.day' || k === 'fq.paidBuyer.v1') return true
  }
  return false
}

/** Call once at the very top of startup. Idempotent. Never throws. */
export function snapshotInstall({ version = '1.4', now = Date.now() } = {}) {
  try {
    const ls = localStorage
    const prev = JSON.parse(ls.getItem(INSTALL_SEEN_KEY) || 'null')
    if (prev && typeof prev === 'object') return prev
    const v = { v: 1, firstVersion: version, prior: hasPriorData(ls), at: now }
    ls.setItem(INSTALL_SEEN_KEY, JSON.stringify(v))
    return v
  } catch { return null }
}

/** True when the device had pre-1.4 data the first time 1.4+ ran. */
export function hadPriorInstall() {
  try { return !!JSON.parse(localStorage.getItem(INSTALL_SEEN_KEY) || 'null')?.prior } catch { return false }
}
