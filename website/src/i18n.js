/* Minimal i18n mirroring the app's t(key, fallback) pattern. English ships
   inline as fallbacks at call sites; other locales add maps here.
   Language persists in egz.site.lang; the header toggle reloads the page
   (simplest correct reactivity for a mostly-static site).

   NOTE FOR THE OWNER: the Amharic below was machine-drafted for simple
   marketing phrases - please review before launch; this is a language
   brand, the Amharic must be right. Untranslated keys fall back to
   English automatically. */

const AM = {
  // navigation
  '/': 'መነሻ',
  '/amharic': 'አማርኛ',
  '/tigrinya': 'ትግርኛ',
  '/alphabet': 'ፊደል ገበታ',
  '/teachers': 'ለመምህራን',
  '/homeschool': 'ትምህርት በቤት',
  '/pricing': 'ዋጋ',
  '/about': 'ስለ እኛ',
  openApp: 'መተግበሪያውን ክፈት',
  // hero
  heroTitle: 'ቋንቋቸው። ታሪካቸው።',
  heroTitle2: 'በቤት ይማራል።',
  heroCta: 'በነጻ ጀምር',
  heroCtaTeach: 'አብረውን ያስተምሩ',
  // shared
  footerLine: 'ለቤተሰብ የተሰራ፣ በመምህራን የሚመራ - ለፊደል በፍቅር።',
  fEmail: 'ኢሜይል',
  fSending: 'በመላክ ላይ…',
  nwTitle: 'የልጅዎን ስም በፊደል ይመልከቱ',
  nwPlaceholder: 'ስም ይጻፉ - Sara, Daniel…',
  alTitle: 'ሁሉም 231 ፊደላት በአንድ ገጽ',
  alPrint: 'ገበታውን አትም',
  prTitle: 'አንዴ ይክፈሉ። በሁሉም ቦታ ይማሩ።',
}

const STRINGS = { am: AM }

let lang = 'en'
try { lang = localStorage.getItem('egz.site.lang') || 'en' } catch { /* default en */ }

export function currentLang() { return lang }
export function setLang(l) {
  lang = l
  try { localStorage.setItem('egz.site.lang', l) } catch { /* session only */ }
}
export function t(key, fallback, vars) {
  let s = STRINGS[lang]?.[key] ?? fallback
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v)
  return s
}
