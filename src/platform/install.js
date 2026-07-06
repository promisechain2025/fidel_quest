/* ============================================================================
   ADD-TO-HOME-SCREEN (growth) - platform layer
   ----------------------------------------------------------------------------
   Converts a share-driven visitor into an installed, retained user. Captures
   the browser's beforeinstallprompt as early as possible (it fires once, often
   before React mounts) and exposes a tiny state machine the UI can subscribe
   to. iOS Safari has no such event, so there we surface manual instructions.
   A dismissal / successful install is remembered so we never nag.
   ========================================================================== */

import { track } from './analytics'

const KEY = 'fq.install.v1' // 'dismissed' | 'installed'
let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault?.()
    deferred = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    try {
      localStorage.setItem(KEY, 'installed')
    } catch {
      /* session-only */
    }
    track('install')
    notify()
  })
}

function stored() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator?.standalone === true
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '') && !window.MSStream
}

/** 'none' | 'prompt' (native install available) | 'ios' (manual steps). */
export function installState() {
  if (isStandalone() || stored()) return 'none'
  if (deferred) return 'prompt'
  if (isIOS()) return 'ios'
  return 'none'
}

export function dismissInstall() {
  try {
    localStorage.setItem(KEY, 'dismissed')
  } catch {
    /* session-only */
  }
  notify()
}

/** Fire the native install prompt. Returns 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  if (!deferred) return 'unavailable'
  const e = deferred
  deferred = null
  e.prompt()
  let outcome = 'dismissed'
  try {
    ;({ outcome } = await e.userChoice)
  } catch {
    outcome = 'dismissed'
  }
  if (outcome !== 'accepted') dismissInstall()
  notify()
  return outcome
}

export function onInstallChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
