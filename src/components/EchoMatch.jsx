/* ============================================================================
   ECHO MATCH — the renderer (replaces the old same-glyph Match)
   ----------------------------------------------------------------------------
   Thin shell over the pure echoMatchCore. Half the face-down cards are VOICE
   cards: flipping one plays a letter clip and shows a speaker that pulses
   while it talks (tap it again to hear it again). The other half are LETTER
   cards. Match each voice to the letter it says.

   Feedback is the teaching:
     - a match speaks the letter again and shows an example word + picture
       from the pack's word list (its recording plays when there is one);
     - a wrong pair replays BOTH sounds, each card pulsing in turn, so the
       child hears the difference before the cards turn back;
     - first-try matches in a row build a star streak.
   The round ends in a summary: stars, the letters mastered and the letters
   to practise (tap any to hear it). Missed letters come back in the next
   rounds; the next level opens on first-try accuracy, not completion.

   Only letters with a real recording are dealt (a voice card that could only
   chime would be unanswerable). Informed first attempts on L2+ go into the
   answer ledger (mode 'echo'), so Grown-ups' letter stats include them; L1
   shows a ghost of the letter on the voice card, so it is not scored there.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, Volume2, Lock, LockOpen, Star, RotateCcw, ArrowRight, Check, Flame, Timer } from 'lucide-react'
import { audio, afterVoice, playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { FOCUS, ALL_WORDS } from '../FidelQuestApp'
import AnbessaSvg from './AnbessaSvg'
import KokebSvg from './KokebSvg'
import WordPicture from './Pictures'
import { FidelCard } from './FidelCard'
import {
  initEcho, echoTransition, exampleWord, roundSummary, applyRound, loadEcho, saveEcho, dueList, maxPlayableLevel,
  ECHO_LEVELS, MAX_LEVEL, UNLOCK_ACCURACY, Phase, MatchEvent, Face, Outcome,
} from '../echoMatchCore'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''

// A board needs a few DIFFERENT families to be a game at all.
const MIN_FAMILIES = 3

function useWide() {
  const q = '(min-width: 768px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches)
  useEffect(() => {
    const m = window.matchMedia?.(q)
    if (!m) return undefined
    const on = () => setWide(m.matches)
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [])
  return wide
}

const GO_BTN = { background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', color: '#fff', '--chunk-depth': '4px' }
const PLAIN_BTN = { background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }

export default function EchoMatch({ soundOn, onBack, pool = [] }) {
  // Callers pass a fresh array each render; key on its contents so a parent
  // re-render (e.g. after recordAnswer) never deals a new board mid-game.
  const poolSig = [...new Set(pool)].join(',')
  const [voiced, setVoiced] = useState(null) // keys with a real clip
  useEffect(() => {
    let live = true
    const keys = poolSig ? poolSig.split(',') : []
    Promise.all(keys.map((k) => audio.hasClip(`letters/${k}`).then((ok) => (ok ? k : null)).catch(() => k)))
      .then((res) => { if (live) setVoiced(res.filter(Boolean)) })
    return () => { live = false }
  }, [poolSig])

  const keys = useMemo(() => voiced || [], [voiced])
  const families = useMemo(() => new Set(keys.map((k) => k.split('-')[0])).size, [keys])
  const enough = voiced !== null && families >= MIN_FAMILIES
  const playable = useMemo(() => maxPlayableLevel(keys), [keys])

  const [progress, setProgress] = useState(loadEcho)
  const [level, setLevel] = useState(() => loadEcho().unlocked)
  const startRef = useRef(Math.floor(Math.random() * 997) + 1) // cosmetic seed
  const [round, setRound] = useState(0)
  const [ctx, setCtx] = useState(null)
  const [result, setResult] = useState(null) // { summary, unlockedNew }
  const [playingId, setPlayingId] = useState(null)
  const [example, setExample] = useState(null) // { key, word }
  const [wrongIds, setWrongIds] = useState([]) // the two cards of a wrong pair, while shown
  const [timeLeft, setTimeLeft] = useState(0)
  const reduce = useReducedMotion()
  const wide = useWide()
  const timers = useRef([])
  const later = (cancel) => { timers.current.push(cancel) }
  const clearTimers = () => { timers.current.forEach((c) => c()); timers.current = [] }

  const effLevel = Math.max(1, Math.min(level, progress.unlocked, playable))
  const cfg = ECHO_LEVELS[effLevel]

  // Deal. `progress.due` is read at deal time only (not a dependency), so
  // saving a round's result never re-deals the summary away.
  const dueRef = useRef(progress.due)
  dueRef.current = progress.due
  useEffect(() => {
    if (!enough) return undefined
    clearTimers()
    setCtx(initEcho(effLevel, (round + 1) * 131 + startRef.current, keys, dueList(dueRef.current)))
    setResult(null)
    setExample(null)
    setWrongIds([])
    setTimeLeft(ECHO_LEVELS[effLevel].seconds)
    return clearTimers
  }, [enough, effLevel, round, keys])

  const playing = ctx?.phase === Phase.PLAY

  // Expert clock (L4): a visual bar; TIMEUP ends the round.
  useEffect(() => {
    if (!playing || !cfg.seconds) return undefined
    const end = Date.now() + cfg.seconds * 1000
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setTimeLeft(left)
      if (left <= 0) {
        clearInterval(iv)
        setCtx((cur) => (cur ? echoTransition(cur, { type: MatchEvent.TIMEUP }).next : cur))
      }
    }, 250)
    return () => clearInterval(iv)
  }, [playing, cfg.seconds, round])

  // Round over -> summary, adaptive schedule, unlocks (once per round).
  useEffect(() => {
    if (!ctx || ctx.phase === Phase.PLAY || result) return
    const summary = roundSummary(ctx)
    const { state, unlockedNew } = applyRound(loadEcho(), ctx.level, summary)
    saveEcho(state)
    setProgress(state)
    setResult({ summary, unlockedNew })
    playEffect(ctx.phase === Phase.WIN ? 'win' : 'good', soundOn)
  }, [ctx, result, soundOn])

  /* ── sound helpers ── */
  const voiceOf = (key, id) => {
    playForm(formOf(key), soundOn)
    if (id == null) return
    setPlayingId(id)
    later(afterVoice(() => setPlayingId((p) => (p === id ? null : p)), 250, 3000))
  }
  const sayWord = (w) => {
    if (!w || w.noAudio) return
    audio.play(`words/${w.latin}`, { enabled: soundOn, chime: { familyIndex: w.familyIndex || 0, order: 1 } })
  }

  const onMatch = (last, voiceCard) => {
    playEffect('good', soundOn)
    // Say the letter again, then its example word.
    const word = exampleWord(last.letterKey, ALL_WORDS)
    setExample({ key: last.letterKey, word })
    later(afterVoice(() => {
      voiceOf(last.letterKey, voiceCard.id)
      later(afterVoice(() => sayWord(word), 300, 3000))
    }, 350, 2500))
    later(afterVoice(() => setExample((e) => (e && e.key === last.letterKey ? null : e)), 2600, 6000))
  }

  const onWrong = (next, a, b) => {
    // Hear the difference: each card's sound in turn (a letter card speaks
    // its own letter), then both turn back.
    playEffect('bad', soundOn)
    setWrongIds([a.id, b.id])
    later(afterVoice(() => {
      voiceOf(a.key, a.id)
      later(afterVoice(() => {
        voiceOf(b.key, b.id)
        later(afterVoice(() => {
          setWrongIds([])
          setCtx((cur) => (cur ? echoTransition(cur, { type: MatchEvent.RESOLVE }).next : cur))
        }, reduce ? 500 : 700, 3500))
      }, 250, 3000))
    }, 300, 3000))
  }

  const tapCard = (card) => {
    if (!ctx || !playing) return
    // A face-up voice card replays its sound; nothing else moves.
    if (card.faceUp || card.matched) {
      if (card.face === Face.VOICE) voiceOf(card.key, card.id)
      return
    }
    const r = echoTransition(ctx, { type: MatchEvent.FLIP, payload: { id: card.id } })
    if (!r.accepted) return
    setExample(null)
    if (card.face === Face.VOICE) voiceOf(card.key, card.id)
    setCtx(r.next)
    const last = r.next.last
    if (!last) return
    if (last.log && effLevel >= 2) recordAnswer(last.log.heard, last.log.picked, 'echo')
    if (last.outcome === Outcome.MATCH) {
      const voiceCard = r.next.cards.find((c) => c.face === Face.VOICE && c.key === last.voiceKey)
      onMatch(last, voiceCard)
    } else {
      const [a, b] = r.next.flipped.map((id) => r.next.cards.find((c) => c.id === id))
      // Voice first, so the child hears the target, then the letter they chose.
      const ordered = b.face === Face.VOICE && a.face !== Face.VOICE ? [b, a] : [a, b]
      onWrong(r.next, ordered[0], ordered[1])
    }
  }

  /* ── layout ── */
  const cols = 4
  const n = ctx?.cards.length || 8
  const cardW = wide ? (n <= 8 ? 140 : n <= 12 ? 128 : 112) : (n <= 8 ? 86 : n <= 12 ? 80 : 72)
  const cardH = Math.round(cardW * 1.4)

  const levelPills = (
    <div className="flex items-center justify-center gap-2" role="group" aria-label={t('echoLevels', 'Levels')}>
      {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((lv) => {
        const open = lv <= progress.unlocked && lv <= playable
        const on = lv === effLevel
        const best = progress.best[lv] || 0
        return (
          <button
            key={lv}
            type="button"
            disabled={!open}
            aria-pressed={on}
            aria-label={`${t('echoLevel', 'Level')} ${lv}${open ? '' : ` (${t('echoLocked', 'locked')})`}`}
            onClick={() => { setLevel(lv); setRound((r) => r + 1) }}
            className={`flex h-11 min-w-[52px] flex-col items-center justify-center rounded-xl px-2 leading-none ${FOCUS}`}
            style={{ background: on ? 'var(--sky)' : 'var(--card)', color: on ? '#fff' : 'var(--muted)', border: `2px solid ${on ? 'var(--sky)' : 'var(--line)'}`, opacity: open ? 1 : 0.5, outlineColor: 'var(--sky)' }}
          >
            {open ? (
              <>
                <span className="flex items-center gap-0.5 text-base font-black">{lv === MAX_LEVEL ? <Timer className="h-4 w-4" aria-hidden="true" /> : null}{lv}</span>
                <span className="mt-0.5 flex" aria-hidden="true">
                  {[0, 1, 2].map((i) => <Star key={i} className="h-2.5 w-2.5" fill={i < best ? 'currentColor' : 'none'} />)}
                </span>
              </>
            ) : <Lock className="h-4 w-4" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )

  const back = (card) => (
    <div style={{ position: 'relative', width: cardW, height: cardH }}>
      <FidelCard variant="back" size={cardW} />
      {cfg?.markedBacks && (
        <span
          aria-hidden="true"
          className="absolute flex items-center justify-center rounded-full"
          style={{ left: '50%', bottom: cardW * 0.1, transform: 'translateX(-50%)', width: cardW * 0.38, height: cardW * 0.38, background: '#fffdf4', color: '#1a294a', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }}
        >
          {card.face === Face.LETTER
            ? <span className="geez" style={{ fontSize: cardW * 0.22, fontWeight: 900, lineHeight: 1 }}>ፊ</span>
            : <Volume2 style={{ width: cardW * 0.22, height: cardW * 0.22 }} />}
        </span>
      )}
    </div>
  )

  const face = (card) => {
    if (card.face === Face.LETTER) return <FidelCard glyph={glyphOf(card.key)} size={cardW} done={card.matched} />
    const talking = playingId === card.id
    const hint = cfg?.hint && !card.matched
    const iconSize = cardW * (hint ? 0.32 : 0.46)
    const speaker = (
      <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: cardW * 0.04 }}>
        {hint && (
          <span className="geez" aria-hidden="true" data-testid="echo-hint" style={{ fontSize: cardW * 0.4, fontWeight: 900, opacity: 0.32, lineHeight: 1 }}>{glyphOf(card.key)}</span>
        )}
        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: iconSize * 1.35, height: iconSize * 1.35 }}>
          {talking && (
            reduce
              ? <span aria-hidden="true" style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '3px solid var(--sky)' }} />
              : <motion.span aria-hidden="true" style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '3px solid var(--sky)' }} animate={{ scale: [1, 1.25, 1], opacity: [0.9, 0.3, 0.9] }} transition={{ duration: 0.8, repeat: Infinity }} />
          )}
          <motion.span style={{ display: 'flex' }} animate={talking && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={talking && !reduce ? { duration: 0.6, repeat: Infinity } : { duration: 0.1 }}>
            <Volume2 style={{ width: iconSize, height: iconSize, color: talking ? '#1d6fb8' : '#2c4373' }} strokeWidth={2.4} />
          </motion.span>
        </span>
      </span>
    )
    return <FidelCard glyph={card.matched ? glyphOf(card.key) : ''} size={cardW} done={card.matched} icon={speaker} />
  }

  const labelOf = (card) => {
    const shown = card.faceUp || card.matched
    if (!shown) {
      if (!cfg?.markedBacks) return t('matchCardBack', 'Hidden card')
      return card.face === Face.LETTER ? t('echoBackLetter', 'Hidden letter card') : t('echoBackVoice', 'Hidden sound card')
    }
    if (card.face === Face.LETTER) return glyphOf(card.key)
    return t('echoVoice', 'Sound card. Tap to hear it again')
  }

  // 3D flip; reduced motion swaps faces with a short fade instead.
  const cardView = (card) => {
    const shown = card.faceUp || card.matched
    if (reduce) {
      return (
        <motion.div key={shown ? 'f' : 'b'} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
          {shown ? face(card) : back(card)}
        </motion.div>
      )
    }
    const side = { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }
    return (
      <div style={{ width: cardW, height: cardH, perspective: 700 }}>
        <motion.div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }} initial={false} animate={{ rotateY: shown ? 180 : 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
          <div style={side}>{back(card)}</div>
          <div style={{ ...side, transform: 'rotateY(180deg)' }}>{face(card)}</div>
        </motion.div>
      </div>
    )
  }

  const streakRow = ctx && (
    <div className="flex h-8 items-center justify-center gap-1" aria-label={`${t('echoStreak', 'Streak')} ${ctx.streak}`} role="status">
      {Array.from({ length: Math.min(ctx.streak, 8) }, (_, i) => (
        <motion.span key={i} initial={reduce ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
          <Star className="h-6 w-6" style={{ color: 'var(--accent)' }} fill="currentColor" aria-hidden="true" />
        </motion.span>
      ))}
      {ctx.streak >= 3 && (
        <motion.span key={`combo-${ctx.streak}`} initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="ml-1 flex items-center rounded-full px-2 text-sm font-black text-white" style={{ background: 'var(--accent)' }}>
          <Flame className="h-4 w-4" aria-hidden="true" />×{ctx.streak}
        </motion.span>
      )}
    </div>
  )

  const chip = (k, good) => (
    <button
      key={k}
      type="button"
      onClick={() => voiceOf(k)}
      aria-label={`${glyphOf(k)}. ${t('echoTapHear', 'Tap to hear')}`}
      className={`geez relative flex h-14 w-14 items-center justify-center rounded-2xl text-3xl font-black ${FOCUS}`}
      style={{ background: 'var(--card)', border: `3px solid ${good ? 'var(--go)' : 'var(--accent)'}`, outlineColor: 'var(--sky)' }}
    >
      {glyphOf(k)}
      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: good ? 'var(--go)' : 'var(--accent)' }} aria-hidden="true">
        {good ? <Check className="h-3.5 w-3.5" /> : <Volume2 className="h-3 w-3" />}
      </span>
    </button>
  )

  const summaryView = result && ctx && (() => {
    const { summary, unlockedNew } = result
    const pct = Math.round(summary.accuracy * 100)
    const canNext = effLevel < Math.min(progress.unlocked, playable)
    return (
      <div className="flex w-full flex-col items-center gap-4" data-testid="echo-summary">
        <AnbessaSvg size={wide ? 130 : 96} mood="happy" pose={summary.passed ? 'cheer' : undefined} />
        <div className="flex gap-1" aria-label={`${summary.stars} / 3`} role="img">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} initial={reduce ? false : { scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.2 + i * 0.18, type: 'spring', stiffness: 300, damping: 12 }}>
              <Star className="h-12 w-12 md:h-16 md:w-16" style={{ color: i < summary.stars ? 'var(--accent)' : 'var(--line)' }} fill="currentColor" aria-hidden="true" />
            </motion.span>
          ))}
        </div>
        <p className="text-center text-sm font-extrabold" style={{ color: 'var(--muted)' }}>
          {ctx.phase === Phase.TIMEUP ? `${t('echoTimeUp', 'Time!')} · ` : ''}{pct}% {t('echoFirstTry', 'right first time')} · <Flame className="inline h-4 w-4" aria-hidden="true" /> {summary.bestStreak}
        </p>
        {summary.mastered.length > 0 && (
          <section className="flex w-full flex-col items-center gap-2">
            <h2 className="flex items-center gap-1 text-sm font-black" style={{ color: 'var(--go)' }}><Check className="h-4 w-4" aria-hidden="true" />{t('echoMastered', 'You know these')}</h2>
            <div className="flex flex-wrap justify-center gap-3">{summary.mastered.map((k) => chip(k, true))}</div>
          </section>
        )}
        {summary.practice.length > 0 && (
          <section className="flex w-full flex-col items-center gap-2">
            <h2 className="flex items-center gap-1 text-sm font-black" style={{ color: 'var(--accent)' }}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t('echoPractice', 'Practise these - they come back next round')}</h2>
            <div className="flex flex-wrap justify-center gap-3">{summary.practice.map((k) => chip(k, false))}</div>
          </section>
        )}
        {unlockedNew ? (
          <motion.p initial={reduce ? false : { scale: 0.6 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-base font-black" style={{ color: 'var(--go)' }}>
            <LockOpen className="h-6 w-6" aria-hidden="true" />{t('echoUnlocked', 'New level unlocked!')}
          </motion.p>
        ) : !summary.passed && effLevel < MAX_LEVEL && effLevel >= progress.unlocked ? (
          <p className="flex max-w-xs items-center gap-2 text-center text-sm font-extrabold" style={{ color: 'var(--muted)' }}>
            <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />{t('echoNeed', 'Get {pct}% right first time to open the next level').replace('{pct}', String(Math.round(UNLOCK_ACCURACY * 100)))}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          {canNext && (
            <button type="button" onClick={() => { setLevel(effLevel + 1); setRound((r) => r + 1) }} className={`chunk flex min-h-[48px] items-center gap-2 rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={GO_BTN}>
              <ArrowRight className="h-5 w-5" aria-hidden="true" />{t('echoNext', 'Next level')}
            </button>
          )}
          <button type="button" onClick={() => setRound((r) => r + 1)} className={`chunk flex min-h-[48px] items-center gap-2 rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={canNext ? PLAIN_BTN : GO_BTN}>
            <RotateCcw className="h-5 w-5" aria-hidden="true" />{t('matchAgain', 'Again!')}
          </button>
          <button type="button" onClick={onBack} className={`chunk flex min-h-[48px] items-center gap-2 rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={PLAIN_BTN}>
            <Check className="h-5 w-5" aria-hidden="true" />{t('orderDone', 'Done')}
          </button>
        </div>
      </div>
    )
  })()

  return (
    <div className="mx-auto flex min-h-dvh max-w-md md:max-w-2xl flex-col px-5 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-lg font-black">{t('echoTitle', 'Echo Match')}</h1>
        <div className="w-11" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-3">
        {voiced === null ? null : !enough ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <KokebSvg size={72} />
            <p className="max-w-xs text-base font-black" style={{ color: 'var(--muted)' }}>
              {t('matchNeedMore', 'Learn a few more letters, then come back to match them!')}
            </p>
            <button type="button" onClick={onBack} className={`chunk min-h-[48px] rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={GO_BTN}>
              {t('orderDone', 'Done')}
            </button>
          </div>
        ) : !ctx ? null : result ? summaryView : (
          <>
            {levelPills}
            {cfg.seconds > 0 && (
              <div className="h-3 w-full max-w-sm overflow-hidden rounded-full" style={{ background: 'var(--line)' }} role="timer" aria-label={`${timeLeft}s`} data-testid="echo-timer">
                <div className="h-full rounded-full" style={{ width: `${(timeLeft / cfg.seconds) * 100}%`, background: timeLeft <= 15 ? 'var(--accent)' : 'var(--sky)', transition: reduce ? 'none' : 'width 250ms linear' }} />
              </div>
            )}
            {streakRow}
            <div className="flex min-h-[64px] items-center justify-center md:min-h-[80px]">
                <AnimatePresence>
                  {example && (
                    <motion.button
                      type="button"
                      key={example.key}
                      onClick={() => { voiceOf(example.key); later(afterVoice(() => sayWord(example.word), 300, 3000)) }}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      aria-label={`${glyphOf(example.key)}${example.word ? ` - ${example.word.geez}` : ''}`}
                      data-testid="echo-example"
                      className={`flex min-h-[44px] items-center gap-3 rounded-3xl px-4 py-1.5 ${FOCUS}`}
                      style={{ background: 'var(--card)', border: '3px solid var(--go)', outlineColor: 'var(--sky)' }}
                    >
                      <span className="geez text-4xl font-black" style={{ color: 'var(--go)' }}>{glyphOf(example.key)}</span>
                      {example.word && (
                        <>
                          <WordPicture emoji={example.word.picture} size={wide ? 64 : 48} />
                          <span className="geez text-2xl font-black">{example.word.geez}</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
            </div>
            <div>
              <div className="grid justify-center gap-2.5 md:gap-4" style={{ gridTemplateColumns: `repeat(${cols}, ${cardW}px)` }} data-testid="echo-grid">
                {ctx.cards.map((card) => {
                  const shown = card.faceUp || card.matched
                  const replay = shown && card.face === Face.VOICE
                  const wrong = wrongIds.includes(card.id)
                  return (
                    <motion.button
                      key={card.id}
                      type="button"
                      data-face={card.face}
                      data-key={card.key}
                      data-state={card.matched ? 'matched' : card.faceUp ? 'up' : 'down'}
                      data-wrong={wrong || undefined}
                      animate={wrong && !reduce ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
                      transition={{ duration: 0.45 }}
                      onClick={() => tapCard(card)}
                      aria-disabled={shown && !replay}
                      whileTap={reduce || (shown && !replay) ? undefined : { scale: 0.93 }}
                      aria-label={labelOf(card)}
                      className={`rounded-2xl ${FOCUS}`}
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: shown && !replay ? 'default' : 'pointer', outlineColor: 'var(--sky)', borderRadius: 16, boxShadow: wrong ? '0 0 0 4px var(--accent)' : 'none' }}
                    >
                      {cardView(card)}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
