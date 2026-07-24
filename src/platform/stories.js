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

/* ── the starter library: gentle Bible stories (Amharic) ──────────────── */
/* Page shape: g (Ge'ez), lt (latin), en (meaning), pic (emoji fallback),
   scene ({ bg, items }) rendered by StoryScene as a picture-book panel.
   band (1-4) gates a story to a chapter. Short, kind, easy to understand. */

/* People presets for scenes (skin / hair / cloth, plus robe/veil/beard...). */
const GIRL = { k: 'person', skin: '#c98a5a', hair: '#241812', cloth: '#d9642e', blush: true }
const BOY = { k: 'person', skin: '#b87a44', hair: '#1e140d', cloth: '#c8103e', hairStyle: 'short' }
const MARY = { k: 'person', robe: true, head: 'scarf', headColor: '#4f6bbf', skin: '#c98a5a', cloth: '#6d84c9' }
const JOSEPH = { k: 'person', robe: true, head: 'cloth', headColor: '#e0cda2', beard: true, staff: true, skin: '#a56a38', cloth: '#9a6f3c' }
const SHEPHERD = { k: 'person', robe: true, head: 'cloth', headColor: '#d8c69c', beard: true, staff: true, skin: '#a56a38', cloth: '#7f8a56' }
const JESUS = { k: 'person', robe: true, beard: true, hair: '#3a2a1a', halo: true, skin: '#b87a44', cloth: '#efe7d4', sash: 'rgba(80,110,180,0.5)' }
const NOAH = { k: 'person', robe: true, head: 'cloth', headColor: '#d8c69c', beard: true, beardColor: '#8f857c', staff: true, skin: '#a56a38', cloth: '#8a6a3a' }
const DANIEL = { k: 'person', robe: true, head: 'scarf', headColor: '#5a76c4', beard: true, skin: '#a56a38', cloth: '#6f86c6' }
const JONAH = { k: 'person', robe: true, head: 'cloth', headColor: '#cbb98f', beard: true, skin: '#a56a38', cloth: '#b08a4a' }
const MOTHER = { k: 'person', robe: true, head: 'scarf', headColor: '#9a5a8a', skin: '#c98a5a', cloth: '#b06a9a' }
const PRINCESS = { k: 'person', robe: true, head: 'scarf', headColor: '#d98ac0', skin: '#c98a5a', cloth: '#e0a0d0', blush: true }
const ADAM = { k: 'person', skin: '#a56a38', hair: '#241812', cloth: '#7b9a53', hairStyle: 'short' }
const EVE = { k: 'person', skin: '#c98a5a', hair: '#241812', cloth: '#7b9a53', blush: true }
const DAVID = { k: 'person', skin: '#b87a44', hair: '#3a2a1a', cloth: '#d0a83a', hairStyle: 'short' }
const GOLIATH = { k: 'person', helmet: true, spear: true, beard: true, skin: '#a56a38', cloth: '#6b7280' }

