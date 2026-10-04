/* ============================================================================
   THE JOURNEY  (Pillars 1 + 3)  -  pure, data-derived, deterministic
   ----------------------------------------------------------------------------
   eGeez used to present nine sibling screens and three separate
   progress blobs. This module is the single spine that replaces them: one
   ordered array of typed nodes (JOURNEY), one progress record
   (fq.journey.v1), and one derived "next step" (nextNode). Every screen is
   reached by opening a node; there is exactly one obvious thing to do next.

   No wall clock, no Math.random - buildJourney() is a pure function of the
   fidel data, exactly like LearnLetters' buildStones(). Rewards (P3) are
   assigned here at build time so a completed node always grants the same,
   authored collectible - determinism, no loot RNG.
   ========================================================================== */

import { FIDEL_FAMILIES, getActivePackId } from './platform/ethiopic'
import { progressChanged } from './platform/childModel'
import { STORIES } from './platform/stories'
import {
  SCHOOL_PATH_PACK_ID,
  SCHOOL_PATH_UNITS,
  quizSpecForFamilies,
  schoolPathActive,
  schoolPathBands,
  blendWordsReadyAtUnit,
  playableMidLetterTargets,
} from './data/schoolPathGr1'
import { SCHOOL_PATH_STORY_COUNT } from './data/schoolPathGr1Stories'

/* Story nodes exist only when that pack ships stories. Pack switching
   reloads the app, so the module-level JOURNEY matches the active pack. */
const packHasStories = (packId) =>
  STORIES.some((s) => s.pack === packId) ||
  (packId === SCHOOL_PATH_PACK_ID && SCHOOL_PATH_STORY_COUNT > 0)

export const NodeKind = Object.freeze({
  LEARN: 'learn', // one family, the six-phase Letter Steps lesson
  MIX: 'mix', // shuffle challenge over families mastered so far in the chapter
  QUIZ: 'quiz', // BOSS node -> the audio matching Lesson (a level)
  ARCADE: 'arcade', // GATEWAY  -> a 3D Runner leg / Skylands island
  STORY: 'story', // read a decodable story - real reading ON the spine
  REVIEW: 'review', // service the spaced-repetition backlog ON the spine
  BLEND: 'blend', // School Path Word Build — syllable tiles from blend words
  FIND: 'find', // School Path Find-the-fidel — mid or final letter in a word
})

// One earned 3D gateway per chapter (P1 decision: no free-play menu; a child
// scrolls back up the path to replay an unlocked gateway).
export const ARCADE_GATEWAYS = [
  { mode: 'runner', theme: 'lalibela', label: 'Lalibela Run' },
  { mode: 'catch', island: 1, label: 'Aksum Harvest' },
  { mode: 'runner', theme: 'simien', label: 'Simien Run' },
  { mode: 'catch', island: 4, label: 'Massawa Harvest' },
]

/* Rewards are Anbessa wearables only for now (P3 decision: defer the den).
   Slots: hat | scarf | cape. The table is curated and ordered so early
   nodes hand out instantly-wearable items. It is intentionally shorter than
   the node count - grantReward is idempotent, so the collection saturates at
   the table's size rather than duping. Art for each id is drawn in code in
   the wardrobe compositor (no image assets). */
export const REWARD_TABLE = [
  { id: 'hat-straw', slot: 'hat', name: 'Straw Hat' },
  { id: 'scarf-red', slot: 'scarf', name: 'Red Scarf' },
  { id: 'cape-green', slot: 'cape', name: 'Green Cape' },
  { id: 'hat-cap', slot: 'hat', name: 'Blue Cap' },
  { id: 'scarf-gold', slot: 'scarf', name: 'Gold Scarf' },
  { id: 'cape-star', slot: 'cape', name: 'Star Cape' },
  { id: 'hat-crown', slot: 'hat', name: 'Gold Crown' },
  { id: 'scarf-blue', slot: 'scarf', name: 'Sky Scarf' },
  { id: 'cape-royal', slot: 'cape', name: 'Royal Cape' },
  // Second lap of the table (the 9 originals saturated against ~80 nodes,
  // leaving chapters 3-4 a reward drought of silent duplicates).
  { id: 'scarf-green', slot: 'scarf', name: 'Meadow Scarf' },
  { id: 'cape-sunset', slot: 'cape', name: 'Sunset Cape' },
  { id: 'scarf-plum', slot: 'scarf', name: 'Plum Scarf' },
  { id: 'cape-sky', slot: 'cape', name: 'Sky Cape' },
  { id: 'scarf-rose', slot: 'scarf', name: 'Rose Scarf' },
  { id: 'cape-night', slot: 'cape', name: 'Night Cape' },
]
export const REWARD_BY_ID = new Map(REWARD_TABLE.map((r) => [r.id, r]))
export const WEARABLE_SLOTS = Object.freeze(['hat', 'scarf', 'cape'])

