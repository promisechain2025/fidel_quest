/* ============================================================================
   FIDEL MEMORY MATCH — the renderer
   ----------------------------------------------------------------------------
   Thin shell over the pure memoryCore. A grid of face-down cards (Kokeb-star
   backs); the child flips two, each flip speaks its letter, a matching pair
   locks and Anbessa cheers, a mismatch turns back after a short reveal. Clear
   the board to win. Never punishes a wrong flip - the pair just returns.

   The core is clock-free: this renderer schedules the mismatch reveal and
   then dispatches RESOLVE. Board size scales with how many letters the child
   knows (levelForCount over the learned pool).
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { sayPrompt } from '../platform/prompts'
import { t } from '../platform/i18n'
import { Sprite2D, drawAnbessa, drawKokeb, FOCUS } from '../FidelQuestApp'
import { FidelCard } from './FidelCard'
import { initMatch, matchTransition, levelForCount, Phase, MatchEvent } from '../memoryCore'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''

export default function FidelMatch({ soundOn, onBack, pool = [] }) {
  const keys = useMemo(() => (pool.length ? [...new Set(pool)] : ['ha-1']), [pool])
  const level = levelForCount(keys.length)
  const startRef = useRef(Math.floor(Math.random() * 997) + 1) // cosmetic seed
  const [round, setRound] = useState(0)
  const [ctx, setCtx] = useState(() => initMatch(level, startRef.current, keys))
  const reduce = useReducedMotion()
  const resolveTimer = useRef(null)

  // New round -> fresh board, and a one-time spoken hint.
  useEffect(() => {
    setCtx(initMatch(level, (round + 1) * 131 + startRef.current, keys))
    sayPrompt('matchFind', soundOn)
    return () => { if (resolveTimer.current) clearTimeout(resolveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const won = ctx.phase === Phase.WIN

  const flipCard = (card) => {
    if (card.faceUp || card.matched || ctx.flipped.length >= 2 || won) return
    const r = matchTransition(ctx, { type: MatchEvent.FLIP, payload: { id: card.id } })
    if (!r.accepted) return
    playForm(formOf(card.key), soundOn)
    setCtx(r.next)

    if (r.next.flipped.length === 2) {
      // Two mismatched cards showing: log the miss and schedule the turn-back.
      const [aId, bId] = r.next.flipped
      const a = r.next.cards.find((c) => c.id === aId)
      const b = r.next.cards.find((c) => c.id === bId)
      recordAnswer(a?.key, b?.key, 'match')
      resolveTimer.current = setTimeout(() => {
        setCtx((cur) => matchTransition(cur, { type: MatchEvent.RESOLVE }).next)
      }, reduce ? 650 : 950)
    } else if (r.next.matches > ctx.matches) {
      // A pair just locked.
      recordAnswer(card.key, card.key, 'match')
      playEffect('good', soundOn)
      if (r.next.phase === Phase.WIN) setTimeout(() => playEffect('win', soundOn), 220)
    }
  }

  const cols = 4
  // Card width so four portrait cards + gaps fit a phone column; smaller boards
  // get slightly larger cards. (height is 1.4x inside FidelCard.)
  const cardW = ctx.cards.length <= 8 ? 74 : 72

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-lg font-black">{t('matchTitle', 'Find the pairs!')}</h1>
        <div className="w-11" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-5">
        <Sprite2D draw={won ? drawAnbessa : drawKokeb} size={won ? 100 : 72} mood="happy" pose={won ? 'cheer' : 'stand'} />

        {!won ? (
          <div
            className="grid justify-center gap-2.5"
            style={{ gridTemplateColumns: `repeat(${cols}, ${cardW}px)` }}
          >
            {ctx.cards.map((card) => {
              const shown = card.faceUp || card.matched
              return (
                <motion.button
                  key={card.id}
                  type="button"
                  onClick={() => flipCard(card)}
                  disabled={shown}
                  whileTap={reduce || shown ? undefined : { scale: 0.92 }}
                  aria-label={shown ? glyphOf(card.key) : t('matchCardBack', 'Hidden card')}
                  className={`rounded-2xl ${FOCUS}`}
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: shown ? 'default' : 'pointer', outlineColor: 'var(--sky)' }}
                >
                  {shown
                    ? <FidelCard glyph={glyphOf(card.key)} size={cardW} done={card.matched} />
                    : <FidelCard variant="back" size={cardW} />}
                </motion.button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-base font-black" style={{ color: 'var(--muted)' }}>
              {t('matchWin', 'All matched!')}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRound((r) => r + 1)} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
                {t('matchAgain', 'Again!')}
              </button>
              <button type="button" onClick={onBack} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
                {t('orderDone', 'Done')}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
