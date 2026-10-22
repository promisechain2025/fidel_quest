/* ============================================================================
   REP COUNTRIES - where card / store payment is hard (web, Grown-Ups order)
   ----------------------------------------------------------------------------
   In these countries the web app's Grown-Ups shows the representative code
   (and the representatives list) FIRST; elsewhere the store / card buy stays
   first. Detection is a hint only (time zone, then browser locale region);
   a grown-up can override it. Nothing here unlocks anything - rep codes are
   still checked by the server and are web only (docs/rep-codes.md).

   Reasons (see docs/rep-codes.md "Rep countries"):
     store  - no Apple App Store storefront (Apple Media Services list;
              appavailability.com/guides/app-store-countries, checked
              2026-10-22): an iPhone there cannot buy in-app at all
     cards  - storefront exists, but card ownership is very low and mobile
              money is the norm, so store/card checkout fails for most families
     sanctions - card networks / store payments restricted
   Edit REP_COUNTRIES to add or drop a country; tests pin the defaults.
   ========================================================================== */
export const REP_COUNTRIES = Object.freeze({
  ET: { name: 'Ethiopia', why: ['store', 'cards'] },
  ER: { name: 'Eritrea', why: ['store', 'cards', 'sanctions'] },
  UG: { name: 'Uganda', why: ['cards'] },
  AO: { name: 'Angola', why: ['cards'] },
  SS: { name: 'South Sudan', why: ['store', 'cards'] },
  SD: { name: 'Sudan', why: ['store', 'cards', 'sanctions'] },
  SO: { name: 'Somalia', why: ['store', 'cards'] },
  CD: { name: 'DR Congo', why: ['cards'] },
  DJ: { name: 'Djibouti', why: ['store'] },
  BI: { name: 'Burundi', why: ['store', 'cards'] },
  CF: { name: 'Central African Republic', why: ['store', 'cards'] },
  GN: { name: 'Guinea', why: ['store', 'cards'] },
  TG: { name: 'Togo', why: ['store'] },
  GQ: { name: 'Equatorial Guinea', why: ['store'] },
  KM: { name: 'Comoros', why: ['store'] },
  LS: { name: 'Lesotho', why: ['store'] },
})

/* IANA zones that belong to exactly one of the countries above. */
const ZONE_COUNTRY = Object.freeze({
  'Africa/Addis_Ababa': 'ET', 'Africa/Asmara': 'ER', 'Africa/Asmera': 'ER', 'Africa/Kampala': 'UG',
  'Africa/Luanda': 'AO', 'Africa/Juba': 'SS', 'Africa/Khartoum': 'SD', 'Africa/Mogadishu': 'SO',
  'Africa/Kinshasa': 'CD', 'Africa/Lubumbashi': 'CD', 'Africa/Djibouti': 'DJ', 'Africa/Bujumbura': 'BI',
  'Africa/Bangui': 'CF', 'Africa/Conakry': 'GN', 'Africa/Lome': 'TG', 'Africa/Malabo': 'GQ',
  'Indian/Comoro': 'KM', 'Africa/Maseru': 'LS',
})

export const REGION_KEY = 'fq.repRegion' // 'auto' (default) | 'rep' | 'store'

export function regionOverride() {
  try {
    const v = localStorage.getItem(REGION_KEY)
    return v === 'rep' || v === 'store' ? v : 'auto'
  } catch { return 'auto' }
}
export function setRegionOverride(v) {
  try { localStorage.setItem(REGION_KEY, v === 'rep' || v === 'store' ? v : 'auto') } catch { /* session only */ }
}

/** Best-guess country code from the device, or ''. */
export function detectCountry({ timeZone, languages } = {}) {
  let tz = timeZone
  if (tz == null) { try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch { tz = '' } }
  if (ZONE_COUNTRY[tz]) return ZONE_COUNTRY[tz]
  const langs = languages ?? (typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language]) : [])
  for (const l of langs || []) {
    const m = /^[a-z]{2,3}[-_]([A-Z]{2})\b/i.exec(String(l || ''))
    if (m) return m[1].toUpperCase()
  }
  return ''
}

/** Should Grown-Ups lead with the representative code? */
export function repFirst(opts = {}) {
  const o = opts.override ?? regionOverride()
  if (o === 'rep') return true
  if (o === 'store') return false
  return !!REP_COUNTRIES[detectCountry(opts)]
}
