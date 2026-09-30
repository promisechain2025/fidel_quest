/* Store-billing environment - split out of iap.js so license.js can ask
   "can the native store sell right now?" without importing the purchase
   module (iap.js imports license.js for markSupported; this file keeps the
   graph acyclic). */
import { isNativePlatform, isApplePlatform } from './native'

export function revenueCatKey() {
  const key = isApplePlatform() ? import.meta.env?.VITE_REVENUECAT_APPLE_KEY : import.meta.env?.VITE_REVENUECAT_GOOGLE_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : ''
}

/** PAID UPFRONT (v1.3.0+): eGeez is sold as a paid download ($12.99 set in
    App Store Connect / Play Console). The store takes payment at install, so
    every build is fully unlocked: no trial, no paywall, no Buy/Restore UI.
    The RevenueCat in-app purchase path (iap.js) stays in the code but is
    DORMANT - a RevenueCat key alone (e.g. still set in an Xcode Cloud
    workflow) no longer turns it on. Only an explicit VITE_STORE_IAP=true
    revives it, for a possible future free-with-IAP model. */
export function storeIapEnabled() {
  return /^(1|true|yes|on)$/i.test(String(import.meta.env?.VITE_STORE_IAP ?? ''))
}

/** True when this build can run real store purchases: the dormant IAP path
    was explicitly re-enabled AND the app is native with that platform's key.
    False in every default build (paid-upfront model). */
export function iapAvailable() {
  return storeIapEnabled() && isNativePlatform() && !!revenueCatKey()
}
