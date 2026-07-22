/* ============================================================================
   THEME — the dark-manuscript / warm-daylight switch
   ----------------------------------------------------------------------------
   The app ships DARK by default (owner decision). A warm parchment daylight
   theme is the user-selectable alternative, flipped from the header sun/moon
   toggle. The choice is a device SETTING (like language/sound), not learning
   progress, so it lives in its own key and is deliberately absent from
   PROGRESS_KEYS.

   applyTheme() stamps data-theme on <html> so the index.css token system
   resolves; it also keeps the Tailwind `.dark` class in lockstep so Classic
   mode's class-based dark: styles match the resolved theme (not the OS).
   ========================================================================== */
import { loadFromStorage } from '../utils/loadFromStorage'

export const THEME_KEY = 'fq.theme.v1'
export const THEMES = ['dark', 'light']
const DEFAULT_THEME = 'dark'

/** The stored theme, defaulting to dark. Unknown values fall back to dark. */
export function getTheme() {
  const v = loadFromStorage(THEME_KEY, DEFAULT_THEME)
  return THEMES.includes(v) ? v : DEFAULT_THEME
}

/** Stamp <html> so tokens (index.css) and Classic's `.dark` styles resolve. */
export function applyTheme(theme) {
  const t = THEMES.includes(theme) ? theme : DEFAULT_THEME
  if (typeof document === 'undefined') return t
  document.documentElement.setAttribute('data-theme', t)
  document.documentElement.classList.toggle('dark', t === 'dark')
  // Let canvas-drawn chrome (the manuscript TibebFrame) repaint for the theme.
  try { window.dispatchEvent(new CustomEvent('fq-theme', { detail: t })) } catch { /* SSR/old */ }
  return t
}

/** Persist + apply. Returns the theme actually set. */
export function setTheme(theme) {
  const t = THEMES.includes(theme) ? theme : DEFAULT_THEME
  try { localStorage.setItem(THEME_KEY, t) } catch { /* private mode */ }
  return applyTheme(t)
}

/** Flip dark <-> light, persist, apply. Returns the new theme. */
export function toggleTheme() {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

/** Read the stored theme and stamp it before first paint (called from main). */
export function initTheme() {
  return applyTheme(getTheme())
}
