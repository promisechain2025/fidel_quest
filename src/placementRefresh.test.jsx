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

// The quiz shows no Latin sound label any more, so the test learns the spoken
// letter from the recording the app asks to play (the same thing a child hears).
const spoken = { char: null }
vi.mock('./platform/audioEngine', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, playForm: (form, ...rest) => { if (form?.char) spoken.char = form.char; return real.playForm(form, ...rest) } }
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
      if (!spoken.char) continue
      const right = screen.queryAllByRole('button').find((b) => b.getAttribute('aria-label') === spoken.char)
      if (right && !right.disabled) fireEvent.click(right)
    }
    expect(screen.getByText('Placed!')).toBeInTheDocument()
    fireEvent.click(screen.getByText('To the path'))
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(screen.getByLabelText(/^Learn ha, done$/)).toBeInTheDocument()
    vi.useRealTimers()
  })
})