/** Family ids for chapter c (0..3): groups of 8, the last chapter taking
    the remainder (9 in Amharic, 10 in Tigrinya with its extra ቐ family).
    The Tigrinya School Path does not use these slices — it follows
    SCHOOL_PATH_UNITS. This helper stays for the classic (Amharic) spine. */
export function chapterFamilies(c) {
  return FIDEL_FAMILIES.slice(c * 8, c === 3 ? FIDEL_FAMILIES.length : c * 8 + 8).map((f) => f.id)
}

function pushNode(nodes, n) {
  nodes.push({ ...n, index: nodes.length, reward: REWARD_TABLE[nodes.length % REWARD_TABLE.length] })
}

/* Classic spine (Amharic, and any pack without School Path). Each chapter:
   [family, family, mix, family, mix, ... , QUIZ boss, ARCADE gateway].
   Then a second lap of vowel QUIZ bosses (levels 5-8) reuses the families. */
function buildClassicJourney(packId) {
  const nodes = []
  const stories = packHasStories(packId)
  for (let c = 0; c < 4; c++) {
    const chapter = c + 1
    const fams = chapterFamilies(c)
    fams.forEach((fid, i) => {
      pushNode(nodes, { id: `learn:${fid}`, kind: NodeKind.LEARN, chapter, familyId: fid })
      if (i > 0) pushNode(nodes, { id: `mix:${fid}`, kind: NodeKind.MIX, chapter, families: fams.slice(0, i + 1) })
    })
    pushNode(nodes, { id: `quiz:${chapter}`, kind: NodeKind.QUIZ, chapter, levelId: `level-${chapter}` })
    // Reading sits ON the motivational spine, not in a side pocket: after
    // each boss the child reads a real story before earning the arcade.
    // Only for packs that ship stories (Tigrinya's path must never block
    // on an empty library).
    if (stories) pushNode(nodes, { id: `story:${chapter}`, kind: NodeKind.STORY, chapter })
    pushNode(nodes, { id: `arcade:${chapter}`, kind: NodeKind.ARCADE, chapter, gateway: ARCADE_GATEWAYS[c] })
    // The chapter closes with a review leg: the memory schedule's due
    // forms get a guaranteed traffic lane on the path itself, not just
    // the optional daily warm-up (the SRS was scheduled but starved).
    pushNode(nodes, { id: `review:${chapter}`, kind: NodeKind.REVIEW, chapter })
  }
  for (let c = 0; c < 4; c++) {
    pushNode(nodes, { id: `vowel:${c + 1}`, kind: NodeKind.QUIZ, chapter: 5, levelId: `level-${c + 5}`, vowel: true })
  }
  return nodes
}

/* Tigrinya School Path. LEARN nodes follow the unit family list (each
   family once). After the unit's families, Word Build and Find-the-fidel
   sit before the QUIZ boss (echo lines stay data-only). Units are grouped
   into the same four arcade chapters so Runner/Catch gateways stay at
   four — Play practice still uses learned families only. */
function buildSchoolPathJourney() {
  const nodes = []
  const stories = packHasStories(SCHOOL_PATH_PACK_ID)
  const bands = schoolPathBands(SCHOOL_PATH_UNITS, ARCADE_GATEWAYS.length)
  bands.forEach((band, c) => {
    const chapter = c + 1
    band.forEach((unit) => {
      const fams = unit.familyIds
      fams.forEach((fid, i) => {
        pushNode(nodes, {
          id: `learn:${fid}`,
          kind: NodeKind.LEARN,
          chapter,
          unitId: unit.id,
          unitIndex: unit.index,
          familyId: fid,
        })
        if (i > 0) {
          pushNode(nodes, {
            id: `mix:${fid}`,
            kind: NodeKind.MIX,
            chapter,
            unitId: unit.id,
            unitIndex: unit.index,
            families: fams.slice(0, i + 1),
          })
        }
      })
      const blendWords = blendWordsReadyAtUnit(unit)
      if (blendWords.length) {
        pushNode(nodes, {
          id: `blend:${unit.id}`,
          kind: NodeKind.BLEND,
          chapter,
          unitId: unit.id,
          unitIndex: unit.index,
          families: fams.slice(),
          words: blendWords,
        })
      }
      const findTargets = playableMidLetterTargets(unit)
      if (findTargets.length) {
        pushNode(nodes, {
          id: `find:${unit.id}`,
          kind: NodeKind.FIND,
          chapter,
          unitId: unit.id,
          unitIndex: unit.index,
          families: fams.slice(),
          targets: findTargets,
        })
      }
      const quiz = quizSpecForFamilies(fams, {
        levelId: `unit-${unit.id}`,
        title: unit.titleEn,
        unitId: unit.id,
        unitIndex: unit.index,
      })
      pushNode(nodes, {
        id: `quiz:${unit.id}`,
        kind: NodeKind.QUIZ,
        chapter,
        unitId: unit.id,
        unitIndex: unit.index,
        levelId: quiz.id,
        families: fams.slice(),
        quiz,
      })
    })
    if (stories) pushNode(nodes, { id: `story:${chapter}`, kind: NodeKind.STORY, chapter })
    pushNode(nodes, { id: `arcade:${chapter}`, kind: NodeKind.ARCADE, chapter, gateway: ARCADE_GATEWAYS[c] })
    pushNode(nodes, { id: `review:${chapter}`, kind: NodeKind.REVIEW, chapter })
  })
  bands.forEach((band, c) => {
    const families = band.flatMap((u) => u.familyIds)
    const quiz = quizSpecForFamilies(families, {
      vowel: true,
      levelId: `level-${c + 5}`,
      title: 'Vowel Magic',
    })
    pushNode(nodes, {
      id: `vowel:${c + 1}`,
      kind: NodeKind.QUIZ,
      chapter: 5,
      levelId: quiz.id,
      vowel: true,
      families,
      quiz,
    })
  })
  return nodes
}

