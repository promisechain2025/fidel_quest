/* ============================================================================
   Static content for Fidel Quest (pages/AmharicFidelGame.jsx).

   All 33 consonant families of the Ge'ez script in traditional abugida
   order, each with seven vocalized orders, plus:

   - `twinOf`:    families that share a modern Amharic pronunciation
   - `nickname`:  the traditional disambiguating name Ethiopian schools use
                  for twin letters (e.g. ንጉሡ ሠ "the king's Se")
   - `labial`:    the common labialized ("-wa") bonus form, explore-only
   - `word`:      a kid-familiar word starting with one of the family's
                  forms, used by the First Words level and explore view.
                  The `picture` field holds an emoji glyph as the word's
                  zero-asset illustration (content data, like the Ge'ez
                  characters themselves — not UI decoration).

   UI_STRINGS holds the full interface copy in English and Amharic.
   NOTE: the Amharic translations are best-effort and should be reviewed
   by a native speaker before marketing pushes.
   ========================================================================== */

// Index 5 (the 6th order) is never read: that order is the bare consonant
// and is special-cased in the form mapping below. Kept as '' to preserve
// positional alignment with the seven orders.
const ORDER_VOWELS = ['a', 'u', 'ee', 'aa', 'ay', '', 'o']
export const ORDER_NAMES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th']
// Traditional names of the seven orders, as taught in Ethiopian schools.
export const GEEZ_ORDER_NAMES = ["Ge'ez", "Ka'ib", 'Sals', "Rab'", 'Hams', 'Sadis', "Sab'"]

const VOWEL_SOUNDS = ['a', 'u', 'ee', 'aa', 'ay', 'ih', 'o']

