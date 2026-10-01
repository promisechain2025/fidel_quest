/* Solo Bingo regression: the parent passes a NEW `families` array on every
   render (and each correct daub re-renders it through progressChanged). The
   card used to re-deal on every such render, so a correct daub was wiped and
   the game could never be won. Also: a card never holds two same-sound
   letters (e.g. ጸ and ፀ), or a called letter would have two answers. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const played = []
vi.mock('../platform/audioEngine', async (importOriginal) => ({
  ...(await importOriginal()),
  playForm: (form) => played.push(form?.audioKey),
  playEffect: () => {},
}))

const { default: BingoCard } = await import('./BingoCard')
const { soloPool } = await import('../bingoPool')
const { soundKeyOf } = await import('../platform/sameSound')
const { INDEXES, FIDEL_FAMILIES } = await import('../platform/ethiopic')

const ALL_IDS = () => FIDEL_FAMILIES.map((f) => f.id)
const marks = (c) => c.querySelectorAll('svg.lucide-star').length

beforeEach(() => { played.length = 0 })

describe('Solo Bingo', () => {
  it('keeps a correct daub when the parent re-renders with a fresh families array', () => {
    const { container, rerender } = render(<BingoCard soundOn onBack={() => {}} families={ALL_IDS()} />)
    fireEvent.click(screen.getByText('Play solo'))
    for (let n = 1; n <= 3; n++) {
      const called = played[played.length - 1]
      const glyph = INDEXES.byAudioKey.get(called).char
      const cell = screen.getAllByText(glyph).map((el) => el.closest('button')).find(Boolean)
      act(() => { fireEvent.click(cell) })
      // what recordAnswer -> progressChanged does to the real parent:
      rerender(<BingoCard soundOn onBack={() => {}} families={ALL_IDS()} />)
      expect(marks(container)).toBe(n)
    }
  })

  it('never deals two same-sound letters into the pool', () => {
    for (const scope of [ALL_IDS(), ['tse', 'ttse', 'se', 'sse', 'ha', 'hha', 'kha', 'a', 'ae'], ['le']]) {
      const pool = soloPool(scope)
      expect(pool.length).toBeGreaterThanOrEqual(9)
      const sounds = pool.map((k) => soundKeyOf(k))
      expect(new Set(sounds).size).toBe(sounds.length)
    }
  })
})
