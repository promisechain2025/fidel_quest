/* ============================================================================
   VOWEL-ORDER LADDER — the renderer
   ----------------------------------------------------------------------------
   Thin shell over the pure ladderCore. Kokeb calls the next form in vowel
   order; the child taps the matching glyph from the shuffled tray and it
   climbs a rung. A wrong tap re-chants the wanted form (never blocks). Fill
   all seven rungs -> Anbessa cheers.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { Sprite2D, drawAnbessa, drawKokeb, FOCUS } from '../FidelQuestApp'
import { FidelCard, GEEZ_DIGITS } from './FidelCard'
import { initLadder, ladderTransition, Phase, LadderEvent } from '../ladderCore'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''

export default function VowelLadder({ soundOn, onBack, families = [] }) {
  const pool = families.length ? families : ['ha']
  const startRef = useRef(Math.floor(Math.random() * pool.length)) // cosmetic pick only
  const [round, setRound] = useState(0)
  const family = pool[(startRef.current + round) % pool.length]
  const [ctx, setCtx] = useState(() => initLadder(family, (round + 1) * 97 + startRef.current))
  const reduce = useReducedMotion()

  // New round -> fresh family + tray. Kokeb then calls the first form via the
  // announce effect below - one voice per step, like Bingo (no extra prompt).
  useEffect(() => {
    setCtx(initLadder(family, (round + 1) * 97 + startRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  // Announce the next expected form whenever a rung is filled (and at start).
  useEffect(() => {
    if (ctx.phase !== Phase.PLAY) return
    const want = formOf(ctx.order[ctx.placed])
    const id = setTimeout(() => playForm(want, soundOn), 320)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.placed, family])

  const tapCard = (key) => {
    if (ctx.phase !== Phase.PLAY) return
    const want = ctx.order[ctx.placed]
    recordAnswer(want, key, 'ladder')
    const r = ladderTransition(ctx, { type: LadderEvent.TAP, payload: { key } })
    if (r.accepted) {
      // A soft chime only - do NOT re-voice the tapped letter. The announce
      // effect then calls the NEXT form, so the child hears one voice per step
      // (matching Bingo), never the placed letter and the next one at once.
      playEffect('good', soundOn)
      setCtx(r.next)
      if (r.next.phase === Phase.WIN) setTimeout(() => playEffect('win', soundOn), 200)
    } else {
      playEffect('bad', soundOn)
      setTimeout(() => playForm(formOf(want), soundOn), 300) // re-cue the wanted form
    }
  }

  const remaining = ctx.tray.filter((k) => ctx.order.indexOf(k) >= ctx.placed)
  const won = ctx.phase === Phase.WIN

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-lg font-black">{t('orderTitle', 'Put them in order!')}</h1>
        <div className="w-11" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <Sprite2D draw={won ? drawAnbessa : drawKokeb} size={won ? 108 : 84} mood="happy" pose={won ? 'cheer' : 'stand'} />

        {/* the seven rungs */}
        <div role="img" aria-label={t('orderProgress', `${ctx.placed} of 7 in order`, { n: ctx.placed })} className="flex items-end justify-center gap-1.5">
          {ctx.order.map((k, i) => {
            const filled = i < ctx.placed
            const current = i === ctx.placed && !won
            return (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-xl border-2 font-black"
                style={{
                  width: 40, height: 40 + i * 6,
                  background: filled ? 'var(--go-soft)' : 'var(--paper)',
                  borderColor: current ? 'var(--go)' : filled ? 'var(--go)' : 'var(--line)',
                  boxShadow: current ? '0 0 0 3px var(--go-soft)' : 'none',
                }}
              >
                {filled ? (
                  <span className="geez" style={{ fontSize: 22, color: 'var(--go-ink)' }}>{glyphOf(k)}</span>
                ) : (
                  <>
                    <span style={{ fontSize: 16, lineHeight: 1, color: 'var(--muted)' }}>{i + 1}</span>
                    <span className="geez" style={{ fontSize: 12, lineHeight: 1.2, color: 'var(--accent)' }}>{GEEZ_DIGITS[i]}</span>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* the shuffled tray */}
        {!won ? (
          <div className="flex flex-wrap items-center justify-center gap-2.5 px-2">
            {remaining.map((k) => (
              <motion.button
                key={k}
                type="button"
                onClick={() => tapCard(k)}
                whileTap={reduce ? undefined : { scale: 0.9 }}
                aria-label={glyphOf(k)}
                className={`rounded-2xl ${FOCUS}`}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <FidelCard glyph={glyphOf(k)} size={52} />
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="flex gap-3">
            <button type="button" onClick={() => setRound((r) => r + 1)} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
              {t('orderAgain', 'Another one!')}
            </button>
            <button type="button" onClick={onBack} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
              {t('orderDone', 'Done')}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
