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
import { expectGuideOnlyLatin } from './brickTestUtils'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const IDS = FIDEL_FAMILIES.slice(0, 8).map((f) => f.id)
const POOL = ALL_FORMS.filter((f) => IDS.includes(f.familyId)).map((f) => f.audioKey)
const orderOf = (k) => Number(k.split('-')[1])

const flush = () => act(() => {
  for (let i = 0; i < 50 && waits.length; i++) {
    const w = waits.shift()
    if (!w.cancelled) w.cb()
  }
})
const cargo = () => Array.from(document.querySelectorAll('[data-testid="cargo"]'))
const keyOf = (b) => b.dataset.order
const car = (o) => screen.getByTestId(`car-${o}`)
// a brick tap = pointer down + up with no movement (the tap fallback of the drag brick)
const tap = (el) => { fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: 0, clientY: 0, pointerId: 1 }) }
const drop = (el, x, y) => { fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 }); fireEvent.pointerMove(el, { clientX: x, clientY: y, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: x, clientY: y, pointerId: 1 }) }

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
    const key = keyOf(c)
    tap(c)
    expect(played).toEqual([key])
    expect(c.parentElement).toHaveAttribute('data-held', 'true')
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
    const key = keyOf(c)
    const want = orderOf(key)
    const [w1, w2] = [1, 2, 3].filter((o) => o !== want)
    tap(c)
    fireEvent.click(car(w1))
    expect(effects).toContain('bad')
    played.length = 0
    flush()
    expect(played).toEqual([key, `le-${w1}`])
    expect(ledger).toEqual([{ k: key, p: `${key.split('-')[0]}-${w1}`, m: 'train' }])
    fireEvent.click(car(w2))
    flush()
    expect(car(want)).toHaveAttribute('data-glow', '1')
  })

  it('L4 is ears-only: cargo shows no letter', async () => {
    await mount({ unlocked: 4, due: {}, best: {} })
    for (const b of cargo()) expect(b.textContent.trim()).toBe('')
    expectGuideOnlyLatin(screen.getByTestId('brick-train'), 'Find the matching wagon')
    expect(cargo()[0]).toHaveAttribute('aria-label', expect.stringMatching(/Sound cargo/))
  })

  it('a full clean round departs and shows the summary, unlocking L2', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await mount()
    while (cargo().length) {
      const c = cargo()[0]
      tap(c)
      fireEvent.click(car(orderOf(keyOf(c))))
      flush()
    }
    await act(async () => { vi.advanceTimersByTime(2000) })
    vi.useRealTimers()
    expect(screen.getByTestId('train-summary')).toBeInTheDocument()
    expect(screen.getByLabelText('You know these')).toBeInTheDocument()
    expect(screen.getByText('New level unlocked!')).toBeInTheDocument()
    expect(loadTrain().unlocked).toBe(2)
  })

  it('look: brick train on a studded track, guide text via i18n, no transliteration or numerals beside fidel', async () => {
    await mount()
    const root = screen.getByTestId('brick-train')
    expectGuideOnlyLatin(root, 'Find the matching wagon')
    expect(screen.getByTestId('engine')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-testid^="car-"] [data-testid="pips"]')).toHaveLength(3) // language-free numbers on the wagons
    tap(cargo()[0])
    expectGuideOnlyLatin(root, 'Now tap its wagon')
    const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'VowelTrain.jsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(src).not.toMatch(/GEEZ_ONES/)
    expect([...src.matchAll(/>\s*([A-Za-z][A-Za-z ,.!']{2,})\s*</g)]).toEqual([])
    expect([...src.matchAll(/(?:aria-label|label)="([^"]*[A-Za-z][^"]*)"/g)]).toEqual([])
    for (const m of src.matchAll(/(?<![\w.$])t\(\s*'([^']+)'\s*,\s*'([^']*)'/g)) { expect(m[2]).toMatch(/^[A-Za-z][A-Za-z !.,']*$/); expect(m[2].length).toBeLessThanOrEqual(40) }
  })

  it('dragging a cargo brick onto a wagon loads it (right wagon) or shakes (wrong), like tap + tap', async () => {
    await mount()
    const rect = (o) => ({ left: o * 100, right: o * 100 + 80, top: 0, bottom: 80, width: 80, height: 80, x: o * 100, y: 0 })
    for (const o of [1, 2, 3]) car(o).getBoundingClientRect = () => rect(o)
    const c = cargo()[0]
    const key = keyOf(c)
    const want = orderOf(key)
    const wrong = [1, 2, 3].find((o) => o !== want)
    drop(c, wrong * 100 + 40, 40)
    expect(effects).toContain('bad')
    expect(ledger).toEqual([{ k: key, p: `${key.split('-')[0]}-${wrong}`, m: 'train' }])
    expect(cargo()).toHaveLength(6)
    drop(cargo().find((b) => keyOf(b) === key), want * 100 + 40, 40)
    expect(plucks).toEqual([want])
    expect(cargo()).toHaveLength(5)
    expect(screen.getByTestId('game-example')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-testid="loaded"]')).toHaveLength(1)
  })
})
