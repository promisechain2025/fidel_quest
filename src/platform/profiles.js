/* ============================================================================
   PROFILES — per-child progress on one device (the Family Pack feature)
   ----------------------------------------------------------------------------
   Design rule: the ACTIVE child always plays directly on the canonical
   storage keys, so no game module knows profiles exist. A profile is just a
   named parking slot: switching stashes every canonical progress key into
   the outgoing child's slot, loads the incoming child's slot back onto the
   canonical keys, and reloads the app (same reload contract as pack
   switching). Nothing here talks to the network.

     fq.profiles.v1       { v, active, list: [{ id, name, created }] }
     fq.profile.<id>      { data: { <storageKey>: <rawString> } }

   The swap set is the progress registry plus two raw-string keys that the
   JSON-validated snapshot format cannot carry (child nickname, letter
   scope). Slots store raw strings verbatim - they are internal, never
   user-imported, so no validation gate is needed.

   The first profile is created by migration from whatever the device
   already holds, so an existing child loses nothing. Adding a SECOND
   profile is the paid Family Pack feature - enforcement lives in
   familyPack.js; this module only mechanics.
   ========================================================================== */
import { PROGRESS_KEYS } from './progress'
import { progressChanged } from './childModel'

const KEY = 'fq.profiles.v1'
const SLOT_PREFIX = 'fq.profile.'
export const MAX_PROFILES = 6

/** Every storage key that belongs to one child and swaps on profile change. */
export const SWAP_KEYS = Object.freeze([
  ...PROGRESS_KEYS,
  'fq.nickname', // raw string - the child's name
  'fq.scope.v1', // raw string - learned-only vs all-letters choice
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
  } catch {
    /* storage blocked - profiles degrade to single-child */
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
  if (!reg || !Array.isArray(reg.list) || !reg.list.length) {
    reg = { v: 1, active: 'p1', list: [{ id: 'p1', name: nickname(), created: Date.now() }] }
    writeJson(KEY, reg)
  }
  if (!reg.list.some((p) => p.id === reg.active)) reg.active = reg.list[0].id
  const active = reg.list.find((p) => p.id === reg.active)
  const nick = nickname()
  if (nick && active.name !== nick) {
    active.name = nick
    writeJson(KEY, reg)
  }
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
  writeJson(SLOT_PREFIX + profileId, { data })
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
  stashCanonical(reg.active)
  loadSlotToCanonical(toId)
  reg.active = toId
  writeJson(KEY, reg)
  progressChanged()
  return true
}

/** Add a child and make them active with a FRESH start. Entitlement
    (Family Pack) is the caller's job. Returns the new profile, or null. */
export function addProfile(name) {
  const reg = loadProfiles()
  if (reg.list.length >= MAX_PROFILES) return null
  stashCanonical(reg.active)
  const id = newId(reg.list)
  const clean = String(name || '').trim().slice(0, 24)
  reg.list.push({ id, name: clean, created: Date.now() })
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
  const reg = loadProfiles()
  const p = reg.list.find((x) => x.id === id)
  if (!p) return false
  const clean = String(name || '').trim().slice(0, 24)
  p.name = clean
  writeJson(KEY, reg)
  if (id === reg.active) {
    try {
      if (clean) localStorage.setItem('fq.nickname', clean)
      else localStorage.removeItem('fq.nickname')
    } catch {
      /* skip */
    }
  }
  return true
}

/** Delete a NON-active child and their stashed progress. The active child
    cannot be deleted (switch away first) - that keeps the mechanics simple
    and makes destroying the child you are looking at a two-step act. */
export function deleteProfile(id) {
  const reg = loadProfiles()
  if (id === reg.active || !reg.list.some((p) => p.id === id)) return false
  reg.list = reg.list.filter((p) => p.id !== id)
  writeJson(KEY, reg)
  try {
    localStorage.removeItem(SLOT_PREFIX + id)
  } catch {
    /* skip */
  }
  return true
}
