import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ensurePaidBuyerMark, isPaidBuyer, _setAppTransactionReader, _setFirstFreeBuild } from './paidBuyer'
import { snapshotInstall, hadPriorInstall, INSTALL_SEEN_KEY } from './installSeen'
import { __setPackagesFlag } from './packagesFlag'
import { hasPackage } from './packages'

const NOW = Date.UTC(2026, 9, 22)
beforeEach(() => { localStorage.clear(); _setAppTransactionReader(null); _setFirstFreeBuild(undefined); __setPackagesFlag(true) })
afterEach(() => { __setPackagesFlag(null); _setFirstFreeBuild(undefined); _setAppTransactionReader(null) })

describe('install-seen snapshot', () => {
  it('fresh install: no prior data, and later profiles never flip it', () => {
    expect(snapshotInstall({ now: NOW }).prior).toBe(false)
    localStorage.setItem('fq.profiles.v1', '{"list":[]}')
    expect(snapshotInstall({ now: NOW + 1 }).prior).toBe(false)
    expect(hadPriorInstall()).toBe(false)
  })
  it('upgrade: household data from an older version counts', () => {
    localStorage.setItem('fq.profile.p1', '{}')
    expect(snapshotInstall({ now: NOW }).prior).toBe(true)
    expect(JSON.parse(localStorage.getItem(INSTALL_SEEN_KEY)).firstVersion).toBe('1.4')
    expect(hadPriorInstall()).toBe(true)
  })
})

describe('1.4 free build grandfathers pre-1.4 paid buyers', () => {
  it('android upgrade from 1.3.1 (no mark): Core granted', async () => {
    localStorage.setItem('fq.profiles.v1', '{"list":[{}]}')
    snapshotInstall({ now: NOW })
    expect(hasPackage('core')).toBe(false)
    const m = await ensurePaidBuyerMark({ native: true, platform: 'android', now: NOW })
    expect(m.source).toBe('upgrade-pre-1.4')
    expect(isPaidBuyer()).toBe(true)
    expect(hasPackage('core')).toBe(true)
    expect(hasPackage('prayer')).toBe(false)
  })
  it('android fresh 1.4 install: nothing granted', async () => {
    snapshotInstall({ now: NOW })
    expect(await ensurePaidBuyerMark({ native: true, platform: 'android', now: NOW })).toBeNull()
    expect(hasPackage('core')).toBe(false)
  })
  it('ios: Production AppTransaction older than the first free build grants Core', async () => {
    snapshotInstall({ now: NOW })
    _setFirstFreeBuild(20)
    _setAppTransactionReader(async () => ({ verified: true, originalAppVersion: '8', environment: 'Production' }))
    const m = await ensurePaidBuyerMark({ native: true, platform: 'ios', now: NOW })
    expect(m.source).toBe('apple-original-version')
    expect(hasPackage('core')).toBe(true)
  })
  it('ios: first download at/after the free build, sandbox, or threshold unset -> nothing', async () => {
    snapshotInstall({ now: NOW })
    _setFirstFreeBuild(20)
    _setAppTransactionReader(async () => ({ verified: true, originalAppVersion: '20', environment: 'Production' }))
    expect(await ensurePaidBuyerMark({ native: true, platform: 'ios', now: NOW })).toBeNull()
    _setAppTransactionReader(async () => ({ verified: true, originalAppVersion: '1.0', environment: 'Sandbox' }))
    expect(await ensurePaidBuyerMark({ native: true, platform: 'ios', now: NOW })).toBeNull()
    _setFirstFreeBuild(null)
    _setAppTransactionReader(async () => ({ verified: true, originalAppVersion: '8', environment: 'Production' }))
    expect(await ensurePaidBuyerMark({ native: true, platform: 'ios', now: NOW })).toBeNull()
  })
  it('web never grandfathers', async () => {
    localStorage.setItem('fq.profiles.v1', '{}')
    snapshotInstall({ now: NOW })
    expect(await ensurePaidBuyerMark({ native: false })).toBeNull()
  })
})