/* The ordered path. packId defaults to the active pack so a reload after
   setActivePack rebuilds the matching spine. Pass 'ti' or 'am' in tests. */
export function buildJourney(packId = getActivePackId()) {
  if (schoolPathActive(packId)) return buildSchoolPathJourney()
  return buildClassicJourney(packId)
}
export const JOURNEY = buildJourney()
export const NODE_BY_ID = new Map(JOURNEY.map((n) => [n.id, n]))

/* ── Progress record: fq.journey.v1 ──────────────────────────────────── */
const JOURNEY_KEY = 'fq.journey.v1'

const emptyCollection = () => ({ owned: [], worn: {} })
const emptyProgress = () => ({ version: 1, done: {}, collection: emptyCollection() })

function safeParse(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

export function loadJourney() {
  const raw = safeParse(JOURNEY_KEY, null)
  if (raw && raw.version === 1 && raw.done) {
    return { version: 1, done: raw.done, collection: { ...emptyCollection(), ...(raw.collection || {}) } }
  }
  return migrateLegacyProgress()
}
export function saveJourney(p) {
  try {
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(p))
  } catch {
    /* session-only; the app still works, progress just is not persisted */
  }
  progressChanged()
}

/* One-time port of the pre-refactor blobs so returning children keep their
   place. Reads Letter Steps mastery (fq.learn.v1) and quiz stars
   (fq2.progress); legacy keys are left intact as a safety net. Pure given
   storage - no clock, no RNG. */
export function migrateLegacyProgress() {
  const learn = safeParse('fq.learn.v1', { mastered: [], mixes: [] }) || { mastered: [], mixes: [] }
  const levels = safeParse('fq2.progress', {}) || {}
  const done = {}
  for (const fid of learn.mastered || []) if (NODE_BY_ID.has(`learn:${fid}`)) done[`learn:${fid}`] = { stars: 3 }
  for (const mid of learn.mixes || []) {
    const fid = String(mid).replace(/^mix-/, '')
    if (NODE_BY_ID.has(`mix:${fid}`)) done[`mix:${fid}`] = { stars: 3 }
  }
  for (const [levelId, rec] of Object.entries(levels)) {
    if (!rec || !rec.stars) continue
    const n = Number(String(levelId).split('-')[1])
    const nodeId = n >= 5 ? `vowel:${n - 4}` : `quiz:${n}`
    if (NODE_BY_ID.has(nodeId)) done[nodeId] = { stars: rec.stars }
  }
  const p = { version: 1, done, collection: emptyCollection() }
  // Backfill wearables for content the child already finished, so a returning
  // player is not left with an empty closet they can never fill.
  for (const nodeId of Object.keys(done)) grantReward(p, nodeId)
  saveJourney(p)
  return p
}

/* ── Unlock / next-step (strict prefix, like stoneUnlocked) ───────────── */
export const isDone = (p, nodeId) => !!p.done[nodeId]
export const nodeUnlockedAt = (p, index) => JOURNEY.slice(0, index).every((n) => p.done[n.id])
export const nodeUnlocked = (p, node) => nodeUnlockedAt(p, node.index)

/** THE single obvious next step: first not-yet-done node. null when finished. */
export function nextNode(p) {
  return JOURNEY.find((n) => !p.done[n.id]) ?? null
}
export const journeyComplete = (p) => JOURNEY.every((n) => p.done[n.id])

