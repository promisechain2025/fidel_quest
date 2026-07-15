import { describe, it, expect } from 'vitest'
import { buildClassicData } from './classicPack'
import { FIDEL_FAMILIES as AM } from './fidelGameData'

describe('buildClassicData (Classic mode, pack-aware)', () => {
  it('returns the validated Amharic table unchanged', () => {
    const d = buildClassicData('am')
    expect(d.FIDEL_FAMILIES).toBe(AM) // same reference: zero risk to Amharic
    expect(d.FIDEL_FAMILIES).toHaveLength(33)
  })

  it('derives the Tigrinya table (34 families incl. the qhe letter)', () => {
    const d = buildClassicData('ti')
    expect(d.FIDEL_FAMILIES).toHaveLength(34)
    expect(d.FIDEL_FAMILIES.some((f) => f.id === 'qhe')).toBe(true)
    // every family carries 7 forms + a familyIndex, like Classic expects
    d.FIDEL_FAMILIES.forEach((f, i) => {
      expect(f.familyIndex).toBe(i)
      expect(f.forms).toHaveLength(7)
    })
  })

  it("routes ሐ audio through the pack's letters/ti override, not Amharic", () => {
    const d = buildClassicData('ti')
    const hha = d.FIDEL_FAMILIES.find((f) => f.id === 'hha')
    // family-id-based key so effectiveKey redirects hha -> letters/ti/hha-1
    expect(hha.forms[0].audioKey).toBe('hha-1')
    expect(hha.forms[0].char).toBe('ሐ')
    // the char map resolves Tigrinya letters
    expect(d.CHAR_TO_FORM.get('ሐ')?.familyName).toBe('Hha')
  })

  it('builds Tigrinya word cards with a leading character', () => {
    const d = buildClassicData('ti')
    expect(d.WORDS.length).toBeGreaterThan(0)
    for (const w of d.WORDS) {
      expect(typeof w.startChar).toBe('string')
      expect(d.CHAR_TO_FORM.has(w.startChar)).toBe(true) // startChar is a real ti letter
    }
  })
})
