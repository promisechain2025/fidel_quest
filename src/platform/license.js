/* ============================================================================
   LICENSE - paid upfront, the whole app
   ----------------------------------------------------------------------------
   eGeez is sold once at download ($12.99 on the App Store and Google Play).
   Every build is the whole app: every path, every Bible book, every game,
   no trial, no daily pass, no asks, no unlock codes, no subscriptions, no
   ads. The only in-app purchases are extra kids profiles (one-time, per
   child: platform/profileSlots.js + iap.js); they never gate learning
   content, so nothing here consults them. The old trial engine (VITE_MONETIZE,
   EGZ/FAM codes, SupportAsk, full_app) was removed in the 1.3.x cleanup.
   ========================================================================== */

/** Always true: every build is the whole app. Kept as the single question
    a screen can ask, so no screen ever grows a paywall branch. */
export const fullAccess = () => true
