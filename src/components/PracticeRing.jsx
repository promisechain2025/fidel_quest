/* Kid-facing daily practice ring: today's verified active minutes against the
   teacher's goal. No words on screen (kid UI has no English) - a ring, a
   number and a star when the goal is met. Re-renders on tracker ticks. */
import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { activeMinutes, loadPractice } from '../platform/practice'
import { currentPracticeDays, subscribePractice } from '../platform/practiceTracker'
import { dayStamp } from '../platform/streak'

export function RingSvg({ minutes, goal, size = 40, stroke = 5 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = goal ? Math.min(1, minutes / goal) : 0
  const done = goal && minutes >= goal
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={done ? 'var(--go)' : 'var(--accent)'} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - p)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 600ms ease' }} />
    </svg>
  )
}

export default function PracticeRing({ size = 40, onClick, today: todayProp }) {
  const [, setRev] = useState(0)
  useEffect(() => subscribePractice(() => setRev((n) => (n + 1) % 1e6)), [])
  const goal = loadPractice().goal
  if (!goal) return null
  const today = todayProp || dayStamp()
  const minutes = activeMinutes(currentPracticeDays()[today])
  const done = minutes >= goal
  return (
    <button type="button" onClick={onClick} data-testid="practice-ring"
      className="relative flex min-h-[44px] shrink-0 items-center justify-center rounded-2xl px-1"
      style={{ background: 'var(--paper-2)' }} aria-label={`ዛሬ ${minutes}/${goal}`}>
      <RingSvg minutes={minutes} goal={goal} size={size} />
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums" style={{ color: done ? 'var(--go-ink)' : 'var(--ink)' }}>
        {done ? <Star className="h-4 w-4" fill="currentColor" style={{ color: 'var(--go)' }} /> : minutes}
      </span>
    </button>
  )
}