const RAW_FAMILIES = [
  { name: 'Ha', consonant: 'h', chars: 'ሀሁሂሃሄህሆ', nickname: 'Haleta Ha' },
  {
    name: 'Le', consonant: 'l', chars: 'ለሉሊላሌልሎ', labial: 'ሏ',
    word: { geez: 'ልጅ', latin: 'lij', meaning: 'child', picture: '👶' },
  },
  { name: 'Hha', consonant: 'h', chars: 'ሐሑሒሓሔሕሖ', twinOf: 'Ha', nickname: 'Hameru Hha' },
  {
    name: 'Me', consonant: 'm', chars: 'መሙሚማሜምሞ', labial: 'ሟ',
    word: { geez: 'ማር', latin: 'mar', meaning: 'honey', picture: '🍯' },
  },
  {
    name: 'Sse', consonant: 's', chars: 'ሠሡሢሣሤሥሦ', twinOf: 'Se', nickname: 'Nigusu Sse',
    word: { geez: 'ሠዓሊ', latin: 'seali', meaning: 'painter', picture: '🎨' },
  },
  {
    name: 'Re', consonant: 'r', chars: 'ረሩሪራሬርሮ', labial: 'ሯ',
    word: { geez: 'ሩዝ', latin: 'ruz', meaning: 'rice', picture: '🍚' },
  },
  {
    name: 'Se', consonant: 's', chars: 'ሰሱሲሳሴስሶ', nickname: 'Isatu Se', labial: 'ሷ',
    word: { geez: 'ሳር', latin: 'sar', meaning: 'grass', picture: '🌿' },
  },
  {
    name: 'She', consonant: 'sh', chars: 'ሸሹሺሻሼሽሾ', labial: 'ሿ',
    word: { geez: 'ሻይ', latin: 'shai', meaning: 'tea', picture: '🍵' },
  },
  {
    name: 'Qe', consonant: 'q', chars: 'ቀቁቂቃቄቅቆ', labial: 'ቋ',
    word: { geez: 'ቀይ', latin: 'qey', meaning: 'red', picture: '🔴' },
  },
  {
    name: 'Be', consonant: 'b', chars: 'በቡቢባቤብቦ', labial: 'ቧ',
    word: { geez: 'ቤት', latin: 'biet', meaning: 'house', picture: '🏠' },
  },
  {
    name: 'Te', consonant: 't', chars: 'ተቱቲታቴትቶ', labial: 'ቷ',
    word: { geez: 'ተራራ', latin: 'terara', meaning: 'mountain', picture: '⛰️' },
  },
  {
    name: 'Che', consonant: 'ch', chars: 'ቸቹቺቻቼችቾ', labial: 'ቿ',
    word: { geez: 'ቸኮሌት', latin: 'chokolet', meaning: 'chocolate', picture: '🍫' },
  },
  { name: 'Kha', consonant: 'h', chars: 'ኀኁኂኃኄኅኆ', twinOf: 'Ha', nickname: 'Bizuhanu Kha', labial: 'ኋ' },
  {
    name: 'Ne', consonant: 'n', chars: 'ነኑኒናኔንኖ', labial: 'ኗ',
    word: { geez: 'ንብ', latin: 'nib', meaning: 'bee', picture: '🐝' },
  },
  { name: 'Nye', consonant: 'ny', chars: 'ኘኙኚኛኜኝኞ', labial: 'ኟ' },
  // The vowel-bearer families: no consonant, so their sounds are raw vowels.
  {
    name: 'A', consonant: '', chars: 'አኡኢኣኤእኦ', sounds: VOWEL_SOUNDS, nickname: 'Alfau A',
    word: { geez: 'አሳ', latin: 'asa', meaning: 'fish', picture: '🐟' },
  },
  {
    name: 'Ke', consonant: 'k', chars: 'ከኩኪካኬክኮ', labial: 'ኳ',
    word: { geez: 'ኮከብ', latin: 'kokeb', meaning: 'star', picture: '⭐' },
  },
  // Modern Amharic merges ኸ into ከ (both said "k"); twinned so the two are
  // never asked apart, and so ኸ reuses the Ke recording. Tigrinya keeps ኸ
  // distinct ("kh") — see the ti pack.
  { name: 'Khe', consonant: 'k', chars: 'ኸኹኺኻኼኽኾ', twinOf: 'Ke' },
  {
    name: 'We', consonant: 'w', chars: 'ወዉዊዋዌውዎ',
    word: { geez: 'ውሻ', latin: 'wisha', meaning: 'dog', picture: '🐕' },
  },
  {
    name: 'Ae', consonant: '', chars: 'ዐዑዒዓዔዕዖ', sounds: VOWEL_SOUNDS, twinOf: 'A', nickname: 'Aynu Ae',
    word: { geez: 'ዓይን', latin: 'ayin', meaning: 'eye', picture: '👁️' },
  },
  {
    name: 'Ze', consonant: 'z', chars: 'ዘዙዚዛዜዝዞ', labial: 'ዟ',
    word: { geez: 'ዛፍ', latin: 'zaf', meaning: 'tree', picture: '🌳' },
  },
  { name: 'Zhe', consonant: 'zh', chars: 'ዠዡዢዣዤዥዦ' },
  { name: 'Ye', consonant: 'y', chars: 'የዩዪያዬይዮ' },
  {
    name: 'De', consonant: 'd', chars: 'ደዱዲዳዴድዶ', labial: 'ዷ',
    word: { geez: 'ድመት', latin: 'dimet', meaning: 'cat', picture: '🐈' },
  },
  {
    name: 'Je', consonant: 'j', chars: 'ጀጁጂጃጄጅጆ', labial: 'ጇ',
    word: { geez: 'ጆሮ', latin: 'joro', meaning: 'ear', picture: '👂' },
  },
  {
    name: 'Ge', consonant: 'g', chars: 'ገጉጊጋጌግጎ', labial: 'ጓ',
    word: { geez: 'ግመል', latin: 'gimel', meaning: 'camel', picture: '🐫' },
  },
  {
    name: 'The', consonant: "t'", chars: 'ጠጡጢጣጤጥጦ', labial: 'ጧ',
    word: { geez: 'ጥርስ', latin: 'tirs', meaning: 'tooth', picture: '🦷' },
  },
  {
    name: 'Chhe', consonant: "ch'", chars: 'ጨጩጪጫጬጭጮ', labial: 'ጯ',
    word: { geez: 'ጨረቃ', latin: 'chereqa', meaning: 'moon', picture: '🌙' },
  },
  { name: 'Ppe', consonant: "p'", chars: 'ጰጱጲጳጴጵጶ' },
  {
    name: 'Tse', consonant: "ts'", chars: 'ጸጹጺጻጼጽጾ', nickname: 'Tselotu Tse', labial: 'ጿ',
    word: { geez: 'ጸሎት', latin: 'tselot', meaning: 'prayer', picture: '🙏' },
  },
  {
    name: 'Ttse', consonant: "ts'", chars: 'ፀፁፂፃፄፅፆ', twinOf: 'Tse', nickname: 'Tsehayu Ttse',
    word: { geez: 'ፀሐይ', latin: 'tsehay', meaning: 'sun', picture: '☀️' },
  },
  {
    name: 'Fe', consonant: 'f', chars: 'ፈፉፊፋፌፍፎ', labial: 'ፏ',
    word: { geez: 'ፈረስ', latin: 'feres', meaning: 'horse', picture: '🐎' },
  },
  {
    name: 'Pe', consonant: 'p', chars: 'ፐፑፒፓፔፕፖ',
    word: { geez: 'ፓፓያ', latin: 'papaya', meaning: 'papaya', picture: '🥭' },
  },
]

