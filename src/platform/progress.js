/* ============================================================================
   PROGRESS — the app-level view over the child's whole learning state
   ----------------------------------------------------------------------------
   Each feature owns its own localStorage key (journey, islands, runner,
   classic, coach, hunt, plan, answer ledger) - that stays: small, testable,
   crash-isolated. What was missing is ONE place that knows the full list, so
   the child's progress can be treated as a single object: exported, shared
   to another phone, imported, or wiped.

   This module is that registry.
     - snapshotProgress(): everything -> one versioned JSON object
     - restoreProgress(snapshot): validated import (only known keys)
     - wipeProgress(): the full-reset primitive (used by devUnlock/Grown-ups)
   The snapshot moves over WhatsApp/AirDrop as a small .json - no server,
   nothing leaves the device unless the family shares it.
   ========================================================================== */
import { progressChanged } from './childModel'
import { dayStamp } from './streak'
import { isNativePlatform } from './native'

/** Every key that together IS the child's progress. Settings (language,
    sound), teacher/classroom data and the trial clock are deliberately NOT
    progress - they belong to the device/adult, not the learner. */
export const PROGRESS_KEYS = Object.freeze([
  'fq.journey.v1', // the Journey path + wearables collection
  'fidel-quest-progress-v1', // Classic mode stars
  'fq3.skylands', // Skylands islands
  'fq2.runner', // Letter Runner best
  'fq.learn.v1', // legacy letter steps (pre-journey)
  'fq2.progress', // legacy lesson blob (pre-journey)
  'fq.onboarded.v1', // which one-time demos were seen
  'fq.coach.v1', // streak + warm-up day
  'fq.hunt.v1', // Daily Hunt day state
  'fq.plan.v1', // the learning plan
  'fq.telemetry.v1', // the answer ledger (mastery, trouble letters)
  'fq.words.v1', // decodable words already practiced (Word Steps)
  'fq.streak.v1', // daily streak count + best
  'fq.gift.v1', // daily gift claim state
  'fq.tees.v1', // tee designs already seen/earned
  'fq.student.v1', // class membership (this child's class link)
  'fq.assign.v1', // pending homework assignment
])
// Additive only: restoreProgress ignores unknown keys, so snapshots made
// before these five keys existed import cleanly, and old app versions
// simply skip them. Two more child keys (fq.nickname, fq.scope.v1) hold
// raw strings, which this JSON-validated format cannot carry - profile
// switching swaps them via profiles.js SWAP_KEYS instead.

const SNAPSHOT_KIND = 'fidel-quest-progress'
export const SNAPSHOT_VERSION = 1

/** The whole learning state as one plain object (raw stored strings, so no
    feature schema is re-interpreted here). */
export function snapshotProgress(today = dayStamp()) {
  const data = {}
  for (const k of PROGRESS_KEYS) {
    try {
      const v = localStorage.getItem(k)
      if (v != null) data[k] = v
    } catch { /* storage blocked */ }
  }
  return { kind: SNAPSHOT_KIND, version: SNAPSHOT_VERSION, day: today, data }
}

/** Validate + write a snapshot back. Unknown keys are ignored (a forged or
    future snapshot cannot write outside the progress registry). Returns the
    number of keys restored, or 0 if the object is not a progress snapshot. */
export function restoreProgress(snap) {
  if (!snap || snap.kind !== SNAPSHOT_KIND || !snap.data || typeof snap.data !== 'object') return 0
  let n = 0
  for (const k of PROGRESS_KEYS) {
    const v = snap.data[k]
    if (typeof v !== 'string') continue
    try {
      JSON.parse(v) // progress values are all JSON; refuse junk
      localStorage.setItem(k, v)
      n++
    } catch { /* skip malformed entries */ }
  }
  if (n > 0) progressChanged()
  return n
}

/** Remove every progress key - the one true "fresh player" primitive. */
export function wipeProgress() {
  for (const k of PROGRESS_KEYS) {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  }
  progressChanged()
}

/* ── moving between phones (no server: a small .json over WhatsApp) ──── */

export async function shareProgressSnapshot() {
  const snap = snapshotProgress()
  const text = JSON.stringify(snap)
  const filename = `fidel-quest-progress-${snap.day}.json`
  if (isNativePlatform()) {
    try {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
      const b64 = btoa(unescape(encodeURIComponent(text)))
      await Filesystem.writeFile({ path: filename, data: b64, directory: Directory.Cache })
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
      await Share.share({ title: 'Fidel Quest progress', files: [uri] })
      return 'shared'
    } catch { /* fall through to web share / download */ }
  }
  const blob = new Blob([text], { type: 'application/json' })
  const file = typeof File !== 'undefined' ? new File([blob], filename, { type: 'application/json' }) : null
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: 'Fidel Quest progress', files: [file] })
      return 'shared'
    }
  } catch { /* cancelled or unsupported; fall through */ }
  try {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
    return 'downloaded'
  } catch {
    return 'unsupported'
  }
}

/** Parse a picked progress file and restore it. Resolves to the number of
    keys restored (0 = not a Fidel Quest progress file). */
export async function importProgressFile(file) {
  try {
    const snap = JSON.parse(await file.text())
    return restoreProgress(snap)
  } catch {
    return 0
  }
}
