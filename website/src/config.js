/* Site configuration - override per deploy with Vite env vars. */
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://egeez.app'
export const API_URL = import.meta.env.VITE_API_URL || '' // '' = forms fall back to mailto
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'promisechain.net@gmail.com'
