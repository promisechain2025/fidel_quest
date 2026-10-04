/* Site configuration - override per deploy with Vite env vars. */
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://easygeez.com/app'
export const API_URL = import.meta.env.VITE_API_URL || '' // '' = forms fall back to mailto
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'promisechain.net@gmail.com'

/* eGeez is PAID UPFRONT: one-time $12.99 in the App Store and Google Play,
   with every path and Bible book and ONE kid profile. Extra kids profiles
   are one-time in-app purchases, bought in order, up to 6 children:
   profile_slot_2 $4.99, profile_slot_3..6 $2.49 each. The stores set the
   real prices; keep these strings in step with App Store Connect / Play
   Console. */
export const APP_PRICE = '$12.99'
export const SECOND_PROFILE_PRICE = '$4.99'
export const EXTRA_PROFILE_PRICE = '$2.49'
export const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/app/id6789703688'
export const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=net.promisechain.fidelquest'
