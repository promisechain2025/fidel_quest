/* ============================================================================
   UI LANGUAGE — platform layer
   ----------------------------------------------------------------------------
   UI strings for the child-facing core (home, lessons, feedback,
   celebrations, runner HUD). English is every key's fallback; the diaspora
   packs live in langpacks.js. Amharic and Tigrinya are learn languages
   only, not app-text languages (owner's decision, July 2026) — a legacy
   stored fq.lang of 'am'/'ti' falls back to English via the LANG_IDS check
   in getLang(). Language choice persists and applies on reload, like packs.
   ========================================================================== */

import { LANGPACK_LOADERS, LANG_IDS, REINFORCE } from './langpacks'

const LANG_KEY = 'fq.lang'

const STRINGS = {
  en: {},
}

export function getLang() {
  try {
    const l = localStorage.getItem(LANG_KEY)
    return LANG_IDS.includes(l) ? l : 'en'
  } catch {
    return 'en'
  }
}

/** Persist and apply on next load (data is module-level by design). */
export function setLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, LANG_IDS.includes(lang) ? lang : 'en')
  } catch {
    /* session-only */
  }
}

const ACTIVE = getLang()

/* The active diaspora pack (German, Italian, Swedish, Dutch, Norwegian,
   French) is fetched on demand rather than bundled - see langpacks.js for why.
   main.jsx awaits this BEFORE the first render, so t() stays synchronous and
   no screen ever paints in the wrong language. If the fetch fails, every key
   falls back to the inline English at the call site, which is the same
   behaviour as a pack with a missing key: degraded, never broken.
   Idempotent, so a second call is free. */
export async function loadActiveLangPack(lang = ACTIVE) {
  if (lang === 'en' || STRINGS[lang]) return false
  const load = LANGPACK_LOADERS[lang]
  if (!load) return false
  try {
    const mod = await load()
    STRINGS[lang] = { ...(mod.default || {}) }
    return true
  } catch {
    return false // offline or chunk missing: English fallback carries the UI
  }
}

/** Reinforcement word lists for the active language (praise on right answers,
    encourage on wrong), English if the language has none. Shared by the main
    app and the Classic game so all feedback follows the chosen app text. */
export const praiseWords = () => REINFORCE[ACTIVE]?.praise || REINFORCE.en.praise
export const encourageWords = () => REINFORCE[ACTIVE]?.encourage || REINFORCE.en.encourage
export const randomPraise = () => { const w = praiseWords(); return w[Math.floor(Math.random() * w.length)] }
export const randomEncourage = () => { const w = encourageWords(); return w[Math.floor(Math.random() * w.length)] }

/** Translate a key; `fallback` is the English inline text; {n} interpolates. */
export function t(key, fallback, vars) {
  let out = (ACTIVE !== 'en' && STRINGS[ACTIVE]?.[key]) || fallback || key
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v))
  return out
}
