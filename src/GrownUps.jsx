/* ============================================================================
   GROWN-UPS DASHBOARD
   ----------------------------------------------------------------------------
   A parent-gated view over the learning telemetry: a mastery grid of the 33
   base letters, "trouble letters" with concrete practice tips and one-tap
   deep links, per-mode accuracy, and progress totals. All numbers come from
   pure selectors over the answer ledger (src/platform/telemetry.js).

   The gate is two non-reading-child steps: hold a button for two seconds,
   then match a written number word to its digits.
   ========================================================================== */

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Star, Flame, Sparkles, Trash2 } from 'lucide-react'
import { loadLedger, clearLedger, letterStats, troubleLetters, confusions, tipFor, accuracyOf } from './platform/telemetry'
import { FIDEL_FAMILIES, INDEXES } from './platform/ethiopic'
import { LEVELS, loadProgress, loadRunnerBest } from './FidelQuestApp'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOf = (key) => INDEXES.byAudioKey.get(key)
const levelOf = (form) =>
  form.order > 1 ? Math.min(8, Math.floor(form.familyIndex / 8) + 5) : Math.min(4, Math.floor(form.familyIndex / 8) + 1)

const GATE_NUMBERS = [
  { word: 'thirty-five', value: 35, decoys: [53, 45] },
  { word: 'twenty-eight', value: 28, decoys: [82, 38] },
  { word: 'forty-one', value: 41, decoys: [14, 47] },
]

function Gate({ onOpen }) {
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
        This area is for grown-ups: progress details and practice tips.
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
            Hold me
          </button>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            Press and hold for two seconds
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-extrabold">Tap the number {challenge.word}</p>
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

function masteryColor(stat) {
  if (!stat || stat.seen === 0) return 'var(--line)'
  const rate = stat.correct / stat.seen
  if (rate >= 0.85) return 'var(--go)'
  if (rate >= 0.6) return 'var(--star)'
  return 'var(--bad)'
}

export default function GrownUps({ onBack, onPractice, onReplayLevel }) {
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [, forceRefresh] = useState(0)

  const events = useMemo(() => (open ? loadLedger() : []), [open])
  const stats = useMemo(() => letterStats(events), [events])
  const trouble = useMemo(() => troubleLetters(events), [events])
  const pairs = useMemo(() => confusions(events), [events])
  const progress = loadProgress()
  const runnerBest = loadRunnerBest()
  const stars = LEVELS.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0)

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">Grown-ups</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            Progress, trouble letters, and practice tips
          </p>
        </div>
      </header>

      {!open ? (
        <Gate onOpen={() => setOpen(true)} />
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {/* totals */}
          <div className="grid grid-cols-3 gap-3">
            {[
              [<Star key="i" className="h-5 w-5" style={{ color: 'var(--star)', fill: 'var(--star)' }} aria-hidden="true" />, `${stars}/${LEVELS.length * 3}`, 'Lesson stars'],
              [<Sparkles key="i" className="h-5 w-5" style={{ color: 'var(--star)' }} aria-hidden="true" />, `${runnerBest.fed}`, 'Runner best'],
              [<Flame key="i" className="h-5 w-5" style={{ color: 'var(--accent)' }} fill="currentColor" aria-hidden="true" />, accuracyOf(events) === null ? '—' : `${accuracyOf(events)}%`, 'Accuracy'],
            ].map(([icon, value, label]) => (
              <div key={label} className="rounded-2xl border-2 p-3 text-center" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
                <p className="mono flex items-center justify-center gap-1 text-xl font-black">
                  {icon}
                  {value}
                </p>
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* mastery grid */}
          <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Letter mastery · {events.length} answers recorded
            </h2>
            <div className="mt-3 grid grid-cols-11 gap-1.5" aria-label="Mastery of the 33 base letters">
              {FIDEL_FAMILIES.map((f) => {
                const key = `${f.id}-1`
                const stat = stats.get(key)
                return (
                  <div key={f.id} className="geez flex aspect-square items-center justify-center rounded-lg text-base font-black" style={{ background: masteryColor(stat), color: stat?.seen ? '#fff' : 'var(--muted)' }} title={stat ? `${f.name}: ${stat.correct}/${stat.seen} correct` : `${f.name}: not practiced yet`}>
                    {Array.from(f.chars)[0]}
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              Green: solid · Yellow: getting there · Red: needs help · Grey: not practiced yet. Quizzes currently practice the first-order letters.
            </p>
          </section>

          {/* trouble letters */}
          <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Trouble letters
            </h2>
            {trouble.length === 0 ? (
              <p className="mt-2 font-bold" style={{ color: 'var(--muted)' }}>
                {events.length < 10 ? 'Not enough play yet — check back after a few games.' : 'No trouble letters right now. Nice work!'}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {trouble.map((t) => {
                  const form = formOf(t.key)
                  const tip = tipFor(t.key, pairs, formOf, levelOf)
                  if (!form || !tip) return null
                  return (
                    <motion.div key={t.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-2xl border-2 p-3" style={{ borderColor: 'var(--bad)', background: 'var(--bad-soft)' }}>
                      <span className="geez flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl font-black text-white" style={{ background: 'var(--bad)' }} aria-hidden="true">
                        {form.char}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-black" style={{ color: 'var(--bad-ink)' }}>
                          {form.char} says “{form.sound}” · {t.correct}/{t.seen} correct
                        </p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          {tip.text}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={() => onPractice(tip.familyId)} className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
                            Open in Explorer
                          </button>
                          <button type="button" onClick={() => onReplayLevel(`level-${tip.level}`)} className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
                            Replay Level {tip.level}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </section>

          {/* reset */}
          <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            {!confirmReset ? (
              <button type="button" onClick={() => setConfirmReset(true)} className={`flex items-center gap-2 text-sm font-extrabold ${FOCUS}`} style={{ color: 'var(--bad-ink)', outlineColor: 'var(--bad)' }}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Reset all progress…
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold" style={{ color: 'var(--bad-ink)' }}>
                  Erase stars, bests, islands, and learning history?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearLedger()
                    try {
                      for (const k of ['fq2.progress', 'fq2.runner', 'fq3.skylands', 'fq.onboarded.v1']) localStorage.removeItem(k)
                    } catch {
                      /* ignore */
                    }
                    setConfirmReset(false)
                    forceRefresh((n) => n + 1)
                  }}
                  className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`}
                  style={{ background: 'var(--bad)', boxShadow: '0 3px 0 var(--bad-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}
                >
                  Yes, erase
                </button>
                <button type="button" onClick={() => setConfirmReset(false)} className={`text-xs font-extrabold ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
                  Keep it
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
