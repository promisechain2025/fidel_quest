import { describe, it, expect } from 'vitest'
import { FIDEL_FAMILIES } from './ethiopic'
import { buildCharFamilies, familiesOfWord, unlockStage, isDecodable, decodableWords, newlyDecodable } from './words'

const stageName = (g) => FIDEL_FAMILIES[unlockStage(g)]?.name

describe('decodable words (the early-unlock engine)', () => {
  it('maps every vocalized form AND the labialized bonus forms to a family', () => {
    const map = buildCharFamilies()
    expect(map.get('ሀ')).toBe('ha')
    expect(map.get('ሆ')).toBe('ha')
    expect(map.get('ቋ')).toBe('qe') // labialized
    expect(map.get('ሏ')).toBe('le')
    expect(map.get('Z')).toBeUndefined()
  })

  it("the owner's examples unlock exactly where a child expects", () => {
    // ላም needs le+me; ሎሚ needs le+me; ሰላም needs se+le+me.
    expect(stageName('ላም')).toBe('Me')
    expect(stageName('ሎሚ')).toBe('Me')
    expect(stageName('ሰላም')).toBe('Se')
  })

  it('a word with an unwritable character is never decodable', () => {
    expect(familiesOfWord('ላxም')).toBe(null)
    expect(unlockStage('ላxም')).toBe(Infinity)
    expect(isDecodable('ላxም', ['le', 'me'])).toBe(false)
  })

  it('isDecodable follows the learned set, not the journey position', () => {
    expect(isDecodable('ሰላም', ['se', 'le', 'me'])).toBe(true)
    expect(isDecodable('ሰላም', ['se', 'le'])).toBe(false)
  })

  it('decodableWords filters and newlyDecodable celebrates only fresh unlocks', () => {
    const words = [{ geez: 'ላም' }, { geez: 'ሰላም' }, { geez: 'ቤት' }]
    expect(decodableWords(words, ['le', 'me']).map((w) => w.geez)).toEqual(['ላም'])
    // Learning se unlocks selam but NOT lam (already readable) or biet.
    expect(newlyDecodable(words, ['le', 'me'], 'se').map((w) => w.geez)).toEqual(['ሰላም'])
  })

  it('after chapter 1 (8 families) a child can read a real shelf of words', () => {
    const chapter1 = FIDEL_FAMILIES.slice(0, 8).map((f) => f.id)
    const all = FIDEL_FAMILIES.flatMap((f) => (Array.isArray(f.words) && f.words.length ? f.words : f.word ? [f.word] : []))
    const readable = decodableWords(all, chapter1)
    expect(readable.length).toBeGreaterThanOrEqual(15)
    expect(readable.map((w) => w.geez)).toContain('ሰላም')
    expect(readable.map((w) => w.geez)).toContain('ሽሮ')
  })
})
