/* i18n coverage guard. The app-text contract (see langpacks.js) is:
   English fallbacks live inline at every t() call site, packs may cover a
   subset of keys, and anything a pack omits shows in English. What CAN
   silently rot under that contract - and what this suite locks down - is:

   1. a t() call with no fallback (missing translation would render the raw
      key on screen),
   2. one key used with two different English meanings (every non-English
      language then shows the SAME translation for both sites - one of them
      wrong; this caught levelComplete/munched/steerInto/feedHint/catchHint/
      yourTurn collisions in July 2026),
   3. a translated key that no call site uses any more (the translation
      silently stopped applying after a rename),
   4. a language pack drifting out of the shared key set.

   The scan is static (fs over src/) so it needs no rendering and fails CI
   the moment any of the four appear. */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LANGPACKS, LANG_IDS, LANG_META, REINFORCE } from './langpacks'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/* Dynamic-key call sites (t(`speed_${s}`) and friends) declare their key
   families here; a pack key matching one of these counts as used. */
const DYNAMIC_KEY_PATTERNS = [/^speed_/, /^pace_/, /^slot\./, /^gpNum/, /\.title$/]

function sourceFiles(dir = SRC) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...sourceFiles(p))
    else if (/\.(js|jsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p)
  }
  return out
}

/* Only files that import the platform translator (as 'platform/i18n' or the
   intra-platform './i18n'); Classic (AmharicFidelGame) has its own
   UI_STRINGS-based t and is out of scope here. */
const files = sourceFiles().filter(
  (f) => !f.endsWith('langpacks.js') && /import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*'[^']*\/i18n'/.test(fs.readFileSync(f, 'utf8')),
)

const CALL_RE = /(?<![\w.$])t\(\s*'([^']+)'\s*([,)])/g
const FALLBACK_RE = /^\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/

const usedKeys = new Map() // key -> { fallback, file }
const noFallback = []
const conflicts = []
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8')
  const rel = path.relative(SRC, f)
  for (const m of s.matchAll(CALL_RE)) {
    const key = m[1]
    if (m[2] === ')') {
      noFallback.push(`${rel}: t('${key}')`)
      continue
    }
    const after = s.slice(m.index + m[0].length, m.index + m[0].length + 500)
    const fb = after.match(FALLBACK_RE)
    if (!fb) {
      noFallback.push(`${rel}: t('${key}', <non-literal fallback>)`)
      continue
    }
    const fallback = fb[0].trim()
    const prev = usedKeys.get(key)
    if (prev && prev.fallback !== fallback) conflicts.push(`'${key}': ${prev.file} says ${prev.fallback} but ${rel} says ${fallback}`)
    else usedKeys.set(key, { fallback, file: rel })
  }
}

describe('language pack structure', () => {
  it('registers exactly the picker languages (English is inline-fallback only)', () => {
    expect(Object.keys(LANGPACKS).sort()).toEqual(LANG_IDS.filter((id) => id !== 'en').sort())
    expect(LANG_META.map((l) => l.id)).toEqual(LANG_IDS)
  })

  it('every language pack carries the identical key set', () => {
    const ids = Object.keys(LANGPACKS)
    const ref = Object.keys(LANGPACKS[ids[0]]).sort()
    for (const id of ids) {
      const keys = Object.keys(LANGPACKS[id]).sort()
      const missing = ref.filter((k) => !keys.includes(k))
      const extra = keys.filter((k) => !ref.includes(k))
      expect({ id, missing, extra }).toEqual({ id, missing: [], extra: [] })
    }
  })

  it('every language has reinforcement word lists', () => {
    for (const id of LANG_IDS) {
      expect(REINFORCE[id]?.praise?.length, `praise for ${id}`).toBeGreaterThan(0)
      expect(REINFORCE[id]?.encourage?.length, `encourage for ${id}`).toBeGreaterThan(0)
    }
  })
})

describe('t() call sites', () => {
  it('found a plausible number of files and keys (guard against a broken scan)', () => {
    expect(files.length).toBeGreaterThan(10)
    expect(usedKeys.size).toBeGreaterThan(300)
  })

  it('every call provides a literal English fallback', () => {
    expect(noFallback).toEqual([])
  })

  it('no key is used with two different English meanings', () => {
    expect(conflicts).toEqual([])
  })
})

describe('pack keys against call sites', () => {
  it('every translated key is still used by some call site', () => {
    // Keys also reach t() through tables (t(tb.key, tb.label) in
    // FidelMaster), so "used" means: the quoted literal appears somewhere
    // in non-test source outside langpacks.js. Zero false failures; a key
    // this cannot see is truly orphaned.
    const allSource = sourceFiles()
      .filter((f) => !f.endsWith('langpacks.js'))
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('\n')
    const packKeys = Object.keys(LANGPACKS[Object.keys(LANGPACKS)[0]])
    const dead = packKeys.filter(
      (k) =>
        !allSource.includes(`'${k}'`) &&
        !allSource.includes(`"${k}"`) &&
        !allSource.includes(`\`${k}\``) &&
        !DYNAMIC_KEY_PATTERNS.some((re) => re.test(k)),
    )
    expect(dead).toEqual([])
  })
})
