/* Voice Postcard: the system mic prompt must not appear from a child's tap.
   The first Record goes through the parental gate; the approval is then
   remembered so later recordings start directly. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const startRecorder = vi.fn(async () => ({ stop: async () => new Blob(), cancel() {} }))
vi.mock('../platform/voicePack', () => ({
  startRecorder: (...a) => startRecorder(...a),
  normalizeClip: async (b) => b,
  recordSupported: () => true,
}))
vi.mock('./ParentalGate', () => ({
  default: ({ intro, onOpen }) => (
    <div>
      <p>{intro}</p>
      <button type="button" onClick={onOpen}>gate-pass</button>
    </div>
  ),
}))

const { default: VoicePostcard } = await import('./VoicePostcard')

beforeEach(() => {
  startRecorder.mockClear()
  localStorage.removeItem('fq.postcard.micOk')
})

describe('VoicePostcard mic gate', () => {
  it('first Record shows the parental gate instead of asking for the mic', async () => {
    render(<VoicePostcard onBack={() => {}} soundOn={false} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Record' })) })
    expect(startRecorder).not.toHaveBeenCalled()
    expect(screen.getByText(/Recording uses the microphone/)).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByText('gate-pass')) })
    expect(startRecorder).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('fq.postcard.micOk')).toBe('1')
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
  })

  it('records directly once a grown-up has approved the mic on this device', async () => {
    localStorage.setItem('fq.postcard.micOk', '1')
    render(<VoicePostcard onBack={() => {}} soundOn={false} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Record' })) })
    expect(startRecorder).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Recording uses the microphone/)).toBeNull()
  })
})
