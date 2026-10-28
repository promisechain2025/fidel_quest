/* ============================================================================
   ECHO MATCH — the renderer (toy-brick memory cards on a wooden board)
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
import { Volume2, Hand, Ear, ThumbsUp, PartyPopper, RotateCcw } from 'lucide-react'
import { audio, afterVoice, playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { FOCUS, ALL_WORDS } from '../FidelQuestApp'
import KokebSvg from './KokebSvg'
import {
  BrickScreen, WoodTopBar, GuideSign, useGuideFeedback, WoodBottomBar, RoundButton, Confetti,
  BRICK_COLORS, WOOD, brickCss, studCss, shade, brickLabels,
  GameStage, FitBox, useLandscapeShort,
} from './brickKit'
import { BrickLevels, BrickStreak, BrickSummary, sceneStyle } from './brickRoundKit'
import BrickExample from './brickExample'
import { NeedMore } from './gameKit'
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
  const [fb, flash, clearFb] = useGuideFeedback()
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
    clearFb()
    setTimeLeft(ECHO_LEVELS[effLevel].seconds)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Round over -> (a short brick celebration on a win) -> summary, adaptive
  // schedule, unlocks (once per round).
  useEffect(() => {
    if (!ctx || ctx.phase === Phase.PLAY || result) return undefined
    const win = ctx.phase === Phase.WIN
    playEffect(win ? 'win' : 'good', soundOn)
    const finish = () => {
      const summary = roundSummary(ctx)
      const { state, unlockedNew } = applyRound(loadEcho(), ctx.level, summary)
      saveEcho(state)
      setProgress(state)
      setResult({ summary, unlockedNew })
    }
    if (!win) { finish(); return undefined }
    const id = setTimeout(finish, reduce ? 400 : 2000)
    return () => clearTimeout(id)
  }, [ctx, result, soundOn, reduce])

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
    flash('ok', 1200)
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
    flash('try', 0)
    setWrongIds([a.id, b.id])
    later(afterVoice(() => {
      voiceOf(a.key, a.id)
      later(afterVoice(() => {
        voiceOf(b.key, b.id)
        later(afterVoice(() => {
          setWrongIds([])
          clearFb()
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
  const land = useLandscapeShort()
  const n = ctx?.cards.length || 8
  const cols = land && n > 8 ? Math.ceil(n / 2) : 4
  const cardW = n <= 8 ? 80 : n <= 12 ? 76 : 72
  const cardH = n <= 8 ? 112 : n <= 12 ? 100 : 88
  const celebrating = ctx?.phase === Phase.WIN && !result
  const BACK = '#2f86d6'
  const VOICE = '#f08a24'
  const LETTER = '#f7efd9'
  const pairColor = (card) => BRICK_COLORS[card.pair % BRICK_COLORS.length]

  const studs = (color, count, area) => (
    <span aria-hidden="true" className="absolute grid place-items-center" style={{ left: 7, right: 7, top: 7, height: area, gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: '1fr' }}>
      {Array.from({ length: count }, (_, i) => <span key={i} style={studCss(color, cardW * 0.3)} />)}
    </span>
  )

  const brickBox = (color, children, extra) => (
    <div style={{ position: 'relative', width: cardW, height: cardH, borderRadius: 12, ...brickCss(color, 6), ...extra }}>{children}</div>
  )

  const back = (card) => {
    const marked = !!cfg?.markedBacks
    return brickBox(BACK, (
      <>
        {marked ? studs(BACK, 4, cardH * 0.52) : studs(BACK, 6, cardH - 14)}
        {marked && (
          <span aria-hidden="true" className="absolute flex items-center justify-center rounded-full"
            style={{ left: '50%', bottom: cardW * 0.1, transform: 'translateX(-50%)', width: cardW * 0.42, height: cardW * 0.42, background: '#fffdf4', color: '#1a294a', boxShadow: `0 3px 0 ${shade(BACK, -0.45)}, inset 0 2px 0 #fff` }}>
            {card.face === Face.LETTER
              ? <span className="geez" style={{ fontSize: cardW * 0.26, fontWeight: 900, lineHeight: 1 }}>ፊ</span>
              : <Volume2 style={{ width: cardW * 0.24, height: cardW * 0.24 }} strokeWidth={3} />}
          </span>
        )}
      </>
    ))
  }

  const glyphEl = (key, color, size, extra) => (
    <span className="geez" style={{ fontSize: size, fontWeight: 900, lineHeight: 1, color, ...extra }}>{glyphOf(key)}</span>
  )

  const face = (card) => {
    if (card.matched) {
      const c = pairColor(card)
      return brickBox(c, (
        <span className="absolute inset-0 flex items-center justify-center" style={{ textShadow: `0 2px 0 ${shade(c, -0.4)}` }}>
          {glyphEl(card.key, '#fff', cardW * 0.62)}
        </span>
      ), { boxShadow: `${brickCss(c, 6).boxShadow}, 0 0 14px 3px rgba(255,240,150,.8)` })
    }
    if (card.face === Face.LETTER) {
      return brickBox(LETTER, <span className="absolute inset-0 flex items-center justify-center">{glyphEl(card.key, '#2c4a7a', cardW * 0.62, { textShadow: '0 1px 0 #fff' })}</span>)
    }
    const talking = playingId === card.id
    const hint = cfg?.hint
    const iconSize = cardW * (hint ? 0.34 : 0.5)
    return brickBox(VOICE, (
      <span className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: cardW * 0.03 }}>
        {hint && <span aria-hidden="true" data-testid="echo-hint" className="geez" style={{ fontSize: cardW * 0.42, fontWeight: 900, opacity: 0.4, lineHeight: 1, color: '#fff' }}>{glyphOf(card.key)}</span>}
        <span className="relative flex items-center justify-center" style={{ width: iconSize * 1.4, height: iconSize * 1.4 }}>
          {talking && (reduce
            ? <span aria-hidden="true" style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '3px solid #fff' }} />
            : <motion.span aria-hidden="true" style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '3px solid #fff' }} animate={{ scale: [1, 1.3, 1], opacity: [0.95, 0.3, 0.95] }} transition={{ duration: 0.8, repeat: Infinity }} />)}
          <motion.span style={{ display: 'flex' }} animate={talking && !reduce ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={talking && !reduce ? { duration: 0.6, repeat: Infinity } : { duration: 0.1 }}>
            <Volume2 style={{ width: iconSize, height: iconSize, color: '#fff', filter: 'drop-shadow(0 2px 0 rgba(120,50,0,.5))' }} strokeWidth={3} />
          </motion.span>
        </span>
      </span>
    ))
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

  const L = brickLabels()
  const held = ctx && ctx.flipped.length === 1 ? ctx.cards.find((c) => c.id === ctx.flipped[0]) : null
  const exCard = example && ctx?.cards.find((c) => c.key === example.key)

  const summaryView = result && ctx && (
    <BrickSummary
      testId="echo-summary"
      summary={result.summary}
      unlockedNew={result.unlockedNew}
      canNext={effLevel < Math.min(progress.unlocked, playable)}
      atMax={effLevel >= MAX_LEVEL}
      belowUnlock={effLevel >= progress.unlocked}
      item={(k) => ({ label: glyphOf(k) })}
      onHear={(k) => voiceOf(k)}
      onNext={() => { setLevel(effLevel + 1); setRound((r) => r + 1) }}
      onAgain={() => setRound((r) => r + 1)}
      onDone={onBack}
    />
  )

  const showing = voiced !== null && enough && ctx && !result
  const rowsN = Math.ceil(n / cols)
  const boardW = cols * cardW + (cols - 1) * 10 + 46
  const boardH = rowsN * (cardH + 6) + (rowsN - 1) * 10 + 46 + 12
  const fitW = Math.max(boardW, cfg?.seconds > 0 ? 304 : 0)
  const fitH = 88 + (cfg?.seconds > 0 ? 24 : 0) + boardH + 14
  return (
    <BrickScreen testId="brick-echo">
      <GameStage style={sceneStyle}
        head={(
          <WoodTopBar onBack={onBack} value={ctx ? ctx.matches : 0} total={ctx ? ctx.pairs : 4} done={celebrating}
            guide={showing ? (celebrating ? <GuideSign icon={PartyPopper} tone="ok" text={t('echoBrickWin', 'You found them all!')} />
              : fb === 'try' ? <GuideSign icon={Ear} tone="try" text={L.retry} />
                : fb === 'ok' ? <GuideSign icon={ThumbsUp} tone="ok" text={L.good} />
                  : held ? <GuideSign icon={Ear} text={held.face === Face.VOICE ? t('echoBrickFindLetter', 'Find the letter that says it') : t('echoBrickFindSound', 'Find its sound card')} />
                    : <GuideSign icon={Hand} text={t('echoBrickGuide', 'Match each sound to its letter')} />) : null} />
        )}>
        {celebrating && <Confetti reduce={reduce} count={36} />}
        {voiced === null ? null : !enough ? (
          <div className="flex h-full items-center justify-center px-6"><NeedMore onBack={onBack}><KokebSvg size={72} /></NeedMore></div>
        ) : !ctx ? null : result ? summaryView : (
          <FitBox w={fitW} h={fitH} anchor="center" pad={2}>
          <div className="flex h-full w-full flex-col items-center">
            <BrickExample example={example && { id: example.key, glyph: glyphOf(example.key), word: example.word }} color={exCard ? pairColor(exCard) : undefined}
              onTap={() => { voiceOf(example.key); later(afterVoice(() => sayWord(example.word), 300, 3000)) }} />
            {cfg.seconds > 0 && (
              <div className="mb-2 h-4 w-[300px] overflow-hidden rounded-full" role="timer" aria-label={`${timeLeft}s`} data-testid="echo-timer"
                style={{ background: 'rgba(60,34,12,.55)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.45)', border: '2px solid #8a5426' }}>
                <div className="h-full rounded-full" style={{ width: `${(timeLeft / cfg.seconds) * 100}%`, background: timeLeft <= 15 ? '#e2453c' : '#4fb04a', transition: reduce ? 'none' : 'width 250ms linear' }} />
              </div>
            )}
            <div className="flex flex-1 items-center justify-center pb-3">
              <div className="relative rounded-[26px] p-2.5" data-testid="echo-board"
                style={{ ...WOOD, border: '5px solid #8a5426', boxShadow: 'inset 0 4px 0 rgba(255,255,255,.3), inset 0 -6px 10px rgba(0,0,0,.25), 0 8px 0 #5a3414, 0 16px 22px rgba(0,0,0,.35)' }}>
                <div className="absolute -top-5 right-3 z-20"><BrickStreak streak={ctx.streak} /></div>
                <div className="rounded-2xl p-2" style={{ background: 'rgba(90,52,20,.28)', boxShadow: 'inset 0 3px 6px rgba(0,0,0,.35)' }}>
                  <div className="grid justify-center gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, ${cardW}px)` }} data-testid="echo-grid">
                    {ctx.cards.map((card, idx) => {
                      const shown = card.faceUp || card.matched
                      const replay = shown && card.face === Face.VOICE
                      const wrong = wrongIds.includes(card.id)
                      const dance = celebrating && !reduce
                      return (
                        <motion.button
                          key={card.id}
                          type="button"
                          data-face={card.face}
                          data-key={card.key}
                          data-state={card.matched ? 'matched' : card.faceUp ? 'up' : 'down'}
                          data-wrong={wrong || undefined}
                          animate={wrong && !reduce ? { x: [0, -7, 7, -5, 5, 0] } : dance ? { y: [0, -18, 0], rotate: [0, idx % 2 ? 5 : -5, 0] } : { x: 0, y: 0, rotate: 0 }}
                          transition={dance ? { duration: 0.55, delay: idx * 0.07, repeat: 2 } : { duration: 0.45 }}
                          onClick={() => tapCard(card)}
                          aria-disabled={shown && !replay}
                          whileTap={reduce || (shown && !replay) ? undefined : { scale: 0.93 }}
                          aria-label={labelOf(card)}
                          className={`rounded-xl ${FOCUS}`}
                          style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: 6, cursor: shown && !replay ? 'default' : 'pointer', outlineColor: '#fff59a', borderRadius: 12, boxShadow: wrong ? '0 0 0 4px #e2453c, 0 0 18px 4px rgba(226,69,60,.7)' : 'none' }}
                        >
                          {cardView(card)}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </FitBox>
        )}
      </GameStage>

      {showing && (
        <WoodBottomBar>
          <BrickLevels max={MAX_LEVEL} current={effLevel} unlocked={progress.unlocked} playable={playable} best={progress.best} onPick={(lv) => { setLevel(lv); setRound((r) => r + 1) }} />
          <RoundButton onClick={() => setRound((r) => r + 1)} label={L.again} testId="again" color="#2f86d6">
            <RotateCcw className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
          </RoundButton>
        </WoodBottomBar>
      )}
    </BrickScreen>
  )
}
