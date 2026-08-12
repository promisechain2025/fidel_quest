/* Line Up's interaction contract. The drag path cannot be exercised in jsdom
   (framer's pointer gestures need real layout), but the TAP path is the one
   a four-year-old actually uses, and it is pure DOM - so it is the one that
   gets locked down here, together with the "one voice per tap" rule that the
   double-chant bug broke. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

/* Only the two voice calls are swapped out; the rest of the engine stays real
   because the fidel table configures it at import time. */
const played = []
vi.mock('../platform/audioEngine', async (importOriginal) => ({
  ...(await importOriginal()),
  playForm: (form) => played.push(`form:${form?.audioKey}`),
  playEffect: (name) => played.push(`fx:${name}`),
}))

const { default: FidelLineup } = await import('./FidelLineup')
const { initLineup } = await import('../lineupCore')
const { INDEXES } = await import('../platform/ethiopic')

const charOf = (key) => INDEXES.byAudioKey.get(key).char

beforeEach(() => {
  played.length = 0
  vi.stubGlobal('Audio', class { addEventListener() {} play() { return Promise.resolve() } })
})
afterEach(() => vi.restoreAllMocks())

/* The component seeds itself from a random start index, so the family in play
   is whichever single family we pass in - and the seed is then deterministic. */
const FAMILY = 'ha'
const ctx0 = () => initLineup(FAMILY, 1 * 89 + 0)

describe('FidelLineup', () => {
  it('places a card with two taps: the letter, then its number', () => {
    render(<FidelLineup soundOn={false} onBack={() => {}} families={[FAMILY]} />)
    const { order } = ctx0()
    const key = order[3] // the 4th form belongs in place 4

    // Before anything is picked up the places are not tappable.
    expect(screen.getByLabelText('Put the letter in place 4')).toBeDisabled()

    act(() => { fireEvent.pointerDown(screen.getByLabelText(`Letter ${charOf(key)}`)) })
    act(() => { fireEvent.click(screen.getByLabelText('Put the letter in place 4')) })

    expect(screen.getByLabelText(`Place 4: ${charOf(key)}`)).toBeInTheDocument()
  })

  it('speaks the letter once per pick-up and answers a correct place with a chime', () => {
    render(<FidelLineup soundOn onBack={() => {}} families={[FAMILY]} />)
    const { order } = ctx0()
    const key = order[0]

    act(() => { fireEvent.pointerDown(screen.getByLabelText(`Letter ${charOf(key)}`)) })
    act(() => { fireEvent.click(screen.getByLabelText('Put the letter in place 1')) })

    // Exactly one spoken form for the whole interaction - the pick-up.
    expect(played.filter((p) => p.startsWith('form:'))).toEqual([`form:${key}`])
    expect(played).toContain('fx:good')
  })

  it('keeps a wrong place silent of letters and leaves the card in hand', () => {
    render(<FidelLineup soundOn onBack={() => {}} families={[FAMILY]} />)
    const { order } = ctx0()
    const key = order[0] // belongs in place 1

    act(() => { fireEvent.pointerDown(screen.getByLabelText(`Letter ${charOf(key)}`)) })
    played.length = 0
    act(() => { fireEvent.click(screen.getByLabelText('Put the letter in place 5')) })

    expect(played).toEqual(['fx:bad'])
    // Still held, so the retry is a single tap.
    expect(screen.getByLabelText('Put the letter in place 1')).not.toBeDisabled()
  })

  it('tells the child which half of the move is next', () => {
    render(<FidelLineup soundOn={false} onBack={() => {}} families={[FAMILY]} />)
    expect(screen.getByText('Tap a letter, then tap its number.')).toBeInTheDocument()
    act(() => { fireEvent.pointerDown(screen.getByLabelText(`Letter ${charOf(ctx0().order[2])}`)) })
    expect(screen.getByText('Now tap the number it belongs to.')).toBeInTheDocument()
  })
})
