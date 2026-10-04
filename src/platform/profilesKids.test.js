/* Kids profiles end to end at the storage layer: CRUD with avatar / age /
   grade, strict progress isolation between children for EVERY swapped key,
   migration of a single-user device into profile 1, and a registry guard
   so a new child-progress key cannot silently skip profile swapping. */
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  loadProfiles, activeProfile, profileCount, switchProfile, addProfile, updateProfile, renameProfile, deleteProfile,
  profileStats, nextFreeAvatar, shouldAskWhoOnLaunch, markWhoPicked, SWAP_KEYS, MAX_PROFILES, AVATARS,
} from './profiles'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

const journeyWith = (ids, stars = 3) => JSON.stringify({ version: 1, done: Object.fromEntries(ids.map((id) => [id, { stars }])), collection: { owned: [], worn: {} } })

describe('profile CRUD (name, avatar, age, grade)', () => {
  it('adds a child with an avatar, age and grade, and starts them fresh', () => {
    loadProfiles()
    const p = addProfile('  Abel  ', { avatar: 'zebra', age: 6, grade: '1' })
    expect(p).toMatchObject({ name: 'Abel', avatar: 'zebra', age: 6, grade: '1' })
    expect(activeProfile().id).toBe(p.id)
    expect(localStorage.getItem('fq.nickname')).toBe('Abel')
  })

  it('rejects junk avatar / age / grade instead of storing it', () => {
    loadProfiles()
    const p = addProfile('<b>Hanna</b>', { avatar: 'dragon', age: 99, grade: '12' })
    expect(p.name).toBe('bHanna/b') // angle brackets stripped
    expect(AVATARS).toContain(p.avatar)
    expect(p.age).toBeNull()
    expect(p.grade).toBeNull()
  })

  it('gives each new child the next unused friend by default', () => {
    loadProfiles() // p1 = anbessa
    const p2 = addProfile('B')
    const p3 = addProfile('C')
    expect(new Set([activeProfile().avatar, p2.avatar, loadProfiles().list[0].avatar]).size).toBe(3)
    expect(p3.avatar).toBe(AVATARS[2])
    expect(nextFreeAvatar(AVATARS.map((a) => ({ avatar: a })))).toBe(AVATARS[AVATARS.length % AVATARS.length])
  })

  it('edits a child: avatar, age, grade, and clearing age/grade', () => {
    loadProfiles()
    const id = activeProfile().id
    expect(updateProfile(id, { avatar: 'bee', age: 5, grade: 'KG' })).toBe(true)
    expect(activeProfile()).toMatchObject({ avatar: 'bee', age: 5, grade: 'KG' })
    updateProfile(id, { age: null, grade: null })
    expect(activeProfile()).toMatchObject({ avatar: 'bee', age: null, grade: null })
    expect(updateProfile('nope', { age: 4 })).toBe(false)
  })

  it('renaming a PARKED child sticks after switching back to them', () => {
    localStorage.setItem('fq.nickname', 'Selam')
    const first = loadProfiles().active
    addProfile('Abel')
    renameProfile(first, 'Selamawit')
    switchProfile(first)
    expect(activeProfile().name).toBe('Selamawit')
    expect(localStorage.getItem('fq.nickname')).toBe('Selamawit')
  })

  it('deletes a parked child; the active one only with allowActive; never the last', () => {
    loadProfiles()
    const first = activeProfile().id
    const p2 = addProfile('Abel')
    localStorage.setItem('fq.journey.v1', journeyWith(['learn:le']))
    expect(deleteProfile(p2.id)).toBe(false) // active, default rule kept
    expect(deleteProfile(p2.id, { allowActive: true })).toBe(true)
    expect(profileCount()).toBe(1)
    expect(activeProfile().id).toBe(first)
    // Abel's canonical progress is gone - the device now holds the first child
    expect(localStorage.getItem('fq.journey.v1')).toBeNull()
    expect(deleteProfile(first, { allowActive: true })).toBe(false) // last child stays
  })

  it('caps the household at six', () => {
    expect(MAX_PROFILES).toBe(6)
    loadProfiles()
    for (let i = 1; i < 6; i++) expect(addProfile(`Kid ${i}`)).toBeTruthy()
    expect(addProfile('Seventh')).toBeNull()
    expect(profileCount()).toBe(6)
  })
})

