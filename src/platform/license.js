/* ============================================================================
   LICENSE
   ----------------------------------------------------------------------------
   Native iOS/Android: paid upfront at download ($12.99). fullAccess() is
   always true. The only in-app purchases are extra kids profiles
   (platform/profileSlots.js + iap.js); they never gate learning content.

   Website (VITE_BASE=/app/, not a native shell): a 3-session trial, then a
   parental-gated paywall. An unlock code from the paid app's Grown-Ups
   screen restores full access on that browser. See platform/webTrial.js.
   ========================================================================== */
import { hasFullAccess } from './webTrial'

/** The one question a screen asks before starting a lesson, game, or story.
    Native builds always pass. The /app website passes during the 3 free
    sessions and after an unlock code. */
export function fullAccess() {
  return hasFullAccess()
}
