/* ============================================================================
   WORD MARKET — the renderer (replaces Merkato Market)
   ----------------------------------------------------------------------------
   Anbessa's shopping list is written in fidel; the stall shows pictures.
   Read a line, tap the item it names, and it drops into the basket. Thin
   shell over the pure wordMarketCore.

   Interactions (all answers are taps):
   - Tap a list line: it is selected and SOUNDED OUT letter by letter (each
     fidel lights up as it is said) - a decoding scaffold, never the whole
     word. In L4 the hidden list cannot be sounded out (that would turn
     reading into listening).
   - Right item: it pops into the basket with a rising "cha-ching", the line
     is ticked and shows its picture, the whole word is said (when recorded).
     L3+: the line's Ge'ez numeral says HOW MANY - buy exactly that many.
   - Wrong item: it wobbles, its own word is said (if recorded) and the
     line is sounded out again: hear the difference. Two misses on a line
     make its item glow.
   Logged: the first attempt per line as recordAnswer('word:<id>', 'word:<picked>',
   'market'), plus the first differing LETTER of a same-family decoy, so the
   mastery ledger learns which vowel/letter tripped the child.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Volume2, Eye, ShoppingBasket } from 'lucide-react'
import { audio, afterVoice, playForm, playEffect, playPluck } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { useWide, GO_BTN } from '../platform/gameUi'
import { dueList } from '../platform/roundProgress'
import { GEEZ_ONES } from '../data/numerals'
import { FOCUS, ALL_WORDS } from '../FidelQuestApp'
import AnbessaSvg from './AnbessaSvg'
import KokebSvg from './KokebSvg'
import WordPicture from './Pictures'
import { GameHeader, LevelPills, StreakStars, ExampleSlot, RoundSummary, NeedMore } from './gameKit'
import {
  marketStock, readableIds, initMarket, marketTransition, marketSummary, maxPlayableLevel, letterMiss,
  loadMarket, saveMarket, applyRound, MARKET_LEVELS, MAX_LEVEL, Phase, MarketEvent, Outcome,
} from '../wordMarketCore'

const STOCK = marketStock(ALL_WORDS)
const BY_ID = new Map(STOCK.map((w) => [w.id, w]))
const formOf = (k) => INDEXES.byAudioKey.get(k)
const PEEK_MS = 6000
const REPEEK_MS = 3000

/** Letter keys (of `keys`) that have a real recording. */
function useVoiced(keys) {
  const sig = [...new Set(keys)].sort().join(',')
  const [voiced, setVoiced] = useState(null)
  useEffect(() => {
    let live = true
    const ks = sig ? sig.split(',') : []
    Promise.all(ks.map((k) => audio.hasClip(`letters/${k}`).then((ok) => (ok ? k : null)).catch(() => k)))
      .then((res) => { if (live) setVoiced(res.filter(Boolean)) })
    return () => { live = false }
  }, [sig])
  return voiced
}

