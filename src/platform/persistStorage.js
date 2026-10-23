/* Ask the browser to keep eGeez's storage (unlocks live in localStorage).
   Without this, Chrome may evict under storage pressure and Safari may clear
   a non-home-screen site after 7 days unvisited. Best effort, web only. */
import { isNativePlatform } from './native'

export async function requestPersistentStorage({ nav = typeof navigator !== 'undefined' ? navigator : undefined, native = isNativePlatform() } = {}) {
  if (native || !nav?.storage?.persist) return false
  try {
    if (nav.storage.persisted && (await nav.storage.persisted())) return true
    return !!(await nav.storage.persist())
  } catch { return false }
}
