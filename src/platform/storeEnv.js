/* Store-billing environment: "can this build talk to the App Store / Google
   Play right now?" Split out of iap.js so screens can ask without loading
   the purchase module.

   1.3.1+: eGeez is paid upfront ($12.99, set in App Store Connect / Play
   Console) and sells only kids-profile slots in-app (profile_slot_2..6,
   platform/profileSlots.js). Store billing is on in every native build that bundles the
   @capgo/native-purchases plugin (StoreKit 2 on iOS, Play Billing on
   Android, no third-party server). There is no env switch and no
   RevenueCat key any more; web / PWA builds never have store billing. */
import { Capacitor } from '@capacitor/core'
import { isNativePlatform } from './native'

export const STORE_PLUGIN = 'NativePurchases'

export function storePluginAvailable() {
  try {
    return Capacitor?.isPluginAvailable?.(STORE_PLUGIN) === true
  } catch {
    return false
  }
}

/** True when this build can run a real store purchase / restore. */
export function iapAvailable() {
  return isNativePlatform() && storePluginAvailable()
}
