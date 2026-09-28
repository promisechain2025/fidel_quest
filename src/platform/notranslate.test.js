/* Chrome/Google Translate must not rewrite fidel. The static index.html
   signals are what the browser reads before JavaScript; lockDocumentTranslate
   keeps them after the UI language is applied. */
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getLang, lockDocumentTranslate } from './i18n'

const indexHtml = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../index.html'),
  'utf8',
)

function tag(source, name) {
  const match = source.match(new RegExp(`<${name}\\b[^>]*>`))
  return match ? match[0] : ''
}

describe('page translate lock', () => {
  it('index.html blocks Google Translate and defaults lang to English chrome', () => {
    const html = tag(indexHtml, 'html')
    const body = tag(indexHtml, 'body')
    const root = indexHtml.match(/<div id="root"[^>]*>/)?.[0] || ''
    expect(html).toContain('lang="en"')
    expect(html).toContain('translate="no"')
    expect(html).toContain('class="notranslate"')
    expect(body).toContain('translate="no"')
    expect(body).toContain('class="notranslate"')
    expect(root).toContain('translate="no"')
    expect(root).toContain('class="notranslate"')
    expect(indexHtml).toMatch(/<meta\s+name="google"\s+content="notranslate"\s*\/?>/)
    expect(html).not.toContain('lang="am"')
    expect(html).not.toContain('lang="ti"')
  })

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    document.head.querySelectorAll('meta[name="google"]').forEach((el) => el.remove())
    document.documentElement.removeAttribute('translate')
    document.documentElement.classList.remove('notranslate')
  })

  it('keeps the UI language for screen readers while blocking translate', () => {
    expect(getLang()).toBe('en')
    lockDocumentTranslate('fr')
    expect(document.documentElement.lang).toBe('fr')
    expect(document.documentElement.getAttribute('translate')).toBe('no')
    expect(document.documentElement.classList.contains('notranslate')).toBe(true)
    expect(document.body.getAttribute('translate')).toBe('no')
    expect(document.body.classList.contains('notranslate')).toBe(true)
    const root = document.getElementById('root')
    expect(root.getAttribute('translate')).toBe('no')
    expect(root.classList.contains('notranslate')).toBe(true)
    expect(document.querySelector('meta[name="google"][content="notranslate"]')).toBeTruthy()
  })

  it('ignores a learn-pack language and stays on English chrome', () => {
    lockDocumentTranslate('ti')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.getAttribute('translate')).toBe('no')
  })
})
