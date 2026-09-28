import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { SCHOOL_PATH_UNITS } from './schoolPathGr1'
import { MEET_HERO_BY_FAMILY, meetHeroSrc } from './meetHeroes'

describe('school path meet heroes', () => {
  it('paints every picture word and no strangers', () => {
    const pictured = SCHOOL_PATH_UNITS.flatMap((unit) => unit.pictureWords.map((word) => word.familyId))
    expect(Object.keys(MEET_HERO_BY_FAMILY).sort()).toEqual([...pictured].sort())
    for (const id of pictured) {
      expect(MEET_HERO_BY_FAMILY[id]).toBe(`/art/meet/${id}.webp`)
      expect(existsSync(resolve('public/art/meet', `${id}.webp`))).toBe(true)
    }
  })

  it('stays off Amharic and families with no picture word', () => {
    expect(meetHeroSrc(null)).toBe(null)
    expect(meetHeroSrc({ familyId: 'ha', fromSchoolPath: false })).toBe(null)
    expect(meetHeroSrc({ familyId: 'ha', fromSchoolPath: true })).toBe('/art/meet/ha.webp')
    expect(meetHeroSrc({ familyId: 'sse', fromSchoolPath: true })).toBe(null)
  })
})
