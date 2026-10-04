/* ============================================================================
   PROFILES — per-child progress on one device (1 included, up to 6 with the Family Pack)
   ----------------------------------------------------------------------------
   Design rule: the ACTIVE child always plays directly on the canonical
   storage keys, so no game module knows profiles exist. A profile is just a
   named parking slot: switching stashes every canonical progress key into
   the outgoing child's slot, loads the incoming child's slot back onto the
   canonical keys, and reloads the app (same reload contract as pack
   switching). Nothing here talks to the network.

     fq.profiles.v1       { v, active, list: [{ id, name, avatar, age, grade, created }] }
     fq.profile.<id>      { data: { <storageKey>: <rawString> } }

   avatar is one of AVATARS (the app's own drawn cast and animals); age and
   grade are optional and only ever shown back on this device. A registry
   written before avatars existed is normalised on read (profile 1 becomes
   Anbessa, the rest get the next free friend).

   The swap set is the progress registry plus two raw-string keys that the
   JSON-validated snapshot format cannot carry (child nickname, letter
   scope). Slots store raw strings verbatim - they are internal, never
   user-imported, so no validation gate is needed.

   The first profile is created by migration from whatever the device
   already holds, so an existing child loses nothing. The paid app includes
   ONE child profile; a 2nd-6th child needs the Family Pack in-app purchase
   (platform/familyPack.js needsFamilyPack). addProfile enforces that here,
   at the single choke point, so no screen can bypass it. Children who
   already have a profile are never removed. Nothing in a profile leaves
   the device - no account, no network, no analytics.
   ========================================================================== */
import { PROGRESS_KEYS } from './progress'
import { progressChanged } from './childModel'
import { needsFamilyPack } from './familyPack'

const KEY = 'fq.profiles.v1'
const SLOT_PREFIX = 'fq.profile.'
export const MAX_PROFILES = 6
export const MAX_NAME = 16

/** The avatar choices: the app's own cast first (drawn as SVG), then the
    code-drawn animals from the word-picture library. Ids are stored, so
    only ever append - never rename or reorder meaningfully. */
export const AVATARS = Object.freeze(['anbessa', 'kokeb', 'zebra', 'jibby', 'dog', 'cat', 'bird', 'fish', 'horse', 'camel', 'cow', 'bee'])
export const AGES = Object.freeze([3, 4, 5, 6, 7, 8, 9, 10])
export const GRADES = Object.freeze(['KG', '1', '2', '3', '4', '5', '6'])

const cleanName = (name) => String(name ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
const cleanAvatar = (a) => (AVATARS.includes(a) ? a : null)
const cleanAge = (a) => {
  const n = Number(a)
  return a != null && a !== '' && AGES.includes(n) ? n : null
}
const cleanGrade = (g) => (g != null && GRADES.includes(String(g)) ? String(g) : null)

/** First avatar no other child is using (wraps to the cast when all 12 are taken). */
export function nextFreeAvatar(list = []) {
  const used = new Set(list.map((p) => p.avatar))
  return AVATARS.find((a) => !used.has(a)) || AVATARS[list.length % AVATARS.length]
}

/** Every storage key that belongs to one child and swaps on profile change. */
export const SWAP_KEYS = Object.freeze([
  ...PROGRESS_KEYS,
  'fq.nickname', // raw string - the child's name
  'fq.scope.v1', // raw string - learned-only vs all-letters choice
  'fq.runnerSpeed', // raw string - the child's chosen runner speed
])

function readJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v && typeof v === 'object' ? v : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    /* storage blocked / quota exceeded - report it so callers that are about
       to overwrite canonical progress can abort instead of losing data */
    return false
  }
}

const nickname = () => {
  try {
    return (localStorage.getItem('fq.nickname') || '').trim()
  } catch {
    return ''
  }
}

let nextIdCounter = 1
function newId(existing) {
  let id
  do {
    id = `p${nextIdCounter++}`
  } while (existing.some((p) => p.id === id))
  return id
}

/** The registry, migrating on first touch: the device's existing progress
    becomes profile 1 (named after the stored nickname when there is one).
    Also re-syncs the active entry's name from fq.nickname, which the
    Grown-Ups nickname field may have edited directly. */
