import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HighlandMeadow, CoverArt, ChapterVista } from './HighlandScenery'

describe('highland scenery', () => {
  it('paints a meadow miniature and a chapter ridge', () => {
    const { container } = render(
      <div>
        <HighlandMeadow />
        <ChapterVista chapter={2} />
      </div>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(2)
  })

  it('draws each hiding-place cover', () => {
    const { container } = render(
      <div>
        {['cloud', 'tree', 'bush', 'rock', 'grass'].map((kind) => <CoverArt key={kind} kind={kind} />)}
      </div>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(5)
  })
})
