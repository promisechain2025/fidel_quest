// Regenerate the families block of src/packs/am.js from the validated
// source src/data/fidelGameData.js. The pack literals are GENERATED -
// Ethiopic strings are never hand-edited there. Run after changing family
// names, nicknames, or words in fidelGameData.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FIDEL_FAMILIES } from '../src/data/fidelGameData.js'

const packPath = fileURLToPath(new URL('../src/packs/am.js', import.meta.url))
const src = readFileSync(packPath, 'utf8')

const lines = FIDEL_FAMILIES.map((f) => {
  const id = f.name.toLowerCase()
  const entry = { name: f.name, consonant: f.consonant }
  if (f.nickname) entry.nickname = f.nickname
  if (f.word) entry.word = f.word
  if (Array.isArray(f.words) && f.words.length > 1) entry.words = f.words
  return `    ${id}: ${JSON.stringify(entry)},`
})

const start = src.indexOf('  families: {')
const end = src.indexOf('\n  },', start)
if (start < 0 || end < 0) throw new Error('families block not found')
const next = `${src.slice(0, start)}  families: {\n${lines.join('\n')}${src.slice(end)}`
writeFileSync(packPath, next)
console.log(`am pack regenerated: ${FIDEL_FAMILIES.length} families`)
