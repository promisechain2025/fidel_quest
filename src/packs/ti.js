/* ============================================================================
   TIGRINYA LANGUAGE PACK — DRAFT / ILLUSTRATIVE
   ----------------------------------------------------------------------------
   Demonstrates that the Ethiopic Engine is genuinely language-agnostic: the
   same script table, different sounds, twins, names, and words. The key
   linguistic difference modeled here: Tigrinya PRESERVES consonant
   distinctions Amharic merged — ha/hha/kha and a/ae are NOT twins in
   Tigrinya (distinct pharyngeal/laryngeal sounds), so the question factory
   automatically allows them as distractors for each other in this pack.

   STATUS: sounds are best-effort romanizations and the word list is small;
   REQUIRES NATIVE-SPEAKER REVIEW before this pack is user-facing. Letter
   audio is live: the pack reuses the Amharic recordings for shared sounds and
   redirects the four Tigrinya-distinct consonants (hha/kha/khe/ae) to human
   recordings under letters/ti/ (see audioOverride below). Words fall back to
   the deterministic chime until a Tigrinya word list is recorded.
   ========================================================================== */

export const TI_PACK = Object.freeze({
  id: 'ti',
  label: 'Tigrinya',
  nativeName: 'ትግርኛ',
  orders: [
    { index: 1, geezName: "Ge'ez", vowel: 'ä' },
    { index: 2, geezName: "Ka'ib", vowel: 'u' },
    { index: 3, geezName: 'Sals', vowel: 'i' },
    { index: 4, geezName: "Rab'", vowel: 'a' },
    { index: 5, geezName: 'Hams', vowel: 'e' },
    { index: 6, geezName: 'Sadis', vowel: 'ə' },
    { index: 7, geezName: "Sab'", vowel: 'o' },
  ],
  // Tigrinya keeps ha/hha/kha and a/ae distinct; only s- and ts- merge.
  twins: [['se', 'sse'], ['tse', 'ttse']],
  families: {
    ha: { name: 'Ha', consonant: 'h' },
    le: { name: 'Le', consonant: 'l', word: { geez: 'ልቢ', latin: 'lbi', meaning: 'heart', picture: '❤️' } },
    hha: { name: 'Hha', consonant: 'ḥ' },
    me: { name: 'Me', consonant: 'm', word: { geez: 'ማይ', latin: 'may', meaning: 'water', picture: '💧' } },
    sse: { name: 'Sse', consonant: 's' },
    re: { name: 'Re', consonant: 'r' },
    se: { name: 'Se', consonant: 's' },
    she: { name: 'She', consonant: 'sh' },
    qe: { name: 'Qe', consonant: 'q' },
    be: { name: 'Be', consonant: 'b', word: { geez: 'ቤት', latin: 'bet', meaning: 'house', picture: '🏠' } },
    te: { name: 'Te', consonant: 't' },
    che: { name: 'Che', consonant: 'ch' },
    kha: { name: 'Kha', consonant: 'ḫ' },
    ne: { name: 'Ne', consonant: 'n' },
    nye: { name: 'Nye', consonant: 'ny' },
    a: { name: 'A', consonant: '', word: { geez: 'ዓሳ', latin: 'asa', meaning: 'fish', picture: '🐟' } },
    ke: { name: 'Ke', consonant: 'k', word: { geez: 'ኮኾብ', latin: 'kokhob', meaning: 'star', picture: '⭐' } },
    khe: { name: 'Khe', consonant: 'kh' },
    we: { name: 'We', consonant: 'w' },
    ae: { name: 'Ae', consonant: 'ʿ' },
    ze: { name: 'Ze', consonant: 'z' },
    zhe: { name: 'Zhe', consonant: 'zh' },
    ye: { name: 'Ye', consonant: 'y' },
    de: { name: 'De', consonant: 'd' },
    je: { name: 'Je', consonant: 'j' },
    ge: { name: 'Ge', consonant: 'g' },
    the: { name: 'The', consonant: "t'" },
    chhe: { name: 'Chhe', consonant: "ch'" },
    ppe: { name: 'Ppe', consonant: "p'" },
    tse: { name: 'Tse', consonant: "ts'" },
    ttse: { name: 'Ttse', consonant: "ts'" },
    fe: { name: 'Fe', consonant: 'f' },
    pe: { name: 'Pe', consonant: 'p' },
  },
  // Tigrinya reuses the human Amharic recordings for every sound the two
  // languages share, and overrides only the consonants Amharic merged but
  // Tigrinya keeps distinct. Those distinct clips live under letters/ti/;
  // audioOverride redirects just those family ids there (see effectiveKey in
  // audioEngine). Sharing the base means no clip is duplicated on disk.
  audioBase: '/audio/fidel/',
  manifestUrl: '/audio/fidel/manifest.json',
  audioOverride: { sub: 'ti/', ids: ['hha', 'kha', 'khe', 'ae'] },
})
