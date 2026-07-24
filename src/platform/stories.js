/* ============================================================================
   STORIES — the reading on-ramp after the alphabet
   ----------------------------------------------------------------------------
   The app taught decoding and then stranded it at single words; stories are
   where the child SPENDS the letters. Each story carries a `band` (1-4) tied
   to a chapter of the Journey and unlocks when that chapter is finished, so
   the library grows as a motivating ramp (a locked story tells the child
   which letters still stand between them and it).

   Why banded, not strict per-letter decodable: Ge'ez gates one family at a
   time, so "only letters already learned" boxes the earliest stories into
   near-nonsense (halo, ho-ho-ho, mulu-mulu-mulu). A STORY is narration the
   child reads WITH help (Read-to-me voices every word), not a cold decoding
   drill - so we trade strict decodability for real, correct Amharic that
   still arrives in a sensible order. Vocabulary stays simple and concrete;
   the band, not the exact spelling, sets when a story appears.

   Pure module: tokenizing, gating, and ordering are all selectors; the
   reader UI and read-count persistence live elsewhere (fq.stories.v1 is in
   the progress registry).

   CONTENT NOTE: the starter library is Amharic. Tigrinya stories are a TODO
   gated on a native speaker; the engine is pack-aware (filters by s.pack).
   ========================================================================== */

import { FIDEL_FAMILIES } from './ethiopic'

/* Ethiopic punctuation + whitespace a page may carry around its words. */
const STRIP = /[፡-፨!?,.\s]+/g

/** Families per chapter (groups of 8; the last chapter takes the remainder),
    matching journey.js chapterFamilies. */
const CHAPTER_SIZE = 8

/** The Ge'ez words of a sentence, punctuation stripped. */
export function storyWords(text) {
  return String(text || '')
    .split(STRIP)
    .filter(Boolean)
}

/** 0-based family index at which a band's chapter completes (its gate). */
export function bandUnlockIndex(band, families = FIDEL_FAMILIES) {
  const last = families.length - 1
  if (band >= 4) return last
  return Math.min(Math.max(1, band) * CHAPTER_SIZE - 1, last)
}

/** The family index that gates this story (its band's last family). */
export function storyStage(story, families = FIDEL_FAMILIES) {
  return bandUnlockIndex(story.band || 1, families)
}

/** A story is unlocked once the child has learned its gate family - i.e.
    finished the chapter the story's band belongs to. */
export function storyUnlocked(story, learnedIds, families = FIDEL_FAMILIES) {
  const learned = learnedIds instanceof Set ? learnedIds : new Set(learnedIds)
  const gate = families[storyStage(story, families)]?.id
  return gate ? learned.has(gate) : true
}

/** Families the child still needs to reach a locked story's band, in
    journey order (the "learn these to open" hint). */
export function storyMissingFamilies(story, learnedIds, families = FIDEL_FAMILIES) {
  const learned = learnedIds instanceof Set ? learnedIds : new Set(learnedIds)
  const idx = storyStage(story, families)
  return families.slice(0, idx + 1).filter((f) => !learned.has(f.id)).map((f) => f.id)
}

/** Library view: every story tagged { unlocked, stage, missing } and sorted
    unlocked-first by stage, so the next locked story is the next goal. */
export function storyLibrary(learnedIds, stories = STORIES, packId = null) {
  // Stories are written in a LANGUAGE, not just a script: a Tigrinya
  // learner must not be handed Amharic sentences as "reading practice".
  const inPack = packId ? stories.filter((s) => s.pack === packId) : stories
  return inPack
    .map((s) => {
      const unlocked = storyUnlocked(s, learnedIds)
      return { ...s, unlocked, stage: storyStage(s), missing: unlocked ? [] : storyMissingFamilies(s, learnedIds) }
    })
    .sort((a, b) => a.stage - b.stage || a.id.localeCompare(b.id))
}

/* ── word audio lookup ────────────────────────────────────────────────── */

