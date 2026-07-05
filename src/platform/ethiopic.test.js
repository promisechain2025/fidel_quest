import { describe, it, expect } from 'vitest'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { AM_PACK } from '../packs/am'
import { TI_PACK } from '../packs/ti'
import { mergeFamilies, deriveForms, deriveIndexes, validatePack, PACKS } from './ethiopic'

describe('script table', () => {
  it('has 33 families of exactly 7 unique Ethiopic characters', () => {
    expect(ETHIOPIC_SCRIPT.families).toHaveLength(33)
    const chars = ETHIOPIC_SCRIPT.families.flatMap((f) => Array.from(f.chars))
    expect(chars).toHaveLength(231)
    expect(new Set(chars).size).toBe(231)
    expect(
      chars.every((c) => {
        const cp = c.codePointAt(0)
        return cp >= 0x1200 && cp <= 0x137f
      }),
    ).toBe(true)
  })
})

describe('pack validation (the CI contract)', () => {
  it('accepts every registered pack', () => {
    for (const pack of Object.values(PACKS)) {
      const result = validatePack(ETHIOPIC_SCRIPT, pack)
      expect(result.errors).toEqual([])
      expect(result.ok).toBe(true)
    }
  })

  it('rejects a pack missing a family', () => {
    const families = { ...AM_PACK.families }
    delete families.le
    const result = validatePack(ETHIOPIC_SCRIPT, { ...AM_PACK, families })
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toContain('le missing')
  })

  it('rejects a twin group whose members sound different', () => {
    const families = { ...AM_PACK.families, hha: { ...AM_PACK.families.hha, consonant: 'x' } }
    const result = validatePack(ETHIOPIC_SCRIPT, { ...AM_PACK, families })
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toContain('mixes sounds')
  })

  it('rejects same-sounding families that are not declared twins', () => {
    // Undeclare the s-twins: se and sse still both say "s" -> ambiguous.
    const result = validatePack(ETHIOPIC_SCRIPT, {
      ...AM_PACK,
      twins: [['ha', 'hha', 'kha'], ['a', 'ae'], ['tse', 'ttse']],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toContain('must be one twin group')
  })

  it('rejects words not writable in the script', () => {
    const families = {
      ...AM_PACK.families,
      le: { ...AM_PACK.families.le, word: { geez: 'ልЖ', latin: 'x', meaning: 'x', picture: 'x' } },
    }
    const result = validatePack(ETHIOPIC_SCRIPT, { ...AM_PACK, families })
    expect(result.ok).toBe(false)
  })
})

describe('merge preserves the legacy Amharic shapes exactly', () => {
  const families = mergeFamilies(ETHIOPIC_SCRIPT, AM_PACK)
  it('twins, labials, nicknames, and words survive the merge', () => {
    const byId = Object.fromEntries(families.map((f) => [f.id, f]))
    expect(families).toHaveLength(33)
    expect(byId.hha.twinOf).toBe('Ha')
    expect(byId.kha.twinOf).toBe('Ha')
    expect(byId.sse.twinOf).toBe('Se')
    expect(byId.ha.twinOf).toBeUndefined()
    expect(byId.le.labial).toBe('ሏ')
    expect(byId.ke.word.latin).toBe('kokeb')
    expect(byId.sse.nickname).toBe('Nigusu Sse')
  })

  it('derived forms match the historical audio keys and sounds', () => {
    const forms = deriveForms(families, AM_PACK.orders)
    const { byAudioKey } = deriveIndexes(forms)
    expect(forms).toHaveLength(231)
    expect(byAudioKey.get('ha-1').char).toBe('ሀ')
    expect(byAudioKey.get('ha-1').sound).toBe('ha')
    expect(byAudioKey.get('le-6').sound).toBe('lih')
    expect(byAudioKey.get('pe-7').char).toBe('ፖ')
  })
})

describe('a different language changes behavior without changing code', () => {
  it('Tigrinya un-merges the ha-family sounds Amharic merged', () => {
    const forms = deriveForms(mergeFamilies(ETHIOPIC_SCRIPT, TI_PACK), TI_PACK.orders)
    const { byAudioKey } = deriveIndexes(forms)
    const am = deriveIndexes(deriveForms(mergeFamilies(ETHIOPIC_SCRIPT, AM_PACK), AM_PACK.orders))
    // Same glyphs, same keys - different phonology.
    expect(am.byAudioKey.get('ha-1').sound).toBe(am.byAudioKey.get('hha-1').sound) // twins in Amharic
    expect(byAudioKey.get('ha-1').sound).not.toBe(byAudioKey.get('hha-1').sound) // distinct in Tigrinya
    expect(byAudioKey.get('le-1').sound).toBe('lä')
  })
})
