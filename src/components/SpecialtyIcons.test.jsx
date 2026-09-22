import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SpecialtyIcon, NodeEmblem, SPECIALTY_NAMES } from './SpecialtyIcons'

describe('specialty icons', () => {
  it('draws every backpack mark as an svg', () => {
    const { container } = render(
      <div>
        {SPECIALTY_NAMES.map((name) => <SpecialtyIcon key={name} name={name} />)}
      </div>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(SPECIALTY_NAMES.length)
  })

  it('namespaces gradient ids across two instances', () => {
    const { container } = render(<div><SpecialtyIcon name="closet" /><SpecialtyIcon name="closet" /></div>)
    const ids = [...container.querySelectorAll('[id]')].map((n) => n.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('draws path-node emblems', () => {
    const { container } = render(
      <div>
        {['runner', 'catch', 'boss', 'story', 'review'].map((kind) => <NodeEmblem key={kind} kind={kind} />)}
      </div>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(5)
  })
})
