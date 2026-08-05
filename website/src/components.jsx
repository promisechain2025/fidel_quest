/* Shared site components: header/nav with slide-in mobile menu, footer,
   motion primitives, brand primitives (real logo, tibeb, letter tiles,
   chunk buttons), section scaffolding, and form fields. */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Moon, Sun, Menu, X, ExternalLink } from 'lucide-react'
import { APP_URL } from './config.js'
import { t, currentLang, setLang } from './i18n.js'

/* HIDDEN AT LAUNCH (owner decision): the toggle must not offer Amharic UI
   without Tigrinya UI - both communities get served together or neither.
   Flip to true once BOTH translation maps in i18n.js are reviewed by
   native speakers. The i18n layer keeps working underneath. */
const SHOW_LANG_TOGGLE = false

/** en <-> am toggle; reloads so every t() call re-evaluates (static site,
    simplest correct reactivity). */
function LangToggle({ className = '' }) {
  if (!SHOW_LANG_TOGGLE) return null
  const next = currentLang() === 'am' ? 'en' : 'am'
  return (
    <button type="button" className={`rounded-lg px-2 py-1.5 text-sm font-black ${className}`}
      style={{ color: 'var(--muted)' }}
      aria-label={next === 'am' ? 'ወደ አማርኛ ቀይር' : 'Switch to English'}
      onClick={() => { setLang(next); window.location.reload() }}>
      {next === 'am' ? 'አማ' : 'EN'}
    </button>
  )
}

export function Tibeb({ className = '' }) {
  return <div className={`tibeb ${className}`} aria-hidden="true" />
}

/** The real brand mark: Anbessa peeking over the letter tile (app icon). */
export function BrandMark({ size = 36, className = '' }) {
  return (
    <img src="/icon-192.png" width={size} height={size} alt="" aria-hidden="true"
      className={`rounded-[24%] ${className}`} style={{ boxShadow: '0 2px 0 rgba(0,0,0,.25)' }} />
  )
}

export function LetterTile({ ch, size = 44, className = '', float = false, delay = 0 }) {
  const tile = (
    <span className={`lt geez ${className}`} style={{ width: size, height: size, fontSize: size * 0.5 }} aria-hidden="true">
      {ch}
    </span>
  )
  if (!float) return tile
  // .lt-float is CSS (tokens.css); reduced motion is handled there.
  return <span className="lt-float" style={{ '--lt-delay': `${delay}s` }}>{tile}</span>
}

/** Scroll-reveal wrapper - once, subtle, honors reduced motion (in CSS).
    Plain IntersectionObserver: this was the only reason framer-motion sat on
    the landing critical path. If the observer is missing, the content shows
    immediately - never hidden by a failure. */
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('is-in'); return undefined }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        // Also reveal anything the reader has already scrolled PAST: a fast
        // flick can coalesce into a single "not intersecting" delivery, and a
        // section that has been and gone must not stay invisible.
        const past = e.boundingClientRect.bottom < (e.rootBounds?.top ?? 0)
        if (e.isIntersecting || past) { e.target.classList.add('is-in'); io.unobserve(e.target) }
      }
    }, { rootMargin: '200px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { '--reveal-delay': `${delay}s` } : undefined}>
      {children}
    </div>
  )
}

/** <picture> with a WebP source and the original PNG as the fallback.
    Every raster in public/ has a matching .webp generated at the size it
    actually renders, which is where the page weight was going: the hero shot
    alone was a 160 kB PNG painted into a 298px box. `pic` is
    display:contents so the wrapper never disturbs the layout. */
export function Picture({ src, alt = '', className = '', ...rest }) {
  const webp = src.replace(/\.png$/, '.webp')
  return (
    <picture className="pic">
      <source srcSet={webp} type="image/webp" />
      <img src={src} alt={alt} className={className} {...rest} />
    </picture>
  )
}

