import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  maybeRequestReview, reviewState, REVIEW_MIN_COMPLETIONS, REVIEW_COOLDOWN_MS, REVIEW_MAX_ASKS, REVIEW_KEY, REVIEW_MIN_SESSION_MS,
} from './reviewPrompt'

// A session that has been running a while (the launch guard has its own tests).
const LIVE = REVIEW_MIN_SESSION_MS * 10

describe('store review prompt (native, capped)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('does not ask on the web, and still counts a finished lesson', async () => {
    const request = vi.fn(async () => true)
    for (let i = 0; i < REVIEW_MIN_COMPLETIONS; i++) {
      expect(await maybeRequestReview('complete', { native: false, request, now: 1_000 })).toBe('skip')
    }
    expect(request).not.toHaveBeenCalled()
    expect(reviewState().completions).toBe(REVIEW_MIN_COMPLETIONS)
  })

  it('asks on the native app only after several successful lessons, once per session', async () => {
    const request = vi.fn(async () => true)
    const opts = { native: true, request, now: 5_000, sessionAgeMs: LIVE }
    for (let i = 1; i < REVIEW_MIN_COMPLETIONS; i++) {
      expect(await maybeRequestReview('complete', opts)).toBe('early')
    }
    expect(request).not.toHaveBeenCalled()
    expect(await maybeRequestReview('complete', opts)).toBe('asked')
    expect(request).toHaveBeenCalledTimes(1)
    expect(await maybeRequestReview('complete', opts)).toBe('session')
    expect(request).toHaveBeenCalledTimes(1)
    expect(reviewState().askCount).toBe(1)
    expect(reviewState().completions).toBe(REVIEW_MIN_COMPLETIONS + 1)
  })

  it('waits out the cooldown, then stops after the lifetime cap', async () => {
    const request = vi.fn(async () => true)
    const start = 10_000
    expect(await maybeRequestReview('unlock-code', { native: true, request, now: start, sessionAgeMs: LIVE })).toBe('asked')
    sessionStorage.clear()
    expect(await maybeRequestReview('unlock-code', { native: true, request, now: start + 1_000, sessionAgeMs: LIVE })).toBe('cooldown')
    expect(request).toHaveBeenCalledTimes(1)
    sessionStorage.clear()
    expect(await maybeRequestReview('grownups', { native: true, request, now: start + REVIEW_COOLDOWN_MS + 1, sessionAgeMs: LIVE })).toBe('asked')
    localStorage.setItem(REVIEW_KEY, JSON.stringify({ askCount: REVIEW_MAX_ASKS, lastAskedAt: 0, completions: 9 }))
    sessionStorage.clear()
    expect(await maybeRequestReview('grownups', { native: true, request, now: start + REVIEW_COOLDOWN_MS * 3, sessionAgeMs: LIVE })).toBe('limit')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('viewing the unlock code can ask before the lesson minimum, and a failed card does not burn the ask', async () => {
    const request = vi.fn(async () => { throw new Error('no store') })
    expect(await maybeRequestReview('unlock-code', { native: true, request, now: 1, sessionAgeMs: LIVE })).toBe('unavailable')
    expect(reviewState().askCount).toBeUndefined()
    request.mockResolvedValue(true)
    expect(await maybeRequestReview('unlock-code', { native: true, request, now: 2, sessionAgeMs: LIVE })).toBe('asked')
    expect(reviewState().askCount).toBe(1)
  })

  it('does not treat a false result from the store as an ask', async () => {
    const request = vi.fn(async () => false)
    expect(await maybeRequestReview('grownups', { native: true, request, now: 1, sessionAgeMs: LIVE })).toBe('unavailable')
    expect(reviewState().askCount).toBeUndefined()
  })

  it('asks after just two finished lessons', () => {
    expect(REVIEW_MIN_COMPLETIONS).toBe(2)
  })

  it('never asks right at app launch, except the explicit grown-up button', async () => {
    const request = vi.fn(async () => true)
    localStorage.setItem(REVIEW_KEY, JSON.stringify({ completions: 5 }))
    const early = { native: true, request, now: 1_000, sessionAgeMs: REVIEW_MIN_SESSION_MS - 1 }
    expect(await maybeRequestReview('complete', early)).toBe('launch')
    expect(await maybeRequestReview('chapter', early)).toBe('launch')
    expect(await maybeRequestReview('unlock-code', early)).toBe('launch')
    expect(request).not.toHaveBeenCalled()
    expect(await maybeRequestReview('grownups', early)).toBe('asked')
  })

  it('a First Words round counts as a finished activity and asks at the same minimum', async () => {
    const request = vi.fn(async () => true)
    const opts = { native: true, request, now: 5_000, sessionAgeMs: LIVE }
    expect(await maybeRequestReview('words', opts)).toBe('early')
    expect(await maybeRequestReview('complete', opts)).toBe('asked')
    expect(reviewState().completions).toBe(2)
  })

  it('a finished chapter asks without the lesson minimum and does not double-count', async () => {
    const request = vi.fn(async () => true)
    expect(await maybeRequestReview('chapter', { native: true, request, now: 5_000, sessionAgeMs: LIVE })).toBe('asked')
    expect(reviewState().completions).toBeUndefined()
    expect(reviewState().askCount).toBe(1)
  })

  it('ignores unknown reasons (no ask from arbitrary call sites)', async () => {
    const request = vi.fn(async () => true)
    localStorage.setItem(REVIEW_KEY, JSON.stringify({ completions: 9 }))
    expect(await maybeRequestReview('app-open', { native: true, request, now: 5_000, sessionAgeMs: LIVE })).toBe('early')
    expect(request).not.toHaveBeenCalled()
  })
})
