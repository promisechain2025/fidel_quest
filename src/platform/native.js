/* ============================================================================
   NATIVE BRIDGE (Capacitor) — no-op on the web
   ----------------------------------------------------------------------------
   Thin wrapper so the same build runs as a website AND as the packaged
   Android/iOS app. Everything here is a no-op unless running inside the native
   shell (Capacitor.isNativePlatform()), so the web PWA is unaffected. Plugins
   are imported lazily so the web bundle never pulls native code it won't use.
   ========================================================================== */

import { Capacitor } from '@capacitor/core'

export function isNativePlatform() {
  try {
    return Capacitor?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

/** One-time native setup: status bar, splash hide, and the Android hardware
   back button. Safe to call always; returns immediately on the web. */
export async function initNative() {
  if (!isNativePlatform()) return
  try {
    const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
      import('@capacitor/splash-screen'),
      import('@capacitor/status-bar'),
      import('@capacitor/app'),
    ])
    try { await StatusBar.setStyle({ style: Style.Dark }) } catch { /* older device */ }
    // Keep the OS status bar as its own bar (don't draw the app under it).
    try { await StatusBar.setOverlaysWebView({ overlay: false }) } catch { /* iOS ignores */ }

    // Android hardware back: let the app handle it first (close a modal / go to
    // the home screen). If nothing handled it, we're at the top — exit the app.
    App.addListener('backButton', () => {
      const ev = new CustomEvent('fq:back', { cancelable: true })
      const proceed = window.dispatchEvent(ev) // false if the app called preventDefault
      if (proceed && !ev.defaultPrevented) App.exitApp()
    })

    await SplashScreen.hide()
  } catch {
    /* plugins are optional; never let native setup break the app */
  }
}

/** Share text + url via the native sheet (Capacitor) when packaged, else the
   Web Share API, else a clipboard copy. Returns true if something handled it. */
export async function nativeShare({ title, text, url }) {
  if (isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, url, dialogTitle: title })
      return true
    } catch {
      return false // user dismissed, or unsupported
    }
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch {
      return false
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      /* fall through */
    }
  }
  return false
}
