/* ============================================================================
   ANALYTICS CLIENT (opt-in, privacy-safe, offline-first)
   ----------------------------------------------------------------------------
   Sends ONLY anonymous funnel counts to the backend, and only when
   VITE_ANALYTICS_URL is set. With no URL configured, track() is a hard no-op -
   the app stays 100% offline and sends nothing. There is no id, no child data,
   no progress detail: each event is just { type, day }. Batched and flushed
   with sendBeacon so it never blocks the UI and survives page hide. Analytics
   failures are swallowed - measurement must never break a child's game.
   ========================================================================== */

import { activeVariant } from './experiments'

const ENDPOINT = import.meta.env?.VITE_ANALYTICS_URL || null

let queue = []
let scheduled = false

function flush() {
  scheduled = false
  if (!ENDPOINT || queue.length === 0) return
  const batch = queue
  queue = []
  const body = JSON.stringify(batch)
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // text/plain is CORS-safelisted, so the beacon needs no preflight (which
      // it cannot perform); the server parses the JSON body regardless of type.
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }))
    } else if (typeof fetch === 'function') {
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch {
    /* never let analytics throw into the app */
  }
}

/** Record one anonymous funnel event. No-op unless VITE_ANALYTICS_URL is set. */
export function track(type) {
  if (!ENDPOINT) return
  try {
    const evt = { type, day: new Date().toISOString().slice(0, 10) }
    const a = activeVariant() // tag the device's variant so the funnel splits by it
    if (a) {
      evt.exp = a.key
      evt.variant = a.variant
    }
    queue.push(evt)
    if (queue.length > 50) queue = queue.slice(-50)
    if (!scheduled) {
      scheduled = true
      setTimeout(flush, 1500)
    }
  } catch {
    /* ignore */
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}
