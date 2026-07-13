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

import { LANGPACKS, LANG_IDS, REINFORCE } from './langpacks'

const LANG_KEY = 'fq.lang'

const STRINGS = {
  en: {},
}

// Fold in the diaspora language packs (German, Italian, Swedish, Dutch,
// Norwegian, French). Missing keys fall back to English inside t().
for (const [id, pack] of Object.entries(LANGPACKS)) {
  STRINGS[id] = { ...(STRINGS[id] || {}), ...pack }
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
