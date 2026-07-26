import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AnbessaSvg } from './AnbessaSvg'

describe('AnbessaSvg', () => {
  it('renders an accessible svg with the character label', () => {
    const { container, getByLabelText } = render(<AnbessaSvg title="Anbessa" />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(getByLabelText('Anbessa')).toBeTruthy()
  })
  it('namespaces gradient ids so two instances do not collide', () => {
    const { container } = render(<div><AnbessaSvg /><AnbessaSvg /></div>)
    const ids = [...container.querySelectorAll('linearGradient, radialGradient')].map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length) // all unique
  })
  it('adds raised paws only in the cheer expression', () => {
    const happy = render(<AnbessaSvg expression="happy" />).container.innerHTML
    const cheer = render(<AnbessaSvg expression="cheer" />).container.innerHTML
    // the cheer pose draws two extra thick strokes (arms) the happy pose lacks
    const arms = (s) => (s.match(/stroke-width="15"/g) || []).length
    expect(arms(happy)).toBe(0)
    expect(arms(cheer)).toBe(2)
  })
})
