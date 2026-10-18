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
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { audio, afterVoice, playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { FOCUS, ALL_WORDS } from '../FidelQuestApp'
import KokebSvg from './KokebSvg'
import { useWide } from '../platform/gameUi'
import { GameHeader, LevelPills, StreakStars, ExampleSlot, RoundSummary, NeedMore } from './gameKit'
import { FidelCard } from './FidelCard'
import {
  initEcho, echoTransition, exampleWord, roundSummary, applyRound, loadEcho, saveEcho, dueList, maxPlayableLevel,
  ECHO_LEVELS, MAX_LEVEL, Phase, MatchEvent, Face, Outcome,
} from '../echoMatchCore'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''

// A board needs a few DIFFERENT families to be a game at all.
const MIN_FAMILIES = 3


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
    <LevelPills max={MAX_LEVEL} current={effLevel} unlocked={progress.unlocked} playable={playable} best={progress.best} timed={[MAX_LEVEL]} onPick={(lv) => { setLevel(lv); setRound((r) => r + 1) }} />
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

  const summaryView = result && ctx && (
    <RoundSummary
      testId="echo-summary"
      summary={result.summary}
      unlockedNew={result.unlockedNew}
      canNext={effLevel < Math.min(progress.unlocked, playable)}
      atMax={effLevel >= MAX_LEVEL}
      belowUnlock={effLevel >= progress.unlocked}
      timeUp={ctx.phase === Phase.TIMEUP}
      item={(k) => ({ label: glyphOf(k) })}
      onHear={(k) => voiceOf(k)}
      onNext={() => { setLevel(effLevel + 1); setRound((r) => r + 1) }}
      onAgain={() => setRound((r) => r + 1)}
      onDone={onBack}
      wide={wide}
    />
  )

  return (
    <div className="mx-auto flex min-h-dvh max-w-md md:max-w-2xl flex-col px-5 pb-6 pt-4">
      <GameHeader title={t('echoTitle', 'Echo Match')} onBack={onBack} />

      <main className="flex flex-1 flex-col items-center justify-center gap-3">
        {voiced === null ? null : !enough ? (
          <NeedMore onBack={onBack}><KokebSvg size={72} /></NeedMore>
        ) : !ctx ? null : result ? summaryView : (
          <>
            {levelPills}
            {cfg.seconds > 0 && (
              <div className="h-3 w-full max-w-sm overflow-hidden rounded-full" style={{ background: 'var(--line)' }} role="timer" aria-label={`${timeLeft}s`} data-testid="echo-timer">
                <div className="h-full rounded-full" style={{ width: `${(timeLeft / cfg.seconds) * 100}%`, background: timeLeft <= 15 ? 'var(--accent)' : 'var(--sky)', transition: reduce ? 'none' : 'width 250ms linear' }} />
              </div>
            )}
            <StreakStars streak={ctx.streak} />
            <ExampleSlot wide={wide} example={example && { id: example.key, glyph: glyphOf(example.key), word: example.word }} onTap={() => { voiceOf(example.key); later(afterVoice(() => sayWord(example.word), 300, 3000)) }} />
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
