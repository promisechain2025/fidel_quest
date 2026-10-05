import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { CtaButton, Footer, Header, Picture } from './components.jsx'
import Seo from './Seo.jsx'
import Home from './pages/Home.jsx'
import { CLOSED_PREFIXES } from './siteAccess.js'

// Home stays eager (the landing must paint instantly); every other public
// page loads on navigation. Closed product pages are not imported, so they
// are not in the bundle.
const Progress = lazy(() => import('./pages/Progress.jsx'))
const Pricing = lazy(() => import('./pages/Pricing.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))
const Terms = lazy(() => import('./pages/Terms.jsx'))

function NotFound() {
  const { pathname } = useLocation()
  return (
    <div className="mx-auto max-w-xl px-6 pt-16 text-center">
      {/* Without this an unknown URL served the homepage's title and
          description with no canonical - a soft 404 search engines index. */}
      <Seo title="Page not found - eGeez" description="That page is not on the eGeez site. Pricing, the store links, and the app start from the home page." path={pathname} noindex />
      <Picture src="/art/anbessa-think.png" width={120} height={120} alt="" aria-hidden="true" className="mx-auto" />
      <h1 className="display-2 mt-4">Hmm, this path is not on the journey.</h1>
      <p className="lede mt-3" style={{ color: 'var(--muted)' }}>The page you are looking for does not exist.</p>
      <div className="mt-6"><CtaButton to="/pricing">See pricing</CtaButton></div>
      <p className="mt-3 text-sm"><CtaButton to="/" tone="ghost">Back to the start</CtaButton></p>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const routes = (
    <Suspense fallback={<div className="py-24" aria-hidden="true" />}>
    <Routes location={location}>
      <Route path="/" element={<Home />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/pricing/success" element={<Navigate to="/pricing" replace />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      {CLOSED_PREFIXES.map((path) => (
        <Route key={path} path={path === '/guides' ? '/guides/*' : `${path}/*`} element={<Navigate to="/" replace />} />
      ))}
      {CLOSED_PREFIXES.map((path) => (
        <Route key={`${path}-exact`} path={path} element={<Navigate to="/" replace />} />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  )
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <main id="main" className="flex-1">
        {/* Keyed on the path so React remounts and the CSS enter animation
            replays; .route-in is a no-op under prefers-reduced-motion. */}
        <div key={location.pathname} className="route-in">{routes}</div>
      </main>
      <Footer />
    </div>
  )
}
