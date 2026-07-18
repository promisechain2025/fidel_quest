/* Drift guard: src/script/ethiopic.js is GENERATED from the validated
   src/data/fidelGameData.js and must never be hand-edited. A wrong Ethiopic
   character is the worst bug this app can ship, so this suite fails CI the
   moment the two copies of the table disagree — byte for byte. */
import { describe, it, expect } from 'vitest'
import { ETHIOPIC_SCRIPT } from './ethiopic'
import { FIDEL_FAMILIES } from '../data/fidelGameData'

// Families applicable to Amharic: everything not restricted to other packs.
const amScript = ETHIOPIC_SCRIPT.families.filter((f) => !f.only || f.only.includes('am'))

describe('script table drift guard (generated vs validated source)', () => {
  it('carries exactly the validated Amharic families, in traditional order', () => {
    expect(amScript.length).toBe(FIDEL_FAMILIES.length)
  })

  it('every family matches the source table character for character', () => {
    amScript.forEach((scriptFamily, i) => {
      const source = FIDEL_FAMILIES[i]
      expect(`${scriptFamily.id}:${scriptFamily.chars}`).toBe(`${scriptFamily.id}:${source.chars}`)
    })
  })

  it('every labialized bonus form matches the source', () => {
    amScript.forEach((scriptFamily, i) => {
      const source = FIDEL_FAMILIES[i]
      expect(`${scriptFamily.id}:${scriptFamily.labial ?? ''}`).toBe(`${scriptFamily.id}:${source.labial ?? ''}`)
    })
  })

  it('no character appears twice anywhere in the script table', () => {
    const seen = new Map()
    for (const f of ETHIOPIC_SCRIPT.families) {
      for (const ch of [...Array.from(f.chars), ...(f.labial ? [f.labial] : [])]) {
        expect(seen.has(ch), `${ch} in both ${seen.get(ch)} and ${f.id}`).toBe(false)
        seen.set(ch, f.id)
      }
    }
  })

  it('every character is a real Ethiopic codepoint', () => {
    for (const f of ETHIOPIC_SCRIPT.families) {
      for (const ch of [...Array.from(f.chars), ...(f.labial ? [f.labial] : [])]) {
        const cp = ch.codePointAt(0)
        expect(cp >= 0x1200 && cp <= 0x137f, `${f.id} char ${ch} (U+${cp.toString(16)})`).toBe(true)
      }
    }
  })

  it('pack-restricted families are locked to known ids', () => {
    const restricted = ETHIOPIC_SCRIPT.families.filter((f) => f.only)
    expect(restricted.map((f) => f.id)).toEqual(['qhe'])
  })
})