export const STORIES = [
  {
    id: 'creation', pack: 'am', band: 1,
    title: { g: 'ፍጥረት', lt: 'Fitret', en: 'Creation' },
    pages: [
      { g: 'እግዚአብሔር ብርሃንን ፈጠረ።', lt: 'Igziabiher birhanin fetere.', en: 'God made the light.', pic: '💡',
        scene: { bg: 'night', items: [{ k: 'rays', x: 0.5, y: 0.42, s: 0.3 }] } },
      { g: 'ሰማይንና ባሕርን ፈጠረ።', lt: 'semayinna bahirin fetere.', en: 'He made the sky and sea.', pic: '🌊',
        scene: { bg: 'sea', items: [] } },
      { g: 'ፀሐይንና ጨረቃን ፈጠረ።', lt: 'tsehayinna chereqan fetere.', en: 'He made the sun and moon.', pic: '☀️',
        scene: { bg: 'day', items: [{ k: 'moon', x: 0.3, y: 0.3, s: 0.16 }] } },
      { g: 'እንስሳትን ፈጠረ።', lt: 'insisatin fetere.', en: 'He made the animals.', pic: '🦁',
        scene: { bg: 'field', items: [{ k: 'lion', x: 0.3, foot: 0.74, s: 0.3 }, { k: 'cow', x: 0.62, y: 0.54, s: 0.3 }, { k: 'bird', x: 0.82, y: 0.28, s: 0.14 }] } },
      { g: 'ሁሉም መልካም ነበር።', lt: 'hulum melkam neber.', en: 'Everything was good.', pic: '🌈',
        scene: { bg: 'garden', items: [{ k: 'rainbow', x: 0.5, y: 0.62, s: 0.72 }, { k: 'fruitTree', x: 0.76, foot: 0.72, s: 0.36 }] } },
    ],
    q: { en: 'Who made the world?', a: [{ pic: '✨', ok: true }, { pic: '🐄', ok: false }, { pic: '🌧️', ok: false }] },
  },
  {
    id: 'noah', pack: 'am', band: 1,
    title: { g: 'የኖኅ መርከብ', lt: 'Ye-Noh Merkeb', en: "Noah's Ark" },
    pages: [
      { g: 'ኖኅ ትልቅ መርከብ ሰራ።', lt: 'Noh tiliq merkeb sera.', en: 'Noah built a big ark.', pic: '🚢',
        scene: { bg: 'field', items: [{ ...NOAH, x: 0.26, foot: 0.74, s: 0.34 }, { k: 'ark', x: 0.66, y: 0.52, s: 0.42 }] } },
      { g: 'እንስሳት ሁለት ሁለት ገቡ።', lt: 'insisat hulet hulet gebu.', en: 'Animals went in two by two.', pic: '🐘',
        scene: { bg: 'field', items: [{ k: 'ark', x: 0.62, y: 0.5, s: 0.42 }, { k: 'lion', x: 0.16, foot: 0.75, s: 0.24 }, { k: 'cow', x: 0.33, y: 0.6, s: 0.22 }] } },
      { g: 'ትልቅ ዝናብ ዘነበ።', lt: 'tiliq zinab zenebe.', en: 'A big rain fell.', pic: '🌧️',
        scene: { bg: 'sea', items: [{ k: 'ark', x: 0.5, y: 0.5, s: 0.44 }] } },
      { g: 'ኖኅ ተጠበቀ።', lt: 'Noh tetebeqe.', en: 'Noah was kept safe.', pic: '⛵',
        scene: { bg: 'sea', items: [{ k: 'ark', x: 0.5, y: 0.48, s: 0.46 }] } },
      { g: 'ቀስተ ደመና ወጣ።', lt: 'qeste demena weta.', en: 'A rainbow came out.', pic: '🌈',
        scene: { bg: 'sea', items: [{ k: 'rainbow', x: 0.5, y: 0.5, s: 0.8 }, { k: 'ark', x: 0.5, y: 0.6, s: 0.34 }] } },
    ],
    q: { en: 'What came out at the end?', a: [{ pic: '🌈', ok: true }, { pic: '🌙', ok: false }, { pic: '🍋', ok: false }] },
  },
  {
    id: 'nativity', pack: 'am', band: 1,
    title: { g: 'ኢየሱስ ተወለደ', lt: 'Iyesus Tewelede', en: 'Baby Jesus is Born' },
    pages: [
      { g: 'ማርያምና ዮሴፍ ተጓዙ።', lt: 'Maryamna Yosef tegwazu.', en: 'Mary and Joseph traveled.', pic: '🚶',
        scene: { bg: 'field', items: [{ ...MARY, x: 0.28, foot: 0.72, s: 0.34 }, { k: 'donkey', x: 0.53, foot: 0.75, s: 0.32 }, { ...JOSEPH, x: 0.77, foot: 0.72, s: 0.36 }] } },
      { g: 'ማደሪያ ቤት አጡ።', lt: 'maderiya bet atu.', en: 'They found no place to stay.', pic: '🏠',
        scene: { bg: 'night', items: [{ k: 'house', x: 0.52, y: 0.5, s: 0.5 }, { ...MARY, x: 0.28, foot: 0.75, s: 0.26 }, { ...JOSEPH, x: 0.74, foot: 0.75, s: 0.28 }] } },
      { g: 'ሕፃኑ ኢየሱስ ተወለደ።', lt: 'hitsanu Iyesus tewelede.', en: 'Baby Jesus was born.', pic: '👶',
        scene: { bg: 'stable', items: [{ ...MARY, x: 0.25, foot: 0.74, s: 0.34 }, { k: 'manger', x: 0.52, y: 0.58, s: 0.3 }, { ...JOSEPH, x: 0.79, foot: 0.74, s: 0.36 }] } },
      { g: 'ብሩህ ኮከብ በራ።', lt: 'biruh kokeb bera.', en: 'A bright star shone.', pic: '⭐',
        scene: { bg: 'stable', items: [{ k: 'bigStar', x: 0.5, y: 0.24, s: 0.16, tail: true }, { k: 'manger', x: 0.5, y: 0.66, s: 0.3 }] } },
      { g: 'እረኞች ሊያዩት መጡ።', lt: 'eregnoch liyayut metu.', en: 'Shepherds came to see him.', pic: '🐑',
        scene: { bg: 'night', items: [{ k: 'bigStar', x: 0.78, y: 0.22, s: 0.12 }, { ...SHEPHERD, x: 0.32, foot: 0.74, s: 0.36 }, { k: 'sheep', x: 0.62, foot: 0.77, s: 0.26 }, { k: 'sheep', x: 0.8, foot: 0.79, s: 0.2 }] } },
    ],
    q: { en: 'Where was baby Jesus laid?', a: [{ pic: '🛏️', ok: false }, { pic: '🌾', ok: true }, { pic: '🚗', ok: false }] },
  },
  {
    id: 'baby-moses', pack: 'am', band: 2,
    title: { g: 'ሕፃኑ ሙሴ', lt: 'Hitsanu Musse', en: 'Baby Moses' },
    pages: [
      { g: 'ሕፃኑ ሙሴ ተወለደ።', lt: 'hitsanu Musse tewelede.', en: 'Baby Moses was born.', pic: '👶',
        scene: { bg: 'indoor', items: [{ ...MOTHER, x: 0.4, foot: 0.72, s: 0.36 }, { k: 'basket', x: 0.68, y: 0.62, s: 0.26 }] } },
      { g: 'እናቱ በቅርጫት አኖረችው።', lt: 'inatu beqirchat anorechiw.', en: 'His mother set him in a basket.', pic: '🧺',
        scene: { bg: 'sea', items: [{ ...MOTHER, x: 0.24, foot: 0.78, s: 0.3 }, { k: 'basket', x: 0.62, y: 0.6, s: 0.3 }] } },
      { g: 'ቅርጫቱ ተንሳፈፈ።', lt: 'qirchatu tensafefe.', en: 'The basket floated.', pic: '🌊',
        scene: { bg: 'sea', items: [{ k: 'basket', x: 0.5, y: 0.56, s: 0.32 }] } },
      { g: 'የንጉሥ ልጅ አገኘችው።', lt: 'yengus lij agegnechiw.', en: "The king's daughter found him.", pic: '👸',
        scene: { bg: 'sea', items: [{ ...PRINCESS, x: 0.28, foot: 0.78, s: 0.32 }, { k: 'basket', x: 0.64, y: 0.6, s: 0.28 }, { k: 'heart', x: 0.5, y: 0.3, s: 0.1 }] } },
    ],
    q: { en: 'Where was baby Moses kept safe?', a: [{ pic: '🧺', ok: true }, { pic: '🚗', ok: false }, { pic: '🏠', ok: false }] },
  },
  {
    id: 'good-shepherd', pack: 'am', band: 2,
    title: { g: 'መልካሙ እረኛ', lt: 'Melkamu Eregna', en: 'The Good Shepherd' },
    pages: [
      { g: 'እረኛው በጎች ነበሩት።', lt: 'eregnaw begoch neberut.', en: 'The shepherd had sheep.', pic: '🐑',
        scene: { bg: 'field', items: [{ ...SHEPHERD, x: 0.3, foot: 0.74, s: 0.36 }, { k: 'sheep', x: 0.6, foot: 0.77, s: 0.24 }, { k: 'sheep', x: 0.8, foot: 0.79, s: 0.2 }] } },
      { g: 'አንዲት በግ ጠፋች።', lt: 'andit beg tefach.', en: 'One little sheep got lost.', pic: '🐑',
        scene: { bg: 'field', items: [{ k: 'sheep', x: 0.7, foot: 0.78, s: 0.26 }] } },
      { g: 'እረኛው ፈለጋት።', lt: 'eregnaw felegat.', en: 'The shepherd looked for her.', pic: '🔦',
        scene: { bg: 'field', items: [{ ...SHEPHERD, x: 0.4, foot: 0.74, s: 0.36 }] } },
      { g: 'አገኛትና ተሸከማት።', lt: 'agegnatna teshekemat.', en: 'He found and carried her.', pic: '🐑',
        scene: { bg: 'field', items: [{ ...SHEPHERD, x: 0.42, foot: 0.74, s: 0.36 }, { k: 'sheep', x: 0.62, foot: 0.77, s: 0.22 }, { k: 'heart', x: 0.5, y: 0.28, s: 0.1 }] } },
    ],
    q: { en: 'What did the shepherd look for?', a: [{ pic: '🐑', ok: true }, { pic: '🐟', ok: false }, { pic: '⭐', ok: false }] },
  },
  {
    id: 'adam-eve', pack: 'am', band: 2,
    title: { g: 'አዳምና ሔዋን', lt: 'Adamna Hewan', en: 'Adam and Eve' },
    pages: [
      { g: 'እግዚአብሔር አዳምን ፈጠረ።', lt: 'Igziabiher Adamin fetere.', en: 'God made Adam.', pic: '🧑',
        scene: { bg: 'garden', items: [{ ...ADAM, x: 0.5, foot: 0.72, s: 0.34 }] } },
      { g: 'ሔዋንንም ፈጠረ።', lt: 'Hewaninim fetere.', en: 'He made Eve too.', pic: '👩',
        scene: { bg: 'garden', items: [{ ...ADAM, x: 0.36, foot: 0.72, s: 0.32 }, { ...EVE, x: 0.64, foot: 0.72, s: 0.3 }] } },
      { g: 'በአትክልቱ ውስጥ ኖሩ።', lt: 'be-atkiltu wist noru.', en: 'They lived in the garden.', pic: '🌳',
        scene: { bg: 'garden', items: [{ ...ADAM, x: 0.24, foot: 0.72, s: 0.3 }, { k: 'fruitTree', x: 0.55, foot: 0.72, s: 0.4 }, { ...EVE, x: 0.82, foot: 0.72, s: 0.28 }] } },
      { g: 'እግዚአብሔር ይወዳቸዋል።', lt: 'Igziabiher yiwedachewal.', en: 'God loves them.', pic: '❤️',
        scene: { bg: 'garden', items: [{ ...ADAM, x: 0.34, foot: 0.72, s: 0.3 }, { ...EVE, x: 0.66, foot: 0.72, s: 0.28 }, { k: 'heart', x: 0.5, y: 0.26, s: 0.12 }] } },
    ],
  },
  {
    id: 'daniel', pack: 'am', band: 3,
    title: { g: 'ዳንኤልና አንበሶች', lt: 'Danielna Anbesoch', en: 'Daniel and the Lions' },
    pages: [
      { g: 'ዳንኤል እግዚአብሔርን ወደደ።', lt: 'Daniel Igziabihern wedede.', en: 'Daniel loved God.', pic: '🙏',
        scene: { bg: 'indoor', items: [{ ...DANIEL, x: 0.5, foot: 0.72, s: 0.36 }] } },
      { g: 'ወደ ጉድጓድ ጣሉት።', lt: 'wede gudgwad talut.', en: 'They put him in a pit.', pic: '🕳️',
        scene: { bg: 'den', items: [{ ...DANIEL, x: 0.5, foot: 0.72, s: 0.34 }] } },
      { g: 'አንበሶች ነበሩ።', lt: 'anbesoch neberu.', en: 'There were lions.', pic: '🦁',
        scene: { bg: 'den', items: [{ ...DANIEL, x: 0.28, foot: 0.72, s: 0.32 }, { k: 'lion', x: 0.62, foot: 0.74, s: 0.3 }, { k: 'lion', x: 0.85, foot: 0.75, s: 0.24 }] } },
      { g: 'እግዚአብሔር ጠበቀው።', lt: 'Igziabiher tebeqew.', en: 'God kept him safe.', pic: '✨',
        scene: { bg: 'den', items: [{ k: 'rays', x: 0.5, y: 0.3, s: 0.22 }, { ...DANIEL, x: 0.3, foot: 0.72, s: 0.32 }, { k: 'lion', x: 0.68, foot: 0.74, s: 0.28 }] } },
      { g: 'ዳንኤል ደስ አለው።', lt: 'Daniel des alew.', en: 'Daniel was glad.', pic: '❤️',
        scene: { bg: 'field', items: [{ ...DANIEL, x: 0.5, foot: 0.72, s: 0.36 }, { k: 'heart', x: 0.72, y: 0.3, s: 0.12 }] } },
    ],
    q: { en: 'Who kept Daniel safe?', a: [{ pic: '✨', ok: true }, { pic: '🦁', ok: false }, { pic: '🌧️', ok: false }] },
  },
  {
    id: 'jonah', pack: 'am', band: 3,
    title: { g: 'ዮናስና ዓሣ', lt: 'Yonasna Asa', en: 'Jonah and the Big Fish' },
    pages: [
      { g: 'ዮናስ ከእግዚአብሔር ሸሸ።', lt: 'Yonas ke-Igziabiher shesh.', en: 'Jonah ran from God.', pic: '🚶',
        scene: { bg: 'sea', items: [{ ...JONAH, x: 0.3, foot: 0.82, s: 0.32 }] } },
      { g: 'ትልቅ ማዕበል መጣ።', lt: 'tiliq ma’ibel meta.', en: 'A big storm came.', pic: '🌊',
        scene: { bg: 'sea', items: [] } },
      { g: 'ትልቅ ዓሣ ዋጠው።', lt: 'tiliq asa watew.', en: 'A big fish swallowed him.', pic: '🐋',
        scene: { bg: 'sea', items: [{ k: 'bigFish', x: 0.52, y: 0.62, s: 0.5 }] } },
      { g: 'ዮናስ ጸለየ።', lt: 'Yonas tseleye.', en: 'Jonah prayed.', pic: '🙏',
        scene: { bg: 'sea', items: [{ k: 'bigFish', x: 0.5, y: 0.6, s: 0.52 }] } },
      { g: 'ዓሣው መልሶ አወጣው።', lt: 'asaw melso awetaw.', en: 'The fish brought him back.', pic: '🐋',
        scene: { bg: 'sea', items: [{ k: 'bigFish', x: 0.62, y: 0.58, s: 0.42, flip: true }, { ...JONAH, x: 0.24, foot: 0.82, s: 0.3 }] } },
    ],
    q: { en: 'What carried Jonah safely?', a: [{ pic: '🐋', ok: true }, { pic: '🦁', ok: false }, { pic: '🐑', ok: false }] },
  },
  {
    id: 'david', pack: 'am', band: 4,
    title: { g: 'ዳዊትና ጎልያድ', lt: 'Dawitna Golyad', en: 'David and Goliath' },
    pages: [
      { g: 'ዳዊት ትንሽ ልጅ ነበር።', lt: 'Dawit tinish lij neber.', en: 'David was a small boy.', pic: '🧒',
        scene: { bg: 'field', items: [{ ...DAVID, x: 0.44, foot: 0.72, s: 0.3 }, { k: 'sheep', x: 0.72, foot: 0.77, s: 0.22 }] } },
      { g: 'ጎልያድ ትልቅ ወታደር ነበር።', lt: 'Golyad tiliq wetader neber.', en: 'Goliath was a big soldier.', pic: '🗡️',
        scene: { bg: 'field', items: [{ ...GOLIATH, x: 0.56, foot: 0.72, s: 0.46 }] } },
      { g: 'ዳዊት እግዚአብሔርን ታመነ።', lt: 'Dawit Igziabihern tamene.', en: 'David trusted God.', pic: '🙏',
        scene: { bg: 'field', items: [{ ...DAVID, x: 0.36, foot: 0.72, s: 0.3 }, { ...GOLIATH, x: 0.74, foot: 0.72, s: 0.44 }] } },
      { g: 'ዳዊት ድል ነሳ።', lt: 'Dawit dil nesa.', en: 'David won.', pic: '🎉',
        scene: { bg: 'field', items: [{ ...DAVID, x: 0.5, foot: 0.72, s: 0.32 }, { k: 'heart', x: 0.74, y: 0.3, s: 0.12 }] } },
    ],
    q: { en: 'Who did David trust?', a: [{ pic: '✨', ok: true }, { pic: '🗡️', ok: false }, { pic: '🐑', ok: false }] },
  },
  {
    id: 'jesus-children', pack: 'am', band: 4,
    title: { g: 'ኢየሱስና ልጆች', lt: 'Iyesusna Lijoch', en: 'Jesus and the Children' },
    pages: [
      { g: 'ኢየሱስ ሰዎችን አስተማረ።', lt: 'Iyesus sewochin astemare.', en: 'Jesus taught the people.', pic: '🧎',
        scene: { bg: 'field', items: [{ ...JESUS, x: 0.5, foot: 0.72, s: 0.38 }] } },
      { g: 'ልጆች ወደ እሱ መጡ።', lt: 'lijoch wede esu metu.', en: 'Children came to him.', pic: '🧒',
        scene: { bg: 'field', items: [{ ...JESUS, x: 0.34, foot: 0.72, s: 0.38 }, { ...GIRL, x: 0.66, foot: 0.73, s: 0.24 }, { ...BOY, x: 0.84, foot: 0.74, s: 0.22 }] } },
      { g: 'ሰዎች ሊከለክሏቸው ፈለጉ።', lt: 'sewoch likelekilwachew felegu.', en: 'People tried to stop them.', pic: '🙅',
        scene: { bg: 'field', items: [{ ...JESUS, x: 0.3, foot: 0.72, s: 0.36 }, { ...GIRL, x: 0.7, foot: 0.73, s: 0.24 }] } },
      { g: '"ልጆች ይምጡ" አለ።', lt: '"lijoch yimtu" ale.', en: 'He said, "Let the children come."', pic: '🤗',
        scene: { bg: 'field', items: [{ ...JESUS, x: 0.32, foot: 0.72, s: 0.38, wave: true }, { ...GIRL, x: 0.64, foot: 0.73, s: 0.24 }, { ...BOY, x: 0.84, foot: 0.74, s: 0.22 }] } },
      { g: 'ልጆችን ባረካቸው።', lt: 'lijochin barekachew.', en: 'He blessed the children.', pic: '❤️',
        scene: { bg: 'field', items: [{ ...JESUS, x: 0.34, foot: 0.72, s: 0.38 }, { ...GIRL, x: 0.66, foot: 0.73, s: 0.24 }, { k: 'heart', x: 0.5, y: 0.24, s: 0.12 }] } },
    ],
    q: { en: 'Who welcomed the children?', a: [{ pic: '❤️', ok: true }, { pic: '🦁', ok: false }, { pic: '🌧️', ok: false }] },
  },
]
