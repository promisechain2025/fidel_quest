import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BubbleSky, RiverCrossing, FeedMeadow, LaneVista, TraceChrome } from './StepScenery'

describe('letter-step scenery', () => {
  it('paints the meet sky, the river, the feed lawn, and the runner lane', () => {
    const { container } = render(
      <div>
        <BubbleSky />
        <RiverCrossing />
        <FeedMeadow />
        <LaneVista />
      </div>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(4)
    expect(container.querySelector('[data-scene="bubble"]')).toBeTruthy()
    expect(container.querySelector('[data-scene="river"]')).toBeTruthy()
    const feed = container.querySelector('[data-scene="feed"]')
    expect(feed).toBeTruthy()
    const quiet = [...feed.querySelectorAll('rect')].filter((r) => r.getAttribute('stroke') === '#c4b08a')
    expect(quiet).toHaveLength(1)
    expect(feed.querySelector('circle[fill="#c0453a"]')).toBeNull()
    expect(container.querySelector('[data-scene="lane"]')).toBeTruthy()
  })

  it('gives the trace pad a quiet hairline and no corner jewels', () => {
    const { container } = render(<TraceChrome />)
    const frame = container.querySelector('[data-scene="trace"]')
    expect(frame).toBeTruthy()
    expect(frame.querySelectorAll('span')).toHaveLength(1)
    expect(frame.querySelector('circle')).toBeNull()
    expect(frame.getAttribute('class')).toContain('pointer-events-none')
  })
})
