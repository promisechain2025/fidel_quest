/* ============================================================================
   ETHIOPIC ENGINE — platform layer
   ----------------------------------------------------------------------------
   Joins the language-invariant script table (src/script/ethiopic.js) with a
   language pack (src/packs/*) into the exact family/form shapes the game
   modes have always consumed — so a new language drops in without touching
   any game loop or UI component.

     mergeFamilies(script, pack) -> the legacy FIDEL_FAMILIES shape
     deriveForms / deriveIndexes -> flat forms + lookup maps
     validatePack(script, pack)  -> pure contract check (CI-enforced)

   Pack switching: setActivePack(id) persists the choice and points the
   AudioEngine at the pack's audio; data is module-level by design, so a
   reload applies it (packs are a launch-time choice, not a mid-game one).
   ========================================================================== */

import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { AM_PACK } from '../packs/am'
import { TI_PACK } from '../packs/ti'
import { audio } from './audioEngine'
import { hasOnboarded } from './tutorial'

export const PACKS = Object.freeze({ am: AM_PACK, ti: TI_PACK })
const PACK_KEY = 'fq.pack'
const LANG_KEY = 'fq.lang'
const JOURNEY_KEY = 'fq.journey.v1'

/** The pack named by the device language list, or null when the device is
    in neither Amharic nor Tigrinya (e.g. an en-US diaspora parent). */
export function localePack() {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language || '']
    for (const l of langs) {
      if (/^ti(\b|[-_])/i.test(l)) return 'ti'
      if (/^am(\b|[-_])/i.test(l)) return 'am'
    }
  } catch {
    /* no navigator (SSR/tests) */
  }
  return null
}

/**
 * First-visit default: Tigrinya, unless the device language is explicitly
 * Amharic (owner decision). A soft default only - this function never writes
 * storage. An explicit choice (setActivePack) and a sealed choice
 * (confirmActivePack) always win over a later locale change.
 */
export function detectPreferredPack() {
  return localePack() || 'ti'
}

function readJourneyDoneKeys() {
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    if (!raw) return []
    const done = JSON.parse(raw)?.done
    if (!done || typeof done !== 'object' || Array.isArray(done)) return []
    return Object.keys(done)
  } catch {
    return []
  }
}

/** School Path node ids exist only on the Tigrinya spine. Classic Amharic
    quizzes are numeric (`quiz:1`), so they must not count. */
function journeySuggestsTigrinya(keys = readJourneyDoneKeys()) {
  return keys.some((k) => k.startsWith('blend:') || k.startsWith('find:') || k.startsWith('quiz:u'))
}

/** Before Amharic/Tigrinya were learn-packs only, the app stored that choice
    in fq.lang. getLang() ignores those ids now; the learn pack still honors them. */
function legacyLearnPack() {
  try {
    const l = localStorage.getItem(LANG_KEY)
    if (l === 'am' || l === 'ti') return l
  } catch {
    /* no storage */
  }
  return null
}

/** A choice the family already made: the pack key, a legacy app-text id, or
    School Path progress. Null when the only signal is the soft locale default. */
export function savedPackChoice() {
  try {
    const id = localStorage.getItem(PACK_KEY)
    if (PACKS[id]) return id
  } catch {
    return null
  }
  const legacy = legacyLearnPack()
  if (legacy) return legacy
  if (journeySuggestsTigrinya()) return 'ti'
  return null
}

/** True on a first launch where nobody has chosen a pack and the device
    language did not pick one - the moment to show the language sheet. */
export function needsLanguageChoice() {
  if (savedPackChoice()) return false
  return localePack() === null
}

/** True while the first-launch sheet is still the thing that should record
    the soft default. Sealing earlier would hide that sheet. */
export function languageChoicePending() {
  if (!needsLanguageChoice()) return false
  if (hasOnboarded('langpick')) return false
  if (readJourneyDoneKeys().length > 0) return false
  return true
}

export function getActivePackId() {
  return savedPackChoice() || detectPreferredPack()
}

/** Write the resolved pack so a later locale list cannot replace it.
    Does not reload; callers that change the pack still reload to rebuild
    the module-level family tables. */
export function confirmActivePack(id = getActivePackId()) {
  if (!PACKS[id]) return false
  try {
    localStorage.setItem(PACK_KEY, id)
  } catch {
    /* session-only */
  }
  return true
}

/** English name of the alphabet being learned (share cards, captions). */
export function alphabetLabel(packId = getActivePackId()) {
  return PACKS[packId]?.label || 'Tigrinya'
}

/** Share-sheet and card lines. The learning pack names the alphabet;
    a Tigrinya session must not say Amharic. */
export function shareAlphabetLines(packId = getActivePackId()) {
  const label = alphabetLabel(packId)
  return {
    footer: `Learn the ${label} alphabet - free & offline`,
    share: `I'm learning the ${label} alphabet with Anbessa the lion cub!`,
    nameWithLatin: (latin) => `${latin} - written in the ${label} alphabet with eGeez!`,
    nameBare: `My name in the ${label} alphabet, written with eGeez!`,
  }
}

/** Persist the pack choice and retarget audio; callers reload to apply. */
export function setActivePack(id) {
  if (!PACKS[id]) return false
  try {
    localStorage.setItem(PACK_KEY, id)
  } catch {
    /* session-only */
  }
  audio.setSource({
    audioBase: PACKS[id].audioBase,
    manifestUrl: PACKS[id].manifestUrl,
    override: PACKS[id].audioOverride || null,
  })
  return true
}

/** The script families a pack actually uses: most are shared by every
    language, but a family tagged `only` (e.g. qhe/ቐ, Tigrinya-specific)
    exists solely for the packs it names. */