// Audio keys are ASCII-safe (apostrophes in ejective consonants stripped).
const audioName = (name) => name.toLowerCase().replace(/[^a-z]/g, '')

export const FIDEL_FAMILIES = RAW_FAMILIES.map((family, familyIndex) => ({
  ...family,
  familyIndex,
  forms: [...family.chars].map((char, order) => ({
    char,
    order,
    familyIndex,
    familyName: family.name,
    // Kid-friendly phonetic: consonant + vowel of the order; the 6th order
    // is the bare consonant sound.
    sound: family.sounds
      ? family.sounds[order]
      : order === 5
        ? family.consonant
        : family.consonant + ORDER_VOWELS[order],
    // Audio file key, e.g. "le-3" -> /audio/fidel/letters/le-3.mp3
    audioKey: `${audioName(family.name)}-${order + 1}`,
  })),
  // Labialized bonus form (explore-only): audio key <family>-8.
  labialForm: family.labial
    ? {
        char: family.labial,
        order: 7,
        familyIndex,
        familyName: family.name,
        sound: `${family.consonant}wa`,
        audioKey: `${audioName(family.name)}-8`,
        isLabial: true,
      }
    : null,
}))

export const ALL_FORMS = FIDEL_FAMILIES.flatMap((f) => f.forms)

export const CHAR_TO_FORM = new Map(ALL_FORMS.map((form) => [form.char, form]))

// Word entries for the First Words level: each carries the form of its
// leading character so the quiz can ask "which letter starts this word?".
export const WORDS = FIDEL_FAMILIES.filter((f) => f.word).map((f) => ({
  ...f.word,
  familyIndex: f.familyIndex,
  startChar: [...f.word.geez][0],
}))

/* ── UI STRINGS ──────────────────────────────────────────────────────────────
   Keys interpolate {placeholders}. English is canonical; missing Amharic
   keys fall back to English at lookup time.                                  */

