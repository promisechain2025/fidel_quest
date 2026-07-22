import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/* getActivePackId reads localStorage at call time, so pack switching is
   simulated by setting fq.pack and re-importing the consumers whose
   module-level constants derive from it. */

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})
afterEach(() => vi.resetModules())

const load = async (pack) => {
  localStorage.setItem('fq.pack', pack)
  return import('./places')
}

describe('pack-specific geography', () => {
  it('Amharic journeys through Ethiopia only', async () => {
    const p = await load('am')
    expect(p.chapterPlaces()).toEqual(['Lalibela', 'Aksum', 'Simien', 'Gondar', 'Vowel Skies'])
    for (const place of p.runnerPlaces()) expect(place.country).toBe('Ethiopia')
    for (const s of p.skylandsPlaces()) expect(s.country).toBe('Ethiopia')
  })

  it('Tigrinya journeys through Eritrea plus Axum', async () => {
    const p = await load('ti')
    expect(p.chapterPlaces()).toEqual(['Axum', 'Asmara', 'Keren', 'Massawa', 'Vowel Skies'])
    const countries = p.runnerPlaces().map((x) => x.country)
    expect(countries.filter((c) => c === 'Eritrea').length).toBeGreaterThanOrEqual(4)
    expect(p.runnerPlaces().find((x) => x.id === 'axum')?.country).toContain('Tigray')
    expect(p.skylandsPlaces().map((s) => s.place)).toContain('Massawa')
    expect(p.skylandsPlaces().map((s) => s.place)).toContain('Axum')
  })

  it('the two journeys are actually different, and an unknown pack falls back to the default (Tigrinya)', async () => {
    const am = await load('am')
    const amChapters = am.chapterPlaces()
    vi.resetModules()
    const ti = await load('ti')
    const tiChapters = ti.chapterPlaces()
    expect(tiChapters).not.toEqual(amChapters)
    vi.resetModules()
    const fallback = await load('xx')
    // First-run default is now Tigrinya, so an unknown pack resolves to it.
    expect(fallback.chapterPlaces()).toEqual(tiChapters)
  })

  it('every place carries what its renderers need', async () => {
    for (const pack of ['am', 'ti']) {
      vi.resetModules()
      const p = await load(pack)
      expect(p.chapterPlaces()).toHaveLength(5)
      expect(p.runnerPlaces()).toHaveLength(6)
      expect(p.skylandsPlaces()).toHaveLength(4)
      for (const r of p.runnerPlaces()) {
        expect(r.id && r.name && r.country && r.builder, `${pack}:${r.id}`).toBeTruthy()
        expect(['lalibela', 'aksum', 'simien', 'gondar', 'asmara', 'massawa']).toContain(r.builder)
        expect(Array.isArray(r.fog) && r.fog.length === 2).toBe(true)
      }
      for (const s of p.skylandsPlaces()) {
        expect(s.place && s.rock && s.grass, `${pack}:${s.place}`).toBeTruthy()
        expect(['lalibela', 'aksum', 'simien', 'massawa']).toContain(s.landmark)
      }
    }
  })

  it('Skylands sessions adopt the pack geography', async () => {
    localStorage.setItem('fq.pack', 'ti')
    const { SESSIONS } = await import('../skylandsCore')
    expect(SESSIONS.map((s) => s.place)).toEqual(['Axum', 'Semenawi Bahri', 'Keren', 'Massawa'])
    expect(SESSIONS[0].pool.length).toBeGreaterThan(0)
  })
})