export function CtaButton({ href, to, onClick, children, tone = 'gold', external = false, className = '', type, disabled = false }) {
  const styles = tone === 'green'
    ? { background: 'var(--go-deep)', color: '#fff', boxShadow: '0 4px 0 var(--go-deep)' }
    : tone === 'ghost'
      ? { background: 'var(--card)', color: 'var(--ink)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }
      : { background: 'var(--accent)', color: '#241a05', boxShadow: '0 4px 0 var(--accent-deep)' }
  if (disabled) { styles.opacity = 0.55; styles.pointerEvents = 'none' }
  const cls = `chunk inline-flex items-center justify-center gap-2 px-6 py-3 text-base ${className}`
  if (to) return <Link to={to} className={cls} style={styles}>{children}</Link>
  if (href) return <a href={href} className={cls} style={styles} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{children}{external && <ExternalLink className="h-4 w-4" aria-hidden="true" />}</a>
  return <button type={type || 'button'} onClick={onClick} disabled={disabled} className={cls} style={styles}>{children}</button>
}

export function Section({ eyebrow, title, children, center = false, className = '', mark = '' }) {
  return (
    <section className={`watermark mx-auto w-full max-w-5xl px-5 py-14 sm:px-6 md:py-20 ${className}`} data-mark={mark}>
      <Reveal>
        {eyebrow && <div className={`text-xs font-black uppercase tracking-[0.22em] ${center ? 'text-center' : ''}`} style={{ color: 'var(--accent-text)' }}>{eyebrow}</div>}
        {title && <h2 className={`display-2 mt-2 ${center ? 'text-center' : ''}`}>{title}</h2>}
      </Reveal>
      <div className="mt-7 md:mt-9">{children}</div>
    </section>
  )
}

export function Card({ children, className = '', wash = false }) {
  return (
    <div className={`rounded-3xl p-6 md:p-7 ${wash ? 'wash' : ''} ${className}`}
      style={{ background: 'var(--card)', border: '1px solid var(--line)', boxShadow: '0 10px 30px -18px rgba(0,0,0,.35)' }}>
      {children}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
    </label>
  )
}
/* 16px font prevents iOS zoom-on-focus; generous padding for touch. */
export const inputCls = 'w-full rounded-xl px-4 py-3 text-[16px]'
export const inputStyle = { background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--ink)' }

/* HEADER nav: only the destinations a visitor is actually choosing between.
   Nine links plus a theme toggle and a CTA overflowed into a second row at
   every desktop width from 1024 to 1440 - "For teachers" wrapped, which is
   what pushed the bar to 89px tall. The logo is Home, and Family/About live
   in the footer, so nothing here costs a destination. */
const NAV = [
  ['/amharic', 'Amharic'],
  ['/tigrinya', 'Tigrinya'],
  ['/alphabet', 'Alphabet'],
  ['/teachers', 'Teachers'],
  ['/homeschool', 'Homeschool'],
  ['/guides', 'Guides'],
  ['/pricing', 'Pricing'],
]

/* The full map, for the footer and the mobile sheet - both have the room,
   so trimming the header never makes a page unreachable. */
const ALL_NAV = [
  ['/', 'Home'],
  ...NAV,
  ['/family', 'Family'],
  ['/about', 'About'],
]

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme !== 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try { localStorage.setItem('egz.site.theme', dark ? 'dark' : 'light') } catch { /* private mode */ }
  }, [dark])
  return [dark, setDark]
}

/** Full-screen mobile menu: scroll-locked, Escape closes, focus starts on
    the close button. */
function MobileMenu({ open, onClose, dark, setDark }) {
  const closeRef = useRef(null)
  const panelRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    // aria-modal claims the rest of the page is unavailable, so Tab must not
    // walk out of the overlay into the header and hero behind it.
    const root = document.getElementById('root')
    if (root) { root.setAttribute('aria-hidden', 'true'); root.inert = true }
    const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab') return
      const items = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      if (root) { root.removeAttribute('aria-hidden'); root.inert = false }
    }
  }, [open, onClose])
  // Portal to <body>: keeps this fixed overlay out of the header's stacking
  // context entirely. (It was required when the header used backdrop-filter,
  // which created a containing block; it stays because a sticky, shadowed
  // ancestor is still the wrong place to anchor a full-screen sheet.)
  return createPortal(
    <>
      {open && (
        <div
          className="menu-in fixed inset-0 z-50 flex flex-col lg:hidden"
          style={{ background: 'var(--paper)' }}
          role="dialog" aria-modal="true" aria-label="Menu"
          ref={panelRef}
        >
          <Tibeb />
          <div className="flex items-center justify-between px-5 py-3">
            <Link to="/" onClick={onClose} className="flex items-center gap-2.5 font-black">
              <BrandMark size={34} /> <span className="text-lg">eGeez</span>
            </Link>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close menu"
              className="rounded-xl p-3" style={{ color: 'var(--ink)' }}>
              <X className="h-7 w-7" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col justify-center gap-1 px-7" aria-label="Main">
            {ALL_NAV.map(([to, label], i) => (
              <div key={to} className="menu-item" style={{ '--i': i }}>
                <NavLink to={to} end={to === '/'} onClick={onClose}
                  className="block rounded-xl px-3 py-3.5 text-2xl font-black"
                  style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--ink)' })}>
                  {t(to, label)}
                </NavLink>
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-3 px-7 pb-10">
            <a href={APP_URL} className="chunk flex-1 px-4 py-3.5 text-center text-base"
              style={{ background: 'var(--go-deep)', color: '#fff', boxShadow: '0 4px 0 var(--go-deep)' }}>
              {t('openApp', 'Open the app')}
            </a>
            <LangToggle className="border-2 p-3" />
            <button type="button" onClick={() => setDark(!dark)}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="rounded-xl p-3.5" style={{ border: '2px solid var(--line)', color: 'var(--muted)' }}>
              {dark ? <Sun className="h-6 w-6" aria-hidden="true" /> : <Moon className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
          <Tibeb />
        </div>
      )}
    </>,
    document.body,
  )
}

export function Header() {
  const [dark, setDark] = useTheme()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname, hash } = useLocation()
  // A deep link with a fragment (/teachers#apply) must not be yanked back
  // to the top; and because routes are lazy the target usually does not
  // exist yet on a cold load, so retry briefly until it mounts.
  useEffect(() => {
    setOpen(false)
    if (!hash) { window.scrollTo(0, 0); return undefined }
    let tries = 0
    const id = setInterval(() => {
      const el = document.querySelector(hash)
      if (el) { el.scrollIntoView(); clearInterval(id) }
      else if (++tries > 20) clearInterval(id)
    }, 50)
    return () => clearInterval(id)
  }, [pathname, hash])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const linkCls = 'rounded-lg px-3 py-2 text-sm font-bold'
  const linkStyle = ({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--ink)', opacity: isActive ? 1 : 0.8 })
  return (
    <header className="sticky top-0 z-40"
      style={{
        // Opaque on purpose. At 90% the page slid visibly underneath - the
        // tibeb border and headings read straight through the bar - and the
        // blur did not hide it against high-contrast content.
        background: 'var(--paper)',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
        boxShadow: scrolled ? '0 6px 20px -12px rgba(0,0,0,0.45)' : 'none',
        transition: 'border-color .2s ease, box-shadow .2s ease',
      }}>
      <Tibeb />
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 sm:px-6"
        style={{ paddingTop: scrolled ? 8 : 12, paddingBottom: scrolled ? 8 : 12, transition: 'padding .2s ease' }}>
        <Link to="/" className="flex items-center gap-2.5 rounded-lg py-1 pr-2 font-black">
          <BrandMark size={scrolled ? 32 : 38} />
          <span className="text-lg tracking-tight">eGeez</span>
        </Link>
        <nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={linkCls} style={linkStyle}>{t(to, label)}</NavLink>)}
          <LangToggle />
          <button type="button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} className="rounded-lg p-2" style={{ color: 'var(--muted)' }}>
            {dark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
          <a href={APP_URL} className="chunk ml-1.5 px-4 py-2 text-sm" style={{ background: 'var(--go-deep)', color: '#fff', boxShadow: '0 3px 0 var(--go-deep)', minHeight: 40 }}>{t('openApp', 'Open the app')}</a>
        </nav>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}
          className="ml-auto rounded-xl p-2.5 lg:hidden" style={{ color: 'var(--ink)' }}>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <MobileMenu open={open} onClose={() => setOpen(false)} dark={dark} setDark={setDark} />
    </header>
  )
}

