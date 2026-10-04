/* ============================================================================
   LICENSE - paid upfront, fully unlocked
   ----------------------------------------------------------------------------
   eGeez 1.3.0 is sold once at download ($12.99 on the App Store and Google
   Play). Every build is fully unlocked: no trial, no daily pass, no asks, no
   unlock codes, no Family Pack, no in-app purchases, no subscriptions. The
   old honest-trial engine (VITE_MONETIZE, EGZ/FAM codes, SupportAsk) was
   removed in the paid-upfront cleanup.

   What remains is the one hook the dormant store wrapper (iap.js) writes
   to if it is ever revived behind VITE_STORE_IAP - and iap.js fails closed:
   no RevenueCat plugin is bundled, and ios/App/ci_scripts/ci_post_clone.sh
   refuses to archive a build with VITE_STORE_IAP set.

   fq.license.v1: { supported } - device-level, never a progress key.
   ========================================================================== */
import { progressChanged } from './childModel'

const KEY = 'fq.license.v1'

/** Always true: every build is the whole app. Kept as the single question
    a future model would answer, so no screen needs a paywall branch. */
export const fullAccess = () => true

/** Record that a store purchase was seen (only the dormant iap.js calls
    this). Has no effect on access - everything is already open. */
export function markSupported(source = 'unknown') {
  try {
    localStorage.setItem(KEY, JSON.stringify({ supported: source || true }))
  } catch {
    /* session-only */
  }
  progressChanged()
}