let WORD_AUDIO = null
/** { latin, noAudio } for a Ge'ez word that exists in the pack's word list
    (those may have a recorded clip at words/<latin>.mp3), else null - the
    reader then falls back to letter-by-letter spelling. */
export function wordAudioFor(geez) {
  if (!WORD_AUDIO) {
    WORD_AUDIO = new Map()
    for (const f of FIDEL_FAMILIES) {
      for (const w of f.words || []) if (!WORD_AUDIO.has(w.geez)) WORD_AUDIO.set(w.geez, { latin: w.latin, noAudio: !!w.noAudio })
    }
  }
  return WORD_AUDIO.get(geez) || null
}

/* ── read-count persistence (progress registry key) ───────────────────── */

const READ_KEY = 'fq.stories.v1'

export function loadStoriesRead() {
  try {
    const s = JSON.parse(localStorage.getItem(READ_KEY))
    return s && typeof s === 'object' && s.read ? s : { v: 1, read: {} }
  } catch {
    return { v: 1, read: {} }
  }
}

export function markStoryRead(id) {
  const s = loadStoriesRead()
  s.read[id] = (s.read[id] || 0) + 1
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(s))
  } catch {
    /* session only */
  }
  return s.read[id]
}

/* ── the starter library (Amharic) ────────────────────────────────────── */
/* Page shape: g (Ge'ez), lt (latin), en (meaning), pic (emoji stand-in
   until the owned-illustration pass). band (1-4) gates the story to a
   chapter. Pages stay 1-5 words: pre-reader sentences, real Amharic. */

