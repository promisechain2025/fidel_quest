/* The marketing site stays app-only until the other products are ready.
   Three hosts have to agree: the SPA (siteAccess.js), CloudFront
   (scripts/cloudfront-rewrite.js), and Netlify (website/public/_redirects).
   Prerender and the sitemap must not publish a closed page. */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLOSED_PREFIXES, isClosedPath } from '../../website/src/siteAccess.js'
import { ROUTE_META } from '../../website/src/routeMeta.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

describe('marketing site stays on the app', () => {
  it('closed prefixes match CloudFront, Netlify, and robots', () => {
    const cf = read('scripts/cloudfront-rewrite.js')
    const listed = [...cf.match(/var CLOSED = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(listed).toEqual([...CLOSED_PREFIXES])

    const redirects = read('website/public/_redirects')
    const robots = read('website/public/robots.txt')
    for (const p of CLOSED_PREFIXES) {
      expect(redirects, p).toMatch(new RegExp(`^${p}\\s+/\\s+302$`, 'm'))
      expect(redirects, `${p}/*`).toMatch(new RegExp(`^${p}/\\*\\s+/\\s+302$`, 'm'))
      expect(robots).toContain(`Disallow: ${p}`)
    }
    expect(read('website/src/App.jsx')).toMatch(/CLOSED_PREFIXES\.map/)
    expect(read('website/src/App.jsx')).toMatch(/Navigate to="\/"/)
  })

  it('does not prerender or list a closed page, and leaves the app public', () => {
    expect(Object.keys(ROUTE_META).sort()).toEqual(['/', '/pricing', '/privacy', '/terms'])
    const sitemap = read('website/public/sitemap.xml')
    for (const p of CLOSED_PREFIXES) expect(sitemap).not.toContain(`https://easygeez.com${p}`)
    expect(sitemap).toContain('https://easygeez.com/pricing')
    expect(sitemap).not.toContain('https://easygeez.com/progress')

    for (const open of ['/', '/pricing', '/privacy', '/terms', '/progress', '/app', '/app/']) {
      expect(isClosedPath(open), open).toBe(false)
    }
    expect(isClosedPath('/teachers')).toBe(true)
    expect(isClosedPath('/teachers/')).toBe(true)
    expect(isClosedPath('/guides/the-fidel-explained')).toBe(true)
    expect(isClosedPath('/family-pack')).toBe(true)
    expect(isClosedPath('/family/child')).toBe(true)
    // /teach is closed on its own; it must not swallow /teachers via a bare prefix.
    expect(CLOSED_PREFIXES).toContain('/teach')
    expect(CLOSED_PREFIXES).toContain('/teachers')
  })

  it('keeps prerender descriptions inside the 50-160 band', () => {
    for (const [route, meta] of Object.entries(ROUTE_META)) {
      expect(meta.description.length, route).toBeGreaterThanOrEqual(50)
      expect(meta.description.length, route).toBeLessThanOrEqual(160)
      expect(meta.title.length, route).toBeGreaterThan(0)
    }
  })
})
