import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { publicUrl } from '../platform/publicUrl'
import { SCHOOL_PATH_UNITS } from './schoolPathGr1'
import { MEET_HERO_BY_FAMILY, meetHeroSrc } from './meetHeroes'

describe('school path meet heroes', () => {
  it('paints commissioned picture words and adds no strangers', () => {
    const pictured = new Set(SCHOOL_PATH_UNITS.flatMap((unit) => unit.pictureWords.map((word) => word.familyId)))
    expect(Object.keys(MEET_HERO_BY_FAMILY).length).toBeGreaterThan(0)
    for (const id of Object.keys(MEET_HERO_BY_FAMILY)) {
      expect(pictured.has(id), id).toBe(true)
      expect(MEET_HERO_BY_FAMILY[id]).toBe(publicUrl(`/art/meet/${id}.webp`))
      expect(existsSync(resolve('public/art/meet', `${id}.webp`))).toBe(true)
    }
  })

  it('stays off Amharic, and unpainted Meet words stay letter bubbles', () => {
    expect(meetHeroSrc(null)).toBe(null)
    expect(meetHeroSrc({ familyId: 'ha', fromSchoolPath: false })).toBe(null)
    expect(meetHeroSrc({ familyId: 'ha', fromSchoolPath: true })).toBe(publicUrl('/art/meet/ha.webp'))
    expect(meetHeroSrc({ familyId: 'sse', fromSchoolPath: true })).toBe(null)
    expect(meetHeroSrc({ familyId: 'nye', fromSchoolPath: true })).toBe(null)
  })
})
