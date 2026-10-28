/* The website's teacher dashboard builds class and homework links without
   importing the app. These tests decode them with the app's own decoders
   and check the family ids, so the two sides cannot drift. */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeClassInvite, decodeAssignment, readClassroomFromHash } from './classroom'
import { FIDEL_FAMILIES } from './ethiopic'
import { classInviteUrl, homeworkUrl } from '../../website/src/classLinks.js'
import { FAMILY_IDS, familyChar } from '../../website/src/familyIds.js'

const APP = 'https://easygeez.com/app'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('web teacher dashboard links', () => {
  it('invite link decodes in the app as a synced class with the goal', () => {
    const url = classInviteUrl({ code: 'ab12cd', teacher: 'መምህር ዮሴፍ', goalMin: 20 }, APP)
    expect(url.startsWith('https://easygeez.com/app/#class=')).toBe(true)
    const inv = decodeClassInvite(url.split('#class=')[1])
    expect(inv).toEqual({ code: 'AB12CD', teacher: 'መምህር ዮሴፍ', goalMin: 20, sync: true })
    expect(readClassroomFromHash('#' + url.split('#')[1])?.kind).toBe('class')
  })

  it('homework link decodes in the app with the server seed and families', () => {
    const hw = { seed: 4242, familyIds: ['ha', 'le'], count: 10, due: '2026-11-01', orders: [1] }
    const url = homeworkUrl({ code: 'AB12CD', teacher: 'T', homework: hw }, APP)
    const a = decodeAssignment(url.split('#assign=')[1])
    expect(a).toMatchObject({ code: 'AB12CD', seed: 4242, familyIds: ['ha', 'le'], count: 10, due: '2026-11-01' })
  })

  it('family ids match the app', () => {
    expect(FAMILY_IDS.map((f) => f[0])).toEqual(FIDEL_FAMILIES.map((f) => f.id))
    expect(FAMILY_IDS.map((f) => f[1])).toEqual(FIDEL_FAMILIES.map((f) => f.chars[0]))
    expect(familyChar('le')).toBe('ለ')
  })

  it('dashboard is kid-safe: no child email or birthday fields, consent draft is marked for legal review', () => {
    const src = fs.readFileSync(path.join(ROOT, 'website/src/pages/ClassDashboard.jsx'), 'utf8')
    expect(src).toMatch(/\[LEGAL REVIEW\]/)
    expect(src).not.toMatch(/childEmail|birthDate|type="date"[^>]*birth/i)
    const api = fs.readFileSync(path.join(ROOT, 'api/routes/practice.js'), 'utf8')
    expect(api).toMatch(/cleanName\(req\.body\?\.name, 16\)/) // nickname, 16 chars max
  })
})
