import { describe, it, expect } from 'vitest'
import { toEthiopic, formatEthiopic, holidayFor, ETHIO_MONTHS } from './ethioCalendar'

describe('Gregorian -> Ethiopic conversion', () => {
  it('hits the New Year anchors', () => {
    // EC new year lands Sept 11, or Sept 12 in the year before a Gregorian leap year.
    expect(toEthiopic('2023-09-12')).toEqual({ year: 2016, month: 1, day: 1 })
    expect(toEthiopic('2024-09-11')).toEqual({ year: 2017, month: 1, day: 1 })
    expect(toEthiopic('2025-09-11')).toEqual({ year: 2018, month: 1, day: 1 })
    expect(toEthiopic('2026-09-11')).toEqual({ year: 2019, month: 1, day: 1 })
  })
  it('converts mid-year dates', () => {
    expect(toEthiopic('2026-07-09')).toEqual({ year: 2018, month: 11, day: 2 }) // Hamle 2
    expect(toEthiopic('2025-01-07')).toEqual({ year: 2017, month: 4, day: 29 }) // Genna (Tahsas 29)
    expect(toEthiopic('2025-01-19')).toEqual({ year: 2017, month: 5, day: 11 }) // Timkat (Tir 11)
  })
  it('handles Pagume, the 13th month', () => {
    expect(toEthiopic('2025-09-06')).toEqual({ year: 2017, month: 13, day: 1 })
    expect(toEthiopic('2025-09-10')).toEqual({ year: 2017, month: 13, day: 5 })
  })
  it('has 13 months and formats both scripts', () => {
    expect(ETHIO_MONTHS.length).toBe(13)
    const f = formatEthiopic({ year: 2018, month: 11, day: 2 })
    expect(f.geez).toBe('ሐምሌ 2 ቀን 2018')
    expect(f.latin).toBe('Hamle 2, 2018')
  })
})

describe('holidayFor', () => {
  it('finds the Ethiopic-fixed holidays', () => {
    expect(holidayFor('2025-09-11')?.id).toBe('enkutatash')
    expect(holidayFor('2025-09-27')?.id).toBe('meskel') // Meskerem 17, 2018
    expect(holidayFor('2025-01-07')?.id).toBe('genna')
    expect(holidayFor('2025-01-19')?.id).toBe('timkat')
  })
  it('finds the Gregorian-fixed Eritrean Independence Day', () => {
    expect(holidayFor('2026-05-24')?.id).toBe('eritrea')
  })
  it('returns null on ordinary days', () => {
    expect(holidayFor('2026-07-09')).toBeNull()
  })
})
