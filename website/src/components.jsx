/* Shared site components: header/nav, footer, section scaffolding, brand
   primitives (tibeb ribbon, letter tiles, chunk buttons), and form fields. */
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Moon, Sun, Menu, X, ExternalLink } from 'lucide-react'
import { APP_URL } from './config.js'
import { t } from './i18n.js'

export function Tibeb({ className = '' }) {
  return <div className={`tibeb ${className}`} aria-hidden="true" />
}

export function LetterTile({ ch, size = 44, className = '' }) {
  return (
    <span className={`lt geez ${className}`} style={{ width: size, height: size, fontSize: size * 0.5 }} aria-hidden="true">
      {ch}
    </span>
  )
}

export function CtaButton({ href, to, onClick, children, tone = 'gold', external = false, className = '', type }) {
  const styles = tone === 'green'
    ? { background: 'var(--go)', color: '#fff', boxShadow: '0 4px 0 var(--go-deep)' }
    : tone === 'ghost'
      ? { background: 'var(--card)', color: 'var(--ink)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }
      : { background: 'var(--accent)', color: '#241a05', boxShadow: '0 4px 0 var(--accent-deep)' }
  const cls = `chunk inline-flex items-center gap-2 px-6 py-3 text-base ${className}`
  if (to) return <Link to={to} className={cls} style={styles}>{children}</Link>
  if (href) return <a href={href} className={cls} style={styles} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{children}{external && <ExternalLink className="h-4 w-4" aria-hidden="true" />}</a>
  return <button type={type || 'button'} onClick={onClick} className={cls} style={styles}>{children}</button>
}

export function Section({ eyebrow, title, children, center = false, className = '' }) {
  return (
    <section className={`mx-auto w-full max-w-5xl px-6 py-14 ${className}`}>
      {eyebrow && <div className={`text-xs font-black uppercase tracking-[0.22em] ${center ? 'text-center' : ''}`} style={{ color: 'var(--accent)' }}>{eyebrow}</div>}
      {title && <h2 className={`mt-2 text-3xl font-black leading-tight md:text-4xl ${center ? 'text-center' : ''}`} style={{ textWrap: 'balance' }}>{title}</h2>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`} style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
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
export const inputCls = 'w-full rounded-xl px-3.5 py-2.5 text-base'
export const inputStyle = { background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--ink)' }

const NAV = [
  ['/', 'Home'],
  ['/amharic', 'Amharic'],
  ['/tigrinya', 'Tigrinya'],
  ['/teachers', 'For teachers'],
  ['/homeschool', 'Homeschool'],
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

export function Header() {
  const [dark, setDark] = useTheme()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])
  const linkCls = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-bold ${isActive ? '' : 'opacity-75 hover:opacity-100'}`
  const linkStyle = ({ isActive }) => (isActive ? { color: 'var(--accent)' } : { color: 'var(--ink)' })
  return (
    <header className="sticky top-0 z-40" style={{ background: 'color-mix(in srgb, var(--paper) 88%, transparent)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--line)' }}>
      <Tibeb />
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3">
        <Link to="/" className="flex items-center gap-2.5 font-black">
          <LetterTile ch="ፊ" size={34} />
          <span className="text-lg">eGeez</span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={linkCls} style={linkStyle}>{t(to, label)}</NavLink>)}
          <a href={APP_URL} className="chunk ml-2 px-4 py-2 text-sm" style={{ background: 'var(--go)', color: '#fff', boxShadow: '0 3px 0 var(--go-deep)' }}>{t('openApp', 'Open the app')}</a>
        </nav>
        <button type="button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} className="ml-auto rounded-lg p-2 md:ml-2" style={{ color: 'var(--muted)' }}>
          {dark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open} className="rounded-lg p-2 md:hidden" style={{ color: 'var(--ink)' }}>
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 px-6 pb-4 md:hidden" aria-label="Main mobile">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={linkCls} style={linkStyle}>{t(to, label)}</NavLink>)}
          <a href={APP_URL} className="chunk mt-2 px-4 py-2.5 text-center text-sm" style={{ background: 'var(--go)', color: '#fff', boxShadow: '0 3px 0 var(--go-deep)' }}>{t('openApp', 'Open the app')}</a>
        </nav>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-16" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
        <div className="flex items-center gap-2 font-black" style={{ color: 'var(--ink)' }}>
          <LetterTile ch="ፊ" size={28} /> eGeez
        </div>
        <p className="max-w-xl">{t('footerLine', 'A learning home for Ethiopian and Eritrean languages - built for families, guided by teachers, made with love for the fidel.')}</p>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1" aria-label="Footer">
          {NAV.map(([to, label]) => <Link key={to} to={to} className="hover:underline">{label}</Link>)}
        </nav>
        <p className="text-xs opacity-70">© {new Date().getFullYear()} eGeez</p>
      </div>
      <Tibeb />
    </footer>
  )
}
