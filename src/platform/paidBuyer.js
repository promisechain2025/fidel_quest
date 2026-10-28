/* ============================================================================
   PAID-BUYER MARK (1.3.3) - remember who bought the paid app, before eGeez
   becomes a free download with in-app purchases (plan: free + IAP, 2026-10).
   ----------------------------------------------------------------------------
   1.3.3 is still PAID UPFRONT, so every native install of it was bought.
   On launch it writes a durable mark (fq.paidBuyer.v1) so the later free
   build can grant Core (only Core - the Prayer Book is $9.99 for everyone)
   to people who already paid. Nothing is gated by this module yet.

   Where the mark survives:
     - localStorage (device key, not per child)
     - the daily native backup file + "Move to another phone" export
       (platform/backup.js carries it; restore re-verifies the signature)
     - Android Auto Backup / iCloud device backup (Documents + WebView data)
     - a signed RE-ENTRY CODE the grown-up can write down and type in after
       a reinstall or on a new phone (Grown-Ups)
   iOS also gets Apple's own proof: AppTransaction.originalAppVersion via the
   tiny native AppTransaction plugin (ios/App/App/AppDelegate.swift). It is
   only READ and stored here (log only); the free build will use it.
   NOTE: originalAppVersion is the CFBundleVersion (build number) of the first
   download, NOT "1.3.1"; sandbox/TestFlight always report "1.0".

   Re-entry code:  EGL-<ID6>-<P><D1D2><S1S2S3S4>
     ID6   random per device (alphabet without 0/O/1/I/L)
     P     platform: A android, I ios, S support (minted by hand)
     D1D2  issue day since 2026-01-01, base-31
     S1-4  HMAC-SHA256(key, "EGL|ID|P|D") -> 4 alphabet chars
   Honest limit (same as EGZ/EGC): the key ships in the app; it deters casual
   forging, not a determined reverse-engineer. The mark grants Core only.
   ========================================================================== */
import { Capacitor, registerPlugin } from '@capacitor/core'
import { CODE_ALPHABET } from './appCodes'
import { isNativePlatform } from './native'
import { packagesEnabled } from './packagesFlag'
import { hadPriorInstall } from './installSeen'

export const PAID_BUYER_KEY = 'fq.paidBuyer.v1'
export const PAID_BUYER_PREFIX = 'EGL'
export const PAID_BUILD_VERSION = '1.3.3'
const KEY = 'egeez-paid-buyer-v1:9c41e7a2d05b'
const EPOCH = Date.UTC(2026, 0, 1)
const DAY = 86400000
const N = CODE_ALPHABET.length
const PLATFORMS = { android: 'A', ios: 'I', support: 'S' }

const dayNum = (ms) => Math.max(0, Math.floor((ms - EPOCH) / DAY))
const enc2 = (n) => CODE_ALPHABET[Math.floor(n / N) % N] + CODE_ALPHABET[n % N]
const clean = (raw) => String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

