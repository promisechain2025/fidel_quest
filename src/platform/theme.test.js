import { describe, it, expect, beforeEach } from 'vitest'
import { getTheme, setTheme, toggleTheme, applyTheme, initTheme, THEME_KEY } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
  })

  it('defaults to dark when nothing is stored', () => {
    expect(getTheme()).toBe('dark')
  })

  it('falls back to dark for an unknown stored value', () => {
    localStorage.setItem(THEME_KEY, 'chartreuse')
    expect(getTheme()).toBe('dark')
  })

  it('returns a valid stored theme', () => {
    localStorage.setItem(THEME_KEY, 'light')
    expect(getTheme()).toBe('light')
  })

  it('setTheme persists and returns the applied theme', () => {
    expect(setTheme('light')).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    expect(getTheme()).toBe('light')
  })

  it('setTheme coerces an invalid theme to dark', () => {
    expect(setTheme('neon')).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('applyTheme stamps data-theme and keeps the .dark class in lockstep', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggleTheme flips dark <-> light and persists', () => {
    setTheme('dark')
    expect(toggleTheme()).toBe('light')
    expect(getTheme()).toBe('light')
    expect(toggleTheme()).toBe('dark')
    expect(getTheme()).toBe('dark')
  })

  it('applyTheme dispatches an fq-theme event with the resolved theme', () => {
    let seen = null
    const onT = (e) => { seen = e.detail }
    window.addEventListener('fq-theme', onT)
    applyTheme('light')
    window.removeEventListener('fq-theme', onT)
    expect(seen).toBe('light')
  })

  it('initTheme applies the stored theme', () => {
    localStorage.setItem(THEME_KEY, 'light')
    expect(initTheme()).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
