/* ============================================================================
   DECODABLE STORIES — the reading on-ramp after the alphabet
   ----------------------------------------------------------------------------
   The app taught decoding and then stranded it at single words; stories are
   where the child SPENDS the letters. The engine is strict about the one
   rule that makes a "decodable" real: a story unlocks only when EVERY word
   of EVERY page is writable with the families the child has learned
   (words.js isDecodable, labialized forms included). No exceptions, no
   sight words - a locked story always tells the child which letters will
   open it, turning the library into motivation for the path.

   Pure module: tokenizing, gating, and ordering are all selectors; the
   reader UI and read-count persistence live elsewhere (fq.stories.v1 is in
   the progress registry).

   CONTENT NOTE: the starter stories are DRAFT Amharic composed for strict
   early-band decodability (only ha/le/hha/me rows in band 1, etc.), in the
   naming/exclamation style of pre-reader decodables. Like the UI
   translations, they are flagged for native-speaker review before a
   marketing push - grammar simplifications are deliberate, wrong Amharic
   is not. Tigrinya stories are a TODO gated on a native speaker; the
   engine is pack-aware and gates them off the ti family table when added.
   ========================================================================== */

import { FIDEL_FAMILIES } from './ethiopic'
import { isDecodable, unlockStage } from './words'

/* Ethiopic punctuation + whitespace a page may carry around its words. */
const STRIP = /[፡-፨!?,.\s]+/g

/** The Ge'ez words of a sentence, punctuation stripped. */
export function storyWords(text) {
  return String(text || '')
    .split(STRIP)
    .filter(Boolean)
}

/** A story is readable when every word of every page is decodable. */
export function storyDecodable(story, learnedIds) {
  const learned = learnedIds instanceof Set ? learnedIds : new Set(learnedIds)
  return story.pages.every((p) => storyWords(p.g).every((w) => isDecodable(w, learned)))
}

/** 0-based family index at which the story unlocks (max over its words). */
export function storyStage(story) {
  let stage = 0
  for (const p of story.pages) {
    for (const w of storyWords(p.g)) stage = Math.max(stage, unlockStage(w))
  }
  return stage
}

/** Families still missing for a locked story, in journey order. */
export function storyMissingFamilies(story, learnedIds) {
  const learned = learnedIds instanceof Set ? learnedIds : new Set(learnedIds)
  const missing = new Set()
  for (const p of story.pages) {
    for (const w of storyWords(p.g)) {
      for (const ch of Array.from(w)) {
        const fam = FIDEL_FAMILIES.find((f) => Array.from(f.chars).includes(ch) || f.labial === ch)
        if (fam && !learned.has(fam.id)) missing.add(fam.id)
      }
    }
  }
  return FIDEL_FAMILIES.filter((f) => missing.has(f.id)).map((f) => f.id)
}

/** Library view: every story tagged { unlocked, stage, missing } and sorted
    unlocked-first by stage, so the next locked story is the next goal. */
