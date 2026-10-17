import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PracticeRing from './PracticeRing'
import PracticeReport from './PracticeReport'
import ClassPracticeCard, { ReportViewer, dashboardRows } from './ClassPractice'
import { savePractice, emptyDay } from '../platform/practice'
import { resetPracticeRuntime, notePractice, currentPracticeDays } from '../platform/practiceTracker'
import { reportPayload, signReport } from '../platform/practiceReport'
import { dayStamp } from '../platform/streak'

const TODAY = dayStamp()
const row = (day, min) => ({ ...emptyDay(day), activeMs: min * 60000, sessions: 2, items: 30, answered: 20, correct: 16 })
const LATIN = /[A-Za-z]{2,}/

beforeEach(() => { localStorage.clear(); resetPracticeRuntime() })

describe('child ring', () => {
  it('hidden without a goal; shows minutes with no English text', () => {
    const { container, rerender } = render(<PracticeRing />)
    expect(container.innerHTML).toBe('')
    savePractice({ days: { [TODAY]: row(TODAY, 23) }, goal: 60 })
    resetPracticeRuntime()
    rerender(<PracticeRing key="b" />)
    const ring = screen.getByTestId('practice-ring')
    expect(ring.textContent).toBe('23')
    expect(LATIN.test(ring.textContent + ring.getAttribute('aria-label'))).toBe(false)
  })
})

describe('tracker runtime', () => {
  it('taps and answers become active time in memory', () => {
    const t0 = Date.now()
    notePractice('tap', { t: t0, x: 1, y: 1 })
    notePractice('answer', { t: t0 + 10000, correct: true })
    notePractice('tick', { t: t0 + 20000 })
    expect(currentPracticeDays()[dayStamp(new Date(t0))].activeMs).toBe(20000)
  })
})

describe('parent report', () => {
  it('shows today, the 7-day chart and table, and makes a signed link', async () => {
    savePractice({ days: { [TODAY]: row(TODAY, 42) }, goal: 60 })
    render(<PracticeReport today={TODAY} />)
    expect(screen.getByTestId('week-chart')).toBeTruthy()
    expect(screen.getByTestId('report-table').querySelectorAll('tbody tr')).toHaveLength(7)
    screen.getByText(/Make report link/).click()
    await waitFor(() => expect(screen.getByTestId('check-code').textContent).toMatch(/-/))
  })
})

describe('teacher side', () => {
  const report = {
    class: { code: 'K7Q2MP', name: 'Grade 2', goalMin: 60 }, from: '2026-10-12', to: '2026-10-18',
    students: [{ id: '1', name: 'Selam', days: [{ day: '2026-10-18', activeMin: 62, sessions: 2, items: 80, answered: 60, correct: 51, lessons: 2, games: 1, flags: { rapidTap: 0, randomTap: 0, audioLoop: 0 } }], total: { activeMin: 62, sessions: 2, items: 80, accuracy: 85, daysMetGoal: 1, flags: 0 } }],
  }
  it('dashboard rows: week cells and day view', () => {
    const w = dashboardRows(report, 'week', '2026-10-18')
    expect(w.days).toHaveLength(7)
    expect(w.rows[0].cells[6]).toBe(62)
    expect(dashboardRows(report, 'day', '2026-10-18').rows[0]).toMatchObject({ minutes: 62, accuracy: 85 })
  })
  it('renders the class table', () => {
    render(<ClassPracticeCard preset={report} teacherName="Mr T" />)
    expect(screen.getByTestId('join-code').textContent).toBe('K7Q2MP')
    expect(screen.getByTestId('class-table').textContent).toContain('Selam')
  })
  it('report viewer verifies an untouched link', async () => {
    const token = await signReport(reportPayload({ name: 'Selam', goal: 60, days: { [TODAY]: row(TODAY, 61) }, today: TODAY }))
    render(<ReportViewer token={token} onBack={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('report-verdict').textContent).toMatch(/^Verified/))
  })
})
