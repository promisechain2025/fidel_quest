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

describe('journey sections', () => {
  it('every pack shows numbered sections, never city names', async () => {
    const CITY = /Axum|Aksum|Asmara|Keren|Massawa|Lalibela|Simien|Gondar|Bahir|Addis|Dahlak|Semenawi|Adulis|Ethiopia|Eritrea|Tigray/i
    for (const pack of ['am', 'ti']) {
      vi.resetModules()
      const p = await load(pack)
      expect(p.chapterPlaces()).toEqual(['Section 1', 'Section 2', 'Section 3', 'Section 4', 'Section 5'])
      expect(p.runnerPlaces().map((x) => x.name)).toEqual(['Section 1', 'Section 2', 'Section 3', 'Section 4', 'Section 5', 'Section 6'])
      expect(p.skylandsPlaces().map((s) => s.place)).toEqual(['Section 1', 'Section 2', 'Section 3', 'Section 4'])
      expect(JSON.stringify([p.runnerPlaces(), p.skylandsPlaces()])).not.toMatch(CITY)
    }
  })

  it('the two packs keep different scenery, and an unknown pack falls back to the default (Tigrinya)', async () => {
    const am = await load('am')
    const amScenery = am.runnerPlaces().map((r) => r.builder)
    vi.resetModules()
    const ti = await load('ti')
    const tiScenery = ti.runnerPlaces().map((r) => r.builder)
    expect(tiScenery).not.toEqual(amScenery)
    vi.resetModules()
    const fallback = await load('xx')
    // First-run default is now Tigrinya, so an unknown pack resolves to it.
    expect(fallback.runnerPlaces().map((r) => r.builder)).toEqual(tiScenery)
  })

  it('every place carries what its renderers need', async () => {
    for (const pack of ['am', 'ti']) {
      vi.resetModules()
      const p = await load(pack)
      expect(p.chapterPlaces()).toHaveLength(5)
      expect(p.runnerPlaces()).toHaveLength(6)
      expect(p.skylandsPlaces()).toHaveLength(4)
      for (const r of p.runnerPlaces()) {
        expect(r.id && r.name && r.builder, `${pack}:${r.id}`).toBeTruthy()
        expect(['rockchurch', 'stelae', 'highlands', 'castle', 'town', 'coast']).toContain(r.builder)
        expect(Array.isArray(r.fog) && r.fog.length === 2).toBe(true)
      }
      for (const s of p.skylandsPlaces()) {
        expect(s.place && s.rock && s.grass, `${pack}:${s.place}`).toBeTruthy()
        expect(['rockchurch', 'stelae', 'highlands', 'coast']).toContain(s.landmark)
      }
    }
  })

  it('Skylands sessions adopt the pack geography', async () => {
    localStorage.setItem('fq.pack', 'ti')
    const { SESSIONS } = await import('../skylandsCore')
    expect(SESSIONS.map((s) => s.place)).toEqual(['Section 1', 'Section 2', 'Section 3', 'Section 4'])
    expect(SESSIONS[0].pool.length).toBeGreaterThan(0)
  })
})
