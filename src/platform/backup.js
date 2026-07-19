/* ============================================================================
   AUTO-BACKUP — the paid family's progress must survive the device
   ----------------------------------------------------------------------------
   localStorage can be evicted (iOS PWA storage most notoriously) and phones
   get lost. On NATIVE builds this module silently writes the progress
   snapshot (platform/progress.js, all children's slots included via the
   profile keys) to the app's Documents folder - covered by the OS backup
   (iCloud / Google device backup) - at most once per day, triggered by app
   start. Restore is a one-tap button in Grown-Ups that appears when a
   backup file exists. No server, no account, a few KB of JSON: the
   no-network promise holds. Web builds keep the manual export/import flow.
   ========================================================================== */
import { isNativePlatform } from './native'
import { snapshotProgress, restoreProgress, PROGRESS_KEYS } from './progress'
import { SWAP_KEYS } from './profiles'

const FILE = 'fidel-quest-backup.json'
const STAMP_KEY = 'fq.backup.day'

/* The backup carries the full household: registry keys, profile registry,
   and every parked profile slot. */
function fullSnapshot() {
  const snap = snapshotProgress()
  const extra = {}
  try {
    for (const k of SWAP_KEYS) {
      if (!PROGRESS_KEYS.includes(k)) {
        const v = localStorage.getItem(k)
        if (v != null) extra[k] = v
      }
    }
    const reg = localStorage.getItem('fq.profiles.v1')
    if (reg) {
      extra['fq.profiles.v1'] = reg
      for (const p of JSON.parse(reg).list || []) {
        const slot = localStorage.getItem(`fq.profile.${p.id}`)
        if (slot) extra[`fq.profile.${p.id}`] = slot
      }
    }
  } catch {
    /* partial backup is better than none */
  }
  return { ...snap, extra }
}

/** Fire-and-forget daily backup. Call at app start; never throws. */
export async function autoBackup() {
  if (!isNativePlatform()) return false
  try {
    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem(STAMP_KEY) === today) return false
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({
      path: FILE,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      data: JSON.stringify(fullSnapshot()),
    })
    localStorage.setItem(STAMP_KEY, today)
    return true
  } catch {
    return false
  }
}

/** { day, children } when a backup file exists on this device, else null. */
export async function backupInfo() {
  if (!isNativePlatform()) return null
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { data } = await Filesystem.readFile({ path: FILE, directory: Directory.Documents, encoding: Encoding.UTF8 })
    const snap = JSON.parse(typeof data === 'string' ? data : '')
    if (!snap?.data) return null
    let children = 1
    try {
      children = (JSON.parse(snap.extra?.['fq.profiles.v1'] || 'null')?.list || [null]).length
    } catch {
      /* single child */
    }
    return { day: snap.day || '?', children }
  } catch {
    return null
  }
}

/** Restore the whole household from the device backup. Returns keys written
    (0 = nothing restored). The caller reloads the app. */
export async function restoreBackup() {
  if (!isNativePlatform()) return 0
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { data } = await Filesystem.readFile({ path: FILE, directory: Directory.Documents, encoding: Encoding.UTF8 })
    const snap = JSON.parse(typeof data === 'string' ? data : '')
    let n = restoreProgress(snap)
    for (const [k, v] of Object.entries(snap?.extra || {})) {
      // Same trust rule as restoreProgress: known key shapes only.
      if (typeof v !== 'string') continue
      if (!(SWAP_KEYS.includes(k) || k === 'fq.profiles.v1' || /^fq\.profile\.p\d+$/.test(k))) continue
      try {
        if (k !== 'fq.nickname' && k !== 'fq.scope.v1') JSON.parse(v)
        localStorage.setItem(k, v)
        n++
      } catch {
        /* skip malformed */
      }
    }
    return n
  } catch {
    return 0
  }
}
