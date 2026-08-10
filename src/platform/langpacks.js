/* ============================================================================
   DIASPORA UI LANGUAGES
   ----------------------------------------------------------------------------
   Extra app-text languages for the countries with the largest Ethiopian &
   Eritrean communities: English (default), German, Italian, Swedish, Dutch,
   Norwegian, French. English is every key's fallback, so these packs cover
   the high-visibility core (navigation, buttons, feedback, celebrations,
   Fidel Master, Tee Shop) plus the full REINFORCEMENT word lists; anything a
   pack omits simply shows in English. Best-effort translations, FLAGGED FOR
   NATIVE-SPEAKER REVIEW. Amharic and Tigrinya are LEARN languages only
   (owner's decision, July 2026): the app text is for the diaspora parent
   reading over the child's shoulder, and unreviewed Ge'ez-script UI copy
   was removed rather than shipped. (Hebrew/Arabic are also big diaspora
   languages but are right-to-left and need layout work first — tracked for
   a later pass.)
   ========================================================================== */
// Order shown in the picker. `label` is the language's own endonym.
export const LANG_META = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
  { id: 'it', label: 'Italiano' },
  { id: 'sv', label: 'Svenska' },
  { id: 'nl', label: 'Nederlands' },
  { id: 'no', label: 'Norsk' },
  { id: 'fr', label: 'Français' },
]
export const LANG_IDS = LANG_META.map((l) => l.id)
/* Reinforcement words spoken/shown on right (praise) and wrong (encourage)
   answers, per language. English lives here too so one helper serves both the
   main app and the Classic game. */
export const REINFORCE = {
  en: {
    praise: ['Great job!', 'Wonderful!', 'You are a star!', 'Brilliant!', 'Amazing!', 'Fantastic!', 'You did it!', 'Way to go!', 'Superb!', 'Awesome!'],
    encourage: ['Try again!', 'So close!', 'You can do it!', 'Almost!', 'Keep going!', 'Nearly there!', 'Give it another go!', 'Listen again!'],
  },
  de: {
    praise: ['Super!', 'Toll gemacht!', 'Du bist ein Star!', 'Klasse!', 'Fantastisch!', 'Wunderbar!', 'Du hast es geschafft!', 'Ausgezeichnet!', 'Bravo!'],
    encourage: ['Versuch es nochmal!', 'Fast!', 'Du schaffst das!', 'Weiter so!', 'Hör nochmal zu!', 'Beinahe!'],
  },
  it: {
    praise: ['Bravo!', 'Ottimo lavoro!', 'Sei una stella!', 'Fantastico!', 'Magnifico!', 'Ce l’hai fatta!', 'Eccellente!', 'Meraviglioso!', 'Evviva!'],
    encourage: ['Riprova!', 'Quasi!', 'Ce la puoi fare!', 'Continua così!', 'Ascolta di nuovo!', 'Ci sei quasi!'],
  },
  sv: {
    praise: ['Bra jobbat!', 'Toppen!', 'Du är en stjärna!', 'Fantastiskt!', 'Underbart!', 'Du klarade det!', 'Utmärkt!', 'Superbra!', 'Hurra!'],
    encourage: ['Försök igen!', 'Nästan!', 'Du klarar det!', 'Fortsätt så!', 'Lyssna igen!', 'Du är nästan där!'],
  },
  nl: {
    praise: ['Goed gedaan!', 'Geweldig!', 'Je bent een ster!', 'Fantastisch!', 'Prachtig!', 'Het is je gelukt!', 'Uitstekend!', 'Super!', 'Hoera!'],
    encourage: ['Probeer opnieuw!', 'Bijna!', 'Jij kan het!', 'Ga zo door!', 'Luister nog eens!', 'Je bent er bijna!'],
  },
  no: {
    praise: ['Bra jobba!', 'Kjempebra!', 'Du er en stjerne!', 'Fantastisk!', 'Flott!', 'Du klarte det!', 'Utmerket!', 'Supert!', 'Hurra!'],
    encourage: ['Prøv igjen!', 'Nesten!', 'Du klarer det!', 'Fortsett sånn!', 'Hør en gang til!', 'Du er nesten der!'],
  },
  fr: {
    praise: ['Bravo !', 'Super !', 'Tu es une star !', 'Génial !', 'Fantastique !', 'Magnifique !', 'Tu as réussi !', 'Excellent !', 'Formidable !'],
    encourage: ['Essaie encore !', 'Presque !', 'Tu peux le faire !', 'Continue !', 'Écoute encore !', 'Tu y es presque !'],
  },
}
/* Core UI strings per new language. English (inline fallbacks in t() calls)
   fills every gap, so this is the frequently-seen surface, not every key. */
/* Per-language string packs, one module each, fetched on demand.

   All seven shipped in the entry chunk before: ~116KB of source (string
   content, which barely minifies) that every child downloaded so that six
   languages they will never select could be present. Only the ACTIVE pack is
   fetched now - see platform/i18n.js, which awaits it before first render.
   English is not here at all: it is the inline fallback at every t() call
   site, so an English user fetches nothing extra. */
export const LANGPACK_LOADERS = Object.freeze({
  de: () => import('./langpacks/de.js'),
  it: () => import('./langpacks/it.js'),
  sv: () => import('./langpacks/sv.js'),
  nl: () => import('./langpacks/nl.js'),
  no: () => import('./langpacks/no.js'),
  fr: () => import('./langpacks/fr.js'),
})
