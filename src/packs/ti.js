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
   redirects the Tigrinya-distinct consonants (hha/kha/khe/ae, plus the
   Tigrinya-ONLY qhe/ቐ family) to human recordings under letters/ti/ (see
   audioOverride below). Words fall back to the deterministic chime until a
   Tigrinya word list is recorded.

   EARLY DECODABLE WORDS: like the Amharic pack, the early families carry
   extra short words built ONLY from letters learned before them, so the
   Word Moments engine (platform/words.js) has something to unlock from the
   very first chapter. Words marked noAudio are awaiting recordings — they
   appear in Build rounds but are never voiced.
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
    ha: {
      name: 'Ha', consonant: 'h',
      words: [{ geez: 'ሀሎ', latin: 'halo-ti', meaning: 'hello', picture: '📞', noAudio: true }],
    },
    le: {
      name: 'Le', consonant: 'l', word: { geez: 'ልቢ', latin: 'lbi', meaning: 'heart', picture: '❤️' },
      words: [{ geez: 'ልቢ', latin: 'lbi', meaning: 'heart', picture: '❤️' }, { geez: 'ላም', latin: 'lam-ti', meaning: 'cow', picture: '🐄' }, { geez: 'ለይቲ', latin: 'leyti', meaning: 'night', picture: '🌙' }, { geez: 'ሉል', latin: 'lul-ti', meaning: 'pearl', picture: '💎', noAudio: true }],
    },
    hha: { name: 'Hha', consonant: 'ḥ', word: { geez: 'ሓርማዝ', latin: 'harmaz', meaning: 'elephant', picture: '🐘' } },
    me: {
      name: 'Me', consonant: 'm', word: { geez: 'ማይ', latin: 'may', meaning: 'water', picture: '💧' },
      words: [{ geez: 'ማይ', latin: 'may', meaning: 'water', picture: '💧' }, { geez: 'መኪና', latin: 'mekina-ti', meaning: 'car', picture: '🚗' }, { geez: 'ሙዝ', latin: 'muz-ti', meaning: 'banana', picture: '🍌' }, { geez: 'ማማ', latin: 'mama-ti', meaning: 'mom', picture: '👩', noAudio: true }, { geez: 'ምሳሕ', latin: 'misah', meaning: 'lunch', picture: '🍽️', noAudio: true }, { geez: 'መስመር', latin: 'mesmer', meaning: 'line', picture: '📏', noAudio: true }, { geez: 'መቐስ', latin: 'meqhes', meaning: 'scissors', picture: '✂️', noAudio: true }],
    },
    sse: { name: 'Sse', consonant: 's' },
    re: { name: 'Re', consonant: 'r' },
    se: {
      name: 'Se', consonant: 's', word: { geez: 'ሰብ', latin: 'seb', meaning: 'person', picture: '🧍' },
      words: [{ geez: 'ሰብ', latin: 'seb', meaning: 'person', picture: '🧍' }, { geez: 'ሳዕሪ', latin: 'sari', meaning: 'grass', picture: '🌿' }, { geez: 'ሰላም', latin: 'selam-ti', meaning: 'peace / hello', picture: '🕊️', noAudio: true }, { geez: 'ሰለስተ', latin: 'seleste', meaning: 'three', picture: '3️⃣', noAudio: true }],
    },
    she: {
      name: 'She', consonant: 'sh', word: { geez: 'ሻሂ', latin: 'shahi', meaning: 'tea', picture: '🍵' },
      words: [{ geez: 'ሻሂ', latin: 'shahi', meaning: 'tea', picture: '🍵' }, { geez: 'ሽሮ', latin: 'shiro-ti', meaning: 'shiro stew', picture: '🥘', noAudio: true }, { geez: 'ሻሽ', latin: 'shash-ti', meaning: 'headscarf', picture: '🧕', noAudio: true }],
    },
    qe: {
      name: 'Qe', consonant: 'q', word: { geez: 'ቆልዓ', latin: 'qola', meaning: 'child', picture: '👶' },
      words: [{ geez: 'ቆልዓ', latin: 'qola', meaning: 'child', picture: '👶' }, { geez: 'ቀለም', latin: 'qelem-ti', meaning: 'color', picture: '🖍️', noAudio: true }, { geez: 'ቁርሲ', latin: 'qursi', meaning: 'breakfast', picture: '🍳', noAudio: true }, { geez: 'ቀሚሽ', latin: 'qemish', meaning: 'dress', picture: '👗', noAudio: true }],
    },
    // Tigrinya-only family (the script tags it only:['ti']): the explosive
    // ቐ that Amharic folds into plain ቀ. Human recording under letters/ti/.
    qhe: { name: 'Qhe', consonant: 'qh' },
    be: {
      name: 'Be', consonant: 'b', word: { geez: 'ቤት', latin: 'bet', meaning: 'house', picture: '🏠' },
      words: [{ geez: 'ቤት', latin: 'bet', meaning: 'house', picture: '🏠' }, { geez: 'በለስ', latin: 'beles-ti', meaning: 'cactus fig', picture: '🍈' }, { geez: 'ቡን', latin: 'bun', meaning: 'coffee', picture: '☕' }, { geez: 'ቡምባ', latin: 'bumba', meaning: 'water tap', picture: '🚰' }, { geez: 'ባኒ', latin: 'bani', meaning: 'bread', picture: '🍞' }, { geez: 'ባቡር', latin: 'babur', meaning: 'train', picture: '🚂', noAudio: true }],
    },
    te: { name: 'Te', consonant: 't', word: { geez: 'ተመን', latin: 'temen', meaning: 'snake', picture: '🐍' } },
    che: { name: 'Che', consonant: 'ch' },
    kha: { name: 'Kha', consonant: 'ḫ' },
    ne: { name: 'Ne', consonant: 'n', word: { geez: 'ነብሪ', latin: 'nebri', meaning: 'leopard', picture: '🐆' } },
    nye: { name: 'Nye', consonant: 'ny' },
    a: {
      name: 'A', consonant: '', word: { geez: 'ዓሳ', latin: 'asa', meaning: 'fish', picture: '🐟' },
      words: [{ geez: 'ዓሳ', latin: 'asa', meaning: 'fish', picture: '🐟' }, { geez: 'ኣንበሳ', latin: 'anbesa-ti', meaning: 'lion', picture: '🦁' }],
    },
    ke: {
      name: 'Ke', consonant: 'k', word: { geez: 'ኮኾብ', latin: 'kokhob', meaning: 'star', picture: '⭐' },
      words: [{ geez: 'ኮኾብ', latin: 'kokhob', meaning: 'star', picture: '⭐' }, { geez: 'ከልቢ', latin: 'kelbi', meaning: 'dog', picture: '🐕' }, { geez: 'ኩዕሶ', latin: 'kuso', meaning: 'ball', picture: '⚽' }],
    },
    khe: { name: 'Khe', consonant: 'kh' },
    we: { name: 'We', consonant: 'w', word: { geez: 'ወርሒ', latin: 'werhi', meaning: 'moon', picture: '🌙' } },
    ae: { name: 'Ae', consonant: 'ʿ', word: { geez: 'ዓይኒ', latin: 'ayni', meaning: 'eye', picture: '👁️' } },
    ze: { name: 'Ze', consonant: 'z', word: { geez: 'ዘይቲ', latin: 'zeyti', meaning: 'oil', picture: '🫒' } },
    zhe: { name: 'Zhe', consonant: 'zh' },
    ye: { name: 'Ye', consonant: 'y' },
    de: { name: 'De', consonant: 'd', word: { geez: 'ደርሆ', latin: 'derho', meaning: 'chicken', picture: '🐔' } },
    je: { name: 'Je', consonant: 'j' },
    ge: {
      name: 'Ge', consonant: 'g', word: { geez: 'ገዛ', latin: 'geza', meaning: 'house', picture: '🏠' },
      words: [{ geez: 'ገዛ', latin: 'geza', meaning: 'house', picture: '🏠' }, { geez: 'ጎቦ', latin: 'gobo', meaning: 'mountain', picture: '⛰️' }],
    },
    the: { name: 'The', consonant: "t'" },
    chhe: { name: 'Chhe', consonant: "ch'" },
    ppe: { name: 'Ppe', consonant: "p'" },
    tse: { name: 'Tse', consonant: "ts'", word: { geez: 'ጸሓይ', latin: 'tsehay-ti', meaning: 'sun', picture: '☀️' } },
    ttse: { name: 'Ttse', consonant: "ts'" },
    fe: {
      name: 'Fe', consonant: 'f', word: { geez: 'ፈረስ', latin: 'feres-ti', meaning: 'horse', picture: '🐎' },
      words: [{ geez: 'ፈረስ', latin: 'feres-ti', meaning: 'horse', picture: '🐎' }, { geez: 'ፊደል', latin: 'fidel-ti', meaning: 'alphabet', picture: '🔤' }],
    },
    pe: { name: 'Pe', consonant: 'p' },
  },
  // Tigrinya reuses the human Amharic recordings for every sound the two
  // languages share, and overrides only the consonants Amharic merged but
  // Tigrinya keeps distinct. Those distinct clips live under letters/ti/;
  // audioOverride redirects just those family ids there (see effectiveKey in
  // audioEngine). Sharing the base means no clip is duplicated on disk.
  audioBase: '/audio/fidel/',
  manifestUrl: '/audio/fidel/manifest.json',
  audioOverride: { sub: 'ti/', ids: ['hha', 'kha', 'khe', 'ae', 'qhe'] },
})
