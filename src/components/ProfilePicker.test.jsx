import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ProfilePicker from './ProfilePicker'
import { loadProfiles, addProfile, activeProfile, profileCount } from '../platform/profiles'

const journeyWith = (n) => JSON.stringify({ version: 1, done: Object.fromEntries(['learn:ha', 'learn:le', 'learn:hha', 'quiz:1'].slice(0, n).map((id) => [id, { stars: 3 }])), collection: { owned: [], worn: {} } })

/** Selam (3 steps, parked) and Abel (1 step, playing now). */
function twoKids() {
  localStorage.setItem('fq.nickname', 'Selam')
  localStorage.setItem('fq.journey.v1', journeyWith(3))
  loadProfiles()
  addProfile('Abel', { avatar: 'zebra', age: 6, grade: '1' })
  localStorage.setItem('fq.journey.v1', journeyWith(1))
}

const passGate = () => {
  fireEvent.pointerDown(screen.getByText('Hold me'))
  act(() => { vi.advanceTimersByTime(2100) })
  const m = /What is (\d+) ([×+]) (\d+)\?/.exec(screen.getByText(/What is/).textContent)
  const ans = m[2] === '×' ? Number(m[1]) * Number(m[3]) : Number(m[1]) + Number(m[3])
  for (const d of String(ans)) fireEvent.click(screen.getByRole('button', { name: d }))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
}

beforeEach(() => { localStorage.removeItem('fq.gate.v1') })
afterEach(() => vi.useRealTimers())

describe('ProfilePicker', () => {
  it('shows every child with their OWN progress', () => {
    twoKids()
    render(<ProfilePicker onClose={() => {}} reload={() => {}} />)
    const selam = screen.getByRole('button', { name: 'Play as Selam' })
    const abel = screen.getByRole('button', { name: 'Abel - keep playing' })
    expect(selam.textContent).toContain('3 steps')
    expect(selam.textContent).toContain('9')
    expect(abel.textContent).toContain('1 step')
    expect(abel.textContent).toContain('Playing')
  })

  it('tapping another child switches and reloads; tapping yourself just closes', () => {
    twoKids()
    const reload = vi.fn()
    const onClose = vi.fn()
    render(<ProfilePicker onClose={onClose} reload={reload} />)
    fireEvent.click(screen.getByRole('button', { name: 'Abel - keep playing' }))
    expect(onClose).toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Play as Selam' }))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(activeProfile().name).toBe('Selam')
    expect(localStorage.getItem('fq.journey.v1')).toBe(journeyWith(3))
  })

  it('adds a child with a name, a friend and an age', () => {
    loadProfiles()
    const reload = vi.fn()
    render(<ProfilePicker onClose={() => {}} reload={reload} />)
    fireEvent.click(screen.getByRole('button', { name: /Add a child/ }))
    const save = screen.getByRole('button', { name: "Let's play!" })
    expect(save).toBeDisabled() // a name is required
    fireEvent.change(screen.getByPlaceholderText('e.g. Selam'), { target: { value: 'Ruth' } })
    fireEvent.click(screen.getByRole('button', { name: 'Camel' }))
    expect(screen.getByRole('button', { name: 'Camel' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Age 7' }))
    fireEvent.click(save)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(activeProfile()).toMatchObject({ name: 'Ruth', avatar: 'camel', age: 7, grade: null })
  })

  it('hides Add at six children', () => {
    loadProfiles()
    for (let i = 1; i < 6; i++) addProfile(`Kid ${i}`)
    render(<ProfilePicker onClose={() => {}} reload={() => {}} />)
    expect(screen.queryByRole('button', { name: /Add a child/ })).toBeNull()
    expect(screen.getByText(/Six children/)).toBeTruthy()
  })

  it('edit and delete sit behind the parental gate', () => {
    vi.useFakeTimers()
    twoKids()
    const reload = vi.fn()
    render(<ProfilePicker onClose={() => {}} reload={reload} />)
    expect(screen.queryByRole('button', { name: 'Delete Selam' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Grown-ups: edit or delete/ }))
    expect(screen.getByText('Hold me')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Delete Selam' })).toBeNull()
    passGate()

    // edit Selam's friend
    fireEvent.click(screen.getByRole('button', { name: 'Edit Selam' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bee' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(loadProfiles().list.find((p) => p.name === 'Selam').avatar).toBe('bee')

    // delete Selam: Keep is the default, Delete forever removes her
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selam' }))
    expect(screen.getByText('Delete Selam?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep Selam' }))
    expect(profileCount()).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selam' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(profileCount()).toBe(1)
    expect(reload).not.toHaveBeenCalled() // Selam was parked; Abel keeps playing
    expect(activeProfile().name).toBe('Abel')
    // the last child cannot be deleted
    expect(screen.getByRole('button', { name: 'Delete Abel' })).toBeDisabled()
  })
})
