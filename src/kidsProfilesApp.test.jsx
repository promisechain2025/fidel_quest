/* App wiring for kids profiles: the home shows who is playing, the picker
   greets a shared device on launch (once per session), and a one-child
   family never sees it uninvited. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { loadProfiles, addProfile } from './platform/profiles'

const { default: FidelQuestApp } = await import('./FidelQuestApp')

beforeEach(() => {
  vi.stubGlobal('Audio', class { addEventListener() {} play() { return Promise.resolve() } })
  cleanup()
})

describe('kids profiles in the app', () => {
  it('one child: no picker on launch, the home chip names the child and opens it', async () => {
    localStorage.setItem('fq.nickname', 'Selam')
    render(<FidelQuestApp />)
    expect(screen.queryByRole('dialog', { name: 'Who is playing?' })).toBeNull()
    const chip = screen.getByRole('button', { name: 'Playing: Selam. Change player' })
    await act(async () => { fireEvent.click(chip) })
    expect(screen.getByRole('dialog', { name: 'Who is playing?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add a child/ })).toBeInTheDocument()
  })

  it('two children: the picker greets the launch, and not again this session', async () => {
    localStorage.setItem('fq.nickname', 'Selam')
    loadProfiles()
    addProfile('Abel', { avatar: 'zebra' })
    render(<FidelQuestApp />)
    expect(screen.getByRole('dialog', { name: 'Who is playing?' })).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Abel - keep playing' })) })
    expect(screen.queryByRole('dialog', { name: 'Who is playing?' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Playing: Abel. Change player' })).toBeInTheDocument()
    cleanup()
    render(<FidelQuestApp />)
    expect(screen.queryByRole('dialog', { name: 'Who is playing?' })).toBeNull()
  })
})
