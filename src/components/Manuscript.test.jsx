import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TibebFrame, LetterTile, Harag } from './Manuscript'

describe('Manuscript primitives', () => {
  it('TibebFrame mounts without throwing when canvas 2d context is unavailable (jsdom)', () => {
    // jsdom returns null from getContext; paintGround must guard it.
    const { container, unmount } = render(<TibebFrame />)
    expect(container.querySelector('canvas')).toBeTruthy()
    // two fixed side bands
    expect(container.querySelectorAll('div[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2)
    unmount()
  })

  it('LetterTile renders the glyph in the done/current states and a lock when locked', () => {
    const { getByText, rerender, container } = render(<LetterTile glyph="ሀ" state="current" />)
    expect(getByText('ሀ')).toBeTruthy()
    rerender(<LetterTile glyph="ሀ" state="locked" />)
    // locked hides the glyph and shows a lock icon (svg), not the letter
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('Harag renders an svg ornament', () => {
    const { container } = render(<Harag />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    // medallion + finials + woven strands => several drawn shapes
    expect(svg.querySelectorAll('circle, path').length).toBeGreaterThan(3)
  })
})
