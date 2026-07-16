/* ============================================================================
   TV CLASS DISPLAY — the chant board + class quiz
   ----------------------------------------------------------------------------
   A teacher casts (or plugs) their device into a TV. The teacher PRE-SELECTS
   the letters being taught today (the grid chooser); that one selection
   drives BOTH modes - chant the selected letters, and when the teacher
   judges the class ready they switch to Quiz, which asks exactly those
   letters. No automatic gating: the teacher decides when to move on.

   - CHANT: one giant letter with its sound, the family's seven orders below,
     auto-advancing with audio. SAY AFTER ME toggle: the app says the letter,
     shows "Your turn - say it!", holds the beat so the class can chant back,
     then continues.
   - QUIZ: the board plays a sound and shows lettered options with big
     NUMBER LABELS (1-4) - the teacher asks "which one?", the class answers
     by number ("three!"), the teacher taps it (or presses 1-4), the board
     reveals and moves on.

   `families` scopes the board to the calling week's letters (the Term Plan
   passes it); without it the whole abugida is available. Arrow keys / Enter
   work so a TV remote or keyboard can drive it. Deliberately single-theme
   (dark board) - it is a projection surface, not a page. The class-join QR
   sits in the corner so latecomers can scan straight off the screen.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Grid3X3, Mic, Pause, Play, Volume2, X } from 'lucide-react'
import { t } from '../platform/i18n'
import { FIDEL_FAMILIES, INDEXES } from '../platform/ethiopic'
import { playForm, playEffect } from '../platform/audioEngine'
import { buildReviewQueue } from '../platform/coach'
import { isNativePlatform } from '../platform/native'
import { useKeepAwake } from '../platform/wakeLock'
import { QrPanel } from './TeacherMode'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const STEP_MS = 2600
const SAY_AFTER_MS = STEP_MS + 1000 // clip (~1s) + the app's own beat for the class to chant back
const INK = '#f6f2e8'
const BOARD = '#141419'
const GOLD = '#e8b33c'
const DIM = 'rgba(255,255,255,0.08)'

const formOf = (key) => INDEXES.byAudioKey.get(key)

function JoinCorner({ joinUrl }) {
  if (!joinUrl) return null
  return (
    <div className="flex flex-col items-center gap-1">
      <QrPanel url={joinUrl} size={104} light={INK} dark={BOARD} />
      <p className="text-xs font-black" style={{ color: '#b9b2a4' }}>{t('tvJoin', 'Scan to join the class')}</p>
    </div>
  )
}

/* ── chant mode ── */

