/* eGeez 1.3.0 is PAID UPFRONT ($12.99 at download on the App Store and
   Google Play): everything unlocked, no trial, no in-app purchases, no
   subscriptions, no Family Pack, no unlock codes. Whatever a CI workflow
   leaves in the env (VITE_MONETIZE, RevenueCat keys, VITE_STORE_IAP), every
   build stays fully open and shows no purchase UI. These tests guard that. */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let mockNative = true
vi.mock('./native', () => ({ isNativePlatform: () => mockNative, isApplePlatform: () => true }))

async function load(env) {
  vi.resetModules()
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  return import('./license')
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))

describe('paid upfront (v1.3.0)', () => {
  beforeEach(() => {
    localStorage.clear()
    // An old 1.2 trial that ended long ago must not matter.
    localStorage.setItem('fq.license.v1', JSON.stringify({ startDay: '2026-01-01' }))
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    mockNative = true
  })

  for (const native of [true, false]) {
    it(`${native ? 'native' : 'web'} build is fully unlocked even with monetization env left set`, async () => {
      mockNative = native
      const lic = await load({ VITE_MONETIZE: 'true', VITE_REVENUECAT_APPLE_KEY: 'appl_live_looking', VITE_STORE_IAP: '' })
      expect(lic.fullAccess()).toBe(true)
      // no trial / pass / code machinery is left to switch back on
      for (const gone of ['MONETIZE', 'licenseState', 'dailyPass', 'startDailyPass', 'redeemAppCode', 'grantFeedbackGrace', 'TRIAL_DAYS', 'APP_PRICE']) {
        expect(lic[gone], gone).toBeUndefined()
      }
    })
  }

  it('the store wrapper stays fail-closed', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_STORE_IAP', 'true')
    vi.stubEnv('VITE_REVENUECAT_APPLE_KEY', 'appl_x')
    const iap = await import('./iap')
    expect(await iap.buyFullApp()).toBe('error') // no plugin bundled - never throws, never sells
  })

  it('no purchase copy or module is left in the app source', () => {
    const files = walk(path.join(ROOT, 'src')).filter((f) => /\.(js|jsx)$/.test(f) && !/\.test\./.test(f))
    const banned = [/Buy the app/i, /Family Pack/i, /free try-?out/i, /Restore (a previous )?purchase/i, /unlock code/i, /FAM code/i, /\bEGZ\b/, /Ask family to gift/i, /Not buying\?/i, /Everything open - /]
    const hits = []
    for (const f of files) {
      // UI copy and code only: comments may document what was removed.
      const s = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      for (const re of banned) if (re.test(s)) hits.push(`${path.relative(ROOT, f)}: ${re}`)
    }
    expect(hits).toEqual([])
    expect(fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8')).not.toMatch(/platform\/iap/) // nothing starts the store SDK
    for (const gone of ['src/platform/familyPack.js', 'src/platform/appCodes.js', 'src/components/SupportAsk.jsx', 'src/components/GiftModal.jsx']) {
      expect(fs.existsSync(path.join(ROOT, gone)), gone).toBe(false)
    }
  })

  it('native config carries no billing hooks', () => {
    const manifest = fs.readFileSync(path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8')
    expect(manifest).not.toMatch(/com\.android\.vending\.BILLING/)
    const iosFiles = walk(path.join(ROOT, 'ios/App')).filter((f) => !f.includes('/Pods/') && !f.includes('/build/'))
    expect(iosFiles.filter((f) => f.endsWith('.storekit'))).toEqual([])
    const post = fs.readFileSync(path.join(ROOT, 'ios/App/ci_scripts/ci_post_clone.sh'), 'utf8')
    expect(post).toMatch(/VITE_STORE_IAP is set but no RevenueCat plugin is bundled/)
  })

  it('Android and iOS ship the same version: 1.3.0 (7)', () => {
    const gradle = fs.readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8')
    expect(gradle).toMatch(/versionCode 7\b/)
    expect(gradle).toMatch(/versionName "1\.3\.0"/)
    const pbx = fs.readFileSync(path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8')
    expect([...pbx.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1])).toEqual(['1.3.0', '1.3.0'])
    expect([...pbx.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((m) => m[1])).toEqual(['7', '7'])
    expect(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version).toBe('1.3.0')
  })
  it('the website sells only the $12.99 store app - no Family Pack, codes or web checkout', () => {
    const files = [...walk(path.join(ROOT, 'website/src')), path.join(ROOT, 'website/public/robots.txt'), path.join(ROOT, 'public/privacy.html')]
      .filter((f) => /\.(jsx?|txt|html)$/.test(f))
    const banned = [/\$4\.99/, /family pack/i, /(your|an?|its own) unlock code|enter (the|your|a) code|\bredeem/i, /free try-out/i, /free for 3 days/i, /\bstripe\b/i, /\/api\/pay\b/, /\bEGZ\b|\bFAM\b code/]
    const hits = []
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8')
      for (const re of banned) if (re.test(src)) hits.push(`${path.relative(ROOT, f)}: ${re}`)
    }
    expect(hits).toEqual([])
    expect(fs.existsSync(path.join(ROOT, 'website/src/pages/PricingSuccess.jsx'))).toBe(false)
    const pricing = fs.readFileSync(path.join(ROOT, 'website/src/pages/Pricing.jsx'), 'utf8')
    const config = fs.readFileSync(path.join(ROOT, 'website/src/config.js'), 'utf8')
    expect(config).toContain("APP_PRICE = '$12.99'")
    expect(pricing).toMatch(/No in-app purchases/)
    expect(pricing).toMatch(/No subscriptions/)
    expect(pricing).toMatch(/up to 6 children/)
    expect(pricing.match(/price: '([\d.]+)'/g)).toEqual(["price: '12.99'"])
  })
})
