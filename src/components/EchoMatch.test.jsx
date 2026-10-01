import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const played = []
const effects = []
const waits = []
vi.mock('../platform/audioEngine', async (orig) => {
  const real = await orig()
  return {
    ...real,
    playForm: (form) => played.push(form.audioKey),
    playEffect: (kind) => effects.push(kind),
    afterVoice: (cb) => {
      const w = { cb, cancelled: false }
      waits.push(w)
      return () => { w.cancelled = true }
    },
    audio: Object.assign(Object.create(Object.getPrototypeOf(real.audio)), real.audio, {
      hasClip: () => Promise.resolve(true),
      play: () => {},
    }),
  }
})
const ledger = []
vi.mock('../platform/telemetry', async (orig) => ({
  ...(await orig()),
  recordAnswer: (k, p, m) => ledger.push({ k, p, m }),
}))

import EchoMatch from './EchoMatch'
import { FIDEL_FAMILIES } from '../platform/ethiopic'
import { loadEcho, saveEcho } from '../echoMatchCore'

const POOL = FIDEL_FAMILIES.slice(0, 8).flatMap((f) => [1, 2, 3, 4, 5, 6, 7].map((o) => `${f.id}-${o}`))

/** Run every queued afterVoice continuation (as if each clip ended). */
const flush = () => act(() => {
  for (let i = 0; i < 50 && waits.length; i++) {
    const w = waits.shift()
    if (!w.cancelled) w.cb()
  }
})

const cards = () => Array.from(document.querySelectorAll('[data-testid="echo-grid"] > button'))
const byFace = (face, key) => cards().find((b) => b.dataset.face === face && (!key || b.dataset.key === key))
const pairKeys = () => [...new Set(cards().map((b) => b.dataset.key))]

async function mount(progress) {
  if (progress) saveEcho(progress)
  render(<EchoMatch soundOn onBack={() => {}} pool={POOL} />)
  await act(async () => {})
}

beforeEach(() => {
  played.length = 0
  effects.length = 0
  waits.length = 0
  ledger.length = 0
})

describe('Echo Match screen', () => {
  it('deals voice cards and letter cards; flipping a voice card plays its letter and it can be replayed', async () => {
    await mount()
    expect(cards()).toHaveLength(8) // L1: 4 pairs
    const v = byFace('voice')
    fireEvent.click(v)
    expect(played).toEqual([v.dataset.key])
    expect(v).toHaveAttribute('aria-label', expect.stringMatching(/Sound card/))
    fireEvent.click(v) // replay
    expect(played).toEqual([v.dataset.key, v.dataset.key])
  })

  it('a wrong pair replays BOTH sounds (voice first, then the chosen letter) and then turns back', async () => {
    await mount({ unlocked: 2, due: {}, best: {} })
    const [k0, k1] = pairKeys()
    fireEvent.click(byFace('voice', k0))
    fireEvent.click(byFace('letter', k1))
    expect(effects).toContain('bad')
    played.length = 0
    flush()
    expect(played).toEqual([k0, k1])
    expect(byFace('voice', k0).dataset.state).toBe('down')
    expect(byFace('letter', k1).dataset.state).toBe('down')
  })

  it('a match locks, shows an example moment, says the letter again, and logs first try on L2', async () => {
    await mount({ unlocked: 2, due: {}, best: {} })
    const [k0] = pairKeys()
    fireEvent.click(byFace('voice', k0))
    fireEvent.click(byFace('letter', k0))
    expect(byFace('letter', k0).dataset.state).toBe('matched')
    expect(screen.getByTestId('game-example')).toBeInTheDocument()
    expect(ledger).toEqual([{ k: k0, p: k0, m: 'echo' }])
    played.length = 0
    flush()
    expect(played[0]).toBe(k0)
  })

  it('does not log on L1 (the voice card shows a ghost of its letter)', async () => {
    await mount()
    const [k0] = pairKeys()
    fireEvent.click(byFace('voice', k0))
    fireEvent.click(byFace('letter', k0))
    expect(ledger).toEqual([])
  })

  it('a clean round ends in a summary with mastered letters and unlocks the next level', async () => {
    await mount()
    for (const k of pairKeys()) {
      fireEvent.click(byFace('voice', k))
      fireEvent.click(byFace('letter', k))
      flush()
    }
    await act(async () => {})
    const summary = screen.getByTestId('echo-summary')
    expect(summary).toHaveTextContent('You know these')
    expect(summary).toHaveTextContent('New level unlocked!')
    expect(loadEcho().unlocked).toBe(2)
    expect(screen.getByRole('button', { name: /Next level/ })).toBeInTheDocument()
  })

  it('an inaccurate round ends with letters to practise, stays locked, and re-deals them next round', async () => {
    await mount()
    const keys = pairKeys()
    // Two informed misses: reveal letter p, then pair voice p with the wrong letter.
    for (const [p, q] of [[keys[0], keys[1]], [keys[1], keys[0]]]) {
      fireEvent.click(byFace('letter', p)); fireEvent.click(byFace('letter', q)); flush()
      fireEvent.click(byFace('voice', p)); fireEvent.click(byFace('letter', q)); flush()
    }
    for (const k of keys) {
      if (byFace('voice', k).dataset.state === 'matched') continue
      fireEvent.click(byFace('voice', k)); fireEvent.click(byFace('letter', k)); flush()
    }
    await act(async () => {})
    expect(screen.getByTestId('echo-summary')).toHaveTextContent('Practise these')
    expect(loadEcho().unlocked).toBe(1)
    expect(Object.keys(loadEcho().due).sort()).toEqual([keys[0], keys[1]].sort())
    fireEvent.click(screen.getByRole('button', { name: /Again/ }))
    await act(async () => {})
    const next = pairKeys()
    expect(next).toEqual(expect.arrayContaining([keys[0], keys[1]]))
  })

  it('L1 voice cards show a ghost of their letter (visual hint); L2 voice cards are voice-only', async () => {
    await mount()
    const v = byFace('voice')
    fireEvent.click(v)
    expect(v.querySelector('[data-testid="echo-hint"]')).toHaveTextContent(/\S/)
  })

  it('L2: no ghost hint; a wrong pair is highlighted until it turns back', async () => {
    await mount({ unlocked: 2, due: {}, best: {} })
    const [k0, k1] = pairKeys()
    fireEvent.click(byFace('voice', k0))
    expect(document.querySelector('[data-testid="echo-hint"]')).toBeNull()
    fireEvent.click(byFace('letter', k1))
    expect(byFace('voice', k0)).toHaveAttribute('data-wrong', 'true')
    flush()
    expect(byFace('voice', k0)).not.toHaveAttribute('data-wrong')
  })

  it('level buttons are at least 44px and locked levels are disabled', async () => {
    await mount()
    const lv2 = screen.getByRole('button', { name: /Level 2/ })
    expect(lv2).toBeDisabled()
    expect(lv2.className).toMatch(/h-11/)
  })
})
