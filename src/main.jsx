import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { initNative } from './platform/native'
import { applyUrlUnlock } from './utils/devUnlock'
import { initVoice } from './platform/voicePack'
import { initReminder } from './platform/notify'
import { t } from './platform/i18n'
import { initTheme } from './platform/theme'

// Kick the bundled Ethiopic font loading immediately. The 3D games and the
// share cards bake Ge'ez glyphs into canvas textures; if that happens before
// the font is ready (common on desktops with no system Ethiopic fallback) the
// glyph comes out blank and is cached that way. Starting the load here means it
// is almost always ready by the time anything bakes.
if (typeof document !== 'undefined' && document.fonts?.load) {
  document.fonts.load("900 48px 'Noto Sans Ethiopic'").catch(() => {})
  document.fonts.load("700 48px 'Noto Sans Ethiopic'").catch(() => {})
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

// PWA updates are visible, not silent: when a new build is waiting, show a
// tap-to-update toast (kid-size target). vite-plugin-pwa registerType is
// 'prompt', so nothing swaps under the user mid-session.
async function armUpdateToast() {
  try {
    const { registerSW } = await import('virtual:pwa-register')
    const updateSW = registerSW({
      onNeedRefresh() {
        if (document.getElementById('fq-update-toast')) return
        const btn = document.createElement('button')
        btn.id = 'fq-update-toast'
        btn.type = 'button'
        btn.textContent = t('swUpdate', 'New version ready - tap to update')
        btn.style.cssText = [
          'position:fixed', 'left:50%', 'bottom:18px', 'transform:translateX(-50%)',
          'z-index:9999', 'padding:14px 22px', 'border-radius:18px', 'border:none',
          'background:var(--go, #22a860)', 'color:#fff', 'font-weight:800',
          'font-family:inherit', 'font-size:15px', 'box-shadow:0 4px 0 rgba(0,0,0,0.25)',
          'cursor:pointer',
        ].join(';')
        btn.onclick = () => updateSW(true)
        document.body.appendChild(btn)
      },
    })
  } catch { /* not built with the PWA plugin (tests, odd envs) */ }
}
armUpdateToast()
