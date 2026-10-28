/* Guide text for the toy-brick games: it must come from the app's i18n
   (t(key, English fallback)), render in English by default, never use
   Amharic/Tigrinya as an app-text language, and never hardcode English into
   a component. Fidel / words / recordings are content, not UI text. */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { Hand } from 'lucide-react'
import { GuideSign, brickLabels } from './brickKit'
import { t, getLang } from '../platform/i18n'
import { LANG_IDS, LANGPACKS } from '../platform/langpacks'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const GAMES = ['brickKit.jsx', 'BrickWords.jsx', 'BlockChurch.jsx', 'StackTower.jsx'].filter((f) => fs.existsSync(path.join(DIR, f)))
const src = (f) => fs.readFileSync(path.join(DIR, f), 'utf8')
const ETHIOPIC = /[\u1200-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/

describe('brick guide text goes through i18n', () => {
  it('t() gives English by default and the sign renders it', () => {
    expect(getLang()).toBe('en')
    expect(t('brickWordsGuide', 'Build the word')).toBe('Build the word')
    render(<GuideSign icon={Hand} text={t('brickTowerGuide', 'Drag the bricks in order')} />)
    expect(screen.getByTestId('guide').textContent).toBe('Drag the bricks in order')
    const L = brickLabels()
    expect(L).toMatchObject({ listen: 'Tap to hear', good: 'Nice!', retry: 'Try again!' })
  })

  it('a stored am/ti language is never an app-text language: falls back to English', () => {
    for (const bad of ['am', 'ti']) {
      localStorage.setItem('fq.lang', bad)
      expect(getLang()).toBe('en')
      expect(LANG_IDS).not.toContain(bad)
      expect(Object.keys(LANGPACKS)).not.toContain(bad)
    }
    localStorage.removeItem('fq.lang')
  })

  it('every t() fallback in the brick games is English guide text (no Ethiopic UI strings)', () => {
    expect(GAMES.length).toBeGreaterThanOrEqual(3)
    let found = 0
    for (const f of GAMES) {
      for (const m of src(f).matchAll(/(?<![\w.$])t\(\s*'([^']+)'\s*,\s*'([^']*)'/g)) {
        found++
        expect(m[2], `${f} ${m[1]}`).not.toMatch(ETHIOPIC)
        expect(m[2], `${f} ${m[1]}`).toMatch(/^[A-Za-z][A-Za-z !.,']*$/)
        expect(m[2].length).toBeLessThanOrEqual(40)
      }
    }
    expect(found).toBeGreaterThanOrEqual(8)
  })

  it('no English is hardcoded in JSX text or aria-labels (all through t())', () => {
    for (const f of GAMES) {
      const code = src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      // JSX text nodes: >Some words<
      const jsxText = [...code.matchAll(/>\s*([A-Za-z][A-Za-z ,.!']{2,})\s*</g)].map((m) => m[1])
      expect(jsxText, `${f} JSX text`).toEqual([])
      // aria-label="..." / label="..." literals
      const lit = [...code.matchAll(/(?:aria-label|label)="([^"]*[A-Za-z][^"]*)"/g)].map((m) => m[1])
      expect(lit, `${f} literal labels`).toEqual([])
    }
  })
})