async function sig4(text) {
  const te = new TextEncoder()
  const k = await crypto.subtle.importKey('raw', te.encode(KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const b = new Uint8Array(await crypto.subtle.sign('HMAC', k, te.encode(text)))
  let x = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0
  let out = ''
  for (let i = 0; i < 4; i++) { out += CODE_ALPHABET[x % N]; x = Math.floor(x / N) }
  return out
}

function randomId(rand = Math.random) {
  const buf = new Uint8Array(6)
  try { crypto.getRandomValues(buf) } catch { for (let i = 0; i < 6; i++) buf[i] = Math.floor(rand() * 256) }
  return [...buf].map((b) => CODE_ALPHABET[b % N]).join('')
}

/** Mint a re-entry code. platform: 'android' | 'ios' | 'support'. */
export async function mintPaidBuyerCode({ platform = 'android', id = randomId(), now = Date.now() } = {}) {
  const p = PLATFORMS[platform]
  if (!p || !/^[A-Z0-9]{6}$/.test(id) || [...id].some((c) => !CODE_ALPHABET.includes(c))) return null
  const d = dayNum(now)
  if (d >= N * N) return null
  return `${PAID_BUYER_PREFIX}-${id}-${p}${enc2(d)}${await sig4(`EGL|${id}|${p}|${d}`)}`
}

export const looksLikePaidBuyerCode = (raw) => /^EGL[A-Z0-9]{13}$/.test(clean(raw))

/** Resolves { id, platform, day } for a genuine code, else null. */
export async function verifyPaidBuyerCode(raw) {
  const c = clean(raw)
  if (!looksLikePaidBuyerCode(c)) return null
  const id = c.slice(3, 9); const p = c[9]; const d2 = c.slice(10, 12); const s = c.slice(12)
  const platform = Object.keys(PLATFORMS).find((k) => PLATFORMS[k] === p)
  const a = CODE_ALPHABET.indexOf(d2[0]); const b = CODE_ALPHABET.indexOf(d2[1])
  if (!platform || a < 0 || b < 0 || [...id + s].some((ch) => !CODE_ALPHABET.includes(ch))) return null
  const day = a * N + b
  if ((await sig4(`EGL|${id}|${p}|${day}`)) !== s) return null
  return { id, platform, day }
}

export const formatPaidBuyerCode = (raw) => {
  const c = clean(raw)
  return looksLikePaidBuyerCode(c) ? `${c.slice(0, 3)}-${c.slice(3, 9)}-${c.slice(9)}` : ''
}

export function loadPaidBuyer() {
  try {
    const v = JSON.parse(localStorage.getItem(PAID_BUYER_KEY) || 'null')
    return v && typeof v === 'object' && typeof v.code === 'string' ? v : null
  } catch { return null }
}
const save = (m) => { try { localStorage.setItem(PAID_BUYER_KEY, JSON.stringify(m)) } catch { /* session only */ } }

/** True when this device holds a mark. (Signature re-checked by
    verifyStoredPaidBuyer on launch; the free build gates on that.) */
export const isPaidBuyer = () => !!loadPaidBuyer()

/** Grown-up typed a code (reinstall / new phone). */
export async function redeemPaidBuyerCode(raw, now = Date.now()) {
  const v = await verifyPaidBuyerCode(raw)
  if (!v) return false
  const prev = loadPaidBuyer()
  save({ ...(prev || {}), v: 1, code: formatPaidBuyerCode(raw), platform: v.platform, source: 'code', markedAt: prev?.markedAt || now, redeemedAt: now })
  return true
}

/** Drop a stored mark whose code is not genuine (e.g. a hand-edited backup
    file). Returns the verified mark or null. */
export async function verifyStoredPaidBuyer() {
  const m = loadPaidBuyer()
  if (!m) return null
  if (await verifyPaidBuyerCode(m.code)) return m
  try { localStorage.removeItem(PAID_BUYER_KEY) } catch { /* ignore */ }
  return null
}

/* iOS: Apple's signed AppTransaction (StoreKit 2, iOS 16+). Plugin lives in
   AppDelegate.swift and is registered by NoZoomBridgeViewController. */
const AppTransactionNative = registerPlugin('AppTransaction')
let readOverride = null
/** Tests only. */
export function _setAppTransactionReader(fn) { readOverride = fn }

/** { originalAppVersion, originalPurchaseDate, environment, verified } or null
    (web, Android, iOS < 16, offline first launch, unverified). Never throws. */
export async function readAppTransaction() {
  try {
    if (readOverride) return await readOverride()
    if (!isNativePlatform() || Capacitor.getPlatform() !== 'ios') return null
    const r = await AppTransactionNative.get()
    return r && r.verified ? r : null
  } catch { return null }
}

let firstFreeOverride
/** Tests only. */
export function _setFirstFreeBuild(n) { firstFreeOverride = n }
function firstFreeBuild() {
  const raw = firstFreeOverride !== undefined ? firstFreeOverride : (() => { try { return import.meta.env?.VITE_IOS_FIRST_FREE_BUILD } catch { return undefined } })()
  const n = Number.parseInt(String(raw ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}
/** iOS: verified Production AppTransaction whose first download predates
    the first free build. */
export async function appleSaysPaid() {
  const limit = firstFreeBuild()
  if (!limit) return false
  const at = await readAppTransaction()
  if (!at || at.environment !== 'Production') return false
  const first = Number.parseInt(String(at.originalAppVersion || '').split('.')[0], 10)
  return Number.isFinite(first) && first < limit
}

/** Launch hook (native only): make sure this paid install carries a mark,
    and attach Apple's originalAppVersion on iOS when available. Idempotent.
    Opts are for tests. Resolves the mark (or null on the web). */
export async function ensurePaidBuyerMark({ native = isNativePlatform(), platform, now = Date.now() } = {}) {
  if (!native) return loadPaidBuyer()
  const plat = platform || (Capacitor.getPlatform?.() === 'ios' ? 'ios' : 'android')
  let m = await verifyStoredPaidBuyer()
  // The free-download build (VITE_PACKAGES=1) must never mint a NEW mark:
  // that would hand Core to every new install. It only keeps marks written
  // by the paid builds (or re-entered with an EGL code).
  // Exception - people who paid before the free build but never got a mark
  // (1.3.1 and older; Play production skipped 1.3.3):
  //   - any platform: household data from an older version was already on
  //     the device when 1.4 first ran (installSeen.js), or
  //   - iOS: Apple's verified AppTransaction says the first download was a
  //     build older than the first free build (VITE_IOS_FIRST_FREE_BUILD,
  //     the CFBundleVersion of the first free-download build). Unset = this
  //     check is off (fail closed); sandbox/TestFlight never count.
  if (!m && packagesEnabled()) {
    const source = hadPriorInstall() ? 'upgrade-pre-1.4' : (plat === 'ios' && (await appleSaysPaid())) ? 'apple-original-version' : null
    if (!source) return null
    const code = await mintPaidBuyerCode({ platform: plat, now })
    if (!code) return null
    m = { v: 1, code, platform: plat, source, markedAt: now }
    try { localStorage.removeItem('fq.backup.day') } catch { /* ignore */ }
  }
  if (!m) {
    const code = await mintPaidBuyerCode({ platform: plat, now })
    if (!code) return null
    m = { v: 1, code, platform: plat, source: `paid-app-${PAID_BUILD_VERSION}`, markedAt: now }
    // New mark: let today's native backup run again so the file carries it.
    try { localStorage.removeItem('fq.backup.day') } catch { /* ignore */ }
  }
  if (plat === 'ios' && !m.appTransaction) {
    const at = await readAppTransaction()
    if (at) m = { ...m, appTransaction: { originalAppVersion: String(at.originalAppVersion || ''), originalPurchaseDate: at.originalPurchaseDate || null, environment: at.environment || '' } }
  }
  save(m)
  return m
}