export const UI_STRINGS = {
  en: {
    title: 'Fidel Quest',
    tagline: 'Learn the Amharic alphabet with Kokeb the Star',
    level: 'Level {n}',
    best: 'Best {n}',
    earnStar: 'Earn a star on Level {n}',
    champion: 'Fidel Champion!',
    championSub: 'Every star earned — you know your Fidel. Betam gobez!',
    exploreCta: 'Explore Mode — tap letters, hear sounds',
    traceCta: 'Tracing — draw the letters with your finger',
    masterCta: 'Fidel Master — hear, chant & say every letter',
    footer: "Made for young learners of the Ge'ez script",
    soundOff: 'Turn sound off',
    soundOn: 'Turn sound on',
    langToggle: 'አማርኛ',
    menu: 'Menu',
    backToMenu: 'Back to menu',
    allLetters: 'All letters',
    exploreTitle: 'Explore the Fidel',
    exploreHint: 'Tap a letter to hear it. Tap the little arrow to visit its whole family of seven sounds.',
    familyTitle: 'The {name} family',
    familyHint: 'One letter, seven forms — the shape changes a little for each vowel sound.',
    twinNote: 'It sounds just like the {name} family.',
    chant: 'Chant the row — all seven in order',
    openFamily: 'Open the {name} family',
    letterSays: 'Letter {char}, sounds like {sound}',
    bonusLabial: 'Bonus',
    wordToKnow: 'A word to know',
    findLetter: 'Find the letter that says',
    whatSound: 'What sound does this letter make?',
    whichStarts: 'Which letter starts this word?',
    playAgainSound: 'Play the sound {sound} again',
    playLetterSound: "Play this letter's sound",
    playWordSound: 'Hear the word {word}',
    continueBtn: 'Continue',
    scoreLabel: 'Score:',
    streakLabel: 'Streak:',
    streakMilestone: '{n} in a row! Unbelievable!',
    levelComplete: 'Level {n} complete!',
    practiceDone: 'Practice round done!',
    practiceSub: 'Practice builds mastery — stars come from full levels.',
    stars3: 'Perfect stars — betam gobez!',
    stars2: 'So good! One more star to go.',
    stars1: 'Nice work! Practice makes stars.',
    score: 'Score',
    correct: 'Correct',
    bestStreak: 'Best streak',
    accuracy: 'Accuracy: {n}%',
    lettersToPractice: 'Letters to practice — tap to hear',
    hearForm: 'Hear {char}, sounds like {sound}',
    practiceThese: 'Practice these letters',
    flawless: 'Flawless — not a single miss!',
    next: 'Next: {title}',
    playAgain: 'Play again',
    replayLevel: 'Replay Level {n}',
    traceTitle: 'Trace the letters',
    tracePick: 'Pick a letter family to trace, one form at a time.',
    traceFamily: 'Tracing the {name} family',
    traceInstruction: 'Draw over the gray letter with your finger or mouse.',
    traceClear: 'Clear',
    traceCheck: 'Check my letter',
    traceSkip: 'Skip',
    traceHear: 'Hear it',
    traceGreat: 'Beautiful tracing!',
    traceGood: 'Good! A little more of the letter next time.',
    traceTry: 'Give it one more try — cover more of the gray letter.',
    traceDone: 'Family traced — gobez!',
    traceUnsupported: 'Tracing needs a browser with canvas support.',
    praise: ['Gobez! (Great job!)', 'Wonderful!', 'You are a star!', 'Betam gobez! (Very well done!)', 'Brilliant!', 'Keep shining!', 'Amazing!', 'Fantastic!', 'You did it!', 'Way to go!', 'Superb!', 'Tebarek! (Bless you!)', 'Girum! (Wonderful!)', 'Arif! (Great!)', 'Kokeb neh! (You are a star!)', 'Woohoo!'],
    encourage: ['Almost! Listen again.', 'Good try! Give it another go.', 'So close! Keep going.', 'No worries — try again!', 'Ayzoh! (Take heart!) Listen once more.', 'You can do it! Try again.', 'Nearly there — one more try!', 'Listen carefully and try again.'],
    levels: {
      1: { title: 'First Letters', subtitle: 'Meet the first eight Fidel' },
      2: { title: 'More Letters', subtitle: 'Eight new friends to meet' },
      3: { title: 'Even More Letters', subtitle: 'The middle of the fidel table' },
      4: { title: 'Popping Sounds', subtitle: 'The special explosive letters' },
      5: { title: 'Letter Families', subtitle: 'One letter, seven sounds' },
      6: { title: 'First Words', subtitle: 'Which letter starts the word?' },
      7: { title: 'Grand Review', subtitle: 'Hear any letter, find it' },
    },
  },
  am: {
    title: 'የፊደል ጉዞ',
    tagline: 'ከኮከብ ጋር ፊደል እንማር',
    level: 'ደረጃ {n}',
    best: 'ምርጥ {n}',
    earnStar: 'በደረጃ {n} ኮከብ ያግኙ',
    champion: 'የፊደል ሻምፒዮን!',
    championSub: 'ሁሉንም ኮከቦች አግኝተዋል — ፊደልዎን ያውቃሉ። በጣም ጎበዝ!',
    exploreCta: 'ማሰሻ — ፊደላትን ነክተው ድምፃቸውን ይስሙ',
    traceCta: 'መሳያ — ፊደላትን በጣትዎ ይሳሉ',
    masterCta: 'የፊደል ሊቅ — ሁሉንም ፊደል ስሙ፣ ዘምሩ፣ ተናገሩ',
    footer: 'ለፊደል ተማሪ ልጆች የተሠራ',
    soundOff: 'ድምፅ አጥፋ',
    soundOn: 'ድምፅ አብራ',
    langToggle: 'English',
    menu: 'መነሻ',
    backToMenu: 'ወደ መነሻ ተመለስ',
    allLetters: 'ሁሉም ፊደላት',
    exploreTitle: 'ፊደላትን ያስሱ',
    exploreHint: 'ፊደል ነክተው ድምፁን ይስሙ። ሰባቱን ቅርጾች ለማየት ትንሿን ቀስት ይንኩ።',
    familyTitle: 'የ{name} ቤተሰብ',
    familyHint: 'አንድ ፊደል፣ ሰባት ቅርጾች — ለእያንዳንዱ አናባቢ ቅርጹ ትንሽ ይቀየራል።',
    twinNote: 'ድምፁ ከ{name} ቤተሰብ ጋር አንድ ነው።',
    chant: 'ተርታውን ይዘምሩ — ሰባቱንም በቅደም ተከተል',
    openFamily: 'የ{name} ቤተሰብ ክፈት',
    letterSays: 'ፊደል {char}፣ ድምፁ {sound}',
    bonusLabial: 'ተጨማሪ',
    wordToKnow: 'የምናውቀው ቃል',
    findLetter: 'ይህን ድምፅ ያለውን ፊደል ፈልጉ',
    whatSound: 'ይህ ፊደል ምን ድምፅ አለው?',
    whichStarts: 'ይህ ቃል በየትኛው ፊደል ይጀምራል?',
    playAgainSound: 'ድምፅ {sound} እንደገና አሰማ',
    playLetterSound: 'የዚህን ፊደል ድምፅ አሰማ',
    playWordSound: 'ቃሉን {word} አሰማ',
    continueBtn: 'ቀጥል',
    scoreLabel: 'ነጥብ፦',
    streakLabel: 'ተከታታይ፦',
    streakMilestone: '{n} በተከታታይ! ድንቅ ነው!',
    levelComplete: 'ደረጃ {n} ተጠናቀቀ!',
    practiceDone: 'ልምምዱ ተጠናቀቀ!',
    practiceSub: 'ልምምድ ችሎታ ያዳብራል — ኮከቦች ከሙሉ ደረጃዎች ይገኛሉ።',
    stars3: 'ሙሉ ኮከቦች — በጣም ጎበዝ!',
    stars2: 'በጣም ጥሩ! አንድ ኮከብ ይቀራል።',
    stars1: 'ጥሩ ሥራ! ልምምድ ኮከብ ያመጣል።',
    score: 'ነጥብ',
    correct: 'ትክክል',
    bestStreak: 'ምርጥ ተከታታይ',
    accuracy: 'ትክክለኛነት፦ {n}%',
    lettersToPractice: 'መለማመጃ ፊደላት — ነክተው ይስሙ',
    hearForm: '{char} አሰማ፣ ድምፁ {sound}',
    practiceThese: 'እነዚህን ፊደላት ተለማመድ',
    flawless: 'ፍጹም — አንድም ስህተት የለም!',
    next: 'ቀጣይ፦ {title}',
    playAgain: 'እንደገና ተጫወት',
    replayLevel: 'ደረጃ {n} እንደገና',
    traceTitle: 'ፊደላትን ይሳሉ',
    tracePick: 'ለመሳል የፊደል ቤተሰብ ይምረጡ፣ ቅርጽ በቅርጽ።',
    traceFamily: 'የ{name} ቤተሰብ በመሳል ላይ',
    traceInstruction: 'በግራጫው ፊደል ላይ በጣትዎ ወይም በመዳፊት ይሳሉ።',
    traceClear: 'አጽዳ',
    traceCheck: 'ፊደሌን እይ',
    traceSkip: 'ዝለል',
    traceHear: 'አሰማ',
    traceGreat: 'ውብ ሥዕል!',
    traceGood: 'ጥሩ! በሚቀጥለው ትንሽ ጨምር።',
    traceTry: 'አንድ ጊዜ ደግመህ ሞክር — ግራጫውን ፊደል የበለጠ ሸፍን።',
    traceDone: 'ቤተሰቡ ተስሏል — ጎበዝ!',
    traceUnsupported: 'መሳል ካንቫስ የሚደግፍ አሳሽ ይፈልጋል።',
    praise: ['ጎበዝ!', 'በጣም ጎበዝ!', 'ኮከብ ነህ!', 'ድንቅ!', 'እሰይ!', 'በርታ!', 'ተባረክ!', 'ግሩም!', 'አሪፍ!', 'ዋው!', 'ተባ በል!', 'እጅግ ጎበዝ!'],
    encourage: ['ተቃርበሃል! እንደገና ስማ።', 'ጥሩ ሙከራ! እንደገና ሞክር።', 'በጣም ተቃርበሃል! በርታ።', 'ችግር የለም፣ እንደገና ሞክር!', 'አይዞህ! ደግመህ ስማ።', 'ትችላለህ! እንደገና ሞክር።'],
    levels: {
      1: { title: 'የመጀመሪያ ፊደላት', subtitle: 'የመጀመሪያዎቹ ስምንት ፊደላት' },
      2: { title: 'ተጨማሪ ፊደላት', subtitle: 'ስምንት አዲስ ጓደኞች' },
      3: { title: 'ገና ተጨማሪ ፊደላት', subtitle: 'የፊደል ገበታው መካከል' },
      4: { title: 'ጠንካራ ድምፆች', subtitle: 'ልዩዎቹ ፈንጂ ፊደላት' },
      5: { title: 'የፊደል ቤተሰቦች', subtitle: 'አንድ ፊደል፣ ሰባት ድምፆች' },
      6: { title: 'የመጀመሪያ ቃላት', subtitle: 'ቃሉ በየትኛው ፊደል ይጀምራል?' },
      7: { title: 'ታላቅ ክለሳ', subtitle: 'ማንኛውንም ፊደል ሰምተህ አግኝ' },
    },
  },
}
