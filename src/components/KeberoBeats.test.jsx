import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expectGuideOnlyLatin } from './brickTestUtils'

const played = []
const words = []
const effects = []
const drums = []
const waits = []
vi.mock('../platform/audioEngine', async (orig) => {
  const real = await orig()
  return {
    ...real,
    playForm: (form) => played.push(form.audioKey),
    playEffect: (kind) => effects.push(kind),
    playDrum: (rim) => drums.push(rim ? 'rim' : 'hit'),
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

import KeberoBeats from './KeberoBeats'
import { ALL_FORMS } from '../platform/ethiopic'
import { saveBeats, loadBeats } from '../keberoCore'

const POOL = ALL_FORMS.map((f) => f.audioKey)
const flush = (n = 80) => act(() => {
  for (let i = 0; i < n && waits.length; i++) {
    const w = waits.shift()
    if (!w.cancelled) w.cb()
  }
})

async function mount(progress) {
  if (progress) saveBeats(progress)
  render(<KeberoBeats soundOn onBack={() => {}} pool={POOL} />)
  await act(async () => {})
  await act(async () => {})
}

beforeEach(() => {
  played.length = 0; words.length = 0; effects.length = 0; drums.length = 0; waits.length = 0; ledger.length = 0
  localStorage.removeItem('fq.beats.v1')
})

describe('Kebero Beats screen', () => {
  it('L1: drum taps add beat dots; clear resets; the word is said at the start', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await mount()
    await act(async () => { vi.advanceTimersByTime(600) })
    vi.useRealTimers()
    expect(words.some((w) => w.startsWith('words/'))).toBe(true)
    fireEvent.click(screen.getByTestId('drum'))
    fireEvent.click(screen.getByTestId('drum'))
    expect(screen.getAllByTestId('beat-dot')).toHaveLength(2)
    expect(drums).toEqual(['hit', 'hit'])
    fireEvent.click(screen.getByTestId('beats-clear'))
    expect(screen.queryAllByTestId('beat-dot')).toHaveLength(0)
  })

  it('L1 wrong count: "bad", logged as beats:<word>#n, the beats are drummed out with their letters', async () => {
    await mount()
    for (let i = 0; i < 7; i++) fireEvent.click(screen.getByTestId('drum'))
    fireEvent.click(screen.getByTestId('beats-done'))
    expect(effects).toContain('bad')
    expect(ledger[0].m).toBe('beats')
    expect(ledger[0].p).toMatch(/^beats:.+#7$/)
    flush()
    expect(played.length).toBeGreaterThanOrEqual(2)
  })

  it('L1 right count: reveal, then the next word, through to the summary', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await mount()
    let goods = 0
    for (let guard = 0; guard < 40 && !screen.queryByTestId('beats-summary'); guard++) {
      if (!screen.queryByTestId('drum')) { await act(async () => { vi.advanceTimersByTime(3000) }); continue }
      const c = (guard % 4) + 1
      for (let i = 0; i < c; i++) fireEvent.click(screen.getByTestId('drum'))
      fireEvent.click(screen.getByTestId('beats-done'))
      if (effects.at(-1) === 'good') goods++
      flush()
      flush()
    }
    await act(async () => { vi.advanceTimersByTime(3000) })
    vi.useRealTimers()
    expect(goods).toBe(5)
    expect(screen.getByTestId('beats-summary')).toBeInTheDocument()
    expect(ledger.every((e) => e.m === 'beats')).toBe(true)
  })

  it('L2: tap the beat tile that said the letter; wrong replays tapped then asked', { retry: 3 }, async () => {
    await mount({ unlocked: 2, due: {}, best: {} })
    const tiles = Array.from(document.querySelectorAll('[data-testid^="beat-"]')).filter((e) => /^beat-\d+$/.test(e.dataset.testid))
    expect(tiles.length).toBeGreaterThanOrEqual(2)
    // press the ask button to learn which letter is asked
    played.length = 0
    fireEvent.click(screen.getByTestId('beats-ask'))
    const ask = played[0]
    const labels = tiles.map((t) => t.getAttribute('aria-label'))
    const askChar = ALL_FORMS.find((f) => f.audioKey === ask).char
    const wrongIdx = labels.findIndex((l) => l !== askChar)
    played.length = 0
    fireEvent.click(tiles[wrongIdx])
    expect(effects).toContain('bad')
    expect(ledger[0]).toMatchObject({ k: ask, m: 'beats' })
    flush()
    expect(played.slice(-1)[0]).toBe(ask)
    fireEvent.click(tiles[labels.indexOf(askChar)])
    expect(effects.at(-1)).toBe('good')
  }) // retry: a random pick can rarely draw identical tiles (test-only)

  it('L3 shows an empty drum and sibling options; L4 shows slots and a tray', async () => {
    await mount({ unlocked: 3, due: {}, best: {} })
    expect(screen.getByTestId('beat-gap')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-testid^="opt-"]').length).toBeGreaterThanOrEqual(2)
  })

  it('L4: tapping the right tray tile fills the first slot', async () => {
    await mount({ unlocked: 4, due: {}, best: {} })
    const slots = document.querySelectorAll('[data-testid^="slot-"]')
    expect(slots.length).toBeGreaterThanOrEqual(2)
    const tray = Array.from(document.querySelectorAll('[data-testid^="tray-"]'))
    // tray ids w0..wn are the word's letters in order
    fireEvent.click(tray.find((t) => t.dataset.testid === 'tray-w0'))
    expect(screen.getByTestId('slot-0')).toHaveAttribute('aria-label', expect.not.stringMatching(/Missing/))
    expect(loadBeats().unlocked).toBe(4)
  })

  it('look: brick kebero + beat bricks, guide text via i18n, nothing but fidel beside fidel (all 4 levels)', async () => {
    await mount()
    const root = () => screen.getByTestId('brick-beats')
    expectGuideOnlyLatin(root(), 'Drum once for each beat')
    fireEvent.click(screen.getByTestId('drum'))
    expect(screen.getByTestId('beat-dot')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('beats-done'))
    expect(['Try again!', 'Nice!']).toContain(screen.getByTestId('guide').textContent)
    expectGuideOnlyLatin(root(), screen.getByTestId('guide').textContent)
  })

  it.each([[2, 'Tap the beat you hear'], [3, 'Fill the empty drum'], [4, 'Build the word in order']])('look L%i: guide "%s", Latin only in the sign', async (lv, text) => {
    await mount({ unlocked: lv, due: {}, best: {} })
    expectGuideOnlyLatin(screen.getByTestId('brick-beats'), text)
    expect(screen.getByTestId('level-' + lv)).toBeInTheDocument()
  })

  it('source lint: no hard-coded English, every t() fallback is a short plain phrase', () => {
    const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'KeberoBeats.jsx'), 'utf8')
    expect([...src.matchAll(/>\s*([A-Za-z][A-Za-z ,.!']{2,})\s*</g)]).toEqual([])
    expect([...src.matchAll(/(?:aria-label|label)="([^"]*[A-Za-z][^"]*)"/g)]).toEqual([])
    const guides = []
    for (const m of src.matchAll(/(?<![\w.$])t\(\s*'([^']+)'\s*,\s*'([^']*)'/g)) {
      if (m[1].startsWith('beatsBrick')) { expect(m[2]).toMatch(/^[A-Za-z][A-Za-z !.,']*$/); expect(m[2].length).toBeLessThanOrEqual(40); guides.push(m[2]) }
    }
    expect(guides.length).toBeGreaterThanOrEqual(5)
  })
})
