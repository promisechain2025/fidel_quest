/* A "are you a grown-up?" gate: hold a button for two seconds, then answer a
   random arithmetic question on a keypad (e.g. 7 × 6, 27 + 38). Two wrong
   answers lock the gate for a cooldown that doubles each time (see
   platform/gateCore.js). Shared by Grown-ups, Teacher, Family Voice, Voice
   Postcard, Support and every share sheet. */
import { useEffect, useRef, useState } from 'react'
import { Delete } from 'lucide-react'
import { t } from '../platform/i18n'
import { makeChallenge, lockRemaining, recordMiss, recordPass } from '../platform/gateCore'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']

export default function ParentalGate({ onOpen, intro }) {
  const [held, setHeld] = useState(false)
  const [progress, setProgress] = useState(0)
  const timer = useRef(null)
  const [challenge, setChallenge] = useState(() => makeChallenge())
  const [entry, setEntry] = useState('')
  const [missed, setMissed] = useState(false)
  const [lockMs, setLockMs] = useState(() => lockRemaining())
  // Count a lockout down; the gate reopens (hold step) when it ends.
  useEffect(() => {
    if (lockMs <= 0) return undefined
    const id = setInterval(() => {
      const left = lockRemaining()
      setLockMs(left)
      if (left <= 0) { setHeld(false); setProgress(0) }
    }, 500)
    return () => clearInterval(id)
  }, [lockMs > 0]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearInterval(timer.current), [])

  const submit = () => {
    if (!entry) return
    if (Number(entry) === challenge.answer) {
      recordPass()
      onOpen()
      return
    }
    const locked = recordMiss()
    setEntry('')
    setChallenge(makeChallenge())
    setMissed(true)
    if (locked) setLockMs(locked)
  }
  const press = (k) => {
    if (k === 'del') setEntry((e) => e.slice(0, -1))
    else if (k === 'ok') submit()
    else setEntry((e) => (e.length >= 3 ? e : e + k))
  }

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
      {lockMs > 0 ? (
        <div role="status" className="flex flex-col items-center gap-2">
          <p className="text-lg font-extrabold">{t('gateLocked', 'Too many tries.')}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {t('gateLockedWait', 'Ask a grown-up, or try again in {s} seconds.', { s: Math.ceil(lockMs / 1000) })}
          </p>
        </div>
      ) : !held ? (
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
          <p className="text-lg font-extrabold" aria-live="polite">
            {t('gateQuestion', 'What is {q}?', { q: challenge.text })}
          </p>
          {missed && (
            <p className="-mt-3 text-sm font-bold" style={{ color: 'var(--bad-ink)' }}>
              {t('gateMissed', 'Not quite - here is a new one.')}
            </p>
          )}
          <output aria-label={t('gateAnswer', 'Your answer')} className="mono flex h-14 w-40 items-center justify-center rounded-2xl border-2 text-3xl font-black" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
            {entry || '\u00a0'}
          </output>
          <div className="grid grid-cols-3 gap-2.5">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                disabled={k === 'ok' && !entry}
                aria-label={k === 'del' ? t('gateDelete', 'Delete') : k === 'ok' ? t('gateOk', 'OK') : k}
                className={`chunk mono flex h-14 w-16 items-center justify-center rounded-2xl border-2 text-2xl font-black disabled:opacity-40 ${FOCUS}`}
                style={{ background: k === 'ok' ? 'var(--go)' : 'var(--card)', color: k === 'ok' ? '#fff' : undefined, borderColor: k === 'ok' ? 'var(--go-deep)' : 'var(--line)', boxShadow: `0 4px 0 ${k === 'ok' ? 'var(--go-deep)' : 'var(--line)'}`, outlineColor: 'var(--sky)' }}
              >
                {k === 'del' ? <Delete className="h-6 w-6" aria-hidden="true" /> : k === 'ok' ? t('gateOk', 'OK') : k}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
