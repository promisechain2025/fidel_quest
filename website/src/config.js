/* Site configuration - override per deploy with Vite env vars. */
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://easygeez.com/app'
export const API_URL = import.meta.env.VITE_API_URL || '' // '' = forms fall back to mailto
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'promisechain.net@gmail.com'

/* eGeez is PAID UPFRONT: one-time $12.99 in the App Store and Google Play,
   everything included, no in-app purchases. The store sets the real price;
   keep this string in step with App Store Connect / Play Console. */
export const APP_PRICE = '$12.99'
export const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/app/id6789703688'
export const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=net.promisechain.fidelquest'
