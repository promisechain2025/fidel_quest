/* Store listing links and the one-time price. Keep the defaults in step
   with website/src/config.js (the marketing site uses the same URLs).
   Override per deploy with VITE_APP_STORE_URL / VITE_PLAY_STORE_URL /
   VITE_APP_PRICE. The native app does not use these to sell itself —
   the phone app is paid at download. The website trial uses them as the
   "get the phone app" links. */

export const APP_PRICE = String(import.meta.env?.VITE_APP_PRICE || '$12.99').trim()
export const APP_STORE_URL = import.meta.env?.VITE_APP_STORE_URL || 'https://apps.apple.com/app/id6789703688'
export const PLAY_STORE_URL = import.meta.env?.VITE_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=net.promisechain.fidelquest'
