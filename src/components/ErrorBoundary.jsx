import { Component } from 'react'
import { RefreshCw, Home } from 'lucide-react'

/* A child on a cheap phone will hit a WebGL failure or an odd runtime error
   sooner or later; a white screen ends the session. This boundary catches it
   and shows a friendly, wordless-friendly retry instead. It is deliberately
   self-contained (no app imports) so the fallback still renders even when the
   thing that broke is the app itself. `onReset`, when given, offers a "home"
   escape that remounts the subtree; otherwise it reloads. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    // Surface in the console for debugging; never throw from here.
    try {
      console.error('eGeez caught:', error)
    } catch {
      /* ignore */
    }
    // Field diagnostics + anonymous crash count, via dynamic import so this
    // boundary stays renderable even when the app bundle is what broke.
    try {
      import('../platform/crashLog').then((m) => m.recordCrash(error, info)).catch(() => {})
      import('../platform/analytics').then((m) => m.track('error')).catch(() => {})
    } catch {
      /* ignore */
    }
  }

  reset = () => {
    if (this.props.onReset) {
      this.setState({ failed: false })
      this.props.onReset()
    } else {
      try {
        window.location.reload()
      } catch {
        this.setState({ failed: false })
      }
    }
  }

  render() {
    if (!this.state.failed) return this.props.children
    const canGoHome = !!this.props.onReset
    return (
      <div
        role="alert"
        className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center"
        style={{ background: 'var(--paper)', color: 'var(--ink)' }}
      >
        {/* A simple friendly face drawn inline - no dependency on app art. */}
        <svg width="120" height="120" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="52" r="30" fill="#f7a83c" />
          <circle cx="50" cy="52" r="30" fill="none" stroke="#d97706" strokeWidth="6" strokeDasharray="4 7" />
          <circle cx="40" cy="48" r="4" fill="#3a2a15" />
          <circle cx="60" cy="48" r="4" fill="#3a2a15" />
          <path d="M40 62 Q50 70 60 62" fill="none" stroke="#3a2a15" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <h1 className="text-2xl font-black">{this.props.title || 'Oops! Let us try that again.'}</h1>
        <button
          type="button"
          onClick={this.reset}
          className="chunk flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-white"
          style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}
        >
          {canGoHome ? <Home className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
          {canGoHome ? 'Back to the path' : 'Try again'}
        </button>
      </div>
    )
  }
}
