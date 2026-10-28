import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

const played = []
vi.mock('./platform/audioEngine', async (orig) => {
  const real = await orig()
  // afterVoice runs its callback at once so a pop advances in the test
  return { ...real, playForm: (form) => played.push(form.audioKey), playEffect: () => {}, playPluck: () => {}, afterVoice: (cb) => { cb(); return () => {} } }
})

import { StoneLessonForNode } from './LearnLetters'
import { FIDEL_FAMILIES, INDEXES } from './platform/ethiopic'
import { expectGuideOnlyLatin } from './components/brickTestUtils'

const family = FIDEL_FAMILIES[0]
const node = { familyId: family.id, chapter: 1 }
const view = () => render(<StoneLessonForNode node={node} soundOn onDone={() => {}} onBack={() => {}} />)

// The sign is the only place Latin may appear; hidden SVG <title>s are never drawn.
function expectBrickLook(container, guideText) {
  const clone = container.cloneNode(true)
  clone.querySelectorAll('svg title').forEach((n) => n.remove())
  expectGuideOnlyLatin(clone, guideText)
}

const trayButtons = () => [...document.querySelectorAll('[role="group"] button')]
const char = (key) => INDEXES.byAudioKey.get(key).char

describe('Letter Steps in the brick look (learn phases)', () => {
  it('MEET: a brick balloon, a shelf of seven slots, one guide sign, no Latin or glosses', () => {
    const { container } = view()
    expect(screen.getByTestId('brick-learn')).toBeTruthy()
    expectBrickLook(container, 'Pop the bubble!')
    expect(container.querySelectorAll('[data-testid="meet-shelf"] > div')).toHaveLength(7)
    // the older "1/7" counter and sound label are gone: nothing Latin or numeric beside the letter
    const balloon = screen.getByRole('button', { name: 'Pop the bubble' })
    expect(balloon.textContent).toMatch(/^\S$/u)
  })

  it('MEET: popping the balloon voices the letter and fills a shelf slot', async () => {
    const { container } = view()
    const balloon = screen.getByRole('button', { name: 'Pop the bubble' })
    fireEvent.pointerDown(balloon)
    expect(played).toContain(`${family.id}-1`)
    await waitFor(() => expect(container.querySelectorAll('[data-testid="meet-shelf"] .geez')).toHaveLength(1))
  })

  it('walks MEET, hops forward and back, then reaches the trace board with only the guide sign in English', async () => {
    const { container } = view()
    // MEET: pop every balloon
    for (let i = 0; i < 7; i++) {
      fireEvent.pointerDown(await screen.findByRole('button', { name: 'Pop the bubble' }))
      await act(async () => { await new Promise((r) => setTimeout(r, 450)) })
    }
    // FORWARD: the tray is in reading order; tap card i for stone i
    await screen.findByTestId('stone-river', {}, { timeout: 2000 })
    expectBrickLook(container, 'Listen! Tap the letter to hop across!')
    for (let i = 0; i < 7; i++) {
      fireEvent.click(trayButtons()[i])
      await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
    }
    // BACKWARD: lightly mixed tray; a wrong tap flips the sign to "try", then keep tapping until across
    await act(async () => { await new Promise((r) => setTimeout(r, 450)) })
    expectBrickLook(container, 'Listen! Hop back home!')
    fireEvent.click(trayButtons().find((b) => !b.disabled))
    for (let guard = 0; guard < 120 && screen.queryByTestId('stone-river'); guard++) {
      const open = trayButtons().filter((b) => !b.disabled)
      if (!open.length) break
      fireEvent.click(open[guard % open.length])
      await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    }
    // ECHO + SHUFFLE (Feed Anbessa): tap bricks with the keyboard until the trace board appears
    for (let guard = 0; guard < 200 && !screen.queryByTestId('trace-board'); guard++) {
      const bricks = container.querySelectorAll('[data-form]')
      if (bricks.length) fireEvent.keyDown(bricks[guard % bricks.length], { key: 'Enter' })
      await act(async () => { await new Promise((r) => setTimeout(r, 120)) })
    }
    expect(screen.queryByTestId('trace-board')).toBeTruthy()
    expectBrickLook(container, 'Hear it, then trace it with your finger')
    // the hear button in the wood bar replays the letter being traced
    played.length = 0
    fireEvent.click(screen.getByTestId('hear-again'))
    expect(played).toHaveLength(1)
    expect(char(played[0])).toBeTruthy()
  }, 60000)
})
