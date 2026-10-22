import { describe, it, expect, beforeEach } from 'vitest'
import { REP_COUNTRIES, detectCountry, repFirst, setRegionOverride, regionOverride } from './repCountries'
import REPS from '../../public/representatives.json'

beforeEach(() => localStorage.clear())

describe('rep countries', () => {
  it('starts with the owner list', () => {
    for (const c of ['ET', 'UG', 'AO', 'ER', 'SS', 'SD', 'SO', 'CD']) expect(REP_COUNTRIES[c]).toBeTruthy()
    for (const c of Object.values(REP_COUNTRIES)) expect(c.why.length).toBeGreaterThan(0)
  })
  it('detects from time zone, then locale region', () => {
    expect(detectCountry({ timeZone: 'Africa/Addis_Ababa', languages: [] })).toBe('ET')
    expect(detectCountry({ timeZone: 'Africa/Asmara', languages: [] })).toBe('ER')
    expect(detectCountry({ timeZone: 'Europe/Berlin', languages: ['ti-ER'] })).toBe('ER')
    expect(detectCountry({ timeZone: 'America/Chicago', languages: ['en-US'] })).toBe('US')
    expect(detectCountry({ timeZone: 'UTC', languages: ['am'] })).toBe('')
  })
  it('leads with rep codes only in rep countries, override wins', () => {
    expect(repFirst({ timeZone: 'Africa/Kampala', languages: [] })).toBe(true)
    expect(repFirst({ timeZone: 'America/Chicago', languages: ['en-US'] })).toBe(false)
    setRegionOverride('rep')
    expect(repFirst({ timeZone: 'America/Chicago', languages: ['en-US'] })).toBe(true)
    setRegionOverride('store')
    expect(repFirst({ timeZone: 'Africa/Kampala', languages: [] })).toBe(false)
    setRegionOverride('bogus')
    expect(regionOverride()).toBe('auto')
  })
  it('representatives list ships empty (no invented names)', () => {
    expect(REPS.representatives).toEqual([])
  })
})
