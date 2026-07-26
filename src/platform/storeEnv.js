/* Store-billing environment - split out of iap.js so license.js can ask
   "can the native store sell right now?" without importing the purchase
   module (iap.js imports license.js for markSupported; this file keeps the
   graph acyclic). */
import { isNativePlatform, isApplePlatform } from './native'

export function revenueCatKey() {
  const key = isApplePlatform() ? import.meta.env?.VITE_REVENUECAT_APPLE_KEY : import.meta.env?.VITE_REVENUECAT_GOOGLE_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : ''
}

/** True when this build can run real store purchases (native + key set). */
export function iapAvailable() {
  return isNativePlatform() && !!revenueCatKey()
}
