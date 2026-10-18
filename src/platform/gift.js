/* The App Store product page for eGeez (used as the share link on native
   iOS). The numeric id only exists once the app is published, so it is read
   from VITE_APPLE_APP_ID at build time; '' until it is set. eGeez 1.3.0 is
   paid upfront and has no in-app purchases - nothing here sells anything. */

const APPLE_APP_ID = import.meta.env?.VITE_APPLE_APP_ID

/** https://apps.apple.com/app/id<id>, or '' when the id is not configured. */
export function appStoreUrl() {
  const id = typeof APPLE_APP_ID === 'string' ? APPLE_APP_ID.trim() : ''
  return id ? `https://apps.apple.com/app/id${id}` : ''
}
