import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  maybeRequestReview, reviewState, REVIEW_MIN_COMPLETIONS, REVIEW_COOLDOWN_MS, REVIEW_MAX_ASKS, REVIEW_KEY,
} from './reviewPrompt'

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
    const opts = { native: true, request, now: 5_000 }
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
    expect(await maybeRequestReview('unlock-code', { native: true, request, now: start })).toBe('asked')
    sessionStorage.clear()
    expect(await maybeRequestReview('unlock-code', { native: true, request, now: start + 1_000 })).toBe('cooldown')
    expect(request).toHaveBeenCalledTimes(1)
    sessionStorage.clear()
    expect(await maybeRequestReview('grownups', { native: true, request, now: start + REVIEW_COOLDOWN_MS + 1 })).toBe('asked')
    localStorage.setItem(REVIEW_KEY, JSON.stringify({ askCount: REVIEW_MAX_ASKS, lastAskedAt: 0, completions: 9 }))
    sessionStorage.clear()
    expect(await maybeRequestReview('grownups', { native: true, request, now: start + REVIEW_COOLDOWN_MS * 3 })).toBe('limit')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('viewing the unlock code can ask before three lessons, and a failed card does not burn the ask', async () => {
    const request = vi.fn(async () => { throw new Error('no store') })
    expect(await maybeRequestReview('unlock-code', { native: true, request, now: 1 })).toBe('unavailable')
    expect(reviewState().askCount).toBeUndefined()
    request.mockResolvedValue(true)
    expect(await maybeRequestReview('unlock-code', { native: true, request, now: 2 })).toBe('asked')
    expect(reviewState().askCount).toBe(1)
  })

  it('does not treat a false result from the store as an ask', async () => {
    const request = vi.fn(async () => false)
    expect(await maybeRequestReview('grownups', { native: true, request, now: 1 })).toBe('unavailable')
    expect(reviewState().askCount).toBeUndefined()
  })
})