describe('progress isolation between children', () => {
  it('every swapped key round-trips per child with no leaks, in both directions', () => {
    const first = loadProfiles().active
    for (const k of SWAP_KEYS) localStorage.setItem(k, JSON.stringify({ who: 'selam', k }))
    const p2 = addProfile('Abel')
    for (const k of SWAP_KEYS.filter((k) => k !== 'fq.nickname')) expect(localStorage.getItem(k)).toBeNull()
    for (const k of SWAP_KEYS) localStorage.setItem(k, JSON.stringify({ who: 'abel', k }))

    expect(switchProfile(first)).toBe(true)
    for (const k of SWAP_KEYS) expect(JSON.parse(localStorage.getItem(k))).toEqual({ who: 'selam', k })
    expect(switchProfile(p2.id)).toBe(true)
    for (const k of SWAP_KEYS) expect(JSON.parse(localStorage.getItem(k))).toEqual({ who: 'abel', k })
  })

  it('School Path, Story Path / Bible books, Letter Runner and the games stay per child', () => {
    const first = loadProfiles().active
    localStorage.setItem('fq.journey.v1', journeyWith(['learn:ha', 'learn:le', 'quiz:1'])) // School / letter path
    localStorage.setItem('fq.stories.v1', JSON.stringify({ read: { 'bible-creation': 2, 'gr1-01': 1 } })) // Story Path + Bible
    localStorage.setItem('fq2.runner', JSON.stringify({ fed: 40, level: 3 })) // Letter Runner
    localStorage.setItem('fq.echo.v1', JSON.stringify({ level: 3 }))
    const p2 = addProfile('Abel')
    expect(profileStats(first)).toEqual({ steps: 3, stars: 9 })
    expect(profileStats(p2.id)).toEqual({ steps: 0, stars: 0 })
    localStorage.setItem('fq.journey.v1', journeyWith(['learn:ha'], 2))
    expect(profileStats(p2.id)).toEqual({ steps: 1, stars: 2 })
    expect(localStorage.getItem('fq.stories.v1')).toBeNull()
    expect(localStorage.getItem('fq2.runner')).toBeNull()

    switchProfile(first)
    expect(JSON.parse(localStorage.getItem('fq.stories.v1')).read['bible-creation']).toBe(2)
    expect(JSON.parse(localStorage.getItem('fq2.runner')).level).toBe(3)
    expect(profileStats(first)).toEqual({ steps: 3, stars: 9 })
    expect(profileStats(p2.id)).toEqual({ steps: 1, stars: 2 }) // read from Abel's parked slot
  })

  it('device settings (language, sound, theme) are shared, not swapped', () => {
    localStorage.setItem('fq.pack', 'ti')
    localStorage.setItem('fq.sound.v1', '0')
    loadProfiles()
    addProfile('Abel')
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    expect(localStorage.getItem('fq.sound.v1')).toBe('0')
  })
})

describe('migration of a single-user device', () => {
  it('existing progress becomes profile 1 (Anbessa) untouched, keyed nowhere new', () => {
    const before = {
      'fq.journey.v1': journeyWith(['learn:ha', 'mix:ha']),
      'fq.stories.v1': JSON.stringify({ read: { 'bible-noah': 1 } }),
      'fq2.runner': JSON.stringify({ fed: 12, level: 1 }),
      'fq.streak.v1': JSON.stringify({ count: 4, best: 9 }),
      'fq.nickname': 'Selam',
    }
    for (const [k, v] of Object.entries(before)) localStorage.setItem(k, v)
    const reg = loadProfiles()
    expect(reg.list).toHaveLength(1)
    expect(reg.list[0]).toMatchObject({ name: 'Selam', avatar: 'anbessa', age: null, grade: null })
    for (const [k, v] of Object.entries(before)) expect(localStorage.getItem(k)).toBe(v)
    expect(profileStats(reg.active)).toEqual({ steps: 2, stars: 6 })
  })

  it('a registry from before avatars gains avatars without losing anyone', () => {
    localStorage.setItem('fq.profiles.v1', JSON.stringify({ v: 1, active: 'p2', list: [{ id: 'p1', name: 'Selam', created: 1 }, { id: 'p2', name: 'Abel', created: 2 }] }))
    localStorage.setItem('fq.nickname', 'Abel')
    const reg = loadProfiles()
    expect(reg.active).toBe('p2')
    expect(reg.list.map((p) => [p.id, p.name, p.avatar])).toEqual([['p1', 'Selam', 'anbessa'], ['p2', 'Abel', 'kokeb']])
    // written back once, so the next read is stable
    expect(JSON.parse(localStorage.getItem('fq.profiles.v1')).list[1].avatar).toBe('kokeb')
  })

  it('survives a corrupt registry by rebuilding profile 1 from the device', () => {
    localStorage.setItem('fq.profiles.v1', '{not json')
    localStorage.setItem('fq.journey.v1', journeyWith(['learn:ha']))
    const reg = loadProfiles()
    expect(reg.list).toHaveLength(1)
    expect(localStorage.getItem('fq.journey.v1')).toBe(journeyWith(['learn:ha']))
  })
})

describe('"who is playing?" on launch', () => {
  it('asks only on a shared device, once per session', () => {
    loadProfiles()
    expect(shouldAskWhoOnLaunch()).toBe(false) // one child: never
    addProfile('Abel')
    expect(shouldAskWhoOnLaunch()).toBe(true)
    markWhoPicked()
    expect(shouldAskWhoOnLaunch()).toBe(false)
  })
})

/* Guard: every localStorage key the app writes is either per-child (swapped
   on profile change) or a deliberate device-level key listed here. A new
   progress key that is neither fails this test instead of leaking one
   child's progress into another's. */
const DEVICE_KEYS = new Set([
  'fq.profiles.v1', 'fq.profile.', 'fq.pack', 'fq.lang', 'fq-theme', 'fq.theme.v1', 'fq-update-toast',
  'fq.sound.v1', 'fq2.sound', 'fq3.sound', 'fidel-quest-sound', 'fq.voice', 'fq.voice.active',
  'fq.license.v1', 'fq.gate.v1', 'fq.perf.v1', 'fq.quality', 'fq.install.v1',
  'fq.reminder.v1', 'fq.uid.v1', 'fq.crashlog.v1', 'fq.community.v1', 'fq.social.v1', 'fq.class.v1',
  'fq.teacher.v1', 'fq.backup.day', 'fq.postcard.micOk', 'fq.whoPicked',
])
describe('storage-key registry guard', () => {
  it('no child-progress key escapes profile swapping', () => {
    const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(js|jsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(d, e.name)] : []))
    const keys = new Set()
    for (const f of walk(SRC)) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/['"`](fq[0-9]?[.-][A-Za-z0-9_.-]*)['"`]/g)) keys.add(m[1])
    }
    expect(keys.size).toBeGreaterThan(30)
    const loose = [...keys].filter((k) => !SWAP_KEYS.includes(k) && !DEVICE_KEYS.has(k))
    expect(loose).toEqual([])
  })
})