export default function WordMarket({ soundOn, onBack, pool = [] }) {
  // Only letters with a clip can be sounded out, so a target word must be
  // made entirely of learned AND voiced letters.
  const voiced = useVoiced(pool)
  const ready = voiced !== null
  const readable = useMemo(() => (voiced ? readableIds(STOCK, voiced) : []), [voiced])
  const playable = useMemo(() => maxPlayableLevel(STOCK, readable), [readable])
  const enough = ready && playable >= 1

  const [progress, setProgress] = useState(loadMarket)
  const [level, setLevel] = useState(() => loadMarket().unlocked)
  const startRef = useRef(Math.floor(Math.random() * 997) + 1)
  const [round, setRound] = useState(0)
  const [ctx, setCtx] = useState(null)
  const [result, setResult] = useState(null)
  const [example, setExample] = useState(null)
  const [reading, setReading] = useState(null) // { line, i } letter being sounded out
  const [wobble, setWobble] = useState(null)
  const [pulse, setPulse] = useState(null)
  const [basket, setBasket] = useState([]) // [{ n, picture }]
  const reduce = useReducedMotion()
  const wide = useWide()
  const timers = useRef([])
  const later = (c) => { timers.current.push(c) }
  const clearTimers = () => { timers.current.forEach((c) => c()); timers.current = [] }
  const readToken = useRef(0)

  const effLevel = Math.max(1, Math.min(level, progress.unlocked, playable || 1))
  const cfg = MARKET_LEVELS[effLevel]
  const dueRef = useRef(progress.due)
  dueRef.current = progress.due

  useEffect(() => {
    if (!enough) return undefined
    clearTimers()
    readToken.current += 1
    setCtx(initMarket(effLevel, (round + 1) * 211 + startRef.current, { stock: STOCK, readable, due: dueList(dueRef.current) }))
    setResult(null)
    setExample(null)
    setReading(null)
    setBasket([])
    return clearTimers
  }, [enough, effLevel, round, readable])

  // L4: the list hides itself after a peek.
  useEffect(() => {
    if (!ctx || ctx.peek !== 'show') return undefined
    const id = setTimeout(() => setCtx((c) => marketTransition(c, { type: MarketEvent.HIDE }).next), ctx.peeks ? REPEEK_MS : PEEK_MS)
    return () => clearTimeout(id)
  }, [ctx?.peek, ctx?.peeks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Basket full: summary.
  useEffect(() => {
    if (!ctx || ctx.phase !== Phase.WIN || result) return undefined
    const id = setTimeout(() => {
      playEffect('win', soundOn)
      const summary = marketSummary(ctx)
      const { state, unlockedNew } = applyRound(loadMarket(), ctx.level, summary)
      saveMarket(state)
      setProgress(state)
      setResult({ summary, unlockedNew })
    }, reduce ? 500 : 1800)
    return () => clearTimeout(id)
  }, [ctx, result, soundOn, reduce])

  /* ── audio ── */
  const sayWord = (w) => {
    if (!w || w.noAudio) return
    audio.hasClip(`words/${w.id}`).then((ok) => {
      if (ok) audio.play(`words/${w.id}`, { enabled: soundOn, chime: { familyIndex: w.familyIndex || 0, order: 1 } })
    }).catch(() => {})
  }
  /** Sound a word out letter by letter, lighting each fidel on list line `line`. */
  const soundOut = (w, line, then) => {
    const token = ++readToken.current
    const step = (i) => {
      if (token !== readToken.current) return
      if (i >= w.keys.length) { setReading(null); if (then) later(afterVoice(then, 300, 2500)); return }
      setReading({ line, i })
      playForm(formOf(w.keys[i]), soundOn)
      later(afterVoice(() => step(i + 1), 180, 2500))
    }
    step(0)
  }

  const listHidden = ctx?.peek === 'hidden'

  const selectLine = (i) => {
    if (!ctx || ctx.phase !== Phase.PLAY) return
    const r = marketTransition(ctx, { type: MarketEvent.SELECT, payload: { index: i } })
    if (r.accepted) setCtx(r.next)
    if (!ctx.list[i] || ctx.list[i].done || listHidden) return
    soundOut(BY_ID.get(ctx.list[i].id), i)
  }

  const tapItem = (id) => {
    if (!ctx || ctx.phase !== Phase.PLAY) return
    const r = marketTransition(ctx, { type: MarketEvent.TAP, payload: { id } })
    if (!r.accepted) return
    setCtx(r.next)
    const last = r.next.last
    if (last.log) recordAnswer(`word:${last.log.heard}`, `word:${last.log.picked}`, 'market')
    const w = BY_ID.get(id)
    if (last.outcome === Outcome.RIGHT || last.outcome === Outcome.DONE) {
      readToken.current += 1
      setReading(null)
      playPluck(Math.min(7, last.got), soundOn)
      setBasket((b) => [...b, { n: b.length, picture: w.picture }])
      if (last.outcome === Outcome.DONE) {
        playEffect('good', soundOn)
        setExample({ id: w.id, glyph: '', word: { geez: w.geez, picture: w.picture } })
        later(afterVoice(() => sayWord(w), 250, 1500))
      } else {
        setPulse(last.line)
        later(afterVoice(() => setPulse(null), 400, 800))
      }
    } else if (last.outcome === Outcome.ENOUGH) {
      setPulse(ctx.list.findIndex((l) => l.id === id))
      setWobble(id)
      later(afterVoice(() => { setPulse(null); setWobble(null) }, 500, 900))
    } else {
      playEffect('bad', soundOn)
      const want = BY_ID.get(last.want)
      if (last.log) {
        const lm = letterMiss(want, w)
        if (lm) recordAnswer(lm.heard, lm.picked, 'market')
      }
      setWobble(id)
      later(afterVoice(() => setWobble(null), 500, 900))
      // Hear the difference: what you picked, then the line sounded out.
      later(afterVoice(() => {
        sayWord(w)
        later(afterVoice(() => { if (!listHidden) soundOut(want, last.line) }, 350, 2500))
      }, 250, 1500))
    }
  }

  const peekAgain = () => {
    const r = marketTransition(ctx, { type: MarketEvent.PEEK })
    if (r.accepted) setCtx(r.next)
  }
  const hideNow = () => {
    const r = marketTransition(ctx, { type: MarketEvent.HIDE })
    if (r.accepted) setCtx(r.next)
  }

  /* ── views ── */
  const summaryView = result && ctx && (
    <RoundSummary
      testId="market-summary"
      summary={result.summary}
      unlockedNew={result.unlockedNew}
      canNext={effLevel < Math.min(progress.unlocked, playable)}
      atMax={effLevel >= MAX_LEVEL}
      belowUnlock={effLevel >= progress.unlocked}
      item={(id) => ({ label: BY_ID.get(id)?.geez || '', picture: BY_ID.get(id)?.picture })}
      onHear={(id) => { const w = BY_ID.get(id); if (w) soundOut(w, -1, () => sayWord(w)) }}
      onNext={() => { setLevel(effLevel + 1); setRound((r) => r + 1) }}
      onAgain={() => setRound((r) => r + 1)}
      onDone={onBack}
      wide={wide}
    />
  )

  const line = (l, i) => {
    const w = BY_ID.get(l.id)
    const selected = ctx.current === i && !l.done && ctx.phase === Phase.PLAY
    const chars = Array.from(w.geez)
    const hidden = listHidden && !l.done
    return (
      <motion.button
        key={l.id}
        type="button"
        data-testid={`line-${i}`}
        data-id={l.id}
        onClick={() => selectLine(i)}
        animate={pulse === i && !reduce ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
        aria-pressed={selected}
        aria-label={hidden ? `${t('marketLine', 'List line')} ${i + 1}` : `${w.geez}${cfg.qty ? ` x${l.qty}` : ''}. ${t('marketSoundOut', 'Tap to sound it out')}`}
        className={`flex min-h-[52px] w-full items-center gap-2 rounded-2xl px-2 py-1 text-left ${FOCUS}`}
        style={{
          background: selected ? 'rgba(90,160,230,.18)' : 'transparent',
          border: `2px ${selected ? 'solid' : 'dashed'} ${selected ? 'var(--sky)' : 'rgba(109,69,1,.25)'}`,
          outlineColor: 'var(--sky)',
        }}
      >
        {cfg.qty && (
          <span className="flex h-9 min-w-[36px] flex-col items-center justify-center rounded-lg px-1" style={{ background: '#6d4501', color: '#fff6dc' }}>
            <span className="geez text-lg font-black leading-none">{GEEZ_ONES[l.qty]}</span>
            <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
              {Array.from({ length: l.qty }).map((_, k) => <span key={k} className="block rounded-full" style={{ width: 5, height: 5, background: k < l.got ? '#8fd16a' : 'rgba(255,246,220,.4)' }} />)}
            </span>
          </span>
        )}
        <span className={`geez flex flex-1 items-center font-black ${wide ? 'text-4xl' : 'text-3xl'}`} style={{ color: l.done ? '#3b7a1f' : '#3a2a10', textDecoration: l.done ? 'line-through' : 'none', textDecorationThickness: 3 }}>
          {hidden
            ? chars.map((_, k) => <span key={k} className="inline-block rounded-md" style={{ width: wide ? 30 : 24, height: wide ? 36 : 30, background: 'rgba(109,69,1,.18)' }} />)
            : chars.map((c, k) => {
              const lit = reading && reading.line === i && reading.i === k
              return (
                <motion.span
                  key={k}
                  animate={lit && !reduce ? { y: -6, scale: 1.18 } : { y: 0, scale: 1 }}
                  className="inline-block rounded-md"
                  style={{ background: lit ? '#ffd65a' : 'transparent' }}
                >
                  {c}
                </motion.span>
              )
            })}
        </span>
        {l.done ? (
          <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
            <WordPicture emoji={w.picture} size={wide ? 40 : 34} />
            <span className="text-xl" aria-hidden="true">✅</span>
          </motion.span>
        ) : !hidden ? (
          <Volume2 className="h-5 w-5 shrink-0" style={{ color: '#6d4501' }} aria-hidden="true" />
        ) : null}
      </motion.button>
    )
  }

  const listNote = ctx && (
    <div
      className="relative w-full rounded-2xl px-3 pb-3 pt-2"
      style={{ background: '#fff6dc', boxShadow: '0 4px 0 #c9a560, 0 8px 20px rgba(0,0,0,.25)', transform: reduce ? undefined : 'rotate(-1deg)', maxWidth: wide ? 300 : 420 }}
      data-testid="market-list"
    >
      <div className="mb-1 flex items-center gap-2">
        <AnbessaSvg size={wide ? 52 : 40} mood="happy" />
        <span className="text-2xl" aria-hidden="true">📝</span>
        <span className="flex-1" />
        {ctx.peek === 'show' && (
          <button type="button" data-testid="market-ready" onClick={hideNow} className={`chunk flex min-h-[44px] items-center gap-1 rounded-xl px-3 font-black ${FOCUS}`} style={GO_BTN} aria-label={t('marketReady', 'I remember - go shopping')}>
            <ShoppingBasket className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        {listHidden && (
          <button type="button" data-testid="market-peek" onClick={peekAgain} className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl ${FOCUS}`} style={{ background: '#6d4501', color: '#fff6dc' }} aria-label={t('marketPeek', 'Peek at the list')}>
            <Eye className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">{ctx.list.map(line)}</div>
    </div>
  )

  const stallView = ctx && (
    <div
      className="w-full rounded-3xl p-3"
      style={{ background: 'linear-gradient(180deg,#8a5a2b,#6b4220)', boxShadow: 'inset 0 -6px 0 rgba(0,0,0,.25)' }}
    >
      {/* awning */}
      <div className="-mx-3 -mt-3 mb-3 h-5 rounded-t-3xl" aria-hidden="true" style={{ background: 'repeating-linear-gradient(90deg,#d8553f 0 22px,#fff6dc 22px 44px)' }} />
      <div className="grid grid-cols-3 gap-2.5" data-testid="stall" role="group" aria-label={t('marketStall', 'Market stall')}>
        {ctx.stall.map((id, n) => {
          const w = BY_ID.get(id)
          const glow = ctx.hint === id
          return (
            <motion.button
              key={id}
              type="button"
              data-testid={`stall-${id}`}
              onClick={() => tapItem(id)}
              disabled={ctx.peek === 'show'}
              animate={wobble === id && !reduce ? { rotate: [0, -10, 10, -6, 6, 0] } : { rotate: 0 }}
              whileTap={reduce ? undefined : { scale: 0.92 }}
              transition={{ duration: 0.45 }}
              aria-label={`${t('marketItem', 'Stall item')} ${n + 1}`}
              className={`relative flex aspect-square min-h-[72px] items-center justify-center rounded-2xl ${FOCUS}`}
              style={{
                background: '#f3e2b3', border: '3px solid #b8892f', boxShadow: glow ? '0 0 0 4px var(--go), 0 0 18px var(--go)' : '0 3px 0 #4a2c12',
                outlineColor: 'var(--sky)', opacity: ctx.peek === 'show' ? 0.55 : 1,
              }}
            >
              <WordPicture emoji={w.picture} size={wide ? 92 : 62} />
              {glow && !reduce && (
                <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl" style={{ border: '3px solid var(--go)' }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )

  const basketView = ctx && (
    <div className="flex min-h-[56px] w-full items-center gap-2 rounded-2xl px-3 py-1" style={{ background: 'var(--card)', border: '2px solid var(--line)' }} data-testid="basket">
      <span className="text-3xl" aria-hidden="true">🧺</span>
      <div className="flex flex-1 flex-wrap items-center gap-1">
        <AnimatePresence>
          {basket.map((b) => (
            <motion.span key={b.n} initial={reduce ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.4 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
              <WordPicture emoji={b.picture} size={30} />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )

  return (
    <div className="mx-auto flex min-h-dvh max-w-md md:max-w-3xl flex-col px-4 pb-6 pt-4">
      <GameHeader title={t('wordMarketTitle', 'Word Market')} onBack={onBack} />
      <main className="flex flex-1 flex-col items-center justify-center gap-3">
        {!ready ? null : !enough ? (
          <NeedMore onBack={onBack}><KokebSvg size={72} /></NeedMore>
        ) : !ctx ? null : result ? summaryView : (
          <>
            <LevelPills max={MAX_LEVEL} current={effLevel} unlocked={progress.unlocked} playable={playable} best={progress.best} onPick={(lv) => { setLevel(lv); setRound((r) => r + 1) }} />
            <StreakStars streak={ctx.streak} />
            <ExampleSlot wide={wide} example={example} onTap={() => { const w = BY_ID.get(example.id); soundOut(w, -1, () => sayWord(w)) }} />
            {wide ? (
              <div className="flex w-full items-start gap-5">
                <div className="w-[300px] shrink-0">{listNote}</div>
                <div className="flex flex-1 flex-col gap-3">{stallView}{basketView}</div>
              </div>
            ) : (
              <>
                {listNote}
                {stallView}
                {basketView}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
