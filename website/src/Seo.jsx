/* Tiny per-page SEO: title, meta description, canonical, optional JSON-LD.
   Site-wide Organization/WebSite JSON-LD lives statically in index.html. */
import { useEffect } from 'react'

const SITE = 'https://egeez.app'

export default function Seo({ title, description, path = '/', jsonLd = null, noindex = false }) {
  useEffect(() => {
    document.title = title
    const ensure = (selector, create) => {
      let el = document.head.querySelector(selector)
      if (!el) { el = create(); document.head.appendChild(el) }
      return el
    }
    const desc = ensure('meta[name="description"]', () => {
      const m = document.createElement('meta'); m.name = 'description'; return m
    })
    const prevDesc = desc.content
    desc.content = description
    const canon = ensure('link[rel="canonical"]', () => {
      const l = document.createElement('link'); l.rel = 'canonical'; return l
    })
    canon.href = SITE + path
    const og = ensure('meta[property="og:title"]', () => {
      const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m
    })
    og.content = title
    // og:description / og:url / twitter:* used to keep index.html's generic
    // values on every route, so every shared link looked like the homepage.
    const metaProp = (prop, content) => {
      const el = ensure(`meta[property="${prop}"]`, () => {
        const m = document.createElement('meta'); m.setAttribute('property', prop); return m
      })
      const prev = el.content
      el.content = content
      return () => { el.content = prev }
    }
    const metaName = (name, content) => {
      const el = ensure(`meta[name="${name}"]`, () => {
        const m = document.createElement('meta'); m.name = name; return m
      })
      const prev = el.content
      el.content = content
      return () => { el.content = prev }
    }
    const restore = [
      metaProp('og:description', description),
      metaProp('og:url', SITE + path),
      metaName('twitter:title', title),
      metaName('twitter:description', description),
    ]
    // Thin, transactional or error pages must not compete in search.
    let robots = null
    if (noindex) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      robots.content = 'noindex, follow'
      document.head.appendChild(robots)
    }
    let script = null
    if (jsonLd) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
    return () => {
      desc.content = prevDesc
      for (const undo of restore) undo()
      if (robots) robots.remove()
      if (script) script.remove()
    }
  }, [title, description, path, jsonLd, noindex])
  return null
}
