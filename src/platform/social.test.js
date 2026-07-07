import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as social from './social'

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const mockFetch = (payload, ok = true, status = 200) =>
  vi.fn(async () => ({ ok, status, json: async () => payload }))

describe('dormant without VITE_SOCIAL_URL', () => {
  it('is disabled and never calls the network', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(social.isSocialEnabled()).toBe(false)
    expect(await social.createGroup('Mom', true)).toEqual({ error: 'disabled' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('enabled with a configured URL', () => {
  beforeEach(() => vi.stubEnv('VITE_SOCIAL_URL', 'https://social.test/'))

  it('creates a group and remembers the membership', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, groupId: 'g1', code: 'ABC234', memberId: 'm1', memberToken: 'tok' }))
    const out = await social.createGroup('Mom', true)
    expect(out.groupId).toBe('g1')
    const m = social.activeMembership()
    expect(m).toMatchObject({ groupId: 'g1', code: 'ABC234', memberId: 'm1', memberToken: 'tok' })
  })

  it('submits a score using the stored token', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, groupId: 'g1', code: 'ABC234', memberId: 'm1', memberToken: 'tok' }))
    await social.joinGroup('abc234', 'Selam', true)
    const fetchSpy = mockFetch({ ok: true, value: 40 })
    vi.stubGlobal('fetch', fetchSpy)
    const out = await social.submitScore('lettersLearned', 40)
    expect(out.value).toBe(40)
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toMatchObject({ groupId: 'g1', memberId: 'm1', memberToken: 'tok', metric: 'lettersLearned', value: 40 })
  })

  it('reads a board with a query built from the membership', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, groupId: 'g1', code: 'ABC234', memberId: 'm1', memberToken: 'tok' }))
    await social.createGroup('Mom', true)
    const fetchSpy = mockFetch({ ok: true, rows: [{ nickname: 'Mom', value: 40, me: true }] })
    vi.stubGlobal('fetch', fetchSpy)
    const out = await social.getBoard('lettersLearned', '2026-W28')
    expect(out.rows[0].value).toBe(40)
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/social/board?')
    expect(fetchSpy.mock.calls[0][0]).toContain('metric=lettersLearned')
    expect(fetchSpy.mock.calls[0][0]).toContain('week=2026-W28')
  })

  it('surfaces server errors', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'consent_required' }, false, 403))
    expect(await social.createGroup('Mom')).toEqual({ error: 'consent_required' })
  })

  it('handles a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down') }))
    expect(await social.createGroup('Mom', true)).toEqual({ error: 'network' })
  })

  it('submitScore/getBoard need an active group', async () => {
    expect(await social.submitScore('lettersLearned', 1)).toEqual({ error: 'no_group' })
    expect(await social.getBoard('lettersLearned')).toEqual({ error: 'no_group' })
  })
})

describe('currentWeek', () => {
  it('formats as YYYY-Www', () => {
    expect(social.currentWeek(new Date('2026-07-07T00:00:00Z'))).toMatch(/^\d{4}-W\d{2}$/)
    expect(social.currentWeek(new Date('2026-01-01T12:00:00Z'))).toBe('2026-W01')
  })
})
