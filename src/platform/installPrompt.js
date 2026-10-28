/* ============================================================================
   INSTALL PROMPT (web only) - "Add eGeez to your home screen"
   ----------------------------------------------------------------------------
   Chrome on Android fires `beforeinstallprompt` once, early, often before the
   Grown-Ups screen is open. We catch it at module load (imported from
   main.jsx) and keep it so a later "Install app" button can use it.
   Never used in the Capacitor apps (they are already installed apps).
   ========================================================================== */
import { isNativePlatform } from './native'

let deferred = null
const subs = new Set()
const emit = () => subs.forEach((f) => f(deferred))

if (typeof window !== 'undefined' && !isNativePlatform()) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => { deferred = null; emit() })
}

export function getInstallPrompt() { return deferred }
export function onInstallPrompt(fn) { subs.add(fn); return () => subs.delete(fn) }

/** Show the "Install app" prompt. Resolves 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  const e = deferred
  if (!e) return 'unavailable'
  deferred = null
  emit()
  try {
    await e.prompt()
    const c = await e.userChoice
    return c?.outcome || 'dismissed'
  } catch { return 'dismissed' }
}

/** 'ios' | 'android' | 'other' from the user agent. */
export function deviceOs(ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '', nav = typeof navigator !== 'undefined' ? navigator : {}) {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  // iPadOS 13+ reports as a Mac with touch.
  if (/Macintosh/i.test(ua) && (nav.maxTouchPoints || 0) > 1) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

/** True when already opened from the home screen. */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia?.('(display-mode: standalone)')?.matches) return true
  } catch { /* ignore */ }
  return window.navigator?.standalone === true
}

/** Should the home-screen step be shown at all? */
export function installStepAvailable(native = isNativePlatform()) {
  return !native && !isStandalone()
}
