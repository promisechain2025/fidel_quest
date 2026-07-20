/* Gifting eGeez through Apple's App Store "Gift App" flow.

   Apple has a built-in way to gift a PAID app: on the app's App Store page the
   parent taps the share (...) button and chooses "Gift App"; Apple takes the
   payment and issues a one-time code that the recipient redeems once (it is
   then spent - it "expires once used"). Google Play has no per-app gifting, so
   this path is Apple-only.

   There is no public deep link that opens the gift sheet directly, so the honest
   thing we can do from inside the app is take the parent to the App Store product
   page and show them the two taps to reach "Gift App". Payment and redemption
   are entirely Apple's - nothing here touches money, accounts, or a backend.

   The App Store numeric id only exists once the app is published, so it is read
   from VITE_APPLE_APP_ID at build time. Until it is set the gift guide still
   shows, but the "Open App Store" button is disabled (no dead link). */

const APPLE_APP_ID = import.meta.env?.VITE_APPLE_APP_ID

/** The App Store product URL for gifting, or '' until the app is published and
    VITE_APPLE_APP_ID is set. */
export function appStoreUrl() {
  const id = typeof APPLE_APP_ID === 'string' ? APPLE_APP_ID.trim() : ''
  return id ? `https://apps.apple.com/app/id${id}` : ''
}

/** Whether the "Open App Store" action can actually go somewhere yet. */
export const canOpenAppStore = () => !!appStoreUrl()

/** Open the App Store product page, from which the parent taps Share -> Gift App.
    In the native shell the '_system' target hands off to the real App Store app;
    on the web it opens a new tab. Returns false if there is no URL yet. */
export function openAppStoreForGift(isNative = false) {
  const url = appStoreUrl()
  if (!url) return false
  try {
    window.open(url, isNative ? '_system' : '_blank', 'noopener,noreferrer')
    return true
  } catch {
    return false
  }
}