export function packFamilies(script, pack) {
  return script.families.filter((f) => !f.only || f.only.includes(pack.id))
}

/** Join script + pack into the family shape the modes have always used. */
export function mergeFamilies(script = ETHIOPIC_SCRIPT, pack = PACKS[getActivePackId()]) {
  const twinOfId = {}
  for (const group of pack.twins) {
    for (const id of group.slice(1)) twinOfId[id] = group[0]
  }
  return packFamilies(script, pack).map((f) => {
    const lang = pack.families[f.id] || { name: f.id, consonant: '' }
    const merged = { id: f.id, chars: f.chars, ...lang }
    if (f.labial) merged.labial = f.labial
    if (twinOfId[f.id]) merged.twinOf = (pack.families[twinOfId[f.id]] || {}).name || twinOfId[f.id]
    return merged
  })
}

/** Flat list of vocalized forms for a merged family table. Pure. */
export function deriveForms(families, orders) {
  return families.flatMap((family, familyIndex) =>
    Array.from(family.chars).map((char, i) => ({
      char,
      familyId: family.id,
      familyName: family.name,
      familyIndex,
      order: orders[i].index,
      sound: family.consonant + orders[i].vowel,
      audioKey: `${family.id}-${orders[i].index}`,
    })),
  )
}

export function deriveIndexes(forms) {
  const byChar = new Map()
  const byAudioKey = new Map()
  for (const form of forms) {
    byChar.set(form.char, form)
    byAudioKey.set(form.audioKey, form)
  }
  return { byChar, byAudioKey }
}

/**
 * Contract check for a language pack against the script. Returns
 * { ok, errors } — run in CI so a bad pack fails the build, not the child.
 */
export function validatePack(script, pack) {
  const errors = []
  // Only the families applicable to THIS pack are required of it - and a
  // pack must not define one that is not applicable to it (e.g. qhe in am).
  const applicable = packFamilies(script, pack)
  const ids = new Set(applicable.map((f) => f.id))

  if (!pack.id) errors.push('pack has no id')
  if (!Array.isArray(pack.orders) || pack.orders.length !== script.orderCount) {
    errors.push(`orders must have exactly ${script.orderCount} entries`)
  } else {
    pack.orders.forEach((o, i) => {
      if (o.index !== i + 1) errors.push(`order ${i} has index ${o.index}`)
      if (typeof o.vowel !== 'string') errors.push(`order ${o.index} missing vowel`)
    })
  }

  for (const id of ids) {
    const fam = pack.families[id]
    if (!fam) errors.push(`family ${id} missing from pack`)
    else {
      if (typeof fam.name !== 'string' || !fam.name) errors.push(`family ${id} missing name`)
      if (typeof fam.consonant !== 'string') errors.push(`family ${id} missing consonant`)
    }
  }
  for (const id of Object.keys(pack.families)) {
    if (!ids.has(id)) errors.push(`pack family ${id} not in script`)
  }

  // Twin discipline: every twin id exists; members of a group share a
  // consonant (=> identical sounds in every order); and any two families
  // sharing a consonant MUST be declared twins, or listen-questions become
  // ambiguous for this language.
  const twinGroupOf = {}
  for (const group of pack.twins || []) {
    for (const id of group) {
      if (!ids.has(id)) errors.push(`twin id ${id} not in script`)
      twinGroupOf[id] = group
    }
    const consonants = new Set(group.map((id) => pack.families[id]?.consonant))
    if (consonants.size > 1) errors.push(`twin group [${group}] mixes sounds`)
  }
  const byConsonant = {}
  for (const id of ids) {
    const c = pack.families[id]?.consonant
    if (c === undefined) continue
    ;(byConsonant[c] = byConsonant[c] || []).push(id)
  }
  for (const [c, group] of Object.entries(byConsonant)) {
    if (group.length < 2) continue
    for (const id of group) {
      if (!twinGroupOf[id] || !group.every((g) => twinGroupOf[id].includes(g))) {
        errors.push(`families sharing sound "${c}" (${group}) must be one twin group`)
        break
      }
    }
  }

  // Words must be writable in this pack's script (labialized forms included).
  const scriptChars = new Set(applicable.flatMap((f) => [...Array.from(f.chars), ...(f.labial ? [f.labial] : [])]))
  for (const [id, fam] of Object.entries(pack.families)) {
    if (!fam.word) continue
    for (const ch of Array.from(fam.word.geez)) {
      if (!scriptChars.has(ch)) errors.push(`word for ${id} uses ${ch}, not in script`)
    }
  }

  if (!pack.audioBase) errors.push('pack missing audioBase')
  return { ok: errors.length === 0, errors }
}

/* ── the app's active data, in the exact legacy shapes ── */

export const ACTIVE_PACK = PACKS[getActivePackId()]

// Point the audio singleton at the persisted pack at load time. The default
// AudioEngine config matches the Amharic base, so this only changes anything
// when a non-default pack (e.g. Tigrinya, with its letters/ti/ redirects) was
// chosen on a prior visit — data and audio must agree from the first frame.
audio.setSource({
  audioBase: ACTIVE_PACK.audioBase,
  manifestUrl: ACTIVE_PACK.manifestUrl,
  override: ACTIVE_PACK.audioOverride || null,
})

export const ORDERS = ACTIVE_PACK.orders
export const FIDEL_FAMILIES = Object.freeze(mergeFamilies(ETHIOPIC_SCRIPT, ACTIVE_PACK))
export const ALL_FORMS = deriveForms(FIDEL_FAMILIES, ORDERS)
export const INDEXES = deriveIndexes(ALL_FORMS)
