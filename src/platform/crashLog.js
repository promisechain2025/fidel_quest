/* ============================================================================
   CRASH LOG — local, offline field diagnostics
   ----------------------------------------------------------------------------
   The app sends nothing anywhere, so the only way to learn that some WebView
   in the field is crashing is to write the crash down ON the device and show
   it to the grown-up (Grown-Ups > App health), who can screenshot it into a
   support mail. A ring buffer of the last few crashes lives in
   fq.crashlog.v1 - deliberately NOT in the progress registry: diagnostics
   belong to the device, not to the learner, and must not travel with a
   progress share to another phone.
   ErrorBoundary reaches this module via dynamic import only, so a broken
   bundle can still render the crash screen even if this file is the thing
   that broke. Every function here swallows its own failures.
   ========================================================================== */

const KEY = 'fq.crashlog.v1'
const MAX = 5

export function loadCrashes() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/** Append one crash record, keeping only the newest MAX. */
export function recordCrash(error, info) {
  try {
    const rec = {
      day: new Date().toISOString().slice(0, 10),
      msg: String(error?.message || error || 'unknown').slice(0, 200),
      stack: String(error?.stack || '').slice(0, 400),
      at: String(info?.componentStack || '').split('\n').filter(Boolean)[0]?.trim().slice(0, 120) || '',
    }
    const list = [...loadCrashes(), rec].slice(-MAX)
    localStorage.setItem(KEY, JSON.stringify(list))
    return rec
  } catch {
    return null
  }
}

export function clearCrashes() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage blocked */
  }
}