export function storyLibrary(learnedIds, stories = STORIES) {
  return stories
    .map((s) => {
      const unlocked = storyDecodable(s, learnedIds)
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

/* ── the starter library (Amharic; DRAFT, see header) ─────────────────── */
/* Page shape: g (Ge'ez), lt (latin), en (meaning), pic (emoji stand-in
   until the owned-illustration pass). Pages are 1-5 words on purpose. */

export const STORIES = [
  {
    id: 'lomi',
    pack: 'am',
    title: { g: 'ሎሚ ለሚሚ', lt: 'lomi le-Mimi', en: 'A Lime for Mimi' },
    pages: [
      { g: 'ሃሎ ሚሚ።', lt: 'halo Mimi.', en: 'Hello, Mimi.', pic: '🐱' },
      { g: 'ሎሚ!', lt: 'lomi!', en: 'A lime!', pic: '🍋' },
      { g: 'ለሚሚ ሎሚ።', lt: 'le-Mimi lomi.', en: 'A lime for Mimi.', pic: '🍋' },
      { g: 'ሙሉ ሎሚ ለሚሚ።', lt: 'mulu lomi le-Mimi.', en: 'A whole lime for Mimi.', pic: '😻' },
      { g: 'ሆ ሆ ሆ!', lt: 'ho ho ho!', en: 'Ho ho ho!', pic: '🎉' },
    ],
  },
  {
    id: 'lemlem',
    pack: 'am',
    title: { g: 'ለምለም', lt: 'Lemlem', en: 'Lemlem' },
    pages: [
      { g: 'ሃሎ ለምለም።', lt: 'halo Lemlem.', en: 'Hello, Lemlem.', pic: '👧🏾' },
      { g: 'ለምለም ሎሚ ለማማ።', lt: 'Lemlem lomi le-mama.', en: 'Lemlem has a lime for Mama.', pic: '🍋' },
      { g: 'ማማ ሞላ ሙሉ።', lt: 'mama mola mulu.', en: 'Mama filled it full.', pic: '🫙' },
      { g: 'ሙሉ ሙሉ ሙሉ!', lt: 'mulu mulu mulu!', en: 'Full, full, full!', pic: '🎉' },
    ],
  },
  {
    id: 'selam-sara',
    pack: 'am',
    title: { g: 'ሰላም ሳራ', lt: 'selam Sara', en: 'Hello, Sara' },
    pages: [
      { g: 'ሰላም ሳራ።', lt: 'selam Sara.', en: 'Hello, Sara.', pic: '👧🏾' },
      { g: 'ሰላም ሙሴ።', lt: 'selam Musse.', en: 'Hello, Musse.', pic: '👦🏾' },
      { g: 'ማር ለሳራ።', lt: 'mar le-Sara.', en: 'Honey for Sara.', pic: '🍯' },
      { g: 'ሙሴ ማር ሰራ።', lt: 'Musse mar sera.', en: 'Musse made honey.', pic: '🐝' },
      { g: 'ማር ማር ማር!', lt: 'mar mar mar!', en: 'Honey, honey, honey!', pic: '😋' },
    ],
  },
  {
    id: 'shiro',
    pack: 'am',
    title: { g: 'ሽሮ ለሌሊት', lt: 'shiro le-lelit', en: 'Shiro for the Night' },
    pages: [
      { g: 'ሽሮ ሽሮ ሽሮ።', lt: 'shiro shiro shiro.', en: 'Shiro, shiro, shiro.', pic: '🍲' },
      { g: 'ማማ ሽሮ ሰራ።', lt: 'mama shiro sera.', en: 'Mama made shiro.', pic: '👩🏾‍🍳' },
      { g: 'ሚሚ ሽሮ ሻለ?', lt: 'Mimi shiro shale?', en: 'Is shiro better, Mimi?', pic: '🐱' },
      { g: 'ሽሮ ለሌሊት ሞላ።', lt: 'shiro le-lelit mola.', en: 'Shiro filled the night.', pic: '🌙' },
      { g: 'ሰላም ሰላም ሌሊት።', lt: 'selam selam lelit.', en: 'Good night, good night.', pic: '😴' },
    ],
  },
  {
    id: 'anbesa-lam',
    pack: 'am',
    title: { g: 'አንበሳ እና ላም', lt: 'anbesa ina lam', en: 'The Lion and the Cow' },
    pages: [
      { g: 'አንበሳ አለ።', lt: 'anbesa ale.', en: 'There is a lion.', pic: '🦁' },
      { g: 'ላም አለች።', lt: 'lam alech.', en: 'There is a cow.', pic: '🐄' },
      { g: 'አንበሳ ሎሚ በላ።', lt: 'anbesa lomi bela.', en: 'The lion ate a lime.', pic: '🍋' },
      { g: 'ላም ቆሎ በላች።', lt: 'lam qolo belach.', en: 'The cow ate qolo.', pic: '🌰' },
      { g: 'አንበሳ እና ላም ተኙ።', lt: 'anbesa ina lam tegnu.', en: 'The lion and the cow slept.', pic: '😴' },
    ],
  },
  {
    id: 'inat-abat',
    pack: 'am',
    title: { g: 'እናት እና አባት', lt: 'inat ina abat', en: 'Mother and Father' },
    pages: [
      { g: 'እናት አለች።', lt: 'inat alech.', en: 'There is Mother.', pic: '👩🏾' },
      { g: 'አባት አለ።', lt: 'abat ale.', en: 'There is Father.', pic: '👨🏾' },
      { g: 'እናት አነበበች።', lt: 'inat anebebech.', en: 'Mother read.', pic: '📖' },
      { g: 'አባት ሰማ።', lt: 'abat sema.', en: 'Father listened.', pic: '👂🏾' },
      { g: 'ቤት ሰላም ሞላ።', lt: 'bet selam mola.', en: 'The house filled with peace.', pic: '🏠' },
    ],
  },
  {
    id: 'abebe-anbebe',
    pack: 'am',
    title: { g: 'አበበ አነበበ', lt: 'Abebe anebebe', en: 'Abebe Reads' },
    pages: [
      { g: 'አበበ ተነሳ።', lt: 'Abebe tenesa.', en: 'Abebe got up.', pic: '🌅' },
      { g: 'አበበ ቃል አነበበ።', lt: 'Abebe qal anebebe.', en: 'Abebe read a word.', pic: '📖' },
      { g: 'እሺ አበበ!', lt: 'ishi Abebe!', en: 'Well done, Abebe!', pic: '⭐' },
      { g: 'አበበ እና እናት ሳቁ።', lt: 'Abebe ina inat saqu.', en: 'Abebe and Mother laughed.', pic: '😄' },
    ],
  },
  {
    id: 'wisha',
    pack: 'am',
    title: { g: 'የሉሉ ውሻ', lt: 'ye-Lulu wisha', en: "Lulu's Dog" },
    pages: [
      { g: 'ሉሉ ውሻ አላት።', lt: 'Lulu wisha alat.', en: 'Lulu has a dog.', pic: '🐶' },
      { g: 'ውሻው ውሃ ወደደ።', lt: 'wishaw wiha wedede.', en: 'The dog loved water.', pic: '💧' },
      { g: 'ውሻው ዘለለ።', lt: 'wishaw zelele.', en: 'The dog jumped.', pic: '🐕' },
      { g: 'ሉሉ ሳቀች።', lt: 'Lulu saqech.', en: 'Lulu laughed.', pic: '😄' },
      { g: 'የሉሉ ውሻ ደስ አለው።', lt: 'ye-Lulu wisha des alew.', en: "Lulu's dog was happy.", pic: '❤️' },
    ],
  },
  {
    id: 'wetet',
    pack: 'am',
    title: { g: 'ወተት ለነብር', lt: 'wetet le-nebir', en: 'Milk for the Leopard' },
    pages: [
      { g: 'ነብር አለ።', lt: 'nebir ale.', en: 'There is a leopard.', pic: '🐆' },
      { g: 'ወተት ወደደ።', lt: 'wetet wedede.', en: 'He loved milk.', pic: '🥛' },
      { g: 'ላም ወተት አለች።', lt: 'lam wetet alech.', en: 'The cow had milk.', pic: '🐄' },
      { g: 'ነብር እና ላም ሰላም ሆኑ።', lt: 'nebir ina lam selam honu.', en: 'The leopard and the cow made peace.', pic: '🤝' },
    ],
  },
  {
    id: 'tsehay',
    pack: 'am',
    title: { g: 'ፀሐይ ወጣች', lt: 'tsehay wetach', en: 'The Sun Rose' },
    pages: [
      { g: 'ፀሐይ ወጣች።', lt: 'tsehay wetach.', en: 'The sun rose.', pic: '☀️' },
      { g: 'ጨረቃ ገባች።', lt: 'chereqa gebach.', en: 'The moon set.', pic: '🌙' },
      { g: 'አበበ ፊደል ጻፈ።', lt: 'Abebe fidel tsafe.', en: 'Abebe wrote fidel.', pic: '✍🏾' },
      { g: 'ጤና ለአበበ!', lt: 'tena le-Abebe!', en: 'Health to Abebe!', pic: '💪🏾' },
      { g: 'ፀሐይ እና ጨረቃ ሰላም።', lt: 'tsehay ina chereqa selam.', en: 'Peace to sun and moon.', pic: '🌗' },
    ],
  },
]
