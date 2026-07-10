/* ============================================================================
   THE JOURNEY  (Pillars 1 + 3)  -  pure, data-derived, deterministic
   ----------------------------------------------------------------------------
   Fidel Quest used to present nine sibling screens and three separate
   progress blobs. This module is the single spine that replaces them: one
   ordered array of typed nodes (JOURNEY), one progress record
   (fq.journey.v1), and one derived "next step" (nextNode). Every screen is
   reached by opening a node; there is exactly one obvious thing to do next.

   No wall clock, no Math.random - buildJourney() is a pure function of the
   fidel data, exactly like LearnLetters' buildStones(). Rewards (P3) are
   assigned here at build time so a completed node always grants the same,
   authored collectible - determinism, no loot RNG.
   ========================================================================== */

import { FIDEL_FAMILIES } from './platform/ethiopic'

export const NodeKind = Object.freeze({
  LEARN: 'learn', // one family, the six-phase Letter Steps lesson
  MIX: 'mix', // shuffle challenge over families mastered so far in the chapter
  QUIZ: 'quiz', // BOSS node -> the audio matching Lesson (a level)
  ARCADE: 'arcade', // GATEWAY  -> a 3D Runner leg / Skylands island
})

// One earned 3D gateway per chapter (P1 decision: no free-play menu; a child
// scrolls back up the path to replay an unlocked gateway).
export const ARCADE_GATEWAYS = [
  { mode: 'runner', theme: 'lalibela', label: 'Lalibela Run' },
  { mode: 'skylands', island: 1, label: 'Aksum Skyland' },
  { mode: 'runner', theme: 'simien', label: 'Simien Run' },
  { mode: 'skylands', island: 4, label: 'Massawa Skyland' },
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
]
export const REWARD_BY_ID = new Map(REWARD_TABLE.map((r) => [r.id, r]))
export const WEARABLE_SLOTS = Object.freeze(['hat', 'scarf', 'cape'])

/* ── The free taste (paid app, expired trial) ─────────────────────────
   After the free trial ends, the app narrows to a taste: the first two
   letter families and the chapter-1 arcade gateway (a few game steps).
   Everything else pops the buy-or-gift ask. Practice surfaces over
   already-learned letters (warm-up, Star Practice, Daily Hunt) stay open -
   we limit NEW content, we never confiscate what the child earned. */
export const FREE_FAMILIES = Object.freeze(['ha', 'le'])

export function isNodeFree(node) {
  if (!node) return false
  if (node.kind === NodeKind.LEARN) return FREE_FAMILIES.includes(node.familyId)
  if (node.kind === NodeKind.MIX) return (node.families || []).every((f) => FREE_FAMILIES.includes(f))
  if (node.kind === NodeKind.ARCADE) return node.chapter === 1
  return false // quiz bosses and vowel laps are part of the paid app
}

/** Family ids for chapter c (0..3): the 8/8/8/9 groups. */
export function chapterFamilies(c) {
  return FIDEL_FAMILIES.slice(c * 8, c === 3 ? 33 : c * 8 + 8).map((f) => f.id)
}

/* The ordered path. Each chapter is:
   [family, family, mix, family, mix, ... , QUIZ boss, ARCADE gateway].
   Then a second lap of vowel QUIZ bosses (levels 5-8) reuses the families. */
export function buildJourney() {
  const nodes = []
  const push = (n) => nodes.push({ ...n, index: nodes.length, reward: REWARD_TABLE[nodes.length % REWARD_TABLE.length] })
  for (let c = 0; c < 4; c++) {
    const chapter = c + 1
    const fams = chapterFamilies(c)
    fams.forEach((fid, i) => {
      push({ id: `learn:${fid}`, kind: NodeKind.LEARN, chapter, familyId: fid })
      if (i > 0) push({ id: `mix:${fid}`, kind: NodeKind.MIX, chapter, families: fams.slice(0, i + 1) })
    })
    push({ id: `quiz:${chapter}`, kind: NodeKind.QUIZ, chapter, levelId: `level-${chapter}` })
    push({ id: `arcade:${chapter}`, kind: NodeKind.ARCADE, chapter, gateway: ARCADE_GATEWAYS[c] })
  }
  for (let c = 0; c < 4; c++) {
    push({ id: `vowel:${c + 1}`, kind: NodeKind.QUIZ, chapter: 5, levelId: `level-${c + 5}`, vowel: true })
  }
  return nodes
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

/** Child-facing progress for the share card and Closet. */
export function progressStats(p) {
  const families = JOURNEY.filter((n) => n.kind === NodeKind.LEARN && p.done[n.id]).length
  return { families, totalFamilies: 33, forms: families * 7, totalForms: 231, nodes: Object.keys(p.done || {}).length }
}

/** The family ids the child has actually learned (completed LEARN nodes), in
   journey order. This is the set the games scope to by default so a child only
   practises letters they have met; games offer an "all letters" override. */
export function learnedFamilyIds(p) {
  return JOURNEY.filter((n) => n.kind === NodeKind.LEARN && p?.done?.[n.id]).map((n) => n.familyId)
}
