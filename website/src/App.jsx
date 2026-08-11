import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router-dom'
import { CtaButton, Footer, Header, Picture } from './components.jsx'
import Seo from './Seo.jsx'
import Home from './pages/Home.jsx'

// Home stays eager (the landing must paint instantly); every other page
// loads on navigation - keeps the first bundle lean.
const Amharic = lazy(() => import('./pages/Amharic.jsx'))
const Tigrinya = lazy(() => import('./pages/Tigrinya.jsx'))
const Teachers = lazy(() => import('./pages/Teachers.jsx'))
const Homeschool = lazy(() => import('./pages/Homeschool.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Support = lazy(() => import('./pages/Support.jsx'))
const Alphabet = lazy(() => import('./pages/Alphabet.jsx'))
const Progress = lazy(() => import('./pages/Progress.jsx'))
const Family = lazy(() => import('./pages/Family.jsx'))
const Teach = lazy(() => import('./pages/Teach.jsx'))
const Pricing = lazy(() => import('./pages/Pricing.jsx'))
const Guide = lazy(() => import('./pages/Guides.jsx'))
const GuidesIndex = lazy(() => import('./pages/Guides.jsx').then((m) => ({ default: m.GuidesIndex })))
const PricingSuccess = lazy(() => import('./pages/PricingSuccess.jsx'))
const Verify = lazy(() => import('./pages/Verify.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))
const Terms = lazy(() => import('./pages/Terms.jsx'))

function NotFound() {
  const { pathname } = useLocation()
  return (
    <div className="mx-auto max-w-xl px-6 pt-16 text-center">
      {/* Without this an unknown URL served the homepage's title and
          description with no canonical - a soft 404 search engines index. */}
      <Seo title="Page not found - eGeez" description="That page is not part of the eGeez journey. Start from the beginning, or see the Amharic course." path={pathname} noindex />
      <Picture src="/art/anbessa-think.png" width={120} height={120} alt="" aria-hidden="true" className="mx-auto" />
      <h1 className="display-2 mt-4">Hmm, this path is not on the journey.</h1>
      <p className="lede mt-3" style={{ color: 'var(--muted)' }}>The page you are looking for does not exist.</p>
      <div className="mt-6"><CtaButton to="/">Back to the start</CtaButton></div>
      <p className="mt-3 text-sm"><Link to="/amharic" className="underline" style={{ color: 'var(--muted)' }}>or see the Amharic journey</Link></p>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const routes = (
    <Suspense fallback={<div className="py-24" aria-hidden="true" />}>
    <Routes location={location}>
      <Route path="/" element={<Home />} />
      <Route path="/amharic" element={<Amharic />} />
      <Route path="/tigrinya" element={<Tigrinya />} />
      <Route path="/teachers" element={<Teachers />} />
      <Route path="/homeschool" element={<Homeschool />} />
      <Route path="/alphabet" element={<Alphabet />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/family" element={<Family />} />
      <Route path="/teach" element={<Teach />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/guides" element={<GuidesIndex />} />
      <Route path="/guides/:slug" element={<Guide />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/pricing/success" element={<PricingSuccess />} />
      {/* legacy aliases from the first launch */}
      <Route path="/family-pack" element={<Pricing />} />
      <Route path="/family-pack/success" element={<PricingSuccess />} />
      <Route path="/support" element={<Support />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
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