function Chant({ scopeIds, sel, setSel, joinUrl, onBack, chooseFirst = false }) {
  // Opened without a week scope (whole abugida): make the teacher pick
  // today's letters before anything chants or quizzes.
  const [pick, setPick] = useState(chooseFirst)
  const scoped = FIDEL_FAMILIES.filter((f) => sel.has(f.id))
  const [fam, setFam] = useState(0)
  const [order, setOrder] = useState(1)
  const [dir, setDir] = useState(1) // the chant direction: forward, then back
  const [echo, setEcho] = useState(false) // the turn letters get a second beat
  const [beat, setBeat] = useState(0) // bumped when the SAME letter must sound again
  // The board opens PAUSED: the first letter is up while the teacher gets
  // the class ready, and the chant only runs once they press Play.
  const [auto, setAuto] = useState(false)
  const [sayAfter, setSayAfter] = useState(false)
  const [yourTurn, setYourTurn] = useState(false)
  const family = scoped[Math.min(fam, scoped.length - 1)]
  const orders = family ? Array.from(family.chars) : []
  const form = family ? formOf(`${family.id}-${order}`) : null

  // ONE effect owns the audio: it fires when the letter changes AND when
  // `beat` bumps - the echo turns and the single-family restart keep the same
  // letter on screen, so [form] alone would stay silent there.
  useEffect(() => {
    if (form && !pick) playForm(form, true)
  }, [form, beat, pick])
  // In say-after-me, cue the class right as the clip finishes. Separate from
  // the play effect so toggling the mode mid-letter cues immediately.
  useEffect(() => {
    setYourTurn(false)
    if (!form || !sayAfter || pick) return undefined
    const cue = setTimeout(() => setYourTurn(true), 1000)
    return () => clearTimeout(cue)
  }, [form, sayAfter, beat, pick])

  // Manual stepping (arrows/remote): plain linear movement.
  const step = useCallback((d) => {
    if (!scoped.length) return
    setEcho(false)
    setOrder((o) => {
      const n = o + d
      if (n > orders.length) { setFam((f) => (f + 1) % scoped.length); setDir(1); return 1 }
      if (n < 1) { setFam((f) => (f - 1 + scoped.length) % scoped.length); setDir(1); return 7 }
      return n
    })
  }, [orders.length, scoped.length])

  // The auto-chant goes down the row and BACK UP, the traditional weekend-
  // school pattern, and the TURN letters are chanted TWICE - once ending a
  // pass, once starting the next: ha hu hi haa hie h ho HO h hie haa hi hu
  // ha HA - and only then the next family.
  const chantStep = useCallback(() => {
    if (!scoped.length) return
    if (dir === 1) {
      if (order < orders.length) { setOrder(order + 1); return }
      if (!echo) { setEcho(true); setBeat((b) => b + 1); return } // say the LAST letter again
      setEcho(false); setDir(-1); setOrder(orders.length - 1); return
    }
    if (order > 1) { setOrder(order - 1); return }
    if (!echo) { setEcho(true); setBeat((b) => b + 1); return } // say the FIRST letter again
    setEcho(false); setDir(1); setFam((f) => (f + 1) % scoped.length); setOrder(1)
    // with a single family selected, the restart lands on the same letter -
    // bump the beat so it still sounds
    if (scoped.length === 1) setBeat((b) => b + 1)
  }, [dir, echo, order, orders.length, scoped.length])

  const jumpFamily = useCallback((d) => {
    if (!scoped.length) return
    setFam((f) => (f + d + scoped.length) % scoped.length)
    setOrder(1)
    setDir(1)
    setEcho(false)
  }, [scoped.length])

  // The chant clock. Say-after-me holds the beat much longer so the class
  // has room to chant back before the next letter. Restarts on any manual
  // move so a tap gets a full beat.
  useEffect(() => {
    if (!auto || pick || !form) return undefined
    const id = setTimeout(() => chantStep(), sayAfter ? SAY_AFTER_MS : STEP_MS)
    return () => clearTimeout(id)
  }, [auto, pick, sayAfter, fam, order, dir, echo, beat, chantStep, form])

  // TV remotes and keyboards: arrows step, Enter/Space toggles the chant.
  useEffect(() => {
    const onKey = (e) => {
      if (pick) { if (e.key === 'Escape') { setPick(false); e.preventDefault() } return }
      if (e.key === 'ArrowRight') { step(1); e.preventDefault() }
      else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault() }
      else if (e.key === 'ArrowDown') { jumpFamily(1); e.preventDefault() }
      else if (e.key === 'ArrowUp') { jumpFamily(-1); e.preventDefault() }
      else if (e.key === 'Enter' || e.key === ' ') { setAuto((a) => !a); e.preventDefault() }
      else if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, jumpFamily, onBack, pick])

  const toggleFamily = (id) => {
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-6 pt-1">
        <button type="button" onClick={() => setPick(true)} className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-lg font-black tracking-wide ${FOCUS}`} style={{ background: DIM, color: '#b9b2a4', outlineColor: GOLD }} aria-label={t('tvChoose', 'Choose letters')}>
          <Grid3X3 className="h-5 w-5" aria-hidden="true" />
          {family && <span className="geez text-2xl" style={{ color: INK }}>{orders[0]}</span>}
          {family && <> · {family.name} · {fam + 1}/{scoped.length}</>}
        </button>
        <button type="button" onClick={() => setSayAfter((v) => !v)} aria-pressed={sayAfter} className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-lg font-black ${FOCUS}`} style={sayAfter
          ? { background: GOLD, color: BOARD, outlineColor: INK }
          : { background: DIM, color: INK, outlineColor: GOLD }}>
          <Mic className="h-5 w-5" aria-hidden="true" />
          {t('tvSayAfter', 'Say after me')}
        </button>
      </div>

      <div className="fq-tv-center flex min-h-0 flex-1 flex-col items-center justify-center">
        <p key={`${family?.id}-${order}-${beat}`} className="geez fq-tv-pop fq-tv-letter font-black leading-none" style={{ textShadow: '0 10px 0 rgba(0,0,0,0.35)' }}>
          {form?.char}
        </p>
        <div className="flex flex-col items-center">
          <p className="mono mt-1 text-4xl font-black" style={{ color: GOLD }}>
            {form?.sound}
          </p>
          <p className="mt-2 h-10 text-3xl font-black" style={{ color: GOLD, opacity: sayAfter && yourTurn ? 1 : 0, transition: 'opacity 0.3s' }} aria-live="polite">
            {t('tvYourTurn', 'Your turn - say it!')}
          </p>
        </div>
      </div>

      <div className="fq-tv-orders mx-auto mb-4 flex max-w-full flex-wrap items-center justify-center gap-2 px-4">
        {orders.map((ch, i) => (
          <button key={i} type="button" onClick={() => { setEcho(false); setOrder(i + 1) }} aria-pressed={order === i + 1} className={`geez flex h-16 w-16 items-center justify-center rounded-2xl text-4xl font-black ${FOCUS}`} style={order === i + 1
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
        <JoinCorner joinUrl={joinUrl} />
      </div>

      {/* letter chooser: the teacher pre-selects today's letters; the same
         selection is what the Quiz will ask. */}
      {pick && (
        <div className="absolute inset-0 z-10 flex flex-col p-6" style={{ background: 'rgba(20,20,25,0.96)' }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-black" style={{ color: '#b9b2a4' }}>{t('tvChoose', 'Choose letters')}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSel(new Set(scopeIds))} className={`rounded-2xl px-4 py-2 text-lg font-black ${FOCUS}`} style={{ background: DIM, color: INK, outlineColor: GOLD }}>
                {t('tvAll', 'All')}
              </button>
              <button type="button" onClick={() => setSel(new Set())} className={`rounded-2xl px-4 py-2 text-lg font-black ${FOCUS}`} style={{ background: DIM, color: INK, outlineColor: GOLD }}>
                {t('tvNone', 'None')}
              </button>
              <button type="button" disabled={sel.size === 0} onClick={() => { setPick(false); setFam(0); setOrder(1) }} className={`rounded-2xl px-4 py-2 text-lg font-black ${FOCUS}`} style={{ background: sel.size ? GOLD : DIM, color: sel.size ? BOARD : '#777', outlineColor: INK }}>
                {t('tvDone', 'Done')}
              </button>
            </div>
          </div>
          <div className="mt-4 grid flex-1 content-start gap-2 overflow-y-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(4.5rem, 1fr))' }}>
            {FIDEL_FAMILIES.filter((f) => scopeIds.includes(f.id)).map((f) => {
              const on = sel.has(f.id)
              return (
                <button key={f.id} type="button" onClick={() => toggleFamily(f.id)} aria-pressed={on} className={`geez relative flex aspect-square items-center justify-center rounded-2xl text-4xl font-black ${FOCUS}`} style={on
                  ? { background: GOLD, color: BOARD, outlineColor: INK }
                  : { background: DIM, color: INK, opacity: 0.55, outlineColor: GOLD }}>
                  {on && (
                    <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: BOARD, color: GOLD }} aria-hidden="true">
                      <Check className="h-4 w-4" strokeWidth={4} />
                    </span>
                  )}
                  {Array.from(f.chars)[0]}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

/* ── quiz mode: numbered labels; the class answers BY NUMBER ── */

function Quiz({ familyIds, joinUrl, onBack }) {
  const [round, setRound] = useState(0)
  const [revealed, setRevealed] = useState(null) // tapped key | null
  // A fresh seed per entry; within a session the queue loops with new draws.
  // ALL SEVEN orders of the selected families are fair game - the chant
  // teaches the whole row (ha hu hi haa hie h ho), so the quiz asks the
  // whole row, not just the base letter.
  const [seed] = useState(() => (Date.now() % 1000000) | 1)
  const queue = useMemo(
    () => buildReviewQueue(seed + round * 97, familyIds, [], 10, [1, 2, 3, 4, 5, 6, 7]),
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

  const pick = useCallback((key) => {
    if (revealed || !q) return
    setRevealed(key)
    playEffect(key === q.target ? 'good' : 'bad', true)
    setTimeout(next, 2200)
  }, [revealed, q, next])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onBack()
      else if (e.key === 'Enter' || e.key === ' ') { if (form) playForm(form, true); e.preventDefault() }
      else if (e.key === 'ArrowRight') { next(); e.preventDefault() }
      else if (/^[1-4]$/.test(e.key) && q) {
        const k = q.options[Number(e.key) - 1]
        if (k) pick(k)
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, form, next, q, pick])

  if (!q) return null
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6">
        <button type="button" onClick={() => playForm(form, true)} className={`flex items-center gap-3 rounded-3xl px-8 py-5 text-3xl font-black ${FOCUS}`} style={{ background: GOLD, color: BOARD, outlineColor: INK }}>
          <Volume2 className="h-9 w-9" aria-hidden="true" />
          {t('tvSay', 'Who is this?')}
        </button>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-4">
          {q.options.map((k, idx) => {
            const isTarget = k === q.target
            const state = !revealed ? 'idle' : isTarget ? 'right' : k === revealed ? 'wrong' : 'dim'
            return (
              <button key={k} type="button" onClick={() => pick(k)} className={`geez relative flex items-center justify-center rounded-3xl font-black leading-none ${FOCUS}`} style={{
                width: 'min(21vh, 21vw)', height: 'min(21vh, 21vw)', fontSize: 'min(12vh, 12vw)',
                background: state === 'right' ? '#3fa650' : state === 'wrong' ? '#c0392b' : DIM,
                color: INK, opacity: state === 'dim' ? 0.35 : 1, outlineColor: GOLD,
                transition: 'background 0.3s, opacity 0.3s',
              }}>
                {/* the label the class answers BY: "which one?" - "three!" */}
                <span className="mono absolute left-2 top-2 flex items-center justify-center rounded-full font-black" style={{ width: 'min(5vh, 5vw)', height: 'min(5vh, 5vw)', fontSize: 'min(3vh, 3vw)', background: GOLD, color: BOARD }} aria-hidden="true">
                  {idx + 1}
                </span>
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
        <JoinCorner joinUrl={joinUrl} />
      </div>
    </>
  )
}

export default function TvClass({ onBack, joinUrl = null, families = null }) {
  const scopeIds = families?.length ? families : FIDEL_FAMILIES.map((f) => f.id)
  const chooseFirst = !families?.length
  const [mode, setMode] = useState('chant') // chant | quiz
  // ONE selection drives both modes: the teacher picks today's letters in
  // the chant chooser, and the Quiz asks exactly those. The teacher decides
  // when the class is ready by switching tabs - no automatic gating.
  const [sel, setSel] = useState(() => (chooseFirst ? new Set() : new Set(scopeIds)))
  const selectedIds = scopeIds.filter((id) => sel.has(id))

  // Best-effort fullscreen on entry (a projection wants no browser chrome) -
  // WEB ONLY. The native shell is already fullscreen, and asking WKWebView
  // for HTML fullscreen there makes iOS present its own fullscreen container
  // over the app (view-service churn, frozen-feeling UI). Also blur any
  // focused input: arriving from the class-code field otherwise carries a
  // live keyboard session onto the board.
  useEffect(() => {
    try { document.activeElement?.blur?.() } catch { /* ignore */ }
    if (isNativePlatform()) return undefined
    try { document.documentElement.requestFullscreen?.() } catch { /* not allowed */ }
    return () => { try { if (document.fullscreenElement) document.exitFullscreen?.() } catch { /* ignore */ } }
  }, [])
  // A projected lesson runs untouched for minutes at a time - the phone must
  // not dim or lock mid-chant.
  useKeepAwake()

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: BOARD, color: INK }}>
      <div className="flex items-center justify-between px-6 pt-4" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2" role="tablist">
          {[['chant', t('tvChant', 'Chant')], ['quiz', t('tvQuiz', 'Quiz')]].map(([id, label]) => {
            const disabled = id === 'quiz' && selectedIds.length === 0
            return (
              <button key={id} type="button" role="tab" aria-selected={mode === id} disabled={disabled} onClick={() => setMode(id)} className={`rounded-2xl px-4 py-2 text-lg font-black ${FOCUS}`} style={mode === id
                ? { background: GOLD, color: BOARD, outlineColor: INK }
                : { background: DIM, color: INK, opacity: disabled ? 0.4 : 1, outlineColor: GOLD }}>
                {label}
              </button>
            )
          })}
        </div>
        <button type="button" onClick={onBack} aria-label={t('tvExit', 'Exit TV display')} className={`flex h-12 w-12 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: DIM, outlineColor: INK }}>
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      {mode === 'chant'
        ? <Chant scopeIds={scopeIds} sel={sel} setSel={setSel} joinUrl={joinUrl} onBack={onBack} chooseFirst={chooseFirst} />
        : <Quiz familyIds={selectedIds} joinUrl={joinUrl} onBack={onBack} />}
    </div>
  )
}
