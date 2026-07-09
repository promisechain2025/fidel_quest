/* ============================================================================
   TV CLASS DISPLAY — the chant board + class quiz
   ----------------------------------------------------------------------------
   A teacher casts (or plugs) their device into a TV. Two modes:

   - CHANT: one giant letter with its sound, the family's seven orders below,
     auto-advancing with audio the way weekend-school chalkboards work
     (ha - hu - hi - haa...). Tapping any order jumps to it.
   - QUIZ: the board plays a sound and shows four big letters; the class
     shouts, the teacher taps the answer, the board reveals and moves on.
     Questions come from the same twin-safe builder as homework.

   `families` scopes both modes to this week's letters (the Term Plan passes
   it); without it the whole abugida is on the board. Arrow keys / Enter
   work so a TV remote or keyboard can drive it. Deliberately single-theme
   (dark board) - it is a projection surface, not a page. The class-join QR
   sits in the corner so latecomers can scan straight off the screen.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Grid3X3, Pause, Play, Volume2, X } from 'lucide-react'
import { t } from '../platform/i18n'
import { FIDEL_FAMILIES, INDEXES } from '../platform/ethiopic'
import { playForm, playEffect } from '../platform/audioEngine'
import { buildReviewQueue } from '../platform/coach'
import { QrPanel } from './TeacherMode'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const STEP_MS = 2600
const INK = '#f6f2e8'
const BOARD = '#141419'
const GOLD = '#e8b33c'
const DIM = 'rgba(255,255,255,0.08)'

const formOf = (key) => INDEXES.byAudioKey.get(key)

/* ── chant mode ── */

