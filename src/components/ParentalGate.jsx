/* A light "are you a grown-up?" gate: hold a button for two seconds, then match
   a written number word to its digits. Two steps a pre-reading child won't pass
   by accident, without being an annoying password. Shared by the Grown-ups
   dashboard and the Family Voice recorder (which opens the mic). */
import { useMemo, useRef, useState } from 'react'
import { t } from '../platform/i18n'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

const GATE_NUMBERS = [
  { word: 'thirty-five', value: 35, decoys: [53, 45] },
  { word: 'twenty-eight', value: 28, decoys: [82, 38] },
  { word: 'forty-one', value: 41, decoys: [14, 47] },
]

export default function ParentalGate({ onOpen, intro }) {
  const [held, setHeld] = useState(false)
  const [progress, setProgress] = useState(0)
  const timer = useRef(null)
  const challenge = useMemo(() => GATE_NUMBERS[(new Date().getDate() || 1) % GATE_NUMBERS.length], [])
  const options = useMemo(
    () => [challenge.value, ...challenge.decoys].sort((a, b) => (a % 7) - (b % 7)),
    [challenge],
  )

  const startHold = () => {
    const startedAt = performance.now()
    timer.current = setInterval(() => {
      const k = Math.min(1, (performance.now() - startedAt) / 2000)
      setProgress(k)
      if (k >= 1) {
        clearInterval(timer.current)
        setHeld(true)
      }
    }, 50)
  }
  const cancelHold = () => {
    clearInterval(timer.current)
    if (!held) setProgress(0)
  }

  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <p className="max-w-xs font-bold" style={{ color: 'var(--muted)' }}>
        {intro || t('gpIntro', 'This area is for grown-ups: progress details and practice tips.')}
      </p>
      {!held ? (
        <>
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) startHold()
            }}
            onKeyUp={(e) => {
              if (e.key === 'Enter' || e.key === ' ') cancelHold()
            }}
            className={`relative h-28 w-28 rounded-full font-extrabold text-white ${FOCUS}`}
            style={{ background: 'var(--sky)', outlineColor: 'var(--accent)' }}
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="6" strokeDasharray={`${progress * 289} 289`} />
            </svg>
            {t('gpHold', 'Hold me')}
          </button>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {t('gpHoldHint', 'Press and hold for two seconds')}
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-extrabold">{t('gpTapNumber', `Tap the number ${challenge.word}`, { word: t(`gpNum${challenge.value}`, challenge.word) })}</p>
          <div className="flex gap-3">
            {options.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => (n === challenge.value ? onOpen() : setHeld(false) || setProgress(0))}
                className={`chunk mono h-16 w-20 rounded-2xl border-2 text-2xl font-black ${FOCUS}`}
                style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '0 4px 0 var(--line)', outlineColor: 'var(--sky)' }}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
