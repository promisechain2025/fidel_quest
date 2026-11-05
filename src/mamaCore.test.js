import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { INDEXES } from './platform/ethiopic'
import {
  CLIPS, IDLE_MS, L3_GEEZ, LEVELS, mamaPools, mamaTransition, initRound, previewRound, speedFor,
} from './mamaCore'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const am = mamaPools('am')
const ti = mamaPools('ti')

describe('ማማ word pools', () => {
  it('uses the seven pictured four-letter words, each with a real recording', () => {
    expect(am[3].map((w) => w.geez).sort()).toEqual([...L3_GEEZ].sort())
    for (const w of [...am[1], ...am[2], ...am[3]]) {
      expect(w.len).toBe(Array.from(w.geez).length)
      expect(CLIPS.has(w.clip)).toBe(true)
      expect(fs.existsSync(path.join(ROOT, 'public/audio/fidel', `${w.clip}.mp3`))).toBe(true)
      expect(fs.existsSync(path.join(ROOT, 'public/img/games/bw', `${w.pic}.webp`))).toBe(true)
      expect(w.letters).toHaveLength(w.len)
    }
    expect(am[1].every((w) => w.len === 2)).toBe(true)
    expect(am[2].every((w) => w.len === 3)).toBe(true)
  })

  it('prefers Tigrinya words that already have a recording, and shares the rest', () => {
    for (const id of [1, 2, 3]) {
      expect(ti[id].length).toBeGreaterThan(0)
      for (const w of ti[id]) expect(CLIPS.has(w.clip)).toBe(true)
    }
    const tiOwn = ti[3].filter((w) => w.clip.endsWith('-ti'))
    if (!tiOwn.length) expect(ti[3].map((w) => w.geez).sort()).toEqual([...L3_GEEZ].sort())
  })
})

describe('ማማ round', () => {
  const round = initRound(1, 5, am[1])

  it('is seeded and deals one brick, a sibling decoy or the next letter', () => {
    expect(initRound(1, 5, am[1])).toEqual(round)
    expect(round.brick).toBeTruthy()
    expect(round.placed).toBe(0)
    const avoid = round.letters.map((l) => l.char)
    if (round.brick.role === 'decoy') {
      expect(avoid).not.toContain(round.brick.char)
      expect(INDEXES.byChar.get(round.brick.char).familyId).toBe(INDEXES.byChar.get(round.letters[0].char).familyId)
    } else {
      expect(round.brick.char).toBe(round.letters[0].char)
    }
  })

  it('bounces a lookalike off the tower and does not advance', () => {
    let state = round
    if (state.brick.role !== 'decoy') {
      state = { ...state, brick: { char: 'ሙ', key: INDEXES.byChar.get('ሙ').audioKey, role: 'decoy' } }
    }
    const placed = state.placed
    const next = mamaTransition(state, 'tower')
    expect(next.accepted).toBe(true)
    expect(next.state.outcome).toBe('bounce')
    expect(next.state.placed).toBe(placed)
    expect(next.state.brick).toBeNull()
    expect(next.state.phase).toBe('play')
    const settled = mamaTransition(next.state, 'settle')
    expect(settled.state.brick).toBeTruthy()
    expect(settled.state.outcome).toBeNull()
  })

  it('chomps a lookalike in the bin and spits the needed letter back out', () => {
    let state = round
    const decoy = { char: 'ሙ', key: INDEXES.byChar.get('ሙ').audioKey, role: 'decoy' }
    const eaten = mamaTransition({ ...state, brick: decoy }, 'bin')
    expect(eaten.state.outcome).toBe('chomp')
    expect(eaten.state.bite.char).toBe('ሙ')
    expect(eaten.state.placed).toBe(state.placed)

    const need = state.letters[state.placed]
    const spat = mamaTransition({ ...state, brick: { ...need, role: 'need' } }, 'bin')
    expect(spat.state.outcome).toBe('spit')
    expect(spat.state.brick.char).toBe(need.char)
    expect(spat.state.placed).toBe(state.placed)
    expect(spat.state.phase).toBe('play')
  })

  it('builds the word from the bottom and can finish with no game over', () => {
    let state = initRound(1, 2, am[1])
    let guard = 0
    while (state.phase !== 'win' && guard < 20) {
      if (state.brick?.role === 'decoy') state = mamaTransition(mamaTransition(state, 'bin').state, 'settle').state
      else state = mamaTransition(state, 'tower').state
      guard += 1
    }
    expect(state.phase).toBe('win')
    expect(state.placed).toBe(state.letters.length)
    expect(LEVELS[1].glow).toBe(true)
    expect(LEVELS[3].hearOnly).toBe(true)
    expect(IDLE_MS).toBe(6000)
  })

  it('stops a preview on a real mid-round, a bounce, and a finished word', () => {
    const play = previewRound('play', 4, am)
    expect(play.phase).toBe('play')
    expect(play.placed).toBe(1)
    expect(play.brick.role).toBe('need')
    expect(play.brick.char).toBe(play.letters[1].char)
    const miss = previewRound('miss', 4, am)
    expect(miss.outcome).toBe('bounce')
    expect(miss.fx.role).toBe('decoy')
    expect(miss.bite.char).not.toBe(miss.fx.char)
    expect(miss.letters.map((l) => l.char)).not.toContain(miss.fx.char)
    const win = previewRound('win', 4, am)
    expect(win.phase).toBe('win')
    expect(win.word.len).toBe(4)
    expect(speedFor(null, 1)).toBe('slow')
    expect(speedFor('fast', 1)).toBe('fast')
    expect(speedFor('nope', 2)).toBe('mid')
  })
})
