// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { shouldBlock, installGestureGuards } from './platform/gestureGuard'

const css = readFileSync('src/index.css', 'utf8')
const html = readFileSync('index.html', 'utf8')

const el = (html) => { document.body.innerHTML = html; return document.body.firstElementChild }

describe('viewport meta and CSS rules', () => {
  it('index.html forbids user zoom and covers the notch', () => {
    const m = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/s)[1]
    expect(m).toMatch(/width=device-width/)
    expect(m).toMatch(/initial-scale=1/)
    expect(m).toMatch(/maximum-scale=1/)
    expect(m).toMatch(/user-scalable=no/)
    expect(m).toMatch(/viewport-fit=cover/)
  })
  it('index.css stops zoom, selection, callouts, tap flash, bounce and text inflation', () => {
    expect(css).toMatch(/touch-action:\s*pan-x pan-y/)
    expect(css).toMatch(/-webkit-touch-callout:\s*none/)
    expect(css).toMatch(/-webkit-user-select:\s*none/)
    expect(css).toMatch(/-webkit-tap-highlight-color:\s*transparent/)
    expect(css).toMatch(/overscroll-behavior:\s*none/)
    expect(css).toMatch(/-webkit-text-size-adjust:\s*100%/)
    expect(css).toMatch(/-webkit-user-drag:\s*none/)
  })
  it('text fields stay selectable and the Grown-Ups area may pinch-zoom', () => {
    expect(css).toMatch(/input, textarea[^{]*\{[^}]*user-select:\s*text/s)
    expect(css).toMatch(/\[data-allow-zoom\][^{]*\{[^}]*pinch-zoom/s)
  })
})

describe('gesture guards', () => {
  let off
  beforeEach(() => { document.body.innerHTML = ''; off = installGestureGuards(document) })
  afterEach(() => off())

  const fire = (target, type, props = {}) => {
    const e = new Event(type, { bubbles: true, cancelable: true })
    Object.assign(e, props)
    target.dispatchEvent(e)
    return e.defaultPrevented
  }

  it('cancels iOS pinch gestures on a game surface', () => {
    const b = el('<button>ሀ</button>')
    for (const t of ['gesturestart', 'gesturechange', 'gestureend']) expect(fire(b, t)).toBe(true)
  })
  it('cancels multi-finger moves but not a one-finger scroll', () => {
    const b = el('<div>x</div>')
    expect(fire(b, 'touchmove', { touches: [{}, {}] })).toBe(true)
    expect(fire(b, 'touchmove', { touches: [{}] })).toBe(false)
  })
  it('cancels the context menu, selection start and image drag, except in text fields', () => {
    const b = el('<div><img alt="" src="x.png"><input id="i"></div>')
    expect(fire(b.querySelector('img'), 'contextmenu')).toBe(true)
    expect(fire(b.querySelector('img'), 'selectstart')).toBe(true)
    expect(fire(b.querySelector('img'), 'dragstart')).toBe(true)
    expect(fire(b.querySelector('input'), 'contextmenu')).toBe(false)
    expect(fire(b.querySelector('input'), 'selectstart')).toBe(false)
  })
  it('cancels Ctrl+wheel and Ctrl +/-/0 zoom, but not a normal wheel or typing', () => {
    const b = el('<div>x</div>')
    expect(fire(b, 'wheel', { ctrlKey: true })).toBe(true)
    expect(fire(b, 'wheel', { ctrlKey: false })).toBe(false)
    expect(fire(b, 'keydown', { ctrlKey: true, key: '=' })).toBe(true)
    expect(fire(b, 'keydown', { ctrlKey: true, key: '-' })).toBe(true)
    expect(fire(b, 'keydown', { ctrlKey: false, key: '-' })).toBe(false)
  })
  it('lets the Grown-Ups area zoom', () => {
    const g = el('<div data-allow-zoom=""><span id="s">x</span></div>')
    const s = g.querySelector('#s')
    expect(fire(s, 'gesturestart')).toBe(false)
    expect(fire(s, 'wheel', { ctrlKey: true })).toBe(false)
    expect(shouldBlock('touchmove', { target: s, touches: [{}, {}] })).toBe(false)
  })
})
