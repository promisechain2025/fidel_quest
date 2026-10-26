import { Turtle, Rabbit, Footprints } from 'lucide-react'
import { t } from '../platform/i18n'

/* Icon-only speed control shared by the Explorer chant, Fidel Master and the
   Letter Runner: a tortoise (slow), a walking-feet "normal" and a rabbit (fast)
   on one chunky toy track, with a knob that slides to the chosen stop. No
   visible words - each stop carries an aria-label from i18n (English fallback).
   It only reports the name ('slow' | 'normal' | 'fast'); every caller keeps its
   own rates, default and persistence. */

const SPEED_STOPS = Object.freeze(['slow', 'normal', 'fast'])
const ICONS = { slow: Turtle, normal: Footprints, fast: Rabbit }
const FALLBACK = { slow: 'Slow', normal: 'Normal speed', fast: 'Fast' }
const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

export default function SpeedControl({ value, onChange, tone = 'light', className = '', testId = 'speed-control' }) {
  const at = Math.max(0, SPEED_STOPS.indexOf(value))
  return (
    <div
      role="group"
      aria-label={t('speedGroup', 'Speed')}
      className={`speed-ctl ${tone === 'dark' ? 'speed-ctl-dark' : ''} ${className}`}
      data-testid={testId}
      data-speed={SPEED_STOPS[at]}
      style={{ '--at': at }}
    >
      <span className="speed-ctl-knob" aria-hidden="true" />
      {SPEED_STOPS.map((s) => {
        const Icon = ICONS[s]
        const label = t(s === 'normal' ? 'pace_normal' : `pace_${s}`, FALLBACK[s])
        return (
          <button
            key={s}
            type="button"
            className={`speed-ctl-btn ${FOCUS}`}
            aria-pressed={value === s}
            aria-label={label}
            data-speed={s}
            data-testid={`${testId}-${s}`}
            onClick={() => onChange(s)}
          >
            <Icon size={s === 'normal' ? 22 : 26} strokeWidth={2.4} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
