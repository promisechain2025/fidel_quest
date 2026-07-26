/* Shared site components: header/nav with slide-in mobile menu, footer,
   motion primitives, brand primitives (real logo, tibeb, letter tiles,
   chunk buttons), section scaffolding, and form fields. */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
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
  const reduce = useReducedMotion()
  const tile = (
    <span className={`lt geez ${className}`} style={{ width: size, height: size, fontSize: size * 0.5 }} aria-hidden="true">
      {ch}
    </span>
  )
  if (reduce || !float) return tile
  return (
    <motion.span
      initial={{ opacity: 0, y: 18, rotate: -4 }}
      animate={{ opacity: 1, y: [0, -5, 0], rotate: 0 }}
      transition={{
        opacity: { duration: 0.4, delay },
        rotate: { duration: 0.4, delay },
        y: { delay: delay + 0.5, duration: 3.2 + delay, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="inline-block"
    >
      {tile}
    </motion.span>
  )
}

/** Scroll-reveal wrapper - once, subtle, honors reduced motion. */
export function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.68, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function CtaButton({ href, to, onClick, children, tone = 'gold', external = false, className = '', type, disabled = false }) {
  const styles = tone === 'green'
    ? { background: 'var(--go)', color: '#fff', boxShadow: '0 4px 0 var(--go-deep)' }
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
        {eyebrow && <div className={`text-xs font-black uppercase tracking-[0.22em] ${center ? 'text-center' : ''}`} style={{ color: 'var(--accent)' }}>{eyebrow}</div>}
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

const NAV = [
  ['/', 'Home'],
  ['/amharic', 'Amharic'],
  ['/tigrinya', 'Tigrinya'],
  ['/alphabet', 'Alphabet'],
  ['/teachers', 'For teachers'],
  ['/homeschool', 'Homeschool'],
  ['/pricing', 'Pricing'],
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
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open, onClose])
  // Portal to <body>: the header's backdrop-filter creates a containing
  // block, which would trap this fixed overlay inside the header's box.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex flex-col lg:hidden"
          style={{ background: 'var(--paper)' }}
          role="dialog" aria-modal="true" aria-label="Menu"
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
            {NAV.map(([to, label], i) => (
              <motion.div key={to}
                initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.045, duration: 0.3 }}>
                <NavLink to={to} end={to === '/'} onClick={onClose}
                  className="block rounded-xl px-3 py-3.5 text-2xl font-black"
                  style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--ink)' })}>
                  {t(to, label)}
                </NavLink>
              </motion.div>
            ))}
          </nav>
          <div className="flex items-center gap-3 px-7 pb-10">
            <a href={APP_URL} className="chunk flex-1 px-4 py-3.5 text-center text-base"
              style={{ background: 'var(--go)', color: '#fff', boxShadow: '0 4px 0 var(--go-deep)' }}>
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Header() {
  const [dark, setDark] = useTheme()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])
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
        background: 'color-mix(in srgb, var(--paper) 90%, transparent)',
        backdropFilter: 'blur(10px)',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
        transition: 'border-color .2s ease',
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
          <a href={APP_URL} className="chunk ml-1.5 px-4 py-2 text-sm" style={{ background: 'var(--go)', color: '#fff', boxShadow: '0 3px 0 var(--go-deep)', minHeight: 40 }}>{t('openApp', 'Open the app')}</a>
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
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { submitForm } = await import('./api.js')
      await submitForm('/api/waitlist', { email, language: 'news' }, 'Newsletter signup - eGeez')
      setDone(true)
    } catch { /* keep the row usable */ } finally { setBusy(false) }
  }
  if (done) {
    return <p className="text-sm font-bold" style={{ color: 'var(--go-ink)' }}>{t('nlThanks', 'You are in - we write rarely and only when it matters.')}</p>
  }
  return (
    <form onSubmit={submit} className="flex w-full max-w-sm items-stretch gap-2">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder={t('nlPlaceholder', 'Email for launch news')} aria-label={t('nlLabel', 'Email for launch news')}
        className="min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-[16px]"
        style={{ background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--ink)' }} />
      <button type="submit" disabled={busy} className="chunk px-4 text-sm"
        style={{ background: 'var(--accent)', color: '#241a05', boxShadow: '0 3px 0 var(--accent-deep)', minHeight: 44 }}>
        {busy ? '…' : t('nlJoin', 'Join')}
      </button>
    </form>
  )
}

export function Footer() {
  return (
    <footer className="mt-16" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <img src="/art/anbessa-happy.png" width={64} height={64} alt="" aria-hidden="true" className="mt-1 shrink-0" />
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
          {NAV.map(([to, label]) => <Link key={to} to={to} className="rounded py-0.5 hover:underline">{label}</Link>)}
        </nav>
      </div>
      <p className="pb-6 text-center text-xs opacity-60" style={{ color: 'var(--muted)' }}>© {new Date().getFullYear()} eGeez</p>
      <Tibeb />
    </footer>
  )
}
