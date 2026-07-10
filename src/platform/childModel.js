/* ============================================================================
   CHILD MODEL — the reactive spine over the child's progress
   ----------------------------------------------------------------------------
   Storage stays the source of truth (each platform module owns its key; the
   full list lives in platform/progress.js). What was missing was REACTIVITY:
   screens re-read storage on mount and cross-feature updates leaned on
   manual forceRefresh bumps, so views could sit stale until navigation.

   This is the fix, kept deliberately boring: a version counter + listeners.
   Every writer of child state calls progressChanged(); every screen that
   derives UI from progress calls useChildModel() and re-runs its pure
   selectors (learnedFamilyIds, letterStats, huntDoneToday, licenseState, …)
   whenever the version ticks. No store of data, no new dependency, no
   second source of truth - just invalidation.
   ========================================================================== */
import { useSyncExternalStore } from 'react'

let version = 0
const listeners = new Set()

/** Writers call this after persisting any child state (progress, ledger,
    day marks, license). Idempotent and cheap - call it liberally. */
export function progressChanged() {
  version++
  for (const l of [...listeners]) {
    try { l() } catch { /* a broken listener must not stop the rest */ }
  }
}

/** Subscribe outside React (returns an unsubscribe). */
export function subscribeProgress(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const progressVersion = () => version

/** React hook: returns a number that changes whenever child state changes.
    Use it as a dependency (or just call it) so render-time reads of the
    pure selectors are always fresh. */
export function useChildModel() {
  return useSyncExternalStore(
    (l) => subscribeProgress(l),
    progressVersion,
    progressVersion,
  )
}
