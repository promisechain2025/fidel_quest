import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { KokebSvg } from './KokebSvg'
import { JibbySvg } from './JibbySvg'

describe('authored cast SVGs', () => {
  it('Kokeb renders an accessible star svg', () => {
    const { container, getByLabelText } = render(<KokebSvg title="Kokeb" />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(getByLabelText('Kokeb')).toBeTruthy()
  })
  it('Jibby switches between a fanged smirk and an open, tongue-out maw', () => {
    const grin = render(<JibbySvg expression="grin" />).container.innerHTML
    const agit = render(<JibbySvg expression="agitated" />).container.innerHTML
    // only the agitated maw draws the pink tongue; only the grin draws the smirk stroke
    expect(grin).not.toContain('#e58aa0')
    expect(agit).toContain('#e58aa0')
    expect(grin).toContain('stroke-width="3.2"')
  })
  it('two Jibby instances get distinct gradient ids', () => {
    const { container } = render(<div><JibbySvg /><JibbySvg /></div>)
    const ids = [...container.querySelectorAll('radialGradient')].map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