export function loadProfiles() {
  let reg = readJson(KEY, null)
  let dirty = false
  if (!reg || !Array.isArray(reg.list) || !reg.list.length) {
    reg = { v: 1, active: 'p1', list: [{ id: 'p1', name: cleanName(nickname()), avatar: AVATARS[0], age: null, grade: null, created: Date.now() }] }
    dirty = true
  }
  // Drop junk entries, then give pre-avatar profiles a friend of their own.
  reg.list = reg.list.filter((p) => p && typeof p.id === 'string' && p.id)
  if (!reg.list.length) reg.list = [{ id: 'p1', name: '', created: Date.now() }]
  const seen = []
  for (const p of reg.list) {
    if (!cleanAvatar(p.avatar)) {
      p.avatar = nextFreeAvatar(seen)
      dirty = true
    }
    if (!('age' in p)) { p.age = null; dirty = true }
    if (!('grade' in p)) { p.grade = null; dirty = true }
    seen.push(p)
  }
  if (!reg.list.some((p) => p.id === reg.active)) {
    reg.active = reg.list[0].id
    dirty = true
  }
  const active = reg.list.find((p) => p.id === reg.active)
  const nick = cleanName(nickname())
  if (nick && active.name !== nick) {
    active.name = nick
    dirty = true
  }
  if (dirty) writeJson(KEY, reg)
  return reg
}

export const activeProfile = () => {
  const reg = loadProfiles()
  return reg.list.find((p) => p.id === reg.active)
}
export const profileCount = () => loadProfiles().list.length

/** Display name with a friendly fallback for the unnamed. */
export function profileLabel(p, fallback = 'Child') {
  return (p?.name || '').trim() || `${fallback} ${p ? p.id.replace(/\D/g, '') : ''}`.trim()
}

/* ── the swap mechanics ─────────────────────────────────────────────── */

// Returns false if the outgoing child's progress could NOT be parked (quota) -
// callers must then NOT overwrite the canonical keys, or that child is lost.
function stashCanonical(profileId) {
  const data = {}
  for (const k of SWAP_KEYS) {
    try {
      const v = localStorage.getItem(k)
      if (v != null) data[k] = v
    } catch {
      /* skip */
    }
  }
  return writeJson(SLOT_PREFIX + profileId, { data })
}

function loadSlotToCanonical(profileId) {
  const slot = readJson(SLOT_PREFIX + profileId, { data: {} })
  const data = slot.data && typeof slot.data === 'object' ? slot.data : {}
  for (const k of SWAP_KEYS) {
    try {
      if (typeof data[k] === 'string') localStorage.setItem(k, data[k])
      else localStorage.removeItem(k)
    } catch {
      /* skip */
    }
  }
}

/** Switch children. Returns true when the caller must reload the app -
    every screen holds canonical-key state, so a reload is the contract. */
export function switchProfile(toId) {
  const reg = loadProfiles()
  if (toId === reg.active || !reg.list.some((p) => p.id === toId)) return false
  // If the outgoing child's progress cannot be parked (storage full), do NOT
  // load the other child over the canonical keys - that would destroy the
  // current child's unsaved-elsewhere progress. Abort the switch instead.
  if (!stashCanonical(reg.active)) return false
  loadSlotToCanonical(toId)
  reg.active = toId
  writeJson(KEY, reg)
  progressChanged()
  return true
}

/** Add a child and make them active with a FRESH start. Returns the new
    profile, or null (cap reached, Family Pack not owned for a 2nd+ child,
    or the current child could not be parked).
    opts: { avatar, age, grade } - all optional. */
export function addProfile(name, opts = {}) {
  const reg = loadProfiles()
  if (reg.list.length >= MAX_PROFILES) return null
  if (needsFamilyPack(reg.list.length)) return null
  // Park the current child before wiping the canonical keys for the new one;
  // if that park fails (storage full) abort so we never erase a child we could
  // not save first.
  if (!stashCanonical(reg.active)) return null
  const id = newId(reg.list)
  const clean = cleanName(name)
  reg.list.push({
    id,
    name: clean,
    avatar: cleanAvatar(opts.avatar) || nextFreeAvatar(reg.list),
    age: cleanAge(opts.age),
    grade: cleanGrade(opts.grade),
    created: Date.now(),
  })
  reg.active = id
  writeJson(KEY, reg)
  // Fresh child: clear every swapped key, then seed the nickname.
  for (const k of SWAP_KEYS) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* skip */
    }
  }
  try {
    if (clean) localStorage.setItem('fq.nickname', clean)
  } catch {
    /* skip */
  }
  progressChanged()
  return reg.list[reg.list.length - 1]
}

