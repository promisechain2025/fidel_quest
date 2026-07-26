/* Tiny per-page SEO: title, meta description, canonical, optional JSON-LD.
   Site-wide Organization/WebSite JSON-LD lives statically in index.html. */
import { useEffect } from 'react'

const SITE = 'https://egeez.app'

export default function Seo({ title, description, path = '/', jsonLd = null }) {
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
    let script = null
    if (jsonLd) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
    return () => { desc.content = prevDesc; if (script) script.remove() }
  }, [title, description, path, jsonLd])
  return null
}
