/* The marketing site (website/index.html) forwards old-format app links -
   https://easygeez.com/#assign=... - to the PWA at /app/ with the same hash.
   This runs the exact inline script shipped in the page. */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const html = fs.readFileSync(path.join(ROOT, 'website/index.html'), 'utf8')
const src = html.match(/<script id="app-hash-forward">([\s\S]*?)<\/script>/)[1]

function run(href) {
  const u = new URL(href)
  let to = null
  const location = { pathname: u.pathname, hash: u.hash, replace: (x) => { to = x } }
  new Function('location', src)(location)
  return to
}

describe('marketing site forwards app links to /app/', () => {
  it('is the first script in <head>, so it runs before the site renders', () => {
    const head = html.slice(0, html.indexOf('</head>'))
    expect(head.indexOf('<script')).toBe(head.indexOf('<script id="app-hash-forward">'))
  })
  it('forwards #class, #assign, #receipt and #challenge with the same hash', () => {
    for (const kind of ['class', 'assign', 'receipt', 'challenge']) {
      expect(run(`https://easygeez.com/#${kind}=eyJ2IjoxfQ`)).toBe(`/app/#${kind}=eyJ2IjoxfQ`)
    }
    expect(run('https://easygeez.com/pricing#assign=abc')).toBe('/app/#assign=abc')
  })
  it('leaves everything else alone (and never loops inside /app)', () => {
    expect(run('https://easygeez.com/')).toBeNull()
    expect(run('https://easygeez.com/#pricing')).toBeNull()
    expect(run('https://easygeez.com/#classic=1')).toBeNull()
    expect(run('https://easygeez.com/app/#assign=abc')).toBeNull()
    expect(run('https://easygeez.com/app#assign=abc')).toBeNull()
  })
})