function NewsletterRow() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [mailto, setMailto] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      setError('')
      const { submitForm } = await import('./api.js')
      const r = await submitForm('/api/waitlist', { email, language: 'news' }, 'Newsletter signup - eGeez')
      setMailto(!!r?.mailto)
      setDone(true)
    } catch (e) {
      // Silently swallowing this told the visitor they had signed up when
      // nothing had been recorded.
      setError(e.message || 'Could not sign you up. Please try again.')
    } finally { setBusy(false) }
  }
  if (done) {
    return (
      <p className="text-sm font-bold" style={{ color: 'var(--go-ink)' }}>
        {mailto
          ? t('nlMailto', 'Your email app should have opened - send that message and you are in.')
          : t('nlThanks', 'You are in - we write rarely and only when it matters.')}
      </p>
    )
  }
  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-wrap items-stretch gap-2">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder={t('nlPlaceholder', 'Email for launch news')} aria-label={t('nlLabel', 'Email for launch news')}
        className="min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-[16px]"
        style={{ background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--ink)' }} />
      <button type="submit" disabled={busy} className="chunk px-4 text-sm"
        style={{ background: 'var(--accent)', color: '#241a05', boxShadow: '0 3px 0 var(--accent-deep)', minHeight: 44 }}>
        {busy ? '…' : t('nlJoin', 'Join')}
      </button>
      {error && <p role="alert" className="w-full text-xs font-bold" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  )
}

export function Footer() {
  return (
    <footer className="mt-16" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <Picture src="/art/anbessa-happy.png" loading="lazy" decoding="async" width={64} height={64} alt="" aria-hidden="true" className="mt-1 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-lg font-black">
              <BrandMark size={26} /> eGeez
            </div>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('footerLine', 'A learning home for Amharic and Tigrinya - built for families, guided by teachers, made with love for the fidel.')}
            </p>
            <div className="mt-4"><NewsletterRow /></div>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm font-bold" aria-label="Footer" style={{ color: 'var(--muted)' }}>
          {ALL_NAV.map(([to, label]) => <Link key={to} to={to} className="rounded py-0.5 hover:underline">{label}</Link>)}
          <Link to="/teach" className="rounded py-0.5 hover:underline">{t('navTeachDash', 'Teacher sign-in')}</Link>
          <Link to="/privacy" className="rounded py-0.5 hover:underline">{t('navPrivacy', 'Privacy')}</Link>
          <Link to="/terms" className="rounded py-0.5 hover:underline">{t('navTerms', 'Terms')}</Link>
        </nav>
      </div>
      <p className="pb-6 text-center text-xs" style={{ color: 'var(--muted)' }}>© {new Date().getFullYear()} eGeez</p>
      <Tibeb />
    </footer>
  )
}
