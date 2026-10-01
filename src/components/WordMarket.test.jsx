import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const played = []
const words = []
const effects = []
const waits = []
vi.mock('../platform/audioEngine', async (orig) => {
  const real = await orig()
  return {
    ...real,
    playForm: (form) => played.push(form.audioKey),
    playEffect: (kind) => effects.push(kind),
    playPluck: () => {},
    afterVoice: (cb) => {
      const w = { cb, cancelled: false }
      waits.push(w)
      return () => { w.cancelled = true }
    },
    audio: Object.assign(Object.create(Object.getPrototypeOf(real.audio)), real.audio, {
      hasClip: () => Promise.resolve(true),
      play: (key) => words.push(key),
    }),
  }
})
const ledger = []
vi.mock('../platform/telemetry', async (orig) => ({
  ...(await orig()),
  recordAnswer: (k, p, m) => ledger.push({ k, p, m }),
}))

import WordMarket from './WordMarket'
import { ALL_FORMS } from '../platform/ethiopic'
import { ALL_WORDS } from '../FidelQuestApp'
import { marketStock, loadMarket, saveMarket, letterMiss } from '../wordMarketCore'

const POOL = ALL_FORMS.map((f) => f.audioKey)
const BY_ID = new Map(marketStock(ALL_WORDS).map((w) => [w.id, w]))
const flush = () => act(() => {
  for (let i = 0; i < 60 && waits.length; i++) {
    const w = waits.shift()
    if (!w.cancelled) w.cb()
  }
})
const stallIds = () => Array.from(document.querySelectorAll('[data-testid^="stall-"]')).map((b) => b.dataset.testid.slice(6))
const lineId = (i) => screen.getByTestId(`line-${i}`).dataset.id

async function mount(progress) {
  if (progress) saveMarket(progress)
  render(<WordMarket soundOn onBack={() => {}} pool={POOL} />)
  await act(async () => {})
}

beforeEach(() => {
  played.length = 0; words.length = 0; effects.length = 0; waits.length = 0; ledger.length = 0
  localStorage.removeItem('fq.market.v1')
})

describe('Word Market screen', () => {
  it('L1: one fidel word on the list (no picture), three pictures on the stall', async () => {
    await mount()
    expect(document.querySelectorAll('[data-testid^="line-"]')).toHaveLength(1)
    expect(stallIds()).toHaveLength(3)
    const id = lineId(0)
    expect(screen.getByTestId('line-0')).toHaveTextContent(BY_ID.get(id).geez)
    expect(stallIds()).toContain(id)
  })

  it('tapping a list line sounds it out letter by letter (never the whole word)', async () => {
    await mount()
    const w = BY_ID.get(lineId(0))
    fireEvent.click(screen.getByTestId('line-0'))
    flush()
    expect(played).toEqual(w.keys)
    await act(async () => {})
    expect(words).toEqual([])
  })

  it('right item: basket, tick + picture on the line, whole word said, ledger word:<id> "market"', async () => {
    await mount()
    const id = lineId(0)
    fireEvent.click(screen.getByTestId(`stall-${id}`))
    expect(ledger).toEqual([{ k: `word:${id}`, p: `word:${id}`, m: 'market' }])
    expect(screen.getByTestId('game-example')).toBeInTheDocument()
    flush()
    await act(async () => {})
    if (!BY_ID.get(id).noAudio) expect(words).toContain(`words/${id}`)
  })

  it('wrong item: wobble + "bad", then the line is sounded out; logs the word and a same-family letter miss', async () => {
    await mount({ unlocked: 3, due: {}, best: {} })
    const id = lineId(0)
    const want = BY_ID.get(id)
    const decoy = stallIds().find((s) => !Array.from(document.querySelectorAll('[data-testid^="line-"]')).some((l) => l.dataset.id === s))
    fireEvent.click(screen.getByTestId(`stall-${decoy}`))
    expect(effects).toContain('bad')
    expect(ledger[0]).toEqual({ k: `word:${id}`, p: `word:${decoy}`, m: 'market' })
    const lm = letterMiss(want, BY_ID.get(decoy))
    if (lm) expect(ledger[1]).toEqual({ k: lm.heard, p: lm.picked, m: 'market' })
    played.length = 0
    flush()
    await act(async () => {})
    flush()
    expect(played).toEqual(want.keys)
  })

  it('two misses make the right item glow', async () => {
    await mount()
    const id = lineId(0)
    const decoy = stallIds().find((s) => s !== id)
    fireEvent.click(screen.getByTestId(`stall-${decoy}`))
    flush()
    fireEvent.click(screen.getByTestId(`stall-${decoy}`))
    expect(screen.getByTestId(`stall-${id}`).getAttribute('style')).toMatch(/var\(--go\)/)
  })

  it('L4 shows the list for a peek; stall waits; the hidden list cannot be sounded out', async () => {
    await mount({ unlocked: 4, due: {}, best: {} })
    const id = lineId(0)
    expect(screen.getByTestId(`stall-${id}`)).toBeDisabled()
    fireEvent.click(screen.getByTestId('market-ready'))
    expect(screen.getByTestId('line-0')).not.toHaveTextContent(BY_ID.get(id).geez)
    expect(screen.getByTestId('market-peek')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('line-0'))
    flush()
    expect(played).toEqual([])
  })

  it('a clean round shows the summary and unlocks L2', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await mount()
    fireEvent.click(screen.getByTestId(`stall-${lineId(0)}`))
    flush()
    await act(async () => { vi.advanceTimersByTime(2500) })
    vi.useRealTimers()
    expect(screen.getByTestId('market-summary')).toHaveTextContent('You know these')
    expect(loadMarket().unlocked).toBe(2)
  })
})