function Chant({ familyIds, joinUrl, onBack }) {
  const scoped = FIDEL_FAMILIES.filter((f) => familyIds.includes(f.id))
  const [fam, setFam] = useState(0)
  const [order, setOrder] = useState(1)
  const [auto, setAuto] = useState(true)
  const [jump, setJump] = useState(false)
  const family = scoped[Math.min(fam, scoped.length - 1)]
  const orders = Array.from(family.chars)
  const form = formOf(`${family.id}-${order}`)

  useEffect(() => {
    if (form) playForm(form, true)
  }, [form])

  const step = useCallback((dir) => {
    setOrder((o) => {
      const n = o + dir
      if (n > orders.length) { setFam((f) => (f + 1) % scoped.length); return 1 }
      if (n < 1) { setFam((f) => (f - 1 + scoped.length) % scoped.length); return 7 }
      return n
    })
  }, [orders.length, scoped.length])

  const jumpFamily = useCallback((dir) => {
    setFam((f) => (f + dir + scoped.length) % scoped.length)
    setOrder(1)
  }, [scoped.length])

  // The chant clock. Restarts whenever the position changes so a manual tap
  // gets a full beat before the next auto-step.
  useEffect(() => {
    if (!auto || jump) return undefined
    const id = setTimeout(() => step(1), STEP_MS)
    return () => clearTimeout(id)
  }, [auto, jump, fam, order, step])

  // TV remotes and keyboards: arrows step, Enter/Space toggles the chant.
  useEffect(() => {
    const onKey = (e) => {
      if (jump) { if (e.key === 'Escape') { setJump(false); e.preventDefault() } return }
      if (e.key === 'ArrowRight') { step(1); e.preventDefault() }
      else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault() }
      else if (e.key === 'ArrowDown') { jumpFamily(1); e.preventDefault() }
      else if (e.key === 'ArrowUp') { jumpFamily(-1); e.preventDefault() }
      else if (e.key === 'Enter' || e.key === ' ') { setAuto((a) => !a); e.preventDefault() }
      else if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, jumpFamily, onBack, jump])

  return (
    <>
      <div className="flex items-center justify-between px-6 pt-1">
        <button type="button" onClick={() => setJump(true)} className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-lg font-black tracking-wide ${FOCUS}`} style={{ background: DIM, color: '#b9b2a4', outlineColor: GOLD }} aria-label={t('tvPickFamily', 'Jump to a family')}>
          <Grid3X3 className="h-5 w-5" aria-hidden="true" />
          <span className="geez text-2xl" style={{ color: INK }}>{orders[0]}</span>
          {' '}· {family.name} · {fam + 1}/{scoped.length}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <p key={`${family.id}-${order}`} className="geez font-black leading-none" style={{ fontSize: 'min(42vh, 42vw)', textShadow: '0 10px 0 rgba(0,0,0,0.35)' }}>
          {form?.char}
        </p>
        <p className="mono mt-2 text-4xl font-black" style={{ color: GOLD }}>
          {form?.sound}
        </p>
      </div>

      <div className="mx-auto mb-4 flex max-w-full flex-wrap items-center justify-center gap-2 px-4">
        {orders.map((ch, i) => (
          <button key={i} type="button" onClick={() => setOrder(i + 1)} aria-pressed={order === i + 1} className={`geez flex h-16 w-16 items-center justify-center rounded-2xl text-4xl font-black ${FOCUS}`} style={order === i + 1
            ? { background: GOLD, color: BOARD, outlineColor: INK }
            : { background: DIM, color: INK, outlineColor: GOLD }}>
            {ch}
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between gap-4 px-6 pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => jumpFamily(-1)} aria-label={t('tvPrevFamily', 'Previous family')} className={`flex h-14 w-14 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: DIM, outlineColor: GOLD }}>
            <ChevronLeft className="h-7 w-7" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setAuto((a) => !a)} aria-label={auto ? t('tvPause', 'Pause the chant') : t('tvPlay', 'Play the chant')} aria-pressed={auto} className={`flex h-14 w-20 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: GOLD, color: BOARD, outlineColor: INK }}>
            {auto ? <Pause className="h-7 w-7" aria-hidden="true" /> : <Play className="h-7 w-7" aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => jumpFamily(1)} aria-label={t('tvNextFamily', 'Next family')} className={`flex h-14 w-14 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: DIM, outlineColor: GOLD }}>
            <ChevronRight className="h-7 w-7" aria-hidden="true" />
          </button>
        </div>
        {joinUrl && (
          <div className="flex flex-col items-center gap-1">
            <QrPanel url={joinUrl} size={104} light={INK} dark={BOARD} />
            <p className="text-xs font-black" style={{ color: '#b9b2a4' }}>{t('tvJoin', 'Scan to join the class')}</p>
          </div>
        )}
      </div>

      {/* family jump grid: every scoped family's base glyph */}
      {jump && (
        <div className="absolute inset-0 z-10 flex flex-col p-6" style={{ background: 'rgba(20,20,25,0.96)' }}>
          <div className="flex items-center justify-between">
            <p className="text-lg font-black" style={{ color: '#b9b2a4' }}>{t('tvPickFamily', 'Jump to a family')}</p>
            <button type="button" onClick={() => setJump(false)} aria-label={t('back', 'Back')} className={`flex h-12 w-12 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: DIM, outlineColor: INK }}>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid flex-1 content-start gap-2 overflow-y-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(4.5rem, 1fr))' }}>
            {scoped.map((f, i) => (
              <button key={f.id} type="button" onClick={() => { setFam(i); setOrder(1); setJump(false) }} aria-pressed={i === fam} className={`geez flex aspect-square items-center justify-center rounded-2xl text-4xl font-black ${FOCUS}`} style={i === fam
                ? { background: GOLD, color: BOARD, outlineColor: INK }
                : { background: DIM, color: INK, outlineColor: GOLD }}>
                {Array.from(f.chars)[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* ── quiz mode: sound plays, class shouts, teacher taps the answer ── */

function Quiz({ familyIds, joinUrl, onBack }) {
  const [round, setRound] = useState(0)
  const [revealed, setRevealed] = useState(null) // tapped key | null
  // A fresh seed per entry; within a session the queue loops with new draws.
  const [seed] = useState(() => (Date.now() % 1000000) | 1)
  const queue = useMemo(
    () => buildReviewQueue(seed + round * 97, familyIds, [], 10),
    [seed, round, familyIds],
  )
  const [i, setI] = useState(0)
  const q = queue[i] || null
  const form = q ? formOf(q.target) : null

  useEffect(() => {
    if (form) playForm(form, true)
  }, [form])

  const next = useCallback(() => {
    setRevealed(null)
    if (i + 1 < queue.length) setI(i + 1)
    else { setRound((r) => r + 1); setI(0) }
  }, [i, queue.length])

  const pick = (key) => {
    if (revealed) return
    setRevealed(key)
    playEffect(key === q.target ? 'good' : 'bad', true)
    setTimeout(next, 2200)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onBack()
      else if (e.key === 'Enter' || e.key === ' ') { if (form) playForm(form, true); e.preventDefault() }
      else if (e.key === 'ArrowRight') { next(); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, form, next])

  if (!q) return null
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6">
        <button type="button" onClick={() => playForm(form, true)} className={`flex items-center gap-3 rounded-3xl px-8 py-5 text-3xl font-black ${FOCUS}`} style={{ background: GOLD, color: BOARD, outlineColor: INK }}>
          <Volume2 className="h-9 w-9" aria-hidden="true" />
          {t('tvSay', 'Who is this?')}
        </button>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-4">
          {q.options.map((k) => {
            const isTarget = k === q.target
            const state = !revealed ? 'idle' : isTarget ? 'right' : k === revealed ? 'wrong' : 'dim'
            return (
              <button key={k} type="button" onClick={() => pick(k)} className={`geez flex items-center justify-center rounded-3xl font-black leading-none ${FOCUS}`} style={{
                width: 'min(22vh, 22vw)', height: 'min(22vh, 22vw)', fontSize: 'min(13vh, 13vw)',
                background: state === 'right' ? '#3fa650' : state === 'wrong' ? '#c0392b' : DIM,
                color: INK, opacity: state === 'dim' ? 0.35 : 1, outlineColor: GOLD,
                transition: 'background 0.3s, opacity 0.3s',
              }}>
                {formOf(k)?.char}
              </button>
            )
          })}
        </div>
        <p className="mono h-10 text-3xl font-black" style={{ color: GOLD }}>
          {revealed ? `${form.char}  ·  ${form.sound}` : ''}
        </p>
      </div>
      <div className="flex items-end justify-between gap-4 px-6 pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <p className="mono text-lg font-black" style={{ color: '#b9b2a4' }}>{i + 1}/{queue.length}</p>
        {joinUrl && (
          <div className="flex flex-col items-center gap-1">
            <QrPanel url={joinUrl} size={104} light={INK} dark={BOARD} />
            <p className="text-xs font-black" style={{ color: '#b9b2a4' }}>{t('tvJoin', 'Scan to join the class')}</p>
          </div>
        )}
      </div>
    </>
  )
}

export default function TvClass({ onBack, joinUrl = null, families = null }) {
  const familyIds = families?.length ? families : FIDEL_FAMILIES.map((f) => f.id)
  const [mode, setMode] = useState('chant') // chant | quiz

  // Best-effort fullscreen on entry (a projection wants no browser chrome).
  useEffect(() => {
    try { document.documentElement.requestFullscreen?.() } catch { /* not allowed */ }
    return () => { try { if (document.fullscreenElement) document.exitFullscreen?.() } catch { /* ignore */ } }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: BOARD, color: INK }}>
      <div className="flex items-center justify-between px-6 pt-4" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <div className="flex gap-2" role="tablist">
          {[['chant', t('tvChant', 'Chant')], ['quiz', t('tvQuiz', 'Quiz')]].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={`rounded-2xl px-4 py-2 text-lg font-black ${FOCUS}`} style={mode === id
              ? { background: GOLD, color: BOARD, outlineColor: INK }
              : { background: DIM, color: INK, outlineColor: GOLD }}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onBack} aria-label={t('tvExit', 'Exit TV display')} className={`flex h-12 w-12 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: DIM, outlineColor: INK }}>
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      {mode === 'chant'
        ? <Chant familyIds={familyIds} joinUrl={joinUrl} onBack={onBack} />
        : <Quiz familyIds={familyIds} joinUrl={joinUrl} onBack={onBack} />}
    </div>
  )
}
