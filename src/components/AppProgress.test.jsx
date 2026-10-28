import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AppProgressChip, AppProgressSheet, AppProgressPanel } from './AppProgress'
import { noteDone, noteVisit, setActiveArea, AREA_IDS } from '../platform/appProgress'
import { recordAnswer } from '../platform/telemetry'

beforeEach(() => { localStorage.clear(); setActiveArea(null) })

describe('AppProgressChip (home)', () => {
  it('starts at 0/total and moves when ANY game reports, live', () => {
    render(<AppProgressChip onClick={() => {}} />)
    expect(screen.getByTestId('app-progress-count').textContent).toBe(`0/${AREA_IDS.length}`)
    expect(screen.queryByTestId('app-progress-today')).toBeNull()
    act(() => { setActiveArea('echo'); noteDone() })
    expect(screen.getByTestId('app-progress-count').textContent).toBe(`1/${AREA_IDS.length}`)
    expect(screen.getByTestId('app-progress-today')).toBeTruthy()
    act(() => { setActiveArea('prayer'); recordAnswer('ha-1', 'ha-1', 'prayer') })
    expect(screen.getByTestId('app-progress-count').textContent).toBe(`2/${AREA_IDS.length}`)
    expect(Number(screen.getByTestId('app-progress-bar').dataset.pct)).toBe(Math.round((2 / AREA_IDS.length) * 100))
  })

  it('has an accessible name and opens on tap', () => {
    let opened = 0
    render(<AppProgressChip onClick={() => { opened++ }} />)
    const b = screen.getByTestId('app-progress')
    expect(b.getAttribute('aria-label')).toContain(`0 of ${AREA_IDS.length}`)
    fireEvent.click(b)
    expect(opened).toBe(1)
  })

  it('reads a stored child state on mount (survives reload)', () => {
    noteVisit('explore'); noteDone('closet')
    render(<AppProgressChip onClick={() => {}} />)
    expect(screen.getByTestId('app-progress-count').textContent).toBe(`2/${AREA_IDS.length}`)
  })
})

describe('AppProgressSheet / Panel', () => {
  it('lists every area, marks the tried ones and closes on Escape', () => {
    noteDone('blocks'); noteVisit('prayer')
    let closed = 0
    render(<AppProgressSheet onClose={() => { closed++ }} />)
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('My progress')
    for (const id of AREA_IDS) expect(screen.getByTestId(`ap-area-${id}`)).toBeTruthy()
    expect(screen.getByTestId('ap-area-blocks').dataset.tried).toBe('true')
    expect(screen.getByTestId('ap-area-prayer').dataset.tried).toBe('true')
    expect(screen.getByTestId('ap-area-echo').dataset.tried).toBeUndefined()
    expect(screen.getByTestId('ap-stat-tried').textContent).toBe(`2/${AREA_IDS.length}`)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closed).toBe(1)
  })

  it('uses the .fq-modal contract and keeps fidel free of Latin hints', () => {
    render(<AppProgressSheet onClose={() => {}} />)
    expect(screen.getByTestId('app-progress-sheet').className).toContain('fq-modal')
    const prayer = screen.getByTestId('ap-area-prayer').textContent
    expect(prayer).toContain('ጸሎት')
    expect(prayer).not.toMatch(/[A-Za-z]/)
    expect(screen.getByTestId('ap-area-tower').textContent).not.toMatch(/[A-Za-z]/)
  })

  it('panel shows accuracy and finished totals from the shared store', () => {
    setActiveArea('echo')
    recordAnswer('ha-1', 'ha-1', 'echo'); recordAnswer('ha-1', 'le-1', 'echo'); noteDone()
    render(<AppProgressPanel />)
    expect(screen.getByTestId('ap-stat-done').textContent).toBe('1')
    expect(screen.getByTestId('ap-stat-today').textContent).toBe('2')
    expect(screen.getByTestId('app-progress-panel').textContent).toContain('Accuracy 50%')
  })
})

describe('ጸሎት tracker in the sheet', () => {
  it('shows pages and minutes as icons + numbers, with the wording only in aria-labels', () => {
    localStorage.setItem('fq.practice.v1', JSON.stringify({ v: 1, days: { [new Date().toLocaleDateString('en-CA')]: { day: new Date().toLocaleDateString('en-CA'), activeMs: 0, prayerMs: 4 * 60000, flags: {} } }, goal: null }))
    noteDone('prayer'); noteDone('prayer')
    render(<AppProgressSheet onClose={() => {}} />)
    const tile = screen.getByTestId('ap-prayer')
    expect(tile.textContent).toBe('ጸሎት' + '4' + '2')
    expect(tile.textContent).not.toMatch(/[A-Za-z]/)
    expect(screen.getByTestId('ap-prayer-pages').textContent).toBe('2')
    expect(screen.getByTestId('ap-prayer-min').textContent).toBe('4')
    expect(tile.querySelector('[aria-label="4 minutes this week"]')).toBeTruthy()
    expect(tile.querySelector('[aria-label="2 pages turned"]')).toBeTruthy()
    expect(screen.getByTestId('ap-area-prayer').dataset.tried).toBe('true')
  })
})
