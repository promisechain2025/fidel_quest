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
  it('Jibby renders and switches teeth between grin and agitated', () => {
    const grin = render(<JibbySvg expression="grin" />).container.innerHTML
    const agit = render(<JibbySvg expression="agitated" />).container.innerHTML
    // agitated draws the wide dark maw ellipse the grin lacks
    expect(grin).not.toContain('rx="24" ry="16"')
    expect(agit).toContain('rx="24" ry="16"')
  })
  it('two Jibby instances get distinct gradient ids', () => {
    const { container } = render(<div><JibbySvg /><JibbySvg /></div>)
    const ids = [...container.querySelectorAll('radialGradient')].map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
