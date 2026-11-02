import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AppProgressChip, AppProgressSheet, AppProgressPanel } from './AppProgress'
import { noteDone, setActiveArea } from '../platform/appProgress'
import { saveJourney, loadJourney } from '../journey'
import { setWeekTarget } from '../platform/progressModel'

beforeEach(() => { localStorage.clear(); setActiveArea(null) })

describe('AppProgressChip (home)', () => {
  it('shows fidel rows mastered, and moves when a row is learned', () => {
    render(<AppProgressChip onClick={() => {}} />)
    const total = screen.getByTestId('app-progress-count').textContent.split('/')[1]
    expect(screen.getByTestId('app-progress-count').textContent).toBe(`0/${total}`)
    expect(Number(total)).toBeGreaterThanOrEqual(33)
    expect(screen.queryByTestId('app-progress-today')).toBeNull()
    const p = loadJourney()
    p.done['learn:ha'] = { stars: 3 }
    act(() => { saveJourney(p) })
    expect(screen.getByTestId('app-progress-count').textContent).toBe(`1/${total}`)
  })

  it('has an accessible name and opens on tap', () => {
    let opened = 0
    render(<AppProgressChip onClick={() => { opened++ }} />)
    const b = screen.getByTestId('app-progress')
    expect(b.getAttribute('aria-label')).toMatch(/0 of \d+/)
    fireEvent.click(b)
    expect(opened).toBe(1)
  })

  it('lights today when something was finished', () => {
    noteDone('echo')
    render(<AppProgressChip onClick={() => {}} />)
    expect(screen.getByTestId('app-progress-today')).toBeTruthy()
  })
})

describe('My progress sheet', () => {
  it('shows the row grid and closes on Escape', () => {
    const p = loadJourney()
    p.done['learn:ha'] = { stars: 3 }
    saveJourney(p)
    let closed = 0
    render(<AppProgressSheet onClose={() => { closed++ }} />)
    expect(screen.getByRole('dialog', { name: 'My progress' })).toBeTruthy()
    const ha = screen.getByTestId('mp-row-ha')
    expect(ha.getAttribute('data-state')).toBe('mastered')
    expect(ha.textContent).toBe('ሀ')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closed).toBe(1)
  })

  it('kid view hides the target stepper and the grown-ups notes', () => {
    render(<AppProgressSheet onClose={() => {}} />)
    expect(screen.getByTestId('my-progress').getAttribute('data-mode')).toBe('kid')
    expect(screen.queryByTestId('mp-target')).toBeNull()
    expect(screen.queryByTestId('mp-grown')).toBeNull()
    expect(screen.getByTestId('mp-next')).toBeTruthy()
  })

  it('grown-ups view edits the weekly target and keeps the share button', () => {
    render(<AppProgressPanel />)
    expect(screen.getByTestId('mp-target-value').textContent).toMatch(/105/)
    fireEvent.click(screen.getByRole('button', { name: 'Lower the weekly target' }))
    expect(screen.getByTestId('mp-target-value').textContent).toMatch(/90/)
    fireEvent.click(screen.getByRole('button', { name: 'Raise the weekly target' }))
    expect(screen.getByTestId('mp-target-value').textContent).toMatch(/105/)
    expect(screen.getByTestId('mp-share')).toBeTruthy()
    setWeekTarget(105)
  })
})