export const STORIES = [
  {
    id: 'lomi',
    pack: 'am',
    band: 1,
    title: { g: 'ሚሚና ሎሚ', lt: 'Mimina Lomi', en: 'Mimi and the Lemon' },
    pages: [
      { g: 'ሚሚ ትንሽ ድመት ናት።', lt: 'Mimi tinish dimet nat.', en: 'Mimi is a little cat.', pic: '🐱' },
      { g: 'አንድ ቀን ሎሚ አገኘች።', lt: 'and qen lomi agegnech.', en: 'One day she found a lemon.', pic: '🍋' },
      { g: 'ላሰችው፣ በጣም መራራ ነበር!', lt: 'lasechiw, betam merara neber!', en: 'She licked it - so sour!', pic: '😝' },
      { g: 'ሚሚ ደንግጣ ሸሸች።', lt: 'Mimi dengita sheshech.', en: 'Mimi got startled and ran.', pic: '🙀' },
    ],
    /* Comprehension check: one tap, picture answers, gentle retry (StoryTime). */
    q: { en: 'What did Mimi taste?', a: [{ pic: '🍋', ok: true }, { pic: '🍯', ok: false }, { pic: '🥛', ok: false }] },
  },
  {
    id: 'lemlem',
    pack: 'am',
    band: 1,
    title: { g: 'ለምለምና ማር', lt: 'Lemlemna Mar', en: "Lemlem's Honey" },
    pages: [
      { g: 'ለምለም እናቷን ትወዳለች።', lt: 'Lemlem inatwan tiwedalech.', en: 'Lemlem loves her mother.', pic: '👧🏾' },
      { g: 'እናቷ ማር ገዛች።', lt: 'inatwa mar gezach.', en: 'Her mother bought honey.', pic: '🍯' },
      { g: 'ለምለም ማሩን ቀመሰች።', lt: 'Lemlem marun qemesech.', en: 'Lemlem tasted the honey.', pic: '😋' },
      { g: 'በጣም ጣፋጭ ነው!', lt: 'betam tafach new!', en: 'It is so sweet!', pic: '🫙' },
    ],
    q: { en: 'What did Lemlem taste?', a: [{ pic: '🍯', ok: true }, { pic: '🍋', ok: false }, { pic: '🌿', ok: false }] },
  },
  {
    id: 'selam-sara',
    pack: 'am',
    band: 1,
    title: { g: 'ሰላም ሳራ', lt: 'Selam Sara', en: 'Hello, Sara' },
    pages: [
      { g: 'ሰላም ሳራ!', lt: 'selam Sara!', en: 'Hello, Sara!', pic: '👧🏾' },
      { g: 'ሰላም ሙሴ!', lt: 'selam Musse!', en: 'Hello, Musse!', pic: '👦🏾' },
      { g: 'አብረው ተጫወቱ።', lt: 'abrew techawetu.', en: 'They played together.', pic: '🤸' },
      { g: 'ሳራና ሙሴ ጓደኛሞች ናቸው።', lt: 'Sarana Musse gwadegnamoch nachew.', en: 'Sara and Musse are friends.', pic: '🤝' },
    ],
  },
  {
    id: 'shiro',
    pack: 'am',
    band: 2,
    title: { g: 'ሽሮ ወጥ', lt: 'Shiro Wet', en: 'Shiro Stew' },
    pages: [
      { g: 'እናት ምሳ ሰራች።', lt: 'inat misa serach.', en: 'Mother made lunch.', pic: '👩🏾‍🍳' },
      { g: 'ጣፋጭ ሽሮ ወጥ ነው።', lt: 'tafach shiro wet new.', en: 'It is tasty shiro stew.', pic: '🍲' },
      { g: 'ሁሉም አብረው በሉ።', lt: 'hulum abrew belu.', en: 'Everyone ate together.', pic: '🍽️' },
      { g: 'ሆዳችን ሞላ!', lt: 'hodachin mola!', en: 'Our tummies are full!', pic: '😊' },
    ],
    q: { en: 'What did they eat?', a: [{ pic: '🍲', ok: true }, { pic: '🍋', ok: false }, { pic: '🍯', ok: false }] },
  },
  {
    id: 'anbesa-lam',
    pack: 'am',
    band: 2,
    title: { g: 'አንበሳና ላም', lt: 'Anbesana Lam', en: 'The Lion and the Cow' },
    pages: [
      { g: 'አንበሳ ላምን አገኘ።', lt: 'anbesa lamin agegne.', en: 'The lion met a cow.', pic: '🦁' },
      { g: 'ላም በጣም ፈራች።', lt: 'lam betam ferach.', en: 'The cow was very scared.', pic: '🐄' },
      { g: 'አንበሳ ግን ደግ ነው።', lt: 'anbesa gin deg new.', en: 'But the lion is kind.', pic: '😊' },
      { g: 'አብረው ጓደኛ ሆኑ።', lt: 'abrew gwadegna honu.', en: 'They became friends.', pic: '🤝' },
    ],
    q: { en: 'How did the lion treat the cow?', a: [{ pic: '😊', ok: true }, { pic: '😠', ok: false }, { pic: '😢', ok: false }] },
  },
  {
    id: 'inat-abat',
    pack: 'am',
    band: 2,
    title: { g: 'እናትና አባት', lt: 'Inatna Abat', en: 'Mother and Father' },
    pages: [
      { g: 'እናት መጽሐፍ አነበበች።', lt: 'inat metsihaf anebebech.', en: 'Mother read a book.', pic: '📖' },
      { g: 'አባት በጥሞና አዳመጠ።', lt: 'abat betmona adamete.', en: 'Father listened closely.', pic: '👂🏾' },
      { g: 'ልጆች ተሰበሰቡ።', lt: 'lijoch tesebesebu.', en: 'The children gathered.', pic: '🧒🏾' },
      { g: 'ቤታችን በፍቅር ሞላ።', lt: 'betachin befiqir mola.', en: 'Our home filled with love.', pic: '❤️' },
    ],
  },
  {
    id: 'abebe-anbebe',
    pack: 'am',
    band: 3,
    title: { g: 'አበበ አነበበ', lt: 'Abebe Anebebe', en: 'Abebe Reads' },
    pages: [
      { g: 'አበበ ማለዳ ተነሳ።', lt: 'Abebe maleda tenesa.', en: 'Abebe woke up early.', pic: '🌅' },
      { g: 'ፊደሎቹን አጠና።', lt: 'fidelochun atena.', en: 'He studied his letters.', pic: '🔤' },
      { g: 'መጽሐፉን አነበበ።', lt: 'metsihafun anebebe.', en: 'He read his book.', pic: '📖' },
      { g: 'እናቱ በጣም ኮራች።', lt: 'inatu betam korach.', en: 'His mother was so proud.', pic: '🥰' },
    ],
    q: { en: 'What did Abebe do?', a: [{ pic: '📖', ok: true }, { pic: '⚽', ok: false }, { pic: '😴', ok: false }] },
  },
  {
    id: 'wisha',
    pack: 'am',
    band: 3,
    title: { g: 'የሉሉ ውሻ', lt: 'Ye-Lulu Wisha', en: "Lulu's Dog" },
    pages: [
      { g: 'ሉሉ ትንሽ ውሻ አላት።', lt: 'Lulu tinish wisha alat.', en: 'Lulu has a little dog.', pic: '🐶' },
      { g: 'ውሻው ውሃ ይወዳል።', lt: 'wishaw wiha yiwedal.', en: 'The dog loves water.', pic: '💧' },
      { g: 'በኩሬ ውስጥ ዘለለ።', lt: 'bekure wist zelele.', en: 'He jumped into the pond.', pic: '🐕' },
      { g: 'ሉሉና ውሻው ተደሰቱ።', lt: 'Luluna wishaw tedesetu.', en: 'Lulu and the dog were happy.', pic: '❤️' },
    ],
    q: { en: 'What does the dog love?', a: [{ pic: '💧', ok: true }, { pic: '🔥', ok: false }, { pic: '🌙', ok: false }] },
  },
  {
    id: 'wetet',
    pack: 'am',
    band: 3,
    title: { g: 'ወተትና ነብር', lt: 'Wetetna Nebir', en: 'Milk and the Leopard' },
    pages: [
      { g: 'ነብሩ ተራበ።', lt: 'nebru terabe.', en: 'The leopard was hungry.', pic: '🐆' },
      { g: 'ላም ወተት ሰጠችው።', lt: 'lam wetet setechiw.', en: 'The cow gave him milk.', pic: '🥛' },
      { g: 'ነብሩ አመሰገነ።', lt: 'nebru amesegene.', en: 'The leopard said thank you.', pic: '🙏🏾' },
      { g: 'ጓደኛሞች ሆኑ።', lt: 'gwadegnamoch honu.', en: 'They became friends.', pic: '🤝' },
    ],
  },
  {
    id: 'tsehay',
    pack: 'am',
    band: 4,
    title: { g: 'ፀሐይ ወጣች', lt: 'Tsehay Wetach', en: 'The Sun Rose' },
    pages: [
      { g: 'ጠዋት ፀሐይ ወጣች።', lt: 'tewat tsehay wetach.', en: 'In the morning the sun rose.', pic: '☀️' },
      { g: 'ወፎች ዘመሩ።', lt: 'wefoch zemeru.', en: 'The birds sang.', pic: '🐦' },
      { g: 'አበበ ፊደል ጻፈ።', lt: 'Abebe fidel tsafe.', en: 'Abebe wrote a letter.', pic: '✍🏾' },
      { g: 'ማታ ጨረቃ መጣች።', lt: 'mata chereqa metach.', en: 'At night the moon came.', pic: '🌙' },
      { g: 'መልካም ሌሊት!', lt: 'melkam lelit!', en: 'Good night!', pic: '😴' },
    ],
    q: { en: 'What rose in the morning?', a: [{ pic: '☀️', ok: true }, { pic: '🌙', ok: false }, { pic: '⭐', ok: false }] },
  },
]
