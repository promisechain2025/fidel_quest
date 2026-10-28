/* A "are you a grown-up?" gate: hold a button for two seconds, then type a
   random number from 11 to 99 that is shown ONLY in words (e.g. ኣርብዓን ሸውዓተን
   / አርባ ሰባት / "forty-seven" -> 47) on a keypad. The words default to the
   learn language (Tigrinya or Amharic) and a small toggle switches them to
   English or the app-text language (remembered; not a miss). "Different
   number" swaps the number without counting as a miss; three wrong answers lock the gate for a
   cooldown that doubles each time (see platform/gateCore.js). Shared by
   Grown-ups, Teacher, Family Voice, Voice Postcard, Support and every share
   sheet. */
import { useEffect, useRef, useState } from 'react'
import { Delete } from 'lucide-react'
import { t, getLang } from '../platform/i18n'
import { getActivePackId } from '../platform/ethiopic'
import { ETHIOPIC_WORD_LANGS, numberWords } from '../platform/numberWords'
import { makeChallenge, lockRemaining, recordMiss, recordPass, wordLangOptions, pickWordLang, saveWordLang } from '../platform/gateCore'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']

export default function ParentalGate({ onOpen, intro }) {
  const [held, setHeld] = useState(false)
  const [progress, setProgress] = useState(0)
  const timer = useRef(null)
  const [options] = useState(() => wordLangOptions(getActivePackId(), getLang()))
  const [lang, setLang] = useState(() => pickWordLang(options))
  const [challenge, setChallenge] = useState(() => makeChallenge(lang))
  // Same number, other language; remembered for next time, never a miss.
  const switchLang = (id) => {
    if (id === lang) return
    setLang(id)
    saveWordLang(id)
    setChallenge((c) => ({ text: numberWords(c.answer, id), answer: c.answer }))
  }
  const ethiopic = ETHIOPIC_WORD_LANGS.includes(lang)
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
    setChallenge((c) => makeChallenge(lang, Math.random, c.answer))
    setMissed(true)
    if (locked) setLockMs(locked)
  }
  const press = (k) => {
    if (k === 'del') setEntry((e) => e.slice(0, -1))
    else if (k === 'ok') submit()
    else setEntry((e) => (e.length >= 2 ? e : e + k))
  }
  // A new number on request; not a miss (it tells a guesser nothing).
  const another = () => {
    setEntry('')
    setMissed(false)
    setChallenge((c) => makeChallenge(lang, Math.random, c.answer))
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
            onPointerCancel={cancelHold}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) startHold()
            }}
            onKeyUp={(e) => {
              if (e.key === 'Enter' || e.key === ' ') cancelHold()
            }}
            className={`relative h-40 w-40 select-none rounded-full text-xl font-extrabold text-white ${FOCUS}`}
            style={{ background: 'var(--sky)', outlineColor: 'var(--accent)', touchAction: 'none', WebkitTouchCallout: 'none', boxShadow: '0 6px 0 rgba(0,0,0,0.18)' }}
          >
            {/* fill rises from the bottom while held */}
            <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute inset-x-0 bottom-0" style={{ height: `${progress * 100}%`, background: 'rgba(255,255,255,0.25)' }} />
            </span>
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="7" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${progress * 289} 289`} />
            </svg>
            <span className="relative">{t('gpHold', 'Hold me')}</span>
          </button>
          <p className="text-base font-bold" aria-live="polite" style={{ color: progress > 0 ? 'var(--ink)' : 'var(--muted)' }}>
            {progress > 0 ? t('gpHoldKeep', 'Keep holding…') : t('gpHoldHint', 'Press and hold for two seconds')}
          </p>
        </>
      ) : (
        <>
          <p className="text-base font-bold" style={{ color: 'var(--muted)' }}>
            {t('gateTypeNumber', 'Type this number:')}
          </p>
          <p
            lang={lang}
            className={`-mt-2 flex min-h-[4.75rem] w-full max-w-[22rem] items-center justify-center rounded-2xl border-2 px-5 py-3 font-black ${ethiopic ? 'geez text-4xl leading-snug' : 'text-3xl leading-tight'}`}
            style={{ background: 'var(--paper)', borderColor: 'var(--line)', overflowWrap: 'break-word', textWrap: 'balance' }}
            aria-live="polite"
            data-testid="gate-words"
          >
            {challenge.text}
          </p>
          {options.length > 1 && (
            <div role="group" aria-label={t('gateWordsLang', 'Number words language')} className="-mt-2 flex flex-wrap justify-center gap-1.5">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  lang={o.id}
                  aria-pressed={o.id === lang}
                  onClick={() => switchLang(o.id)}
                  className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${ETHIOPIC_WORD_LANGS.includes(o.id) ? 'geez' : ''} ${FOCUS}`}
                  style={{
                    background: o.id === lang ? 'var(--sky)' : 'transparent',
                    color: o.id === lang ? '#fff' : 'var(--muted)',
                    borderColor: o.id === lang ? 'var(--sky)' : 'var(--line)',
                    outlineColor: 'var(--sky)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {missed && (
            <p role="alert" className="-mt-2 text-sm font-bold" style={{ color: 'var(--bad-ink)' }}>
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
          <button
            type="button"
            onClick={another}
            className={`rounded-full px-4 py-2 text-sm font-bold underline underline-offset-4 ${FOCUS}`}
            style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}
          >
            {t('gateNewNumber', 'Different number')}
          </button>
        </>
      )}
    </div>
  )
}
