/* ============================================================================
   MERKATO MARKET — the renderer
   ----------------------------------------------------------------------------
   Anbessa's market stall. An item sits on the counter with its price written
   as a Ge'ez numeral (፩..፱); the child reads the number and taps the coin bag
   holding that many birr. Right bag -> the item drops in the basket and
   Anbessa thanks them; wrong bag -> a gentle re-cue, never a charge. Fill the
   basket to win. Teaches Ge'ez-numeral reading + counting, wrapped in a warm
   Merkato scene. Thin shell over the pure marketCore.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { playEffect, playPluck } from '../platform/audioEngine'
import { recordAnswer } from '../platform/telemetry'
import { sayPrompt } from '../platform/prompts'
import { t } from '../platform/i18n'
import { Sprite2D, drawAnbessa, drawKokeb, FOCUS } from '../FidelQuestApp'
import WordPicture, { DRAWN_PICTURES } from './Pictures'
import { GEEZ_DIGITS } from './FidelCard'
import { initMarket, marketTransition, Phase, MarketEvent } from '../marketCore'

// Market-stall items that have an owned drawn picture (never a bare emoji).
const STALL = ['🍋', '🥭', '☕', '🥛', '🍯', '🐄', '🍲', '🐟'].filter((e) => DRAWN_PICTURES.includes(e))

function Coin({ size = 14 }) {
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, background: 'radial-gradient(circle at 35% 30%, #ffe08a, #c99a33)', border: '1.5px solid #a9832f', boxShadow: '0 1px 0 rgba(0,0,0,.25)' }}
      aria-hidden="true"
    />
  )
}

export default function MerkatoMarket({ soundOn, onBack }) {
  const items = useMemo(() => (STALL.length ? STALL : ['🍯']), [])
  const startRef = useRef(Math.floor(Math.random() * 997) + 1)
  const [round, setRound] = useState(0)
  const [ctx, setCtx] = useState(() => initMarket((round + 1) * 137 + startRef.current, items, 4))
  const reduce = useReducedMotion()

  useEffect(() => {
    setCtx(initMarket((round + 1) * 137 + startRef.current, items, 4))
    sayPrompt('marketPay', soundOn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const won = ctx.phase === Phase.WIN
  const item = ctx.items[ctx.idx]

  const pay = (count) => {
    if (won || !item) return
    recordAnswer(String(item.price), String(count), 'market')
    const r = marketTransition(ctx, { type: MarketEvent.PAY, payload: { count } })
    if (r.accepted) {
      playPluck(Math.min(6, count), soundOn) // a rising "cha-ching" by size
      setCtx(r.next)
      if (r.next.phase === Phase.WIN) setTimeout(() => playEffect('win', soundOn), 220)
      else setTimeout(() => playEffect('good', soundOn), 60)
    } else {
      playEffect('bad', soundOn)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--focus)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-lg font-black">{t('marketTitle', "Anbessa's Market")}</h1>
        <div className="w-11" />
      </header>

      {/* basket progress */}
      <div className="mt-1 flex items-center justify-center gap-1.5" aria-hidden="true">
        {ctx.items.map((_, i) => (
          <span key={i} className="rounded-full" style={{ width: 10, height: 10, background: i < ctx.bought ? 'var(--go)' : 'var(--line)' }} />
        ))}
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-5">
        <Sprite2D draw={won ? drawAnbessa : drawKokeb} size={won ? 96 : 68} mood="happy" pose={won ? 'cheer' : 'stand'} />

        {won ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-base font-black" style={{ color: 'var(--muted)' }}>{t('marketWin', 'Basket full!')}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRound((r) => r + 1)} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
                {t('marketAgain', 'Shop again!')}
              </button>
              <button type="button" onClick={onBack} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
                {t('orderDone', 'Done')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* the item on the counter + its Ge'ez price tag */}
            <div className="flex flex-col items-center gap-2 rounded-3xl px-6 py-4" style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
              <WordPicture emoji={item.picture} size={84} />
              <div className="flex items-center gap-2 rounded-xl px-3 py-1" style={{ background: 'var(--go-soft)', border: '1.5px solid var(--go)' }}>
                <span className="geez text-2xl font-black" style={{ color: 'var(--go-ink)' }}>{GEEZ_DIGITS[item.price - 1]}</span>
                <span className="text-xs font-black" style={{ color: 'var(--muted)' }}>{t('marketBirr', 'birr')}</span>
              </div>
            </div>

            <p className="text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('marketHint', 'Pay with the right coins.')}</p>

            {/* the coin bags to choose from */}
            <div className="flex flex-wrap items-start justify-center gap-3">
              {item.options.map((count) => (
                <motion.button
                  key={count}
                  type="button"
                  onClick={() => pay(count)}
                  whileTap={reduce ? undefined : { scale: 0.94 }}
                  aria-label={t('marketBag', `${count} coins`, { n: count })}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2.5 ${FOCUS}`}
                  style={{ background: 'var(--paper)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', width: 96 }}
                >
                  <span className="flex flex-wrap items-center justify-center gap-1" style={{ minHeight: 34, maxWidth: 74 }}>
                    {Array.from({ length: count }).map((_, i) => <Coin key={i} />)}
                  </span>
                  <span className="text-sm font-black" style={{ color: 'var(--muted)' }}>{count}</span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
