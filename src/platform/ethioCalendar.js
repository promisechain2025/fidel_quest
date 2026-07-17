/* ============================================================================
   ETHIOPIAN CALENDAR — platform layer
   ----------------------------------------------------------------------------
   The app lives on the calendar the family lives on. Pure Gregorian ->
   Ethiopic conversion via Julian Day Numbers (the Beyene-Kudlek algorithm,
   Amete Mihret era), month names in Ge'ez and latin, and the holidays the
   diaspora organizes its year around. Everything is a pure function of a
   'YYYY-MM-DD' stamp — the wall clock only enters at the caller's boundary
   (dayStamp), same as streak/gift/hunt.

   Fixed-date holidays only for now; the movable feasts (Fasika/Easter,
   Eid) need a computus pass and are tracked as a follow-up.
   ========================================================================== */

/** The 13 Ethiopian months (12 x 30 days + Pagume, 5-6 days). */
export const ETHIO_MONTHS = [
  { am: 'መስከረም', latin: 'Meskerem' },
  { am: 'ጥቅምት', latin: 'Tikimt' },
  { am: 'ኅዳር', latin: 'Hidar' },
  { am: 'ታኅሣሥ', latin: 'Tahsas' },
  { am: 'ጥር', latin: 'Tir' },
  { am: 'የካቲት', latin: 'Yekatit' },
  { am: 'መጋቢት', latin: 'Megabit' },
  { am: 'ሚያዝያ', latin: 'Miyazya' },
  { am: 'ግንቦት', latin: 'Ginbot' },
  { am: 'ሰኔ', latin: 'Sene' },
  { am: 'ሐምሌ', latin: 'Hamle' },
  { am: 'ነሐሴ', latin: 'Nehase' },
  { am: 'ጳጉሜ', latin: 'Pagume' },
]

const ETHIOPIC_ERA = 1723856 // JDN offset of the Amete Mihret era

/** Gregorian calendar date -> Julian Day Number. Pure. */
export function gregorianToJdn(y, m, d) {
  const a = Math.floor((14 - m) / 12)
  const y2 = y + 4800 - a
  const m2 = m + 12 * a - 3
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045
}

/** Julian Day Number -> Ethiopic { year, month (1-13), day (1-30) }. Pure. */
export function jdnToEthiopic(jdn) {
  const r = (((jdn - ETHIOPIC_ERA) % 1461) + 1461) % 1461
  const n = (r % 365) + 365 * Math.floor(r / 1460)
  return {
    year: 4 * Math.floor((jdn - ETHIOPIC_ERA) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  }
}

/** 'YYYY-MM-DD' (Gregorian) -> Ethiopic date. Pure. */
export function toEthiopic(stamp) {
  const [y, m, d] = String(stamp).split('-').map(Number)
  return jdnToEthiopic(gregorianToJdn(y || 1970, m || 1, d || 1))
}

/** Display strings for an Ethiopic date, e.g. { geez: 'ሐምሌ 2 ቀን 2018', latin: 'Hamle 2, 2018' }. */
export function formatEthiopic(e) {
  const month = ETHIO_MONTHS[e.month - 1] || ETHIO_MONTHS[0]
  return {
    geez: `${month.am} ${e.day} ቀን ${e.year}`,
    latin: `${month.latin} ${e.day}, ${e.year}`,
  }
}

/** Localized Gregorian display for a 'YYYY-MM-DD' stamp ("Jul 15, 2026").
    Pure of the wall clock; the caller passes the app-text language as the
    locale. UTC pinning keeps the shown day identical to the stamp's day in
    every device timezone. */
export function formatGregorian(stamp, locale = undefined) {
  const [y, m, d] = String(stamp).split('-').map(Number)
  if (!y || !m || !d) return String(stamp)
  try {
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  } catch {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
}

/** Both calendars the family lives on, together: "Hamle 2, 2018 (Jul 9, 2026)". */
export function formatDual(stamp, locale = undefined) {
  return `${formatEthiopic(toEthiopic(stamp)).latin} (${formatGregorian(stamp, locale)})`
}

/* ── holidays ─────────────────────────────────────────────────────────────
   Fixed on the Ethiopic calendar unless noted. Genna and Timkat are defined
   here by their Ethiopic dates (Tahsas 29 / Tir 11); the one-day drift some
   Gregorian leap years introduce is accepted for this celebratory surface.
   `dress` picks the Daily Hunt meadow decoration. */
export const HOLIDAYS = [
  { id: 'enkutatash', month: 1, day: 1, dress: 'flowers' }, // Ethiopian & Eritrean New Year
  { id: 'meskel', month: 1, day: 17, dress: 'flowers' }, // Finding of the True Cross
  { id: 'genna', month: 4, day: 29, dress: 'stars' }, // Ethiopian Christmas
  { id: 'timkat', month: 5, day: 11, dress: 'drops' }, // Epiphany
  { id: 'adwa', month: 6, day: 23, dress: 'flags' }, // Victory of Adwa
  { id: 'eritrea', gMonth: 5, gDay: 24, dress: 'flags' }, // Eritrean Independence Day (Gregorian)
]

/** The holiday falling on a Gregorian 'YYYY-MM-DD' stamp, or null. Pure. */
export function holidayFor(stamp) {
  const [, gm, gd] = String(stamp).split('-').map(Number)
  const e = toEthiopic(stamp)
  return (
    HOLIDAYS.find((h) => (h.gMonth ? h.gMonth === gm && h.gDay === gd : h.month === e.month && h.day === e.day)) || null
  )
}
