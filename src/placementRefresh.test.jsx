/* Skip ahead: after "Placed!", the home path must show the credited nodes
   immediately. It used to keep rendering the pre-placement journey (0 done,
   everything locked) until the app was restarted. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// One tiny window (the first family) keeps the test to a couple of questions.
vi.mock('./platform/placement', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, placementWindows: () => [['ha']] }
})

const { default: FidelQuestApp } = await import('./FidelQuestApp')

beforeEach(() => {
  vi.stubGlobal('Audio', class { addEventListener() {} play() { return Promise.resolve() } })
})

describe('placement refreshes home progress', () => {
  it('credited nodes show as done on the path without a restart', async () => {
    vi.useFakeTimers()
    render(<FidelQuestApp />)
    expect(screen.getByLabelText(/^Learn ha$/)).toBeInTheDocument() // not done yet
    fireEvent.click(screen.getByText('Skip ahead'))
    for (let i = 0; i < 12 && !screen.queryByText('Placed!'); i++) {
      await act(async () => { vi.advanceTimersByTime(1500) })
      const cont = screen.queryAllByRole('button').find((b) => /^(continue|got it)$/i.test(b.textContent.trim()))
      if (cont) { fireEvent.click(cont); continue }
      const prompt = /“([^”]+)”/.exec(document.body.textContent)
      if (!prompt) continue
      const right = screen.queryAllByRole('button').find((b) => (b.getAttribute('aria-label') || '').endsWith(`says ${prompt[1]}`))
      if (right && !right.disabled) fireEvent.click(right)
    }
    expect(screen.getByText('Placed!')).toBeInTheDocument()
    fireEvent.click(screen.getByText('To the path'))
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(screen.getByLabelText(/^Learn ha, done$/)).toBeInTheDocument()
    vi.useRealTimers()
  })
})
