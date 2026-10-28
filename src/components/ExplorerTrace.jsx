/* ============================================================================
   EXPLORER TRACE — trace any letter of any family (rehomed from Classic)
   ----------------------------------------------------------------------------
   Classic mode was the only place a child could trace ANY of the 33 families
   (the journey's stone lessons trace only the letters being taught). It now
   lives in Letter Explorer: open a family, tap the pencil, trace its forms
   one at a time. Hear button, stars, auto-advance, skip. Lazy-loaded so the
   Explorer screen itself stays light.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, ChevronRight, ChevronLeft, Star } from 'lucide-react'
import { ALL_FORMS, ORDERS } from '../platform/ethiopic'
import { playForm, playEffect } from '../platform/audioEngine'
import { t } from '../platform/i18n'
import FidelTracePad from './FidelTracePad'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

export default function ExplorerTrace({ family, soundOn }) {
  const forms = useMemo(() => ALL_FORMS.filter((f) => f.familyId === family.id), [family.id])
  const [idx, setIdx] = useState(0)
  const [result, setResult] = useState(null)
  const [stars, setStars] = useState({}) // audioKey -> best stars this visit
  const reduce = useReducedMotion()
  const timer = useRef(null)
  const form = forms[Math.min(idx, forms.length - 1)]
  const finished = idx >= forms.length

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (form && !finished) playForm(form, soundOn) }, [form?.audioKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (d) => { clearTimeout(timer.current); setResult(null); setIdx((i) => Math.max(0, Math.min(forms.length, i + d))) }

  const onScored = (r) => {
    setResult(r)
    if (r.stars >= 1) {
      playEffect('good', soundOn)
      setStars((s) => ({ ...s, [form.audioKey]: Math.max(s[form.audioKey] || 0, r.stars) }))
      clearTimeout(timer.current)
      timer.current = setTimeout(() => go(1), 1200)
    } else {
      playEffect('bad', soundOn)
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-4 py-6" data-testid="explorer-trace-done">
        <p className="text-5xl" aria-hidden="true">🎉</p>
        <div className="flex flex-wrap justify-center gap-2">
          {forms.map((f) => (
            <span key={f.audioKey} className="geez flex flex-col items-center rounded-xl px-2 py-1 text-3xl font-black" style={{ background: 'var(--card)', border: '2px solid var(--line)' }}>
              {f.char}
              <span className="flex" aria-hidden="true">{[1, 2, 3].map((n) => <Star key={n} className="h-3 w-3" style={{ color: 'var(--star)', fill: n <= (stars[f.audioKey] || 0) ? 'var(--star)' : 'none' }} />)}</span>
            </span>
          ))}
        </div>
        <button type="button" onClick={() => { setIdx(0); setResult(null) }} className={`chunk min-h-[44px] rounded-2xl px-5 py-2 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
          {t('traceAgain', 'Trace again')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3" data-testid="explorer-trace">
      <div className="flex gap-1.5" aria-hidden="true">
        {forms.map((f, i) => (
          <span key={f.audioKey} className="block rounded-full" style={{ width: 12, height: 12, background: stars[f.audioKey] ? 'var(--go)' : i === idx ? 'var(--accent)' : 'var(--line)' }} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => go(-1)} disabled={idx === 0} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', opacity: idx === 0 ? 0.4 : 1 }}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="geez text-3xl font-black">{form.char}</span>
        <span className="text-xs font-black uppercase" style={{ color: 'var(--muted)' }}>{ORDERS[form.order - 1]?.geezName}</span>
        <button type="button" onClick={() => playForm(form, soundOn)} aria-label={t('traceHear', 'Hear it')} className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${FOCUS}`} style={{ background: 'var(--sky)' }}>
          <Volume2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <FidelTracePad
        key={form.audioKey}
        char={form.char}
        familyId={family.id}
        labels={{
          clear: t('traceClear', 'Clear'),
          check: t('traceCheck', 'Check'),
          instruction: t('traceInstruction', 'Draw over the gray letter with your finger.'),
          unsupported: '-',
          scribble: t('traceScribble', 'Trace on the gray letter, not all over the pad. Clear and try again!'),
        }}
        onScored={onScored}
      />
      <div className="flex min-h-[44px] items-center gap-3">
        <motion.p role="status" aria-live="polite" key={result ? `${form.audioKey}-${result.stars}` : 'none'} initial={reduce ? false : { scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-base font-black" style={{ color: !result ? 'transparent' : result.stars >= 1 ? 'var(--go-ink)' : 'var(--bad, #c0392b)' }}>
          {!result ? '·' : result.stars >= 1 ? [1, 2, 3].map((n) => <Star key={n} className="h-6 w-6" style={{ color: 'var(--star)', fill: n <= result.stars ? 'var(--star)' : 'none' }} aria-hidden="true" />) : t('traceTry', 'Try again!')}
        </motion.p>
        <button type="button" onClick={() => go(1)} className={`flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-sm font-black ${FOCUS}`} style={{ color: 'var(--muted)' }}>
          {t('traceSkip', 'Skip')} <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
