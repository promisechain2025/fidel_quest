/* Warm-up nudge: "Not now" must open the node the child tapped (it used to
   just close the dialog, so the tap did nothing). A Grown-ups "require
   warm-up" rule still keeps the child on the path. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react'
import { JOURNEY, NodeKind, completeNode } from './journey'
import { recordAnswer } from './platform/telemetry'

const { default: FidelQuestApp } = await import('./FidelQuestApp')

const arcade = JOURNEY.find((n) => n.kind === NodeKind.ARCADE)

function seed({ parentRule }) {
  // Everything before the first arcade node is done, so it is the open node.
  let p = { version: 1, done: {}, collection: { owned: [], worn: {} } }
  for (const n of JOURNEY.slice(0, JOURNEY.indexOf(arcade))) p = completeNode(p, n.id)
  // A trouble letter makes the nudge "enforced" (no Play anyway).
  for (let i = 0; i < 4; i++) recordAnswer('ha-1', 'le-1', 'quiz')
  if (parentRule) localStorage.setItem('fq.plan.v1', JSON.stringify({ pace: 'steady', requireWarmup: true, startedOn: '2026-10-01' }))
}

beforeEach(() => {
  vi.stubGlobal('Audio', class { addEventListener() {} play() { return Promise.resolve() } })
  cleanup()
})

const openArcade = async () => {
  const btn = screen.getAllByRole('button').find((b) => b.getAttribute('aria-current') === 'step' && /runner|catch|arcade|game/i.test(b.getAttribute('aria-label') || b.textContent))
  expect(btn).toBeTruthy()
  await act(async () => { fireEvent.click(btn) })
  expect(screen.getByRole('dialog', { name: 'Warm up first!' })).toBeInTheDocument()
}

describe('warm-up nudge "Not now"', () => {
  it('opens the tapped arcade node', async () => {
    seed({ parentRule: false })
    render(<FidelQuestApp />)
    await openArcade()
    expect(screen.queryByText('Play anyway')).toBeNull() // enforced by trouble letters
    await act(async () => { fireEvent.click(screen.getByText('Not now')) })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Warm up first!' })).toBeNull())
    // The path is gone: the arcade gateway (or its loader) is on screen.
    expect(screen.queryAllByRole('button').some((b) => b.getAttribute('aria-current') === 'step')).toBe(false)
  })

  it('keeps the child on the path when Grown-ups require the warm-up', async () => {
    seed({ parentRule: true })
    render(<FidelQuestApp />)
    await openArcade()
    await act(async () => { fireEvent.click(screen.getByText('Back to the path')) })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Warm up first!' })).toBeNull())
    expect(screen.getAllByRole('button').some((b) => b.getAttribute('aria-current') === 'step')).toBe(true)
  })
})
