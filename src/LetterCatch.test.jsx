import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const played = []
const effects = []
vi.mock('./platform/audioEngine', async (orig) => ({
  ...(await orig()),
  playForm: (form) => played.push(form?.audioKey),
  playEffect: (kind) => effects.push(kind),
}))
const ledger = []
vi.mock('./platform/telemetry', async (orig) => ({
  ...(await orig()),
  recordAnswer: (k, p, m) => ledger.push({ k, p, m }),
}))

import LetterCatch from './LetterCatch'
import { ALL_FORMS } from './platform/ethiopic'
import { expectGuideOnlyLatin } from './components/brickTestUtils'

const POOL = ALL_FORMS.filter((_, i) => i % 5 === 0).map((f) => f.audioKey).slice(0, 24)
const field = () => screen.getByTestId('catch-field')
const target = () => field().dataset.catchTarget
const tick = (ms = 250) => act(() => { vi.advanceTimersByTime(ms) })
const bricks = () => [...document.querySelectorAll('[data-testid="catch-brick"]')]
/** run the clock until a brick matching `pred` (given the called key) is on screen */
function waitFor(pred, max = 120) {
  for (let i = 0; i < max; i++) {
    const hit = bricks().find((b) => pred(b.dataset.fam))
    if (hit) return hit
    tick()
  }
  throw new Error('no matching brick appeared')
}

beforeEach(() => {
  played.length = 0; effects.length = 0; ledger.length = 0
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
})
afterEach(() => { vi.useRealTimers() })

const mount = (props = {}) => {
  const onExit = vi.fn()
  const r = render(<LetterCatch level="easy" seed={7} soundOn pool={POOL} onExit={onExit} {...props} />)
  return { onExit, ...r }
}

describe('Letter Catch brick screen', () => {
  it('shows the guide, hearts and an empty bin; the called letter is said, never shown', () => {
    mount()
    expect(screen.getByTestId('brick-catch')).toBeInTheDocument()
    expectGuideOnlyLatin(screen.getByTestId('brick-catch'), 'Listen, then catch it!')
    expect(screen.getByTestId('catch-lives').children).toHaveLength(3)
    expect(screen.getByTestId('catch-bin').children).toHaveLength(8)
    expect(screen.queryAllByTestId('bin-brick')).toHaveLength(0)
    expect(played).toContain(target())
    // sound on: the glyph of the called letter is not revealed as a hint brick
    expect(document.querySelectorAll('[data-testid="catch-hear"]')).toHaveLength(1)
  })

  it('tapping the called letter fills the bin, says "Nice!", and logs a correct catch', () => {
    mount()
    const want = target()
    fireEvent.click(waitFor((k) => k === want))
    expect(screen.getAllByTestId('bin-brick')).toHaveLength(1)
    expect(screen.getByTestId('guide')).toHaveTextContent('Nice!')
    expect(effects).toContain('good')
    expect(ledger.at(-1)).toMatchObject({ k: want, p: want, m: 'catch' })
  })

  it('a wrong tap costs a heart, says "Try again!", replays the called letter', () => {
    mount()
    const want = target()
    const b = waitFor((k) => k !== want)
    const n = played.length
    fireEvent.click(b)
    expect(screen.getByTestId('guide')).toHaveTextContent('Try again!')
    expect(effects).toContain('bad')
    expect(ledger.at(-1)).toMatchObject({ k: want, p: b.dataset.fam })
    tick(600)
    expect(played.length).toBeGreaterThan(n)
    expect(screen.queryAllByTestId('bin-brick')).toHaveLength(0)
  })

  it('play-through: catching every called letter wins and exits as won', () => {
    const { onExit } = mount()
    for (let i = 0; i < 8; i++) {
      const want = target()
      fireEvent.click(waitFor((k) => k === want))
      tick(50)
    }
    expect(field().dataset.catchPhase).toBe('WIN')
    expect(screen.getAllByTestId('bin-brick')).toHaveLength(8)
    expect(screen.getByTestId('guide')).toHaveTextContent('Great catching!')
    expect(effects).toContain('win')
    expect(onExit).not.toHaveBeenCalled() // the celebration plays first
    tick(2600)
    expect(onExit).toHaveBeenCalledWith({ won: true })
    expectGuideOnlyLatin(screen.getByTestId('brick-catch'))
  })

  it('three wrong taps lose; "run again" starts fresh, home exits as not won', () => {
    const { onExit } = mount()
    for (let i = 0; i < 3; i++) {
      const want = target()
      fireEvent.click(waitFor((k) => k !== want))
      tick(50)
    }
    expect(screen.getByTestId('brick-catch-lose')).toBeInTheDocument()
    expectGuideOnlyLatin(screen.getByTestId('brick-catch-lose'), 'Out of hearts!')
    fireEvent.click(screen.getByTestId('catch-again'))
    expect(field().dataset.catchPhase).toBe('PLAY')
    expect(screen.getByTestId('catch-lives').children).toHaveLength(3)
    expect(screen.queryAllByTestId('bin-brick')).toHaveLength(0)
    expect(onExit).not.toHaveBeenCalled()
    for (let i = 0; i < 3; i++) {
      const want = target()
      fireEvent.click(waitFor((k) => k !== want))
      tick(50)
    }
    fireEvent.click(screen.getByTestId('catch-home'))
    expect(onExit).toHaveBeenCalledWith({ won: false })
  })

  it('muted: the called letter is shown on a brick; the back button quits', () => {
    const { onExit } = mount({ soundOn: false })
    const brick = screen.getByTestId('brick-catch')
    expect(brick.textContent).toContain(ALL_FORMS.find((f) => f.audioKey === target()).char)
    expectGuideOnlyLatin(brick)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onExit).toHaveBeenCalledWith({ won: false })
  })

  it('bricks and aria names carry no Latin pronunciation', () => {
    mount()
    waitFor(() => true)
    for (const b of bricks()) expect(b.getAttribute('aria-label')).not.toMatch(/\b(le|lu|la|sounds?)\b/i)
  })

  it('source lint: no hard-coded English, every new guide fallback is a short plain phrase', () => {
    const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'LetterCatch.jsx'), 'utf8')
    expect([...src.matchAll(/>\s*([A-Za-z][A-Za-z ,.!']{2,})\s*</g)]).toEqual([])
    expect([...src.matchAll(/(?:aria-label|label)="([^"]*[A-Za-z][^"]*)"/g)]).toEqual([])
    const guides = []
    for (const m of src.matchAll(/(?<![\w.$])t\(\s*'([^']+)'\s*,\s*'([^']*)'/g)) {
      if (m[1].startsWith('catchBrick')) { expect(m[2]).toMatch(/^[A-Za-z][A-Za-z !.,']*$/); expect(m[2].length).toBeLessThanOrEqual(40); guides.push(m[2]) }
    }
    expect(guides.length).toBeGreaterThanOrEqual(2)
  })
})
