/* Kid-facing study timer (replaces the always-on ring). A small clock button
   in the home HUD; HIDDEN by default - a tap shows today's verified study
   time (and the goal ring when a teacher/parent set one), another tap hides
   it. The choice is per child (fq.studyTimer.v1, in SWAP_KEYS). No words:
   a clock icon, digits (h:mm like the app's other counters) and a star when
   the goal is met. */
import { useEffect, useState } from 'react'
import { Clock, Star } from 'lucide-react'
import { activeMinutes, loadPractice } from '../platform/practice'
import { currentPracticeDays, subscribePractice } from '../platform/practiceTracker'
import { dayStamp } from '../platform/streak'
import { RingSvg } from './PracticeRing'

export const TIMER_KEY = 'fq.studyTimer.v1'
export const loadTimerShown = () => { try { return localStorage.getItem(TIMER_KEY) === 'shown' } catch { return false } }
const saveTimerShown = (v) => { try { localStorage.setItem(TIMER_KEY, v ? 'shown' : 'hidden') } catch { /* session */ } }
export const hmm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`

export default function StudyTimer({ today: todayProp }) {
  const [shown, setShown] = useState(loadTimerShown)
  const [, setRev] = useState(0)
  useEffect(() => subscribePractice(() => setRev((n) => (n + 1) % 1e6)), [])
  const today = todayProp || dayStamp()
  const minutes = activeMinutes(currentPracticeDays()[today])
  const goal = loadPractice().goal
  const done = goal && minutes >= goal
  const toggle = () => { setShown((v) => { saveTimerShown(!v); return !v }) }
  return (
    <button type="button" onClick={toggle} data-testid="study-timer" aria-pressed={shown}
      aria-label={shown ? `⏱ ${hmm(minutes)}` : '⏱'}
      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-2xl px-1.5"
      style={{ background: 'var(--paper-2)' }}>
      {!shown ? (
        <Clock className="h-5 w-5" style={{ color: 'var(--muted)' }} aria-hidden="true" />
      ) : (
        <>
          {goal ? (
            <span className="relative flex items-center justify-center">
              <RingSvg minutes={minutes} goal={goal} size={34} stroke={4} />
              <span className="absolute inset-0 flex items-center justify-center">
                {done ? <Star className="h-4 w-4" fill="currentColor" style={{ color: 'var(--go)' }} /> : <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />}
              </span>
            </span>
          ) : <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />}
          <span className="text-sm font-black tabular-nums" data-testid="study-timer-time" style={{ color: done ? 'var(--go-ink)' : 'var(--ink)' }}>{hmm(minutes)}</span>
        </>
      )}
    </button>
  )
}
