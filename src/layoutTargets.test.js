/* Tap-target + tablet-layout guard (static scan, like i18nCoverage).
   1. No single-line <button>/<a> uses a fixed square smaller than 44px
      (h-8/h-9/h-10 w-*), the size the review flagged on close/quit/back.
   2. Every full-screen root column that was phone-width (max-w-md/xl/lg with
      min-h-screen/dvh) widens on tablets (md:max-w-2xl) - an iPad is no
      longer a phone-width strip down the middle. */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.dirname(fileURLToPath(import.meta.url))
function jsx(dir = SRC) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...jsx(p))
    else if (/\.jsx$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p)
  }
  return out
}
const lines = jsx().flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').map((l, i) => ({ where: `${path.relative(SRC, f)}:${i + 1}`, l })))

describe('tap targets and tablet widths', () => {
  it('no small fixed-size buttons (< 44px squares)', () => {
    const bad = lines.filter(({ l }) => /<(button|a)\b/.test(l) && /\bh-(6|7|8|9|10) w-(6|7|8|9|10)\b/.test(l)).map((x) => x.where)
    expect(bad).toEqual([])
  })

  it('full-screen columns widen on tablets', () => {
    const narrow = lines
      .filter(({ l }) => /className=/.test(l) && /\bmx-auto\b/.test(l) && /\b(min-h-screen|min-h-dvh|h-screen)\b/.test(l) && /(^|[\s"`])max-w-(md|xl|lg)\b/.test(l) && !/md:max-w-/.test(l))
      .map((x) => x.where)
    expect(narrow).toEqual([])
  })
})
