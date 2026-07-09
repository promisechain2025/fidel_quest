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

// Testing: ?unlock opens all content, ?reset wipes it. No-op without the param.
applyUrlUnlock()
// Re-activate the chosen Family Voice (if any) so Anbessa keeps that voice.
initVoice()
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
