/* First-launch setup flow: language -> daily reminder -> sound. Shown once,
   skippable; existing installs only meet the reminder step (native). */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react'
import { JOURNEY, completeNode } from './journey'

const native = vi.hoisted(() => ({ on: false }))
const LN = vi.hoisted(() => ({
  perm: 'granted',
  requestPermissions: vi.fn(),
  cancel: vi.fn(async () => {}),
  schedule: vi.fn(async () => {}),
}))
vi.mock('./platform/native', async (orig) => ({ ...(await orig()), isNativePlatform: () => native.on }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: LN }))

const { default: FidelQuestApp, FirstRunSetup } = await import('./FidelQuestApp')

beforeEach(() => {
  vi.stubGlobal('Audio', class { addEventListener() {} play() { return Promise.resolve() } })
  cleanup()
  native.on = false
  LN.perm = 'granted'
  LN.requestPermissions.mockReset().mockImplementation(async () => ({ display: LN.perm }))
  LN.schedule.mockClear()
})

const dialog = () => screen.queryByRole('dialog', { name: "Let's get ready!" })

describe('FirstRunSetup steps', () => {
  it('reminder: pick 7:30 PM, Yes asks permission then and schedules; sound step; done', async () => {
    native.on = true
    const onDone = vi.fn()
    const onToggleSound = vi.fn()
    render(<FirstRunSetup steps={['reminder', 'sound']} soundOn onToggleSound={onToggleSound} onDone={onDone} />)
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Remind us to practise every day?')).toBeInTheDocument()
    // 6 PM is preselected.
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(LN.requestPermissions).not.toHaveBeenCalled()
    fireEvent.click(radios[2])
    expect(radios[2]).toHaveAttribute('aria-checked', 'true')
    await act(async () => { fireEvent.click(screen.getByText('Yes, remind us')) })
    expect(LN.requestPermissions).toHaveBeenCalledTimes(1)
    expect(LN.schedule.mock.calls.at(-1)[0].notifications[0].schedule.on).toEqual({ hour: 19, minute: 30 })
    expect(localStorage.getItem('fq.reminder.v1')).toBe('1')
    // Sound step
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sound on/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Sound off/ }))
    expect(onToggleSound).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText("Let's go!"))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('"Not now" never asks for permission', async () => {
    native.on = true
    const onDone = vi.fn()
    render(<FirstRunSetup steps={['reminder']} onDone={onDone} />)
    fireEvent.click(screen.getByText('Not now'))
    expect(LN.requestPermissions).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('fq.reminder.v1')).toBeNull()
  })

  it('permission denied explains where to turn it on, then moves on', async () => {
    native.on = true
    LN.perm = 'denied'
    const onDone = vi.fn()
    render(<FirstRunSetup steps={['reminder']} onDone={onDone} />)
    await act(async () => { fireEvent.click(screen.getByText('Yes, remind us')) })
    expect(screen.getByRole('status')).toHaveTextContent(/phone settings/)
    fireEvent.click(screen.getByText("Let's go!"))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('Skip ends the whole setup; the language step seals the choice on the way out', () => {
    const onDone = vi.fn()
    const onLeaveLang = vi.fn()
    render(<FirstRunSetup steps={['lang', 'sound']} onLeaveLang={onLeaveLang} onDone={onDone} />)
    expect(screen.getByRole('heading', { name: /Language/ })).toBeInTheDocument()
    fireEvent.click(screen.getByText('Skip'))
    expect(onLeaveLang).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('counts on from steps done before a language reload', () => {
    render(<FirstRunSetup steps={['sound']} before={1} onDone={() => {}} />)
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
  })
})

describe('FirstRunSetup in the app', () => {
  it('fresh native install: reminder + sound once, then never again', async () => {
    native.on = true
    const { unmount } = render(<FidelQuestApp />)
    expect(dialog()).toHaveAttribute('data-setup-step', 'reminder')
    fireEvent.click(screen.getByText('Not now'))
    expect(dialog()).toHaveAttribute('data-setup-step', 'sound')
    await act(async () => { fireEvent.click(screen.getByText("Let's go!")) })
    await waitFor(() => expect(dialog()).toBeNull())
    unmount()
    render(<FidelQuestApp />)
    expect(dialog()).toBeNull()
  })

  it('existing native install that chose a language: just the reminder step', () => {
    native.on = true
    let p = { version: 1, done: {}, collection: { owned: [], worn: {} } }
    p = completeNode(p, JOURNEY[0].id)
    localStorage.setItem('fq.journey.v1', JSON.stringify(p))
    render(<FidelQuestApp />)
    expect(dialog()).toHaveAttribute('data-setup-step', 'reminder')
    expect(screen.queryByText(/Step \d of/)).toBeNull()
  })

  it('web install whose language is already set: no setup at all', () => {
    render(<FidelQuestApp />)
    expect(dialog()).toBeNull()
  })

  it('web install that still needs a language: language then sound', async () => {
    localStorage.removeItem('fq.pack')
    render(<FidelQuestApp />)
    expect(dialog()).toHaveAttribute('data-setup-step', 'lang')
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Next'))
    expect(dialog()).toHaveAttribute('data-setup-step', 'sound')
    expect(localStorage.getItem('fq.pack')).toBeTruthy()
  })
})
