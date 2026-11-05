/* ማማ is a design mock: real words, sibling decoys, English only on the guide
   sign, and no path into the backpack or the progress store. */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MamaPreview from './MamaPreview'
import { expectGuideOnlyLatin } from './brickTestUtils'
import { audio } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { AM_BRICK_WORDS } from '../brickWordsAm'
import { CITY_WORDS, MAMA_LEVELS, nearestSiblings, poseFor } from '../mamaMock'

const played = []
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

beforeEach(() => {
  played.length = 0
  audio.play = (key) => { played.push(key) }
})

const guides = {
  pick: 'Pick a tower',
  play: 'Drop it on the tower',
  miss: 'It jumps off',
  win: 'Nice!',
  city: 'Your little city',
}

describe('ማማ design mock', () => {
  it('keeps Latin on the guide sign for every frame', () => {
    for (const scene of Object.keys(guides)) {
      const { unmount } = render(<MamaPreview scene={scene} still />)
      expectGuideOnlyLatin(screen.getByTestId('mama-preview'), guides[scene])
      unmount()
    }
  })

  it('builds a real word from the bottom, with a sibling decoy on a miss', () => {
    const level = MAMA_LEVELS[0]
    const pose = poseFor('miss', level)
    expect(AM_BRICK_WORDS.map((w) => w.geez)).toContain(level.geez)
    expect(pose.letters[0]).toBe('ላ')
    expect(pose.bounce).not.toBe(pose.bite)
    for (const ch of [pose.bounce, pose.bite]) {
      expect(pose.letters).not.toContain(ch)
      expect(INDEXES.byChar.get(ch).familyId).toBe(INDEXES.byChar.get('ም').familyId)
    }
    expect(nearestSiblings('ም', pose.letters, 2)).toEqual([pose.bounce, pose.bite])

    render(<MamaPreview scene="play" still />)
    expect(screen.getByTestId('mama-fall').textContent).toBe('ም')
    expect(screen.getByTestId('mama-tower').textContent).toContain('ላ')
    expect(document.querySelector('[data-next="1"]')).toBeTruthy()
    fireEvent.click(screen.getByTestId('mama-picture'))
    expect(played).toEqual(['words/lam'])
  })

  it('shows the bin chomp and a bounce, and does not glow on level 2', () => {
    const miss = render(<MamaPreview scene="miss" still />)
    expect(screen.getByTestId('mama-bounce').textContent).not.toBe('')
    expect(screen.getByTestId('mama-bite').textContent).not.toBe('')
    expect(screen.getByTestId('mama-bin')).toBeTruthy()
    miss.unmount()

    render(<MamaPreview scene="play" level={2} still />)
    expect(document.querySelector('[data-next="1"]')).toBeNull()
    expect(screen.getByTestId('mama-picture')).toBeTruthy()
    expect(screen.getByTestId('mama-slow')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('mama-fast')).toHaveAttribute('aria-pressed', 'false')
  })

  it('hides the picture on hear-only play and reveals the animal when the word is done', () => {
    const { unmount } = render(<MamaPreview scene="play" level={3} still />)
    expect(screen.queryByTestId('mama-picture')).toBeNull()
    expect(screen.getByTestId('mama-hear')).toBeTruthy()
    fireEvent.click(screen.getByTestId('mama-hear'))
    expect(played.at(-1)).toBe('words/anbesa')
    unmount()

    render(<MamaPreview scene="win" still />)
    const dancer = screen.getByTestId('mama-dancer')
    expect(dancer.getAttribute('src')).toContain('lion.webp')
    expect(screen.getByTestId('mama-preview').querySelectorAll('[data-filled="1"]').length).toBe(4)
    expect(screen.getByTestId('mama-slow')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('mama-fast')).toHaveAttribute('aria-pressed', 'true')
  })

  it('turns finished words into a city and only marks where progress would save', () => {
    render(<MamaPreview scene="city" still />)
    const buildings = screen.getAllByTestId('mama-building')
    expect(buildings).toHaveLength(CITY_WORDS.length)
    const fresh = buildings.find((el) => el.getAttribute('data-fresh') === '1')
    expect(fresh.getAttribute('data-progress-hook')).toBe('noteRound')
    expect(fresh.querySelector('img').getAttribute('src')).toContain('lion.webp')
    expect(screen.getByTestId('mama-preview').getAttribute('data-progress-hook')).toBe('trackScreen')
    expect(screen.queryByTestId('idle-rest')).toBeNull()
  })

  it('uses shipped pictures and recordings and stays out of the menu', () => {
    for (const word of [...MAMA_LEVELS, ...CITY_WORDS]) {
      expect(fs.existsSync(path.join(ROOT, 'public/audio/fidel/words', `${word.latin}.mp3`))).toBe(true)
      expect(fs.existsSync(path.join(ROOT, 'public/img/games/bw', `${word.pic}.webp`))).toBe(true)
    }
    const app = fs.readFileSync(path.join(ROOT, 'src/FidelQuestApp.jsx'), 'utf8')
    expect(app).not.toContain('MamaPreview')
    expect(app).not.toContain('mama=preview')
    const main = fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8')
    expect(main).toContain("get('mama') === 'preview'")
    const mock = fs.readFileSync(path.join(ROOT, 'src/components/MamaPreview.jsx'), 'utf8')
    expect(mock).not.toMatch(/noteRound\(|trackScreen\(/)
    render(<MamaPreview scene="play" still />)
    expect(screen.getByTestId('idle-rest')).toBeTruthy()
    expect(screen.getByTestId('mama-slow')).toHaveAttribute('aria-pressed', 'true')
  })
})
