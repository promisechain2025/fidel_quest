/* eGeez 1.3.1 business model, guarded end to end:
     - PAID UPFRONT: $12.99 at download on the App Store and Google Play;
       every path, Bible book and game is open - no trial, no unlock codes,
       no subscriptions, no ads, no web checkout, no gift tile.
     - The only in-app purchases are extra kids profiles: the app includes
       1 kid profile; each further child is a non-consumable bought in order
       (profile_slot_2 $4.99, profile_slot_3..6 $2.49 each), up to 6. Old
       family_pack owners keep all 6. Buy AND Restore purchases go through
       StoreKit / Play Billing.
     - "Buy the app in the app" (full_app) must stay impossible.
   Whatever a CI workflow leaves in the env (VITE_MONETIZE, RevenueCat keys,
   VITE_STORE_IAP), learning content stays fully open. */
import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let mockNative = true
vi.mock('./native', () => ({ isNativePlatform: () => mockNative, isApplePlatform: () => true }))

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const appSource = () => walk(path.join(ROOT, 'src')).filter((f) => /\.(js|jsx)$/.test(f) && !/\.test\./.test(f))
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('paid upfront + per-child profile slots (v1.3.1)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    mockNative = true
  })

  for (const native of [true, false]) {
    it(`${native ? 'native' : 'web'} build opens all learning content even with old monetization env left set`, async () => {
      mockNative = native
      vi.resetModules()
      for (const [k, v] of Object.entries({ VITE_MONETIZE: 'true', VITE_REVENUECAT_APPLE_KEY: 'appl_live_looking', VITE_STORE_IAP: 'true' })) vi.stubEnv(k, v)
      localStorage.setItem('fq.license.v1', JSON.stringify({ startDay: '2026-01-01' })) // an expired 1.2 trial
      const lic = await import('./license')
      expect(lic.fullAccess()).toBe(true)
      for (const gone of ['MONETIZE', 'licenseState', 'dailyPass', 'startDailyPass', 'redeemAppCode', 'grantFeedbackGrace', 'TRIAL_DAYS', 'APP_PRICE', 'markSupported']) {
        expect(lic[gone], gone).toBeUndefined()
      }
    })
  }

  it('the store can sell only profile_slot_2..6 (never full_app, never family_pack again)', async () => {
    vi.resetModules()
    const iap = await import('./iap')
    expect(iap.SELLABLE_PRODUCTS).toEqual(['profile_slot_2', 'profile_slot_3', 'profile_slot_4', 'profile_slot_5', 'profile_slot_6'])
    for (const gone of ['buyFullApp', 'restorePurchasesAll', 'fullAppStorePrice', 'FULL_APP_ENTITLEMENT']) expect(iap[gone], gone).toBeUndefined()
    const hits = []
    for (const f of appSource()) {
      const s = stripComments(fs.readFileSync(f, 'utf8'))
      if (/full_app|buyFullApp|FULL_APP/.test(s)) hits.push(path.relative(ROOT, f))
      // Only iap.js may talk to the store plugin.
      if (/purchaseProduct\s*\(/.test(s) && !f.endsWith('platform/iap.js')) hits.push(`${path.relative(ROOT, f)}: purchaseProduct`)
      if (/@capgo\/native-purchases/.test(s) && !f.endsWith('platform/iap.js')) hits.push(`${path.relative(ROOT, f)}: plugin import`)
    }
    expect(hits).toEqual([])
    const iapSrc = stripComments(read('src/platform/iap.js'))
    // purchaseProduct is only ever called with the computed next slot id.
    expect([...iapSrc.matchAll(/purchaseProduct\(\{ productIdentifier:\s*([A-Za-z_'"]+)/g)].map((m) => m[1])).toEqual(['productId'])
    expect(iapSrc).toMatch(/const productId = slotProductId\(n\)\n\s*if \(!SELLABLE_PRODUCTS\.includes\(productId\)\) return 'error'/)
    expect(read('src/platform/profileSlots.js')).toMatch(/SLOT_PRICE_FALLBACK = Object\.freeze\(\{ 2: '\$4\.99', 3: '\$2\.49', 4: '\$2\.49', 5: '\$2\.49', 6: '\$2\.49' \}\)/)
  })

  it('no trial / code / gift / buy-the-app copy is left in the app; the profile offer is', () => {
    const banned = [/Buy the app/i, /free try-?out/i, /unlock code/i, /FAM code/i, /\bEGZ\b/, /Ask family to gift/i, /Not buying\?/i, /Everything open - /, /I already paid/i, /Redeem/]
    const hits = []
    for (const f of appSource()) {
      const s = stripComments(fs.readFileSync(f, 'utf8'))
      for (const re of banned) if (re.test(s)) hits.push(`${path.relative(ROOT, f)}: ${re}`)
    }
    expect(hits).toEqual([])
    const offer = read('src/components/ProfileSlotOffer.jsx')
    expect(offer).toMatch(/'Restore purchases'/)
    expect(offer).toMatch(/Unlock profile \{n\}/)
    expect(fs.existsSync(path.join(ROOT, 'src/components/FamilyPackOffer.jsx'))).toBe(false)
    expect(read('src/main.jsx')).toMatch(/platform\/iap'\)\.then\(\(m\) => m\.initIap\(\)\)/)
    for (const gone of ['src/platform/appCodes.js', 'src/components/SupportAsk.jsx', 'src/components/GiftModal.jsx', 'scripts/gen-family-codes.mjs', 'scripts/gen-app-codes.mjs']) {
      expect(fs.existsSync(path.join(ROOT, gone)), gone).toBe(false)
    }
    // Store-only: no code redemption or web link left anywhere.
    const fp = appSource().map((f) => stripComments(fs.readFileSync(f, 'utf8'))).join('\n')
    for (const gone of ['redeemFamilyCode', 'isValidFamilyCode', 'mintFamilyCode', 'familyPackUrl', 'VITE_FAMILY_PACK']) expect(fp, gone).not.toContain(gone)
  })

  it('native config carries Play Billing and the StoreKit plugin; CI guards the slots-only rule', () => {
    expect(read('android/app/src/main/AndroidManifest.xml')).toMatch(/<uses-permission android:name="com\.android\.vending\.BILLING" \/>/)
    expect(read('android/capacitor.settings.gradle')).toMatch(/capgo-native-purchases/)
    expect(read('android/app/capacitor.build.gradle')).toMatch(/project\(':capgo-native-purchases'\)/)
    expect(read('ios/App/Podfile')).toMatch(/pod 'CapgoNativePurchases'/)
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.dependencies['@capgo/native-purchases']).toMatch(/^7\./) // the Capacitor 7 line
    expect(pkg.dependencies['@revenuecat/purchases-capacitor']).toBeUndefined()
    const post = read('ios/App/ci_scripts/ci_post_clone.sh')
    expect(post).toMatch(/for v in VITE_STORE_IAP VITE_MONETIZE/)
    expect(post).toMatch(/grep -rqE "full_app\|FULL_APP_ENTITLEMENT\|buyFullApp" dist/)
    expect(post).toMatch(/grep -rq "profile_slot_" dist/)
  })

  it('Android and iOS ship the same version: 1.3.1 (8)', () => {
    const gradle = read('android/app/build.gradle')
    expect(gradle).toMatch(/versionCode 8\b/)
    expect(gradle).toMatch(/versionName "1\.3\.1"/)
    const pbx = read('ios/App/App.xcodeproj/project.pbxproj')
    expect([...pbx.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1])).toEqual(['1.3.1', '1.3.1'])
    expect([...pbx.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((m) => m[1])).toEqual(['8', '8'])
    expect(JSON.parse(read('package.json')).version).toBe('1.3.1')
  })

  it('the website: $12.99 app with 1 kid profile; $4.99 for a 2nd child, $2.49 each after, in-app; no codes, no web checkout', () => {
    const files = [...walk(path.join(ROOT, 'website/src')), path.join(ROOT, 'website/public/robots.txt'), path.join(ROOT, 'public/privacy.html')]
      .filter((f) => /\.(jsx?|txt|html)$/.test(f))
    const banned = [/(your|an?|its own) unlock code|enter (the|your|a) code|\bredeem/i, /free try-out/i, /free for 3 days/i, /\bstripe\b/i, /\/api\/pay\b/, /\bEGZ\b|\bFAM\b code/, /up to 6 children\)?[^.]*included/i]
    const hits = []
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8')
      for (const re of banned) if (re.test(src)) hits.push(`${path.relative(ROOT, f)}: ${re}`)
    }
    expect(hits).toEqual([])
    expect(fs.existsSync(path.join(ROOT, 'website/src/pages/PricingSuccess.jsx'))).toBe(false)
    const pricing = read('website/src/pages/Pricing.jsx')
    const config = read('website/src/config.js')
    expect(config).toContain("APP_PRICE = '$12.99'")
    expect(config).toContain("SECOND_PROFILE_PRICE = '$4.99'")
    expect(config).toContain("EXTRA_PROFILE_PRICE = '$2.49'")
    expect(config).not.toMatch(/FAMILY_PACK/)
    expect(pricing).toMatch(/1 kid profile/)
    expect(pricing).toMatch(/for a 2nd child/)
    expect(pricing).toMatch(/for each child after, up to 6/)
    expect(pricing).toMatch(/No subscriptions/)
    expect(pricing).toMatch(/in-app purchase/)
    // JSON-LD: the app at 12.99 in both stores + the profile add-ons.
    expect(pricing.match(/offer\((?:APP|PLAY)_STORE_URL, '([\d.]+)'/g)).toEqual(["offer(APP_STORE_URL, '12.99'", "offer(PLAY_STORE_URL, '12.99'", "offer(APP_STORE_URL, '4.99'", "offer(APP_STORE_URL, '2.49'"])
    expect(pricing).toMatch(/lowPrice: '2\.49',\s*highPrice: '4\.99'/)
    expect(pricing).not.toMatch(/No in-app purchases/i)
  })
})