export function renameProfile(id, name) {
  return updateProfile(id, { name })
}

/** Edit a child's card: any of { name, avatar, age, grade }. Keys left out
    are untouched; age/grade accept null to clear. Never touches progress. */
export function updateProfile(id, patch = {}) {
  const reg = loadProfiles()
  const p = reg.list.find((x) => x.id === id)
  if (!p) return false
  if ('avatar' in patch && cleanAvatar(patch.avatar)) p.avatar = patch.avatar
  if ('age' in patch) p.age = cleanAge(patch.age)
  if ('grade' in patch) p.grade = cleanGrade(patch.grade)
  if (!('name' in patch)) {
    writeJson(KEY, reg)
    return true
  }
  const clean = cleanName(patch.name)
  p.name = clean
  writeJson(KEY, reg)
  if (id === reg.active) {
    try {
      if (clean) localStorage.setItem('fq.nickname', clean)
      else localStorage.removeItem('fq.nickname')
    } catch {
      /* skip */
    }
  } else {
    // A parked child carries their nickname in the slot; keep it in step, or
    // switching back would restore the OLD name and loadProfiles would sync
    // the registry back to it.
    const slot = readJson(SLOT_PREFIX + id, null)
    if (slot && slot.data && typeof slot.data === 'object') {
      if (clean) slot.data['fq.nickname'] = clean
      else delete slot.data['fq.nickname']
      writeJson(SLOT_PREFIX + id, slot)
    }
  }
  progressChanged()
  return true
}

/** Delete a child and their stashed progress. By default the ACTIVE child
    cannot be deleted (switch away first). The kid-facing manager, which sits
    behind the parental gate, passes { allowActive: true }: the device then
    moves to the first remaining child (their slot loads onto the canonical
    keys) and the deleted child's canonical progress is simply overwritten.
    The last remaining child can never be deleted. Returns true when the
    caller must reload (the active child changed) or false when nothing
    happened; a non-active delete returns true as well - callers that care
    compare ids before calling. */
export function deleteProfile(id, { allowActive = false } = {}) {
  const reg = loadProfiles()
  if (!reg.list.some((p) => p.id === id) || reg.list.length < 2) return false
  if (id === reg.active) {
    if (!allowActive) return false
    const next = reg.list.find((p) => p.id !== id)
    loadSlotToCanonical(next.id)
    reg.active = next.id
  }
  reg.list = reg.list.filter((p) => p.id !== id)
  writeJson(KEY, reg)
  try {
    localStorage.removeItem(SLOT_PREFIX + id)
  } catch {
    /* skip */
  }
  progressChanged()
  return true
}

/* ── per-child summary for the picker ───────────────────────────────── */

/** Read one stored key for a child: the canonical key for the active child,
    their parked slot otherwise. Raw string or null. */
function childRaw(reg, id, key) {
  try {
    if (id === reg.active) return localStorage.getItem(key)
    const slot = readJson(SLOT_PREFIX + id, { data: {} })
    const v = slot.data && slot.data[key]
    return typeof v === 'string' ? v : null
  } catch {
    return null
  }
}

/** { steps, stars } for one child, from their Journey record (School Path
    and the letter path both live there), so the picker can show each child
    their own progress without switching. */
export function profileStats(id, reg = loadProfiles()) {
  let journey = null
  try {
    journey = JSON.parse(childRaw(reg, id, 'fq.journey.v1'))
  } catch {
    journey = null
  }
  const done = journey && typeof journey.done === 'object' && journey.done ? journey.done : {}
  let stars = 0
  for (const rec of Object.values(done)) stars += Math.max(0, Math.min(3, Number(rec?.stars) || 0))
  return { steps: Object.keys(done).length, stars }
}

/* ── "who is playing?" on launch ────────────────────────────────────── */

// Session-scoped (cleared when the app is closed), so the picker greets the
// family on each launch but not again after the reload a switch triggers.
const PICKED_KEY = 'fq.whoPicked'

export function markWhoPicked() {
  try {
    sessionStorage.setItem(PICKED_KEY, '1')
  } catch {
    /* session storage blocked - the picker may simply ask again */
  }
}

/** Ask "who is playing?" at launch only on a shared device (2+ children)
    and only once per app session. A one-child family never sees it. */
export function shouldAskWhoOnLaunch() {
  try {
    if (sessionStorage.getItem(PICKED_KEY) === '1') return false
  } catch {
    /* fall through */
  }
  return loadProfiles().list.length > 1
}
