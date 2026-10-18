/* Order's "one voice per tap" rule. The screen used to read the tapped
   letter back and then, 320ms later, call the next one - two letters in a
   row, which a child hears as being corrected. A correct tap now answers
   with a chime and only the NEXT wanted form is spoken. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const played = []
vi.mock('../platform/audioEngine', async (importOriginal) => ({
  ...(await importOriginal()),
  playForm: (form) => played.push(`form:${form?.audioKey}`),
  playEffect: (name) => played.push(`fx:${name}`),
}))

const { default: VowelLadder } = await import('./VowelLadder')
const { initLadder } = await import('../ladderCore')
const { INDEXES } = await import('../platform/ethiopic')

const charOf = (key) => INDEXES.byAudioKey.get(key).char
const FAMILY = 'ha'
const ctx0 = () => initLadder(FAMILY, 1 * 97 + 0)

beforeEach(() => {
  played.length = 0
  vi.stubGlobal('Audio', class { addEventListener() {} play() { return Promise.resolve() } })
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('VowelLadder', () => {
  it('speaks exactly one letter after a correct tap - the next one wanted', () => {
    render(<VowelLadder soundOn onBack={() => {}} families={[FAMILY]} />)
    const { order } = ctx0()

    act(() => { vi.advanceTimersByTime(400) }) // the opening call
    expect(played).toEqual([`form:${order[0]}`])

    played.length = 0
    act(() => { fireEvent.click(screen.getByLabelText(charOf(order[0]))) })
    expect(played).toEqual(['fx:good']) // chime only, no read-back
    act(() => { vi.advanceTimersByTime(700) })
    expect(played).toEqual(['fx:good', `form:${order[1]}`])
  })

  it('re-cues the wanted form after a wrong tap', () => {
    render(<VowelLadder soundOn onBack={() => {}} families={[FAMILY]} />)
    const { order } = ctx0()

    act(() => { vi.advanceTimersByTime(400) })
    played.length = 0
    act(() => { fireEvent.click(screen.getByLabelText(charOf(order[2]))) }) // not next
    act(() => { vi.advanceTimersByTime(400) })
    expect(played).toEqual(['fx:bad', `form:${order[0]}`])
  })
})
