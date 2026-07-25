/* Minimal i18n mirroring the app's t(key, fallback) pattern. English ships
   inline as fallbacks; Amharic/Tigrinya site translations land here later
   without touching components. */
const STRINGS = {
  // en is the fallback text inline at call sites; other locales add maps:
  // am: { heroTitle: '...', ... }, ti: { ... }
}

let lang = 'en'
export function setLang(l) { lang = l }
export function t(key, fallback) {
  return STRINGS[lang]?.[key] ?? fallback
}
