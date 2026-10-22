/* Amharic / Tigrinya are full app-text languages for kid screens (owner's
   decision, Oct 2026). Fails when a kid-screen t() key has no am or ti text,
   i.e. would fall back to English. Adult/parent screens may stay English. */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { AM } from './langpackAm'
import { TI } from './langpackTi'
import { LANG_IDS } from './langpacks'

const ADULT = /(GrownUps|TeacherMode|PracticeReport|WebTrialPaywall|ParentalGate|ProfileSlotOffer|PaidBuyerCard|ClassUnlockCard|ShareGate|main\.jsx|experiments\.js|firstRun\.js|TvClass|ClassPractice|langpack|i18n\.js)/
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : /\.jsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(d, e.name)] : [])

const kid = new Map()
for (const f of walk(path.resolve(__dirname, '..'))) {
  if (ADULT.test(f)) continue
  const s = fs.readFileSync(f, 'utf8')
  for (const m of s.matchAll(/\bt\(\s*'([A-Za-z0-9_.]+)'\s*,\s*(['"`])((?:\\.|(?!\2).)*)\2\s*(?:,\s*\{([^}]*)\})?/g)) {
    const e = kid.get(m[1]) || { en: m[3], vars: new Set(), files: new Set() }
    for (const v of (m[4] || '').matchAll(/(\w+)\s*:/g)) e.vars.add(v[1])
    for (const v of m[3].matchAll(/\{(\w+)\}/g)) e.vars.add(v[1])
    // Template fallbacks with nested ${} defeat the regex vars capture; read
    // the trailing { a: ..., b: ... } object on the same line instead.
    const line = s.slice(m.index, s.indexOf('\n', m.index))
    const obj = line.match(/,\s*\{([^{}]*)\}\s*\)[^)]*$/)
    if (obj) for (const v of obj[1].matchAll(/(\w+)\s*:/g)) e.vars.add(v[1])
    e.files.add(path.basename(f))
    kid.set(m[1], e)
  }
}

describe('Ge\'ez-script UI languages', () => {
  it('am and ti are selectable app-text languages', () => {
    expect(LANG_IDS).toContain('am')
    expect(LANG_IDS).toContain('ti')
  })
  it('finds the kid-screen strings', () => {
    expect(kid.size).toBeGreaterThan(400)
    expect(kid.has('start')).toBe(true)
    expect(kid.has('schoolPathUnit')).toBe(true)
  })
  for (const [id, pack] of [['am', AM], ['ti', TI]]) {
    it(`${id}: every kid-screen string is translated (no English fallback)`, () => {
      const missing = [...kid.keys()].filter((k) => typeof pack[k] !== 'string' || !pack[k].trim())
      expect(missing.map((k) => `${k} (${[...kid.get(k).files][0]})`)).toEqual([])
    })
    it(`${id}: translations are Ge'ez script, not copied English`, () => {
      const latin = [...kid.keys()].filter((k) => pack[k] && !/[\u1200-\u139F]/.test(pack[k]) && /[A-Za-z]{3}/.test(pack[k]))
      expect(latin).toEqual([])
    })
    it(`${id}: placeholders only use variables the caller passes`, () => {
      const bad = []
      for (const [k, e] of kid) for (const v of (pack[k] || '').matchAll(/\{(\w+)\}/g)) if (!e.vars.has(v[1])) bad.push(`${k}:{${v[1]}}`)
      expect(bad).toEqual([])
    })
  }
})
