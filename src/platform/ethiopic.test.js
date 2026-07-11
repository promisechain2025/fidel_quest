import { describe, it, expect } from 'vitest'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { AM_PACK } from '../packs/am'
import { TI_PACK } from '../packs/ti'
import { mergeFamilies, deriveForms, deriveIndexes, validatePack, PACKS } from './ethiopic'

describe('script table', () => {
  it('is the union of all languages: 34 families of 7 unique Ethiopic characters', () => {
    expect(ETHIOPIC_SCRIPT.families).toHaveLength(34)
    const chars = ETHIOPIC_SCRIPT.families.flatMap((f) => Array.from(f.chars))
    expect(chars).toHaveLength(238)
    expect(new Set(chars).size).toBe(238)
    expect(
      chars.every((c) => {
        const cp = c.codePointAt(0)
        return cp >= 0x1200 && cp <= 0x137f
      }),
    ).toBe(true)
  })

  it('locks down the Tigrinya-only qhe family by codepoint', () => {
    const qhe = ETHIOPIC_SCRIPT.families.find((f) => f.id === 'qhe')
    expect(qhe.only).toEqual(['ti'])
    // U+1250 QHA .. U+1256 QHO, labialized U+1258 QHWA - never hand-trusted.
    expect(Array.from(qhe.chars).map((c) => c.codePointAt(0))).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((i) => 0x1250 + i),
    )
    expect(qhe.labial.codePointAt(0)).toBe(0x1258)
    // It sits right after plain qe, where the abugida traditionally puts it.
    const ids = ETHIOPIC_SCRIPT.families.map((f) => f.id)
    expect(ids[ids.indexOf('qe') + 1]).toBe('qhe')
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

describe('pack-scoped families (qhe exists only in Tigrinya)', () => {
  it('Amharic merges to 33 families without qhe; Tigrinya to 34 with it', () => {
    const am = mergeFamilies(ETHIOPIC_SCRIPT, AM_PACK)
    const ti = mergeFamilies(ETHIOPIC_SCRIPT, TI_PACK)
    expect(am).toHaveLength(33)
    expect(am.some((f) => f.id === 'qhe')).toBe(false)
    expect(ti).toHaveLength(34)
    const ids = ti.map((f) => f.id)
    expect(ids[ids.indexOf('qe') + 1]).toBe('qhe')
  })

  it('Tigrinya qhe forms carry the right glyphs, sounds, and audio keys', () => {
    const forms = deriveForms(mergeFamilies(ETHIOPIC_SCRIPT, TI_PACK), TI_PACK.orders)
    expect(forms).toHaveLength(238)
    const { byAudioKey } = deriveIndexes(forms)
    expect(byAudioKey.get('qhe-1').char).toBe('ቐ')
    expect(byAudioKey.get('qhe-7').char).toBe('ቖ')
    expect(byAudioKey.get('qhe-1').sound).toBe('qhä')
    // Distinct from plain qe - never twins, always valid distractors.
    expect(byAudioKey.get('qhe-1').sound).not.toBe(byAudioKey.get('qe-1').sound)
    // The human recording redirects to letters/ti/ like the other
    // Tigrinya-distinct consonants.
    expect(TI_PACK.audioOverride.ids).toContain('qhe')
  })

  it('a pack must not define a family that is not applicable to it', () => {
    const families = { ...AM_PACK.families, qhe: { name: 'Qhe', consonant: 'qh' } }
    const result = validatePack(ETHIOPIC_SCRIPT, { ...AM_PACK, families })
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toContain('qhe not in script')
  })

  it('Tigrinya missing qhe would fail the contract', () => {
    const families = { ...TI_PACK.families }
    delete families.qhe
    const result = validatePack(ETHIOPIC_SCRIPT, { ...TI_PACK, families })
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toContain('qhe missing')
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
