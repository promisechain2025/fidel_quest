import { describe, it, expect, beforeEach } from 'vitest'
import { loadProfiles, activeProfile, profileCount, switchProfile, addProfile, renameProfile, deleteProfile, profileLabel, SWAP_KEYS, MAX_PROFILES } from './profiles'
import { PROGRESS_KEYS } from './progress'

beforeEach(() => localStorage.clear())

describe('profiles (per-child progress slots)', () => {
  it('migrates the existing device into profile 1 without touching its data', () => {
    localStorage.setItem('fq.journey.v1', JSON.stringify({ done: ['ha'] }))
    localStorage.setItem('fq.nickname', 'Selam')
    const reg = loadProfiles()
    expect(reg.list).toHaveLength(1)
    expect(reg.active).toBe(reg.list[0].id)
    expect(activeProfile().name).toBe('Selam')
    expect(JSON.parse(localStorage.getItem('fq.journey.v1'))).toEqual({ done: ['ha'] })
  })

  it('swap set covers the whole progress registry plus the raw-string keys', () => {
    for (const k of PROGRESS_KEYS) expect(SWAP_KEYS).toContain(k)
    expect(SWAP_KEYS).toContain('fq.nickname')
    expect(SWAP_KEYS).toContain('fq.scope.v1')
  })

  it('adding a child stashes the old one and starts the new one fresh', () => {
    localStorage.setItem('fq.journey.v1', JSON.stringify({ done: ['ha', 'le'] }))
    localStorage.setItem('fq.streak.v1', JSON.stringify({ count: 9 }))
    localStorage.setItem('fq.nickname', 'Selam')
    loadProfiles()
    const p2 = addProfile('Abel')
    expect(p2).toBeTruthy()
    expect(profileCount()).toBe(2)
    expect(activeProfile().id).toBe(p2.id)
    // fresh start for Abel, except the seeded nickname
    expect(localStorage.getItem('fq.journey.v1')).toBeNull()
    expect(localStorage.getItem('fq.streak.v1')).toBeNull()
    expect(localStorage.getItem('fq.nickname')).toBe('Abel')
  })

  it('switching restores each child exactly, both directions', () => {
    localStorage.setItem('fq.journey.v1', JSON.stringify({ done: ['ha'] }))
    localStorage.setItem('fq.scope.v1', 'all')
    localStorage.setItem('fq.nickname', 'Selam')
    const first = loadProfiles().active
    const p2 = addProfile('Abel')
    localStorage.setItem('fq.journey.v1', JSON.stringify({ done: [] }))
    localStorage.setItem('fq.telemetry.v1', JSON.stringify([{ k: 'le-1' }]))

    expect(switchProfile(first)).toBe(true)
    expect(JSON.parse(localStorage.getItem('fq.journey.v1'))).toEqual({ done: ['ha'] })
    expect(localStorage.getItem('fq.scope.v1')).toBe('all')
    expect(localStorage.getItem('fq.nickname')).toBe('Selam')
    expect(localStorage.getItem('fq.telemetry.v1')).toBeNull() // Abel's data must not leak

    expect(switchProfile(p2.id)).toBe(true)
    expect(JSON.parse(localStorage.getItem('fq.telemetry.v1'))).toEqual([{ k: 'le-1' }])
    expect(localStorage.getItem('fq.scope.v1')).toBeNull()
    expect(localStorage.getItem('fq.nickname')).toBe('Abel')
  })

  it('switching to self or to an unknown id is a no-op', () => {
    const reg = loadProfiles()
    expect(switchProfile(reg.active)).toBe(false)
    expect(switchProfile('nope')).toBe(false)
  })

  it('rename updates the registry and the live nickname for the active child', () => {
    loadProfiles()
    const id = activeProfile().id
    renameProfile(id, 'Ruth')
    expect(activeProfile().name).toBe('Ruth')
    expect(localStorage.getItem('fq.nickname')).toBe('Ruth')
  })

  it('nickname edited elsewhere re-syncs into the registry', () => {
    loadProfiles()
    localStorage.setItem('fq.nickname', 'Hanna')
    expect(activeProfile().name).toBe('Hanna')
  })

  it('cannot delete the active child; can delete a parked one', () => {
    loadProfiles()
    const first = activeProfile().id
    const p2 = addProfile('Abel')
    expect(deleteProfile(p2.id)).toBe(false) // p2 is now active
    expect(deleteProfile(first)).toBe(true)
    expect(profileCount()).toBe(1)
    expect(localStorage.getItem(`fq.profile.${first}`)).toBeNull()
  })

  it('caps the household at MAX_PROFILES', () => {
    loadProfiles()
    for (let i = profileCount(); i < MAX_PROFILES; i++) expect(addProfile(`Kid ${i}`)).toBeTruthy()
    expect(addProfile('One too many')).toBeNull()
  })

  it('labels unnamed profiles kindly', () => {
    expect(profileLabel({ id: 'p2', name: '' })).toBe('Child 2')
    expect(profileLabel({ id: 'p1', name: 'Selam' })).toBe('Selam')
  })
})
