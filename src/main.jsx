import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { initNative } from './platform/native'
import { applyUrlUnlock } from './utils/devUnlock'
import { initVoice } from './platform/voicePack'

// Testing: ?unlock opens all content, ?reset wipes it. No-op without the param.
applyUrlUnlock()
// Re-activate the chosen Family Voice (if any) so Anbessa keeps that voice.
initVoice()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Native shell setup (status bar, splash, Android back button). No-op on web.
initNative()
