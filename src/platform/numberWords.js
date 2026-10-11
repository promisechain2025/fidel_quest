/* ============================================================================
   NUMBER WORDS — 11..99 spelled out, for the grown-up gate ("type this
   number": the gate shows e.g. "forty-seven" and the grown-up types 47).
   ----------------------------------------------------------------------------
   One table per language. Every UI language (langpacks.js LANG_IDS) has one;
   Amharic and Tigrinya are included too so the gate is ready if they ever
   become app-text languages (today they are learn languages only). Any other
   id falls back to English. Spellings follow standard modern orthography:
     en  forty-seven            de  siebenundvierzig     it  quarantasette
     sv  fyrtiosju              nl  zevenenveertig       no  førtisju
     fr  quarante-sept          am  አርባ ሰባት             ti  ኣርብዓን ሸውዓተን
   ========================================================================== */

const join = (tens, ones, tensWords, onesWords, glue) =>
  ones === 0 ? tensWords[tens] : glue(tensWords[tens], onesWords[ones], tens, ones)

const E = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const EN = {
  teens: ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
  tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
  ones: E,
  glue: (t, o) => `${t}-${o}`,
}

const DE = {
  teens: ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'],
  tens: ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'],
  ones: ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'],
  glue: (t, o) => `${o}und${t}`,
}

const IT = {
  teens: ['dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'],
  tens: ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'],
  ones: ['', 'uno', 'due', 'tré', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'],
  // the tens word drops its final vowel before uno / otto (ventuno, trentotto)
  glue: (t, o, tens, ones) => (ones === 1 || ones === 8 ? t.slice(0, -1) : t) + o,
}

const SV = {
  teens: ['tio', 'elva', 'tolv', 'tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton'],
  tens: ['', '', 'tjugo', 'trettio', 'fyrtio', 'femtio', 'sextio', 'sjuttio', 'åttio', 'nittio'],
  ones: ['', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio'],
  glue: (t, o) => t + o,
}

const NL = {
  teens: ['tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien'],
  tens: ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig'],
  ones: ['', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen'],
  // "en" after a unit ending in e takes a trema: tweeëntwintig, drieëndertig
  glue: (t, o) => `${o}${o.endsWith('e') ? 'ën' : 'en'}${t}`,
}

const NO = {
  teens: ['ti', 'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten'],
  tens: ['', '', 'tjue', 'tretti', 'førti', 'femti', 'seksti', 'sytti', 'åtti', 'nitti'],
  ones: ['', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni'],
  glue: (t, o) => t + o,
}

const FR_ONES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
const FR_TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
function fr(n) {
  if (n < 20) return FR_TEENS[n - 10]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  if (tens === 7) return ones === 1 ? 'soixante et onze' : `soixante-${FR_TEENS[ones]}`
  if (tens === 8) return ones === 0 ? 'quatre-vingts' : `quatre-vingt-${FR_ONES[ones]}`
  if (tens === 9) return `quatre-vingt-${FR_TEENS[ones]}`
  const T = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'][tens]
  if (ones === 0) return T
  return ones === 1 ? `${T} et un` : `${T}-${FR_ONES[ones]}`
}

// Amharic: tens word + space + unit (አርባ ሰባት = 47); 11-19 are አስራ + unit.
const AM = {
  teens: ['አስር', 'አስራ አንድ', 'አስራ ሁለት', 'አስራ ሶስት', 'አስራ አራት', 'አስራ አምስት', 'አስራ ስድስት', 'አስራ ሰባት', 'አስራ ስምንት', 'አስራ ዘጠኝ'],
  tens: ['', '', 'ሃያ', 'ሰላሳ', 'አርባ', 'ሃምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠና'],
  ones: ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'],
  glue: (t, o) => `${t} ${o}`,
}

// Tigrinya: both parts take the conjunction -ን (ኣርብዓን ሸውዓተን = 47);
// 11-19 are ዓሰርተ + unit (ዓሰርተ ሓደ = 11).
const TI = {
  teens: ['ዓሰርተ', 'ዓሰርተ ሓደ', 'ዓሰርተ ክልተ', 'ዓሰርተ ሰለስተ', 'ዓሰርተ ኣርባዕተ', 'ዓሰርተ ሓሙሽተ', 'ዓሰርተ ሽዱሽተ', 'ዓሰርተ ሸውዓተ', 'ዓሰርተ ሸሞንተ', 'ዓሰርተ ትሽዓተ'],
  tens: ['', '', 'ዕስራ', 'ሰላሳ', 'ኣርብዓ', 'ሓምሳ', 'ሱሳ', 'ሰብዓ', 'ሰማንያ', 'ተስዓ'],
  ones: ['', 'ሓደ', 'ክልተ', 'ሰለስተ', 'ኣርባዕተ', 'ሓሙሽተ', 'ሽዱሽተ', 'ሸውዓተ', 'ሸሞንተ', 'ትሽዓተ'],
  glue: (t, o) => `${t}ን ${o}ን`,
}

const TABLES = { en: EN, de: DE, it: IT, sv: SV, nl: NL, no: NO, am: AM, ti: TI }
export const NUMBER_WORD_LANGS = [...Object.keys(TABLES), 'fr']

/** 11..99 in words for `lang` (English for unknown languages). */
export function numberWords(n, lang = 'en') {
  if (!Number.isInteger(n) || n < 10 || n > 99) throw new RangeError(`numberWords: ${n} is outside 10..99`)
  if (lang === 'fr') return fr(n)
  const tb = TABLES[lang] || EN
  if (n < 20) return tb.teens[n - 10]
  return join(Math.floor(n / 10), n % 10, tb.tens, tb.ones, tb.glue)
}

/** Languages written in Ethiopic script (shown in the Ge'ez font). */
export const ETHIOPIC_WORD_LANGS = ['am', 'ti']

/** The inverse, for tests and tools: the number a word string spells (in
    `lang`, or in any table when omitted), or null. */
export function wordsToNumber(words, lang) {
  for (const l of lang ? [lang] : NUMBER_WORD_LANGS)
    for (let n = 10; n <= 99; n++) if (numberWords(n, l) === words) return n
  return null
}
