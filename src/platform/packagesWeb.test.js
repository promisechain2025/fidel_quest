import { describe, it, expect, vi, beforeEach } from 'vitest'

/* Web app (easygeez.com/app): EGR rep codes unlock packages here only. */
vi.mock('./native', () => ({ isNativePlatform: () => false, isApplePlatform: () => false }))

beforeEach(() => localStorage.clear())

describe('rep codes on the web', () => {
  it('a prayer code opens every prayer book, not core', async () => {
    vi.resetModules()
    const pk = await import('./packages')
    pk.__setPackagesFlag(true)
    const tue = new Date('2026-10-20T12:00:00')
    expect(pk.prayerBookOpen('wudase-monday', tue)).toBe(false)
    expect(pk.prayerBookOpen('wudase-tuesday', tue)).toBe(true)
    expect(pk.prayerBookOpen('tselot-zezewetir', tue)).toBe(true)
    pk.grantRepPackage('prayer', { repId: 'ER01', code: 'EGR-PER01-AAAA-BBBB' })
    expect(pk.prayerBookOpen('wudase-monday', tue)).toBe(true)
    expect(pk.hasPackage('core')).toBe(false)
  })
  it('a core code opens the course', async () => {
    vi.resetModules()
    const pk = await import('./packages')
    pk.__setPackagesFlag(true)
    pk.grantRepPackage('core', { repId: 'ER01', code: 'EGR-CER01-AAAA-BBBB' })
    expect(pk.coreNodeOpen({ id: 'z', unitIndex: 5 }, [])).toBe(true)
    expect(pk.hasPackage('prayer')).toBe(false)
  })
})
