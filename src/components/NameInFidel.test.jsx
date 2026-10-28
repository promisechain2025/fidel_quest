import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Capture the chain: playForm calls, and the afterVoice continuations the
// component schedules (each fires only when the test "ends" the clip).
const played = []
const waits = []
vi.mock('../platform/audioEngine', async (orig) => ({
  ...(await orig()),
  playForm: (form) => played.push(form.char),
  afterVoice: (cb) => {
    const w = { cb, cancelled: false }
    waits.push(w)
    return () => { w.cancelled = true }
  },
}))
vi.mock('./ShareCard', () => ({ shareName: vi.fn() }))

import NameInFidel from './NameInFidel'

const endClip = () => {
  const w = waits.shift()
  if (w && !w.cancelled) w.cb()
}

beforeEach(() => {
  played.length = 0
  waits.length = 0
})

describe('NameInFidel: hear the name', () => {
  it('plays each syllable only after the previous clip ends (no fixed timer)', () => {
    render(<NameInFidel onBack={() => {}} soundOn />)
    const keys = screen.getAllByRole('button').filter((b) => b.className.includes('aspect-square'))
    fireEvent.click(keys[0])
    fireEvent.click(keys[1])
    fireEvent.click(keys[2])
    const typed = played.slice()
    played.length = 0
    waits.length = 0
    fireEvent.click(screen.getByLabelText('Hear the name'))
    expect(played).toEqual([typed[0]])
    endClip()
    expect(played).toEqual([typed[0], typed[1]])
    endClip()
    expect(played).toEqual(typed)
    endClip()
    expect(played).toEqual(typed) // chain ends after the last syllable
  })

  it('Clear stops a chain mid-name', () => {
    render(<NameInFidel onBack={() => {}} soundOn />)
    const keys = screen.getAllByRole('button').filter((b) => b.className.includes('aspect-square'))
    fireEvent.click(keys[0])
    fireEvent.click(keys[1])
    played.length = 0
    waits.length = 0
    fireEvent.click(screen.getByLabelText('Hear the name'))
    expect(played).toHaveLength(1)
    fireEvent.click(screen.getByLabelText('Clear'))
    endClip()
    expect(played).toHaveLength(1)
  })
})
