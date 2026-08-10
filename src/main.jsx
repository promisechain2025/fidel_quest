import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { initNative } from './platform/native'
import { applyUrlUnlock } from './utils/devUnlock'
import { initVoice } from './platform/voicePack'
import { warmAudioCache } from './platform/audioEngine'
import { initReminder } from './platform/notify'
import { t, loadActiveLangPack } from './platform/i18n'
import { initTheme } from './platform/theme'

// Kick the bundled Ethiopic font loading immediately. The 3D games and the
// share cards bake Ge'ez glyphs into canvas textures; if that happens before
// the font is ready (common on desktops with no system Ethiopic fallback) the
// glyph comes out blank and is cached that way. Starting the load here means it
// is almost always ready by the time anything bakes.
if (typeof document !== 'undefined' && document.fonts?.load) {
  // The probe STRING matters: the Ethiopic face has a unicode-range, so a
  // load() with no Ge'ez text does not actually fetch the subset (a silent
  // no-op). Passing real fidel forces the woff2 to load now, before anything
  // bakes a glyph into a canvas texture.
  document.fonts.load("900 48px 'Noto Sans Ethiopic'", 'ሀለሐመ').catch(() => {})
  document.fonts.load("700 48px 'Noto Sans Ethiopic'", 'ሀለሐመ').catch(() => {})
}

// Resolve the eGeez theme before first paint: dark manuscript by default, or
// the stored warm-daylight choice. This stamps data-theme on <html> (the
// index.css token system resolves off it) AND keeps Tailwind's class-based
// `.dark` in lockstep so Classic mode's dark: styles match the resolved theme
// rather than the OS. Doing it here, ahead of render, avoids a theme flash.
initTheme()

// Testing: ?unlock opens all content, ?reset wipes it. No-op without the param.
applyUrlUnlock()
// Re-activate the chosen Family Voice (if any) so Anbessa keeps that voice.
initVoice()
// Native store builds: sync an already-owned Family Pack (reinstall case).
// Dormant no-op on web or until the RevenueCat keys are configured.
import('./platform/iap').then((m) => m.initIap()).catch(() => {})
// Native: silently back the household's progress up to the OS-backed
// Documents folder, at most once a day. Web keeps manual export.
import('./platform/backup').then((m) => m.autoBackup()).catch(() => {})
/* The chosen UI language is fetched before ANYTHING reads a string, for the
   same reason initTheme() runs ahead of render: otherwise the first paint (and
   the reminder text below, which calls t() eagerly) would be English and then
   snap. Only the active pack is fetched - English users await a resolved
   promise and pay nothing. A failed fetch resolves false and every key falls
   back to the inline English, so a boot can never hang on it. */
loadActiveLangPack().then(() => {
  // Re-arm the daily reminder if a grown-up opted in (native only).
  initReminder({ title: t('remindTitle', 'Anbessa misses you!'), body: t('remindBody', 'Come learn a letter today.'), hour: 17 })

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )

  // Native shell setup (status bar, splash, Android back button). No-op on web.
  initNative()
})

// Background-warm the whole voice set into the SW runtime cache so the app
// speaks every letter offline (the atomic audio precache was dropped so the
// shell goes offline-ready fast). Idle + online + failure-tolerant, and a
// no-op once the clips are cached.
if (typeof window !== 'undefined') {
  const warm = async () => {
    // Ask for PERSISTENT storage first. A best-effort origin is evicted whole
    // under storage pressure - Cache API and localStorage together - so warming
    // ~4.7MB of voice into the same bucket that holds the child's only copy of
    // their progress was actively raising the odds of losing it. A persisted
    // origin is never evicted without the user's say-so. Chrome grants this
    // silently for an installed/engaged PWA; elsewhere it just resolves false
    // and we are no worse off than before.
    try {
      await navigator.storage?.persist?.()
    } catch {
      /* unsupported or blocked - warm anyway */
    }
    warmAudioCache()
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 10000 })
  else setTimeout(warm, 5000)
}

// PWA updates are visible, not silent: when a new build is waiting, show a
// tap-to-update toast (kid-size target). vite-plugin-pwa registerType is
// 'prompt', so nothing swaps under the user mid-session.
async function armUpdateToast() {
  try {
    const { registerSW } = await import('virtual:pwa-register')
    const updateSW = registerSW({
      onNeedRefresh() {
        if (document.getElementById('fq-update-toast')) return
        // Sits at the TOP, out of the bottom thumb/play zone, and is dismissible
        // - a child mid-mini-game must not fat-finger a full reload. It only
        // appears when a new build is genuinely waiting (registerType 'prompt').
        const bar = document.createElement('div')
        bar.id = 'fq-update-toast'
        bar.style.cssText = [
          'position:fixed', 'left:50%', 'top:14px', 'transform:translateX(-50%)',
          'z-index:9999', 'display:flex', 'align-items:center', 'gap:6px',
          'padding:6px 6px 6px 14px', 'border-radius:18px',
          'background:var(--go, #22a860)', 'color:#fff', 'font-weight:800',
          'font-family:inherit', 'font-size:14px', 'box-shadow:0 4px 14px rgba(0,0,0,0.3)',
        ].join(';')
        const label = document.createElement('button')
        label.type = 'button'
        label.textContent = t('swUpdate', 'New version ready - tap to update')
        label.style.cssText = 'border:none;background:none;color:inherit;font:inherit;cursor:pointer;padding:6px 2px'
        label.onclick = () => updateSW(true)
        const close = document.createElement('button')
        close.type = 'button'
        close.setAttribute('aria-label', t('swDismiss', 'Dismiss update'))
        close.textContent = '×'
        close.style.cssText = 'border:none;background:rgba(255,255,255,0.22);color:#fff;font:inherit;font-size:16px;line-height:1;cursor:pointer;width:26px;height:26px;border-radius:13px'
        close.onclick = () => bar.remove()
        bar.appendChild(label)
        bar.appendChild(close)
        document.body.appendChild(bar)
      },
    })
  } catch { /* not built with the PWA plugin (tests, odd envs) */ }
}
armUpdateToast()
