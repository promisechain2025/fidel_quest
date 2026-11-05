/* ማማ plays with real words, keeps Latin on the guide sign, remembers speed,
   naps when idle, and saves a building when a tower is finished. */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clips = []
vi.mock('../platform/audioEngine', async (importOriginal) => {
  const real = await importOriginal()
  real.audio.play = (key) => { clips.push(key) }
  return { ...real, playForm: () => {}, playEffect: () => {} }
})

import MamaPreview from './MamaPreview'
import { expectGuideOnlyLatin } from './brickTestUtils'
import { MAMA_KEY } from '../mamaSave'
import { mamaPools, previewRound } from '../mamaCore'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

beforeEach(() => {
  clips.length = 0
  localStorage.clear()
  localStorage.setItem('fq.pack', 'am')
  localStorage.setItem('fq.lang', 'en')
})

describe('ማማ game screen', () => {
  it('keeps Latin on the guide sign', () => {
    for (const scene of ['pick', 'play', 'miss', 'win', 'city']) {
      if (scene === 'city') localStorage.setItem(MAMA_KEY, JSON.stringify({ v: 1, speed: null, city: ['lam'] }))
      const { unmount } = render(<MamaPreview scene={scene} seed={4} still />)
      const guide = {
        pick: 'Pick a tower',
        play: 'Drop it on the tower',
        miss: 'It jumps off',
        win: 'Nice!',
        city: 'Your little city',
      }[scene]
      expectGuideOnlyLatin(screen.getByTestId('mama-preview'), guide)
      unmount()
    }
  })

  it('places the needed letter, spits it back from the bin, and reveals level 3 only at the end', () => {
    const play = previewRound('play', 4, mamaPools('am'))
    const { unmount } = render(<MamaPreview scene="play" seed={4} still />)
    expect(screen.getByTestId('mama-fall').textContent).toBe(play.brick.char)
    expect(screen.getByTestId('mama-slot').getAttribute('data-next')).toBe('1')
    fireEvent.click(screen.getByTestId('mama-picture'))
    expect(clips.at(-1)).toBe(play.word.clip)
    const letter = screen.getByTestId('mama-fall').textContent
    fireEvent.click(screen.getByTestId('mama-fall'))
    fireEvent.click(screen.getByTestId('mama-bin'))
    expect(screen.getByTestId('mama-fall').textContent).toBe(letter)
    fireEvent.click(screen.getByTestId('mama-fall'))
    fireEvent.click(screen.getByTestId('mama-slot'))
    expect(screen.getByTestId('mama-dancer')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(MAMA_KEY)).city).toContain(play.word.latin)
    unmount()

    render(<MamaPreview still />)
    fireEvent.click(screen.getByTestId('mama-level-3'))
    expect(screen.queryByTestId('mama-picture')).toBeNull()
    expect(screen.getByTestId('mama-hear')).toBeTruthy()
  })

  it('shows the bounce and the bin bite, and the city the child has built', () => {
    render(<MamaPreview scene="miss" seed={4} still />)
    expect(screen.getByTestId('mama-bounce').textContent).not.toBe('')
    expect(screen.getByTestId('mama-bite').textContent).not.toBe('')
    expect(screen.queryByTestId('mama-picture')).toBeTruthy()
  })

  it('remembers the speed and shows the napping brick after a quiet moment', () => {
    vi.useFakeTimers()
    const first = render(<MamaPreview scene="play" seed={4} />)
    expect(screen.queryByTestId('idle-rest')).toBeNull()
    fireEvent.click(screen.getByTestId('mama-fast'))
    expect(screen.getByTestId('mama-fast')).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem(MAMA_KEY)).speed).toBe('fast')
    act(() => { vi.advanceTimersByTime(IDLE_MS_WAIT) })
    expect(screen.getByTestId('idle-rest')).toBeTruthy()
    first.unmount()
    vi.useRealTimers()

    render(<MamaPreview scene="play" seed={4} still />)
    expect(screen.getByTestId('mama-fast')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('mama-slow')).toHaveAttribute('aria-pressed', 'false')
  })

  it('stays a backpack game and out of the old tower id', () => {
    const app = fs.readFileSync(path.join(ROOT, 'src/FidelQuestApp.jsx'), 'utf8')
    expect(app).toContain("name: 'mama'")
    expect(app).toContain("t('mamaShort', 'Tower')")
    const src = fs.readFileSync(path.join(ROOT, 'src/components/MamaPreview.jsx'), 'utf8')
    expect(src).toContain("noteRound('mama'")
    expect(src).not.toMatch(/noteRound\('tower'/)
  })
})

const IDLE_MS_WAIT = 6500
