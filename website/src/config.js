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

/* [CONFIRM] legal entity name, type and state before filings. Shown in the
   footer and on /about. */
export const COMPANY_NAME = 'PromiseChain'

/* Web trial on easygeez.com/app (src/platform/webTrial.js FREE_SESSIONS). */
export const WEB_TRIAL_SESSIONS = 3

/* NEW PRICING (free download + in-app purchases). OFF until the day the app
   turns free in both stores: build with VITE_FREE_PRICING=1 to switch the
   /pricing page to src/pages/PricingFree.jsx. Keep in step with the stores. */
export const FREE_PRICING = import.meta.env.VITE_FREE_PRICING === '1'
export const NEW_PRICES = Object.freeze({ core: '$12.99', prayer: '$9.99', bundle: '$19.99' })