/* ── Rewards (P3) ─────────────────────────────────────────────────────── */
/** Grant a node's collectible; auto-equip the first item of each slot.
    Mutates + returns the passed progress object. Idempotent. */
export function grantReward(p, nodeId) {
  const node = NODE_BY_ID.get(nodeId)
  if (!node?.reward) return p
  const c = p.collection || (p.collection = emptyCollection())
  if (!c.owned.includes(node.reward.id)) c.owned = [...c.owned, node.reward.id]
  if (node.reward.slot && c.worn[node.reward.slot] == null) {
    c.worn = { ...c.worn, [node.reward.slot]: node.reward.id }
  }
  return p
}

/** Grant a wearable by id (e.g. from the Daily Gift), auto-equipping an empty
    slot. Immutable + persisted. Idempotent on `owned`. */
export function grantWearable(p, id) {
  const item = REWARD_BY_ID.get(id)
  if (!item) return p
  const owned = p.collection?.owned || []
  const worn = p.collection?.worn || {}
  const next = {
    ...p,
    collection: {
      ...(p.collection || emptyCollection()),
      owned: owned.includes(id) ? owned : [...owned, id],
      worn: worn[item.slot] == null ? { ...worn, [item.slot]: id } : worn,
    },
  }
  saveJourney(next)
  return next
}

/** Mark a node done, grant its reward, persist. Returns the new progress. */
export function completeNode(p, nodeId, stars = 3) {
  const next = { ...p, done: { ...p.done, [nodeId]: { stars: Math.max(stars, p.done[nodeId]?.stars ?? 0) } }, collection: { ...(p.collection || emptyCollection()) } }
  grantReward(next, nodeId)
  saveJourney(next)
  return next
}

/** Reward objects currently worn, for the canvas compositor (Step 3). */
export function wornLayers(collection) {
  const worn = collection?.worn || {}
  return WEARABLE_SLOTS.map((slot) => REWARD_BY_ID.get(worn[slot])).filter(Boolean)
}

/** Owned wearables in a slot (for the Closet). */
export function ownedInSlot(collection, slot) {
  const owned = collection?.owned || []
  return REWARD_TABLE.filter((r) => r.slot === slot && owned.includes(r.id))
}

/** Equip an item, or tap the worn one to take it off. Persists. Pure-ish. */
export function equipItem(p, slot, id) {
  const worn = { ...(p.collection?.worn || {}) }
  worn[slot] = worn[slot] === id ? null : id
  const next = { ...p, collection: { ...(p.collection || emptyCollection()), worn } }
  saveJourney(next)
  return next
}

/** If finishing nodeId completed its whole chapter, return that chapter
    number (a peak-pride moment worth celebrating + prompting a share). */
export function chapterComplete(p, nodeId) {
  const node = NODE_BY_ID.get(nodeId)
  if (!node) return null
  const chapterNodes = JOURNEY.filter((n) => n.chapter === node.chapter)
  return chapterNodes.every((n) => p.done[n.id]) ? node.chapter : null
}

/** What finishing nodeId should celebrate, comparing progress before (prev)
    and after (next). Only NEW things count: a chapter that just became
    complete (not a replay of an already-done node) and a reward the child
    did not own yet. Returns { chapter, reward } or null. */
export function nodeDoneCelebration(prev, next, nodeId) {
  const node = NODE_BY_ID.get(nodeId)
  if (!node) return null
  const reward = node.reward && !(prev.collection?.owned ?? []).includes(node.reward.id) ? node.reward : null
  const wasDone = !!prev.done?.[nodeId]
  const chapter = !wasDone && !chapterComplete(prev, nodeId) ? chapterComplete(next, nodeId) : null
  if (chapter) return { chapter, reward }
  return reward ? { chapter: null, reward } : null
}

/** Child-facing progress for the share card and Closet. */
export function progressStats(p) {
  const families = JOURNEY.filter((n) => n.kind === NodeKind.LEARN && p.done[n.id]).length
  return {
    families,
    totalFamilies: FIDEL_FAMILIES.length,
    forms: families * 7,
    totalForms: FIDEL_FAMILIES.length * 7,
    nodes: Object.keys(p.done || {}).length,
  }
}

/** The family ids the child has actually learned (completed LEARN nodes), in
   journey order. This is the set the games scope to by default so a child only
   practises letters they have met; games offer an "all letters" override.
   Runner, Catch, and the other arcade games read this list — on the School
   Path that is the unlocked unit prefix, not the whole abugida.
   `nodes` defaults to the active spine; tests pass a built journey. */
export function learnedFamilyIds(p, nodes = JOURNEY) {
  return nodes.filter((n) => n.kind === NodeKind.LEARN && p?.done?.[n.id]).map((n) => n.familyId)
}
