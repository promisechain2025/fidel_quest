/* Kid join/unlock screen must carry no English (Yosief): no t() strings,
   no Latin JSX text - names, icons, the class code, Ge'ez aria labels. */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'FidelQuestApp.jsx'), 'utf8')
const body = src.slice(src.indexOf('function JoinClassIntro('), src.indexOf('/** A #assign= link'))

describe('join class screen', () => {
  it('has no translated English strings', () => {
    expect(body.length).toBeGreaterThan(500)
    expect(body).not.toMatch(/\bt\('/)
  })
  it('has no Latin text between JSX tags', () => {
    const texts = [...body.matchAll(/>([^<>{}]+)</g)].map((m) => m[1].trim()).filter(Boolean)
    expect(texts.filter((x) => /[A-Za-z]{2,}/.test(x))).toEqual([])
  })
  it('screen-reader words are Amharic/Tigrinya', () => {
    const words = src.slice(src.indexOf('const JC_WORDS'), src.indexOf('const jcLang'))
    const values = [...words.matchAll(/:\s*'([^']*)'/g)].map((m) => m[1])
    expect(values.length).toBe(10)
    expect(values.filter((v) => /[A-Za-z]/.test(v))).toEqual([])
  })
})
