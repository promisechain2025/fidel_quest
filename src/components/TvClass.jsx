/* ============================================================================
   TV CLASS DISPLAY — the chant board
   ----------------------------------------------------------------------------
   A teacher casts (or plugs) their device into a TV and the whole class
   chants the fidel together: one giant letter with its sound, the family's
   seven orders below it, auto-advancing with audio the way weekend-school
   chalkboards work (ha - hu - hi - haa...). Arrow keys / Enter work so a
   TV remote or a keyboard can drive it; tapping any order jumps to it.

   Deliberately single-theme (dark board) - it is a projection surface, not
   a page. The class-join QR sits in the corner so latecomers can scan
   straight off the screen. Fully offline like everything else.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { t } from '../platform/i18n'
import { FIDEL_FAMILIES, INDEXES } from '../platform/ethiopic'
import { playForm } from '../platform/audioEngine'
import { QrPanel } from './TeacherMode'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const STEP_MS = 2600

export default function TvClass({ onBack, joinUrl = null }) {
  const [fam, setFam] = useState(0)
  const [order, setOrder] = useState(1)
  const [auto, setAuto] = useState(true)
  const family = FIDEL_FAMILIES[fam]
  const orders = Array.from(family.chars)
  const form = INDEXES.byAudioKey.get(`${family.id}-${order}`)
  const speakRef = useRef(0)

  // Say the current letter whenever it changes (and on entry).
  useEffect(() => {
    if (form) playForm(form, true)
  }, [form])

  const step = useCallback((dir) => {
    speakRef.current += 1
    setOrder((o) => {
      const n = o + dir
      if (n > orders.length) { setFam((f) => (f + 1) % FIDEL_FAMILIES.length); return 1 }
      if (n < 1) { setFam((f) => (f - 1 + FIDEL_FAMILIES.length) % FIDEL_FAMILIES.length); return 7 }
      return n
    })
  }, [orders.length])

  const jumpFamily = useCallback((dir) => {
    speakRef.current += 1
    setFam((f) => (f + dir + FIDEL_FAMILIES.length) % FIDEL_FAMILIES.length)
    setOrder(1)
  }, [])

  // The chant clock. Restarts whenever the position changes so a manual tap
  // gets a full beat before the next auto-step.
  useEffect(() => {
    if (!auto) return undefined
    const id = setTimeout(() => step(1), STEP_MS)
    return () => clearTimeout(id)
  }, [auto, fam, order, step])

  // TV remotes and keyboards: arrows step, Enter/Space toggles the chant.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') { step(1); e.preventDefault() }
      else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault() }
      else if (e.key === 'ArrowDown') { jumpFamily(1); e.preventDefault() }
      else if (e.key === 'ArrowUp') { jumpFamily(-1); e.preventDefault() }
      else if (e.key === 'Enter' || e.key === ' ') { setAuto((a) => !a); e.preventDefault() }
      else if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, jumpFamily, onBack])

  // Best-effort fullscreen on entry (a projection wants no browser chrome).
  useEffect(() => {
    try { document.documentElement.requestFullscreen?.() } catch { /* not allowed */ }
    return () => { try { if (document.fullscreenElement) document.exitFullscreen?.() } catch { /* ignore */ } }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#141419', color: '#f6f2e8' }}>
      {/* top bar: family name + exit */}
      <div className="flex items-center justify-between px-6 pt-4" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <p className="text-lg font-black tracking-wide" style={{ color: '#b9b2a4' }}>
          <span className="geez text-2xl" style={{ color: '#f6f2e8' }}>{orders[0]}</span>
          {' '}· {family.name} · {fam + 1}/{FIDEL_FAMILIES.length}
        </p>
        <button type="button" onClick={onBack} aria-label={t('tvExit', 'Exit TV display')} className={`flex h-12 w-12 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'rgba(255,255,255,0.08)', outlineColor: '#f6f2e8' }}>
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* the letter */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <p key={`${family.id}-${order}`} className="geez font-black leading-none" style={{ fontSize: 'min(44vh, 44vw)', textShadow: '0 10px 0 rgba(0,0,0,0.35)' }}>
          {form?.char}
        </p>
        <p className="mono mt-2 text-4xl font-black" style={{ color: '#e8b33c' }}>
          {form?.sound}
        </p>
      </div>

      {/* the seven orders of this family */}
      <div className="mx-auto mb-4 flex max-w-full flex-wrap items-center justify-center gap-2 px-4">
        {orders.map((ch, i) => (
          <button key={i} type="button" onClick={() => { speakRef.current += 1; setOrder(i + 1) }} aria-pressed={order === i + 1} className={`geez flex h-16 w-16 items-center justify-center rounded-2xl text-4xl font-black ${FOCUS}`} style={order === i + 1
            ? { background: '#e8b33c', color: '#141419', outlineColor: '#f6f2e8' }
            : { background: 'rgba(255,255,255,0.08)', color: '#f6f2e8', outlineColor: '#e8b33c' }}>
            {ch}
          </button>
        ))}
      </div>

      {/* controls + join QR */}
      <div className="flex items-end justify-between gap-4 px-6 pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => jumpFamily(-1)} aria-label={t('tvPrevFamily', 'Previous family')} className={`flex h-14 w-14 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'rgba(255,255,255,0.08)', outlineColor: '#e8b33c' }}>
            <ChevronLeft className="h-7 w-7" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setAuto((a) => !a)} aria-label={auto ? t('tvPause', 'Pause the chant') : t('tvPlay', 'Play the chant')} aria-pressed={auto} className={`flex h-14 w-20 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: '#e8b33c', color: '#141419', outlineColor: '#f6f2e8' }}>
            {auto ? <Pause className="h-7 w-7" aria-hidden="true" /> : <Play className="h-7 w-7" aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => jumpFamily(1)} aria-label={t('tvNextFamily', 'Next family')} className={`flex h-14 w-14 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'rgba(255,255,255,0.08)', outlineColor: '#e8b33c' }}>
            <ChevronRight className="h-7 w-7" aria-hidden="true" />
          </button>
        </div>
        {joinUrl && (
          <div className="flex flex-col items-center gap-1">
            <QrPanel url={joinUrl} size={104} light="#f6f2e8" dark="#141419" />
            <p className="text-xs font-black" style={{ color: '#b9b2a4' }}>{t('tvJoin', 'Scan to join the class')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
