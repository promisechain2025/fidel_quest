import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const played = []
vi.mock('./platform/audioEngine', async (orig) => {
  const real = await orig()
  return { ...real, playForm: (form) => played.push(form.audioKey), playEffect: () => {}, playPluck: () => {}, afterVoice: () => () => {} }
})

import { StoneLessonForNode } from './LearnLetters'
import { FIDEL_FAMILIES } from './platform/ethiopic'
import { expectGuideOnlyLatin } from './components/brickTestUtils'

const node = { families: FIDEL_FAMILIES.slice(0, 3).map((f) => f.id), chapter: 1 }

describe('Mix (Feed Anbessa) in the brick look', () => {
  it('shows the guide sign and letter bricks with no Latin sound labels or glosses', () => {
    const { container } = render(<StoneLessonForNode node={node} soundOn onDone={() => {}} onBack={() => {}} />)
    expect(screen.getByTestId('brick-feed')).toBeTruthy()
    const clone = container.cloneNode(true)
    clone.querySelectorAll('svg title').forEach((n) => n.remove()) // hidden SVG names, never drawn
    expectGuideOnlyLatin(clone, 'Be quick, feed Anbessa!')
    const bricks = container.querySelectorAll('[data-form]')
    expect(bricks.length).toBeGreaterThanOrEqual(3)
    bricks.forEach((b) => expect(b.getAttribute('aria-label')).toBe(b.textContent))
  })

  it('feeding bricks with the keyboard flips the guide sign to ok or try again', () => {
    const { container } = render(<StoneLessonForNode node={node} soundOn onDone={() => {}} onBack={() => {}} />)
    const seen = new Set()
    for (const b of container.querySelectorAll('[data-form]')) {
      fireEvent.keyDown(b, { key: 'Enter' })
      seen.add(screen.getByTestId('guide').getAttribute('data-tone'))
      if (seen.has('try') || seen.has('ok')) break
    }
    expect(seen.has('try') || seen.has('ok')).toBe(true)
  })
})
