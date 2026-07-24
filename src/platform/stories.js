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
/* Page shape: g (Ge'ez), lt (latin), en (meaning), pic (emoji fallback),
   scene ({ bg, items }) rendered by StoryScene as a picture-book panel.
   band (1-4) gates the story to a chapter. Pages stay 1-5 words. */

/* People presets for scenes: skin / hair / cloth (hex). Spread with a
   position: { ...GIRL, x: 0.6, foot: 0.72, s: 0.3 }. */
const WOMAN = { k: 'person', skin: '#b87a44', hair: '#241812', cloth: '#3f8f7a' }
const MAN = { k: 'person', skin: '#a56a38', hair: '#1e140d', cloth: '#4b6bb0', hairStyle: 'short' }
const GIRL = { k: 'person', skin: '#c98a5a', hair: '#241812', cloth: '#d9642e', blush: true }
const BOY = { k: 'person', skin: '#b87a44', hair: '#1e140d', cloth: '#c8103e', hairStyle: 'short' }

export const STORIES = [
  {
    id: 'lomi',
    pack: 'am',
    band: 1,
    title: { g: 'ሚሚና ሎሚ', lt: 'Mimina Lomi', en: 'Mimi and the Lemon' },
    pages: [
      { g: 'ሚሚ ትንሽ ድመት ናት።', lt: 'Mimi tinish dimet nat.', en: 'Mimi is a little cat.', pic: '🐱',
        scene: { bg: 'indoor', items: [{ k: 'rug', x: 0.5, y: 0.82, s: 0.55 }, { k: 'cat', x: 0.5, y: 0.5, s: 0.4 }] } },
      { g: 'አንድ ቀን ሎሚ አገኘች።', lt: 'and qen lomi agegnech.', en: 'One day she found a lemon.', pic: '🍋',
        scene: { bg: 'indoor', items: [{ k: 'cat', x: 0.36, y: 0.5, s: 0.36 }, { k: 'lemon', x: 0.68, y: 0.66, s: 0.2 }] } },
      { g: 'ላሰችው፣ በጣም መራራ ነበር!', lt: 'lasechiw, betam merara neber!', en: 'She licked it - so sour!', pic: '😝',
        scene: { bg: 'indoor', items: [{ k: 'cat', x: 0.44, y: 0.5, s: 0.42 }, { k: 'lemon', x: 0.7, y: 0.6, s: 0.2 }, { k: 'note', x: 0.8, y: 0.3, s: 66 }] } },
      { g: 'ሚሚ ደንግጣ ሸሸች።', lt: 'Mimi dengita sheshech.', en: 'Mimi got startled and ran.', pic: '🙀',
        scene: { bg: 'indoor', items: [{ k: 'dust', x: 0.18, y: 0.7, s: 0.22 }, { k: 'cat', x: 0.6, y: 0.5, s: 0.34, flip: true }] } },
    ],
    q: { en: 'What did Mimi taste?', a: [{ pic: '🍋', ok: true }, { pic: '🍯', ok: false }, { pic: '🥛', ok: false }] },
  },
  {
    id: 'lemlem',
    pack: 'am',
    band: 1,
    title: { g: 'ለምለምና ማር', lt: 'Lemlemna Mar', en: "Lemlem's Honey" },
    pages: [
      { g: 'ለምለም እናቷን ትወዳለች።', lt: 'Lemlem inatwan tiwedalech.', en: 'Lemlem loves her mother.', pic: '👧🏾',
        scene: { bg: 'indoor', items: [{ ...WOMAN, x: 0.37, foot: 0.72, s: 0.36 }, { ...GIRL, x: 0.63, foot: 0.72, s: 0.27 }, { k: 'heart', x: 0.5, y: 0.28, s: 0.12 }] } },
      { g: 'እናቷ ማር ገዛች።', lt: 'inatwa mar gezach.', en: 'Her mother bought honey.', pic: '🍯',
        scene: { bg: 'kitchen', items: [{ ...WOMAN, x: 0.38, foot: 0.72, s: 0.36 }, { k: 'honey', x: 0.66, y: 0.6, s: 0.24 }] } },
      { g: 'ለምለም ማሩን ቀመሰች።', lt: 'Lemlem marun qemesech.', en: 'Lemlem tasted the honey.', pic: '😋',
        scene: { bg: 'kitchen', items: [{ ...GIRL, x: 0.4, foot: 0.72, s: 0.32 }, { k: 'honey', x: 0.66, y: 0.62, s: 0.22 }] } },
      { g: 'በጣም ጣፋጭ ነው!', lt: 'betam tafach new!', en: 'It is so sweet!', pic: '🫙',
        scene: { bg: 'kitchen', items: [{ ...GIRL, x: 0.42, foot: 0.72, s: 0.32 }, { k: 'honey', x: 0.66, y: 0.62, s: 0.2 }, { k: 'heart', x: 0.66, y: 0.3, s: 0.12 }] } },
    ],
    q: { en: 'What did Lemlem taste?', a: [{ pic: '🍯', ok: true }, { pic: '🍋', ok: false }, { pic: '🌿', ok: false }] },
  },
  {
    id: 'selam-sara',
    pack: 'am',
    band: 1,
    title: { g: 'ሰላም ሳራ', lt: 'Selam Sara', en: 'Hello, Sara' },
    pages: [
      { g: 'ሰላም ሳራ!', lt: 'selam Sara!', en: 'Hello, Sara!', pic: '👧🏾',
        scene: { bg: 'field', items: [{ ...GIRL, x: 0.5, foot: 0.72, s: 0.34, wave: true }] } },
      { g: 'ሰላም ሙሴ!', lt: 'selam Musse!', en: 'Hello, Musse!', pic: '👦🏾',
        scene: { bg: 'field', items: [{ ...BOY, x: 0.5, foot: 0.72, s: 0.34, wave: true }] } },
      { g: 'አብረው ተጫወቱ።', lt: 'abrew techawetu.', en: 'They played together.', pic: '🤸',
        scene: { bg: 'field', items: [{ ...GIRL, x: 0.34, foot: 0.72, s: 0.3 }, { k: 'ball', x: 0.5, y: 0.66, s: 0.14 }, { ...BOY, x: 0.66, foot: 0.72, s: 0.3 }] } },
      { g: 'ሳራና ሙሴ ጓደኛሞች ናቸው።', lt: 'Sarana Musse gwadegnamoch nachew.', en: 'Sara and Musse are friends.', pic: '🤝',
        scene: { bg: 'field', items: [{ ...GIRL, x: 0.38, foot: 0.72, s: 0.3 }, { ...BOY, x: 0.62, foot: 0.72, s: 0.3 }, { k: 'heart', x: 0.5, y: 0.26, s: 0.12 }] } },
    ],
  },
  {
    id: 'shiro',
    pack: 'am',
    band: 2,
    title: { g: 'ሽሮ ወጥ', lt: 'Shiro Wet', en: 'Shiro Stew' },
    pages: [
      { g: 'እናት ምሳ ሰራች።', lt: 'inat misa serach.', en: 'Mother made lunch.', pic: '👩🏾‍🍳',
        scene: { bg: 'kitchen', items: [{ ...WOMAN, x: 0.4, foot: 0.72, s: 0.36 }, { k: 'pot', x: 0.66, y: 0.62, s: 0.3 }] } },
      { g: 'ጣፋጭ ሽሮ ወጥ ነው።', lt: 'tafach shiro wet new.', en: 'It is tasty shiro stew.', pic: '🍲',
        scene: { bg: 'kitchen', items: [{ k: 'pot', x: 0.5, y: 0.56, s: 0.44 }] } },
      { g: 'ሁሉም አብረው በሉ።', lt: 'hulum abrew belu.', en: 'Everyone ate together.', pic: '🍽️',
        scene: { bg: 'indoor', items: [{ ...WOMAN, x: 0.26, foot: 0.72, s: 0.32 }, { ...GIRL, x: 0.74, foot: 0.72, s: 0.26 }, { k: 'pot', x: 0.5, y: 0.66, s: 0.26 }] } },
      { g: 'ሆዳችን ሞላ!', lt: 'hodachin mola!', en: 'Our tummies are full!', pic: '😊',
        scene: { bg: 'indoor', items: [{ ...GIRL, x: 0.36, foot: 0.72, s: 0.3, blush: true }, { ...BOY, x: 0.64, foot: 0.72, s: 0.3 }, { k: 'heart', x: 0.5, y: 0.26, s: 0.12 }] } },
    ],
    q: { en: 'What did they eat?', a: [{ pic: '🍲', ok: true }, { pic: '🍋', ok: false }, { pic: '🍯', ok: false }] },
  },
  {
    id: 'anbesa-lam',
    pack: 'am',
    band: 2,
    title: { g: 'አንበሳና ላም', lt: 'Anbesana Lam', en: 'The Lion and the Cow' },
    pages: [
      { g: 'አንበሳ ላምን አገኘ።', lt: 'anbesa lamin agegne.', en: 'The lion met a cow.', pic: '🦁',
        scene: { bg: 'field', items: [{ k: 'lion', x: 0.34, foot: 0.74, s: 0.34 }, { k: 'cow', x: 0.68, y: 0.54, s: 0.34 }] } },
      { g: 'ላም በጣም ፈራች።', lt: 'lam betam ferach.', en: 'The cow was very scared.', pic: '🐄',
        scene: { bg: 'field', items: [{ k: 'cow', x: 0.6, y: 0.52, s: 0.4 }, { k: 'lion', x: 0.2, foot: 0.74, s: 0.24 }] } },
      { g: 'አንበሳ ግን ደግ ነው።', lt: 'anbesa gin deg new.', en: 'But the lion is kind.', pic: '😊',
        scene: { bg: 'field', items: [{ k: 'lion', x: 0.5, foot: 0.74, s: 0.4 }, { k: 'heart', x: 0.76, y: 0.32, s: 0.12 }] } },
      { g: 'አብረው ጓደኛ ሆኑ።', lt: 'abrew gwadegna honu.', en: 'They became friends.', pic: '🤝',
        scene: { bg: 'field', items: [{ k: 'lion', x: 0.33, foot: 0.74, s: 0.3 }, { k: 'cow', x: 0.67, y: 0.54, s: 0.32 }, { k: 'heart', x: 0.5, y: 0.26, s: 0.12 }] } },
    ],
    q: { en: 'How did the lion treat the cow?', a: [{ pic: '😊', ok: true }, { pic: '😠', ok: false }, { pic: '😢', ok: false }] },
  },
  {
    id: 'inat-abat',
    pack: 'am',
    band: 2,
    title: { g: 'እናትና አባት', lt: 'Inatna Abat', en: 'Mother and Father' },
    pages: [
      { g: 'እናት መጽሐፍ አነበበች።', lt: 'inat metsihaf anebebech.', en: 'Mother read a book.', pic: '📖',
        scene: { bg: 'indoor', items: [{ ...WOMAN, x: 0.4, foot: 0.72, s: 0.36 }, { k: 'book', x: 0.66, y: 0.6, s: 0.26 }] } },
      { g: 'አባት በጥሞና አዳመጠ።', lt: 'abat betmona adamete.', en: 'Father listened closely.', pic: '👂🏾',
        scene: { bg: 'indoor', items: [{ ...MAN, x: 0.5, foot: 0.72, s: 0.38 }, { k: 'note', x: 0.74, y: 0.34, s: 60 }] } },
      { g: 'ልጆች ተሰበሰቡ።', lt: 'lijoch tesebesebu.', en: 'The children gathered.', pic: '🧒🏾',
        scene: { bg: 'indoor', items: [{ ...GIRL, x: 0.36, foot: 0.72, s: 0.28 }, { ...BOY, x: 0.64, foot: 0.72, s: 0.28 }, { k: 'rug', x: 0.5, y: 0.82, s: 0.6 }] } },
      { g: 'ቤታችን በፍቅር ሞላ።', lt: 'betachin befiqir mola.', en: 'Our home filled with love.', pic: '❤️',
        scene: { bg: 'day', items: [{ k: 'house', x: 0.5, y: 0.56, s: 0.44 }, { k: 'heart', x: 0.72, y: 0.32, s: 0.14 }] } },
    ],
  },
  {
    id: 'abebe-anbebe',
    pack: 'am',
    band: 3,
    title: { g: 'አበበ አነበበ', lt: 'Abebe Anebebe', en: 'Abebe Reads' },
    pages: [
      { g: 'አበበ ማለዳ ተነሳ።', lt: 'Abebe maleda tenesa.', en: 'Abebe woke up early.', pic: '🌅',
        scene: { bg: 'indoor', items: [{ ...BOY, x: 0.56, foot: 0.72, s: 0.36 }, { k: 'zzz', x: 0.72, y: 0.3, s: 40 }] } },
      { g: 'ፊደሎቹን አጠና።', lt: 'fidelochun atena.', en: 'He studied his letters.', pic: '🔤',
        scene: { bg: 'indoor', items: [{ ...BOY, x: 0.4, foot: 0.72, s: 0.34 }, { k: 'book', x: 0.66, y: 0.6, s: 0.26 }] } },
      { g: 'መጽሐፉን አነበበ።', lt: 'metsihafun anebebe.', en: 'He read his book.', pic: '📖',
        scene: { bg: 'indoor', items: [{ ...BOY, x: 0.42, foot: 0.72, s: 0.34 }, { k: 'book', x: 0.66, y: 0.6, s: 0.3 }] } },
      { g: 'እናቱ በጣም ኮራች።', lt: 'inatu betam korach.', en: 'His mother was so proud.', pic: '🥰',
        scene: { bg: 'indoor', items: [{ ...WOMAN, x: 0.36, foot: 0.72, s: 0.36 }, { ...BOY, x: 0.64, foot: 0.72, s: 0.3 }, { k: 'heart', x: 0.5, y: 0.26, s: 0.12 }] } },
    ],
    q: { en: 'What did Abebe do?', a: [{ pic: '📖', ok: true }, { pic: '⚽', ok: false }, { pic: '😴', ok: false }] },
  },
  {
    id: 'wisha',
    pack: 'am',
    band: 3,
    title: { g: 'የሉሉ ውሻ', lt: 'Ye-Lulu Wisha', en: "Lulu's Dog" },
    pages: [
      { g: 'ሉሉ ትንሽ ውሻ አላት።', lt: 'Lulu tinish wisha alat.', en: 'Lulu has a little dog.', pic: '🐶',
        scene: { bg: 'field', items: [{ ...GIRL, x: 0.36, foot: 0.72, s: 0.32 }, { k: 'dog', x: 0.66, y: 0.56, s: 0.3 }] } },
      { g: 'ውሻው ውሃ ይወዳል።', lt: 'wishaw wiha yiwedal.', en: 'The dog loves water.', pic: '💧',
        scene: { bg: 'field', items: [{ k: 'dog', x: 0.4, y: 0.56, s: 0.32 }, { k: 'water', x: 0.66, y: 0.58, s: 0.16 }] } },
      { g: 'በኩሬ ውስጥ ዘለለ።', lt: 'bekure wist zelele.', en: 'He jumped into the pond.', pic: '🐕',
        scene: { bg: 'field', items: [{ k: 'pond', x: 0.5, y: 0.8, s: 0.5 }, { k: 'dog', x: 0.5, y: 0.5, s: 0.3 }, { k: 'dust', x: 0.24, y: 0.72, s: 0.16 }] } },
      { g: 'ሉሉና ውሻው ተደሰቱ።', lt: 'Luluna wishaw tedesetu.', en: 'Lulu and the dog were happy.', pic: '❤️',
        scene: { bg: 'field', items: [{ ...GIRL, x: 0.36, foot: 0.72, s: 0.3 }, { k: 'dog', x: 0.66, y: 0.56, s: 0.28 }, { k: 'heart', x: 0.5, y: 0.26, s: 0.12 }] } },
    ],
    q: { en: 'What does the dog love?', a: [{ pic: '💧', ok: true }, { pic: '🔥', ok: false }, { pic: '🌙', ok: false }] },
  },
  {
    id: 'wetet',
    pack: 'am',
    band: 3,
    title: { g: 'ወተትና ነብር', lt: 'Wetetna Nebir', en: 'Milk and the Leopard' },
    pages: [
      { g: 'ነብሩ ተራበ።', lt: 'nebru terabe.', en: 'The leopard was hungry.', pic: '🐆',
        scene: { bg: 'field', items: [{ k: 'leopard', x: 0.5, foot: 0.74, s: 0.42 }] } },
      { g: 'ላም ወተት ሰጠችው።', lt: 'lam wetet setechiw.', en: 'The cow gave him milk.', pic: '🥛',
        scene: { bg: 'field', items: [{ k: 'cow', x: 0.32, y: 0.54, s: 0.34 }, { k: 'milk', x: 0.56, y: 0.62, s: 0.18 }, { k: 'leopard', x: 0.78, foot: 0.74, s: 0.3, flip: true }] } },
      { g: 'ነብሩ አመሰገነ።', lt: 'nebru amesegene.', en: 'The leopard said thank you.', pic: '🙏🏾',
        scene: { bg: 'field', items: [{ k: 'leopard', x: 0.5, foot: 0.74, s: 0.4 }, { k: 'heart', x: 0.74, y: 0.34, s: 0.12 }] } },
      { g: 'ጓደኛሞች ሆኑ።', lt: 'gwadegnamoch honu.', en: 'They became friends.', pic: '🤝',
        scene: { bg: 'field', items: [{ k: 'cow', x: 0.33, y: 0.54, s: 0.32 }, { k: 'leopard', x: 0.7, foot: 0.74, s: 0.32, flip: true }, { k: 'heart', x: 0.5, y: 0.26, s: 0.12 }] } },
    ],
  },
  {
    id: 'tsehay',
    pack: 'am',
    band: 4,
    title: { g: 'ፀሐይ ወጣች', lt: 'Tsehay Wetach', en: 'The Sun Rose' },
    pages: [
      { g: 'ጠዋት ፀሐይ ወጣች።', lt: 'tewat tsehay wetach.', en: 'In the morning the sun rose.', pic: '☀️',
        scene: { bg: 'day', items: [{ k: 'tree', x: 0.2, y: 0.58, s: 0.3 }] } },
      { g: 'ወፎች ዘመሩ።', lt: 'wefoch zemeru.', en: 'The birds sang.', pic: '🐦',
        scene: { bg: 'day', items: [{ k: 'bird', x: 0.4, y: 0.4, s: 0.18 }, { k: 'bird', x: 0.62, y: 0.3, s: 0.14 }, { k: 'note', x: 0.54, y: 0.24, s: 54 }] } },
      { g: 'አበበ ፊደል ጻፈ።', lt: 'Abebe fidel tsafe.', en: 'Abebe wrote a letter.', pic: '✍🏾',
        scene: { bg: 'indoor', items: [{ ...BOY, x: 0.4, foot: 0.72, s: 0.34 }, { k: 'book', x: 0.66, y: 0.6, s: 0.28 }] } },
      { g: 'ማታ ጨረቃ መጣች።', lt: 'mata chereqa metach.', en: 'At night the moon came.', pic: '🌙',
        scene: { bg: 'night', items: [{ k: 'tree', x: 0.22, y: 0.6, s: 0.28 }] } },
      { g: 'መልካም ሌሊት!', lt: 'melkam lelit!', en: 'Good night!', pic: '😴',
        scene: { bg: 'night', items: [{ ...GIRL, x: 0.5, foot: 0.72, s: 0.3 }, { k: 'zzz', x: 0.66, y: 0.34, s: 44 }] } },
    ],
    q: { en: 'What rose in the morning?', a: [{ pic: '☀️', ok: true }, { pic: '🌙', ok: false }, { pic: '⭐', ok: false }] },
  },
]
