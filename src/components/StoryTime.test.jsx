import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

/* Bible stories are for the child to read alone: nothing in the reader may
   speak them (no narration, no tap hint, no word or letter audio). Other
   stories (School Path) keep their reading help. */

const played = []
const waits = []
vi.mock('../platform/audioEngine', async (orig) => {
  const real = await orig()
  return {
    ...real,
    playEffect: () => {},
    afterVoice: (cb) => {
      const w = { cb, cancelled: false }
      waits.push(w)
      return () => { w.cancelled = true }
    },
    audio: Object.assign(Object.create(Object.getPrototypeOf(real.audio)), real.audio, {
      covered: () => Promise.resolve(true),
      play: (key) => played.push(key),
      stopVoice: () => {},
    }),
  }
})
vi.mock('../platform/telemetry', async (orig) => ({ ...(await orig()), recordAnswer: () => {} }))

import { STORIES, storyLibrary as realLibrary } from '../platform/stories'
import { bibleStoryTimeEntries } from '../data/bibleStories'
import { schoolPathStoryTimeEntries } from '../data/schoolPathGr1Stories'

const AM_BIBLE = STORIES.find((s) => s.id === 'creation')
const TI_BIBLE = bibleStoryTimeEntries()[0]
const PATH = schoolPathStoryTimeEntries()[0]
const unlocked = (s) => ({ ...s, unlocked: true, stage: 0, missing: [] })

vi.mock('../platform/stories', async (orig) => {
  const real = await orig()
  return { ...real, storyLibrary: vi.fn(() => []) }
})
import * as stories from '../platform/stories'
import StoryTime from './StoryTime'

const flush = async () => {
  await act(async () => {})
  act(() => {
    for (let i = 0; i < 50 && waits.length; i++) {
      const w = waits.shift()
      if (!w.cancelled) w.cb()
    }
  })
  await act(async () => {})
}

async function openStory(s) {
  stories.storyLibrary.mockReturnValue([unlocked(s)])
  render(<StoryTime soundOn onBack={() => {}} />)
  await act(async () => {})
  fireEvent.click(document.querySelector(`[data-story-id="${s.id}"]`))
  await flush()
}

beforeEach(() => {
  played.length = 0
  waits.length = 0
  document.body.innerHTML = ''
})

describe('StoryTime: Bible stories are read by the child alone', () => {
  it('fixtures exist (Amharic Bible, Tigrinya Bible shelf, School Path)', () => {
    expect(realLibrary).toBeTypeOf('function')
    expect(AM_BIBLE && TI_BIBLE && PATH).toBeTruthy()
    expect(stories.isBibleStory(AM_BIBLE)).toBe(true)
    expect(stories.isBibleStory(TI_BIBLE)).toBe(true)
    expect(stories.isBibleStory(PATH)).toBe(false)
  })

  for (const [label, s] of [['Amharic Bible', () => AM_BIBLE], ['Tigrinya Bible shelf', () => TI_BIBLE]]) {
    it(`${label}: no auto-read, no Read-to-me, no audio on word tap or page turn`, async () => {
      const story = s()
      await openStory(story)
      expect(played).toEqual([])
      expect(screen.queryByRole('button', { name: /read to me/i })).toBeNull()

      const words = document.querySelectorAll('[data-story-word]')
      expect(words.length).toBeGreaterThan(0)
      for (const w of words) fireEvent.click(w)
      await flush()
      expect(played).toEqual([])

      if (story.pages.length > 1) {
        fireEvent.click(screen.getByRole('button', { name: /next page/i }))
        await flush()
        expect(document.querySelectorAll('[data-story-word]').length).toBeGreaterThan(0)
        expect(played).toEqual([])
      }
    })
  }

  it('School Path (non-Bible) stories keep narration, Read-to-me and word taps', async () => {
    await openStory(PATH)
    expect(played.some((k) => k.startsWith('stories/'))).toBe(true)
    expect(screen.getByRole('button', { name: /read to me/i })).toBeTruthy()
    expect(document.querySelectorAll('[data-story-word]').length).toBe(0)
    played.length = 0
    const chips = document.querySelectorAll('button.geez')
    expect(chips.length).toBeGreaterThan(0)
    fireEvent.click(chips[0])
    await flush()
    expect(played.some((k) => k.startsWith('words/') || k.startsWith('letters/'))).toBe(true)
  })
})
