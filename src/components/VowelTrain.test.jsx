import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const played = []
const effects = []
const plucks = []
const waits = []
vi.mock('../platform/audioEngine', async (orig) => {
  const real = await orig()
  return {
    ...real,
    playForm: (form) => played.push(form.audioKey),
    playEffect: (kind) => effects.push(kind),
    playPluck: (o) => plucks.push(o),
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

import VowelTrain from './VowelTrain'
import { FIDEL_FAMILIES, ALL_FORMS } from '../platform/ethiopic'
import { loadTrain, saveTrain } from '../trainCore'

const IDS = FIDEL_FAMILIES.slice(0, 8).map((f) => f.id)
const POOL = ALL_FORMS.filter((f) => IDS.includes(f.familyId)).map((f) => f.audioKey)
const orderOf = (k) => Number(k.split('-')[1])

const flush = () => act(() => {
  for (let i = 0; i < 50 && waits.length; i++) {
    const w = waits.shift()
    if (!w.cancelled) w.cb()
  }
})
const cargo = () => Array.from(document.querySelectorAll('[data-testid="platform"] > button'))
const car = (o) => screen.getByTestId(`car-${o}`)

async function mount(progress) {
  if (progress) saveTrain(progress)
  render(<VowelTrain soundOn onBack={() => {}} pool={POOL} extra={[]} />)
  await act(async () => {})
}

beforeEach(() => {
  played.length = 0; effects.length = 0; plucks.length = 0; waits.length = 0; ledger.length = 0
})

describe('Vowel Train screen', () => {
  it('L1 shows 3 cars and 6 cargo; tapping a car with nothing picked plays its anchor letter', async () => {
    await mount()
    expect(document.querySelectorAll('[data-testid^="car-"]')).toHaveLength(3)
    expect(cargo()).toHaveLength(6)
    fireEvent.click(car(2))
    expect(played).toEqual(['le-2'])
  })

  it('pick + right car: cargo speaks, loads, the car plucks its note, example moment, ledger "train"', async () => {
    await mount()
    const c = cargo()[0]
    const key = c.dataset.key
    fireEvent.click(c)
    expect(played).toEqual([key])
    expect(c).toHaveAttribute('data-held', 'true')
    fireEvent.click(car(orderOf(key)))
    expect(plucks).toEqual([orderOf(key)])
    expect(cargo()).toHaveLength(5)
    expect(screen.getByTestId('game-example')).toBeInTheDocument()
    expect(ledger).toEqual([{ k: key, p: key, m: 'train' }])
    played.length = 0
    flush()
    expect(played[0]).toBe(key) // said again
  })

  it('wrong car replays the cargo, then that car (hear the difference); the right car glows after two misses', async () => {
    await mount()
    const c = cargo()[0]
    const key = c.dataset.key
    const want = orderOf(key)
    const [w1, w2] = [1, 2, 3].filter((o) => o !== want)
    fireEvent.click(c)
    fireEvent.click(car(w1))
    expect(effects).toContain('bad')
    played.length = 0
    flush()
    expect(played).toEqual([key, `le-${w1}`])
    expect(ledger).toEqual([{ k: key, p: `${key.split('-')[0]}-${w1}`, m: 'train' }])
    fireEvent.click(car(w2))
    flush()
    expect(car(want).querySelector('span').getAttribute('style')).toMatch(/var\(--go\)/)
  })

  it('L4 is ears-only: cargo shows no letter', async () => {
    await mount({ unlocked: 4, due: {}, best: {} })
    for (const b of cargo()) expect(b.textContent.trim()).toBe('')
    expect(cargo()[0]).toHaveAttribute('aria-label', expect.stringMatching(/Sound cargo/))
  })

  it('a full clean round departs and shows the summary, unlocking L2', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await mount()
    while (cargo().length) {
      const c = cargo()[0]
      fireEvent.click(c)
      fireEvent.click(car(orderOf(c.dataset.key)))
      flush()
    }
    await act(async () => { vi.advanceTimersByTime(2000) })
    vi.useRealTimers()
    expect(screen.getByTestId('train-summary')).toHaveTextContent('You know these')
    expect(loadTrain().unlocked).toBe(2)
  })
})
