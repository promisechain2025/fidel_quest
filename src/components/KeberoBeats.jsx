/* ============================================================================
   KEBERO BEATS — the renderer (replaces Classic)
   ----------------------------------------------------------------------------
   One fidel = one beat on the kebero. Thin shell over the pure keberoCore.
     L1 COUNT   hear the word -> drum once per beat -> ✓. The word is then
                revealed beat by beat (each fidel pops in with its letter and
                a drum hit). Two misses show the empty beat slots.
     L2 WHICH   the word as beat tiles; hear a letter, tap the beat that said it.
     L3 MISSING one beat is an empty drum; pick the fidel that fills it.
     L4 SPELL   hear the word, tap its fidel in order from the tray.
   All answers are taps; letters and words are real recordings (the drum is
   synthesized - no new media). Logged: recordAnswer(heard, picked, 'beats')
   (L1 as beats:<word> pseudo-keys, which the SRS ignores).
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, Check, RotateCcw, Hand, Ear, ThumbsUp, PartyPopper } from 'lucide-react'
import { audio, afterVoice, playForm, playEffect, playDrum } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { dueList } from '../platform/roundProgress'
import { FOCUS, ALL_WORDS } from '../FidelQuestApp'
import KokebSvg from './KokebSvg'
import {
  BrickScreen, WoodTopBar, GuideSign, useGuideFeedback, WoodTray, TrayWell, WoodBottomBar, RoundButton, Baseplate,
  BrickTile, BrickPicture, Confetti, Stud, BRICK_COLORS, roundBtnCss, shade, brickLabels,
} from './brickKit'
import { BrickLevels, BrickSummary, BrickStreak, sceneStyle } from './brickRoundKit'
import { NeedMore } from './gameKit'
import {
  beatStock, playableIds, initBeats, beatsTransition, beatsSummary, maxPlayableLevel,
  loadBeats, saveBeats, applyRound, MAX_LEVEL, Phase, Kind, BeatEvent, Outcome,
} from '../keberoCore'

const STOCK = beatStock(ALL_WORDS)
const BY_ID = new Map(STOCK.map((w) => [w.id, w]))
const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''

// glyph bricks skip gold (white fidel on gold is too faint)
const TILE_COLORS = ['#e2453c', '#f08a24', '#4fb04a', '#2f86d6', '#7a4fc9', '#d94f9a']
const tileColor = (i) => TILE_COLORS[(i < 0 ? 3 : i) % TILE_COLORS.length]
const CREAM = '#f7efd9'

/** The kebero built from toy bricks: a studded drum head on three bands of
    brick (red / gold / green) with brick joints and a laced zig-zag. */
export function Kebero({ size = 120, hit = 0 }) {
  const reduce = useReducedMotion()
  const bands = [['#e2453c', 40, 24], ['#f2c230', 64, 26], ['#4fb04a', 90, 24]]
  return (
    <motion.svg
      key={reduce ? 'k' : hit}
      width={size} height={size * 0.95} viewBox="0 0 140 133" aria-hidden="true" style={{ overflow: 'visible', filter: 'drop-shadow(0 6px 4px rgba(0,0,0,.25))' }}
      initial={reduce || !hit ? false : { scaleY: 0.86, scaleX: 1.06 }} animate={{ scaleY: 1, scaleX: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 12 }}
    >
      <defs>
        <clipPath id="kbody"><path d="M14 34 Q6 74 14 114 L126 114 Q134 74 126 34 Z" /></clipPath>
      </defs>
      <ellipse cx="70" cy="120" rx="58" ry="8" fill="rgba(0,0,0,.25)" />
      <g clipPath="url(#kbody)">
        {bands.map(([c, y, h], bi) => (
          <g key={bi}>
            <rect x="0" y={y - 6} width="140" height={h} fill={c} />
            <rect x="0" y={y - 6} width="140" height="4" fill="rgba(255,255,255,.4)" />
            <rect x="0" y={y + h - 8} width="140" height="2.5" fill={shade(c, -0.35)} />
            {Array.from({ length: 8 }, (_, i) => <rect key={i} x={(bi % 2 ? 8 : 24) + i * 18} y={y - 6} width="2" height={h - 2} fill={shade(c, -0.3)} opacity=".55" />)}
          </g>
        ))}
        <path d="M14 46 L34 94 L54 46 L74 94 L94 46 L114 94 L134 46" fill="none" stroke="#fff4d6" strokeWidth="4" strokeLinejoin="round" opacity=".92" />
        <rect x="26" y="30" width="14" height="90" fill="rgba(255,255,255,.22)" />
      </g>
      <path d="M14 34 Q6 74 14 114 L126 114 Q134 74 126 34" fill="none" stroke="#5a2f12" strokeWidth="3" />
      <ellipse cx="70" cy="34" rx="58" ry="15" fill="#fff4d6" stroke="#5a2f12" strokeWidth="3" />
      <ellipse cx="70" cy="34" rx="46" ry="10.5" fill="#f1dfb2" />
      {[[40, 32], [70, 29], [100, 32], [55, 38], [85, 38]].map(([x, y], i) => <Stud key={i} cx={x} cy={y} r={8} color={['#e2453c', '#2f86d6', '#f2c230', '#4fb04a', '#7a4fc9'][i]} />)}
    </motion.svg>
  )
}

/** One beat brick (a fidel), or an empty drum slot for a gap. */
function Tile({ k, i, testId, onClick, glow = false, gap = false, filled = false, tKey, shake, lit, reduce, w = 70, h = 80, cream = false }) {
  const color = cream && !filled ? CREAM : tileColor(i)
  const up = lit === i && !reduce
  return (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={onClick}
      animate={shake === tKey && !reduce ? { x: [0, -7, 7, -4, 4, 0] } : up ? { y: -10, scale: 1.1 } : { x: 0, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      aria-label={gap ? t('beatsGap', 'Missing beat') : glyphOf(k)}
      className={`relative rounded-lg ${FOCUS}`}
      style={{ width: w, height: h + 12, paddingTop: 12, background: 'transparent', border: 'none', outlineColor: '#fff59a', borderRadius: 12, boxShadow: glow ? '0 0 0 4px #fff59a, 0 0 22px 8px rgba(255,235,90,.95)' : lit === i ? '0 0 20px 6px rgba(255,240,150,.9)' : 'none' }}
    >
      {gap ? (
        <span className="flex items-center justify-center rounded-lg" style={{ width: w, height: h, border: '4px dashed #fff', background: 'rgba(60,34,12,.35)', boxShadow: 'inset 0 3px 8px rgba(0,0,0,.4)' }}>
          <Kebero size={w * 0.8} />
        </span>
      ) : (
        <BrickTile color={color} studs={2} width={w} height={h} depth={6} className="text-[38px]">
          <span style={cream && !filled ? { color: '#2c4a7a', textShadow: '0 1px 0 #fff' } : undefined}>{glyphOf(k)}</span>
        </BrickTile>
      )}
    </motion.button>
  )
}

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
/** Word ids whose whole-word clip exists. */
function useRecordedWords() {
  const [ids, setIds] = useState(null)
  useEffect(() => {
    let live = true
    Promise.all(STOCK.map((w) => audio.hasClip(`words/${w.id}`).then((ok) => (ok ? w.id : null)).catch(() => null)))
      .then((res) => { if (live) setIds(res.filter(Boolean)) })
    return () => { live = false }
  }, [])
  return ids
}

export default function KeberoBeats({ soundOn, onBack, pool = [] }) {
  const voiced = useVoiced(pool)
  const heardIds = useRecordedWords()
  const ready = voiced !== null && heardIds !== null
  const keys = useMemo(() => voiced || [], [voiced])
  const heard = useMemo(() => (heardIds || []).filter((id) => BY_ID.get(id).keys.every((k) => formOf(k))), [heardIds])
  const ids = useMemo(() => playableIds(STOCK.filter((w) => heard.includes(w.id)), keys), [heard, keys])
  const playable = useMemo(() => maxPlayableLevel(STOCK, ids, heard, keys), [ids, heard, keys])
  const enough = ready && playable >= 1

  const [progress, setProgress] = useState(loadBeats)
  const [level, setLevel] = useState(() => loadBeats().unlocked)
  const startRef = useRef(Math.floor(Math.random() * 997) + 1)
  const [round, setRound] = useState(0)
  const [ctx, setCtx] = useState(null)
  const [result, setResult] = useState(null)
  const [example, setExample] = useState(null)
  const [taps, setTaps] = useState(0) // L1 drum hits
  const [hit, setHit] = useState(0)
  const [reveal, setReveal] = useState(null) // { keys, i } beat-by-beat reveal
  const [lit, setLit] = useState(null) // tile index lit while sounding
  const [shake, setShake] = useState(null)
  const [busy, setBusy] = useState(false)
  const reduce = useReducedMotion()
  const [fb, flash] = useGuideFeedback()
  const fx = (kind) => { playEffect(kind, soundOn); flash(kind === 'good' ? 'ok' : 'try', 1300) }
  const timers = useRef([])
  const later = (c) => { timers.current.push(c) }
  const clearTimers = () => { timers.current.forEach((c) => c()); timers.current = [] }
  const token = useRef(0)

  const effLevel = Math.max(1, Math.min(level, progress.unlocked, playable || 1))
  const dueRef = useRef(progress.due)
  dueRef.current = progress.due

  useEffect(() => {
    if (!enough) return undefined
    clearTimers()
    token.current += 1
    setCtx(initBeats(effLevel, (round + 1) * 199 + startRef.current, { stock: STOCK, ids, heardIds: heard, pool: keys, due: dueList(dueRef.current) }))
    setResult(null); setExample(null); setTaps(0); setReveal(null); setLit(null); setBusy(false)
    return clearTimers
  }, [enough, effLevel, round, ids, heard, keys])

  const item = ctx && ctx.phase === Phase.PLAY ? ctx.items[ctx.idx] : null
  const word = item ? BY_ID.get(item.word) : null
  // identity of the CURRENT question (stable across wrong answers / holds)
  const itemKey = item ? `${round}:${ctx.level}:${ctx.idx}:${item.word}:${item.pos ?? ''}` : null

  /* ── audio helpers ── */
  const sayWord = (w, then) => {
    if (!w) return
    audio.play(`words/${w.id}`, { enabled: soundOn, chime: { familyIndex: w.familyIndex || 0, order: 1 } })
    if (then) later(afterVoice(then, 250, 3000))
  }
  /** Drum the word out beat by beat: each fidel voiced with a drum hit,
      lighting tile i (and growing the reveal when `show`). */
  const beatOut = (ks, { show = false, then = null } = {}) => {
    const my = ++token.current
    const step = (i) => {
      if (my !== token.current) return
      if (i >= ks.length) { setLit(null); if (then) later(afterVoice(then, 250, 2500)); return }
      setLit(i)
      if (show) setReveal({ keys: ks, i })
      playDrum(false, soundOn)
      setHit((h) => h + 1)
      playForm(formOf(ks[i]), soundOn)
      later(afterVoice(() => step(i + 1), 160, 2500))
    }
    step(0)
  }

  // Each new item: say the word (and, in L2, ask the letter).
  useEffect(() => {
    if (!item) return undefined
    const id = setTimeout(() => {
      if (ctx.kind === Kind.WHICH) sayWord(word, () => playForm(formOf(item.ask), soundOn))
      else sayWord(word)
    }, 450)
    return () => clearTimeout(id)
  }, [itemKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Round over -> summary.
  useEffect(() => {
    if (!ctx || ctx.phase !== Phase.WIN || result) return undefined
    const id = setTimeout(() => {
      playEffect('win', soundOn)
      const summary = beatsSummary(ctx)
      const { state, unlockedNew } = applyRound(loadBeats(), ctx.level, summary)
      saveBeats(state)
      setProgress(state)
      setResult({ summary, unlockedNew })
    }, reduce ? 600 : 2400)
    return () => clearTimeout(id)
  }, [ctx, result, soundOn, reduce])

  /* ── answering ── */
  const apply = (event) => {
    if (!ctx || busy) return null
    const r = beatsTransition(ctx, event)
    if (!r.accepted) return null
    const last = r.next.last
    if (last.log) recordAnswer(last.log.heard, last.log.picked, 'beats')
    return r
  }
  const wordMoment = (w, next) => {
    setExample({ id: w.id, glyph: '', word: { geez: w.geez, picture: w.picture } })
    later(afterVoice(() => sayWord(w), 200, 2000))
    setBusy(true)
    later(afterVoice(() => { setBusy(false); setReveal(null); setCtx(next) }, 900, 4000))
  }

  const drum = () => {
    if (!item || ctx.kind !== Kind.COUNT || busy) return
    playDrum(false, soundOn)
    setHit((h) => h + 1)
    setTaps((n) => Math.min(8, n + 1))
  }
  const done = () => {
    if (!taps) return
    const r = apply({ type: BeatEvent.COUNT, payload: { n: taps } })
    if (!r) return
    playDrum(true, soundOn)
    const w = BY_ID.get(r.next.last.item.word)
    if (r.next.last.outcome === Outcome.WORD_DONE) {
      fx('good')
      setBusy(true)
      setCtx({ ...r.next, phase: Phase.PLAY, idx: ctx.idx }) // hold the item on screen for the reveal
      beatOut(w.keys, { show: true, then: () => { setBusy(false); setTaps(0); wordMoment(w, r.next) } })
    } else {
      fx('bad')
      setCtx(r.next)
      setShake('drum')
      setBusy(true)
      // show the beats, then let the child drum it again
      later(afterVoice(() => beatOut(w.keys, { show: true, then: () => { setBusy(false); setTaps(0); setReveal(null); setShake(null) } }), 400, 1500))
    }
  }

  const tapTile = (pos) => {
    if (!item || busy) return
    if (ctx.kind !== Kind.WHICH) { playForm(formOf(item.keys[pos]), soundOn); return }
    const r = apply({ type: BeatEvent.TAP, payload: { pos } })
    if (!r) return
    playDrum(false, soundOn)
    setHit((h) => h + 1)
    const last = r.next.last
    if (last.outcome === Outcome.RIGHT) {
      fx('good')
      setLit(pos)
      playForm(formOf(item.keys[pos]), soundOn)
      if (last.wordDone) wordMoment(word, r.next)
      else { setBusy(true); later(afterVoice(() => { setBusy(false); setLit(null); setCtx(r.next) }, 500, 2500)) }
    } else {
      fx('bad')
      setCtx(r.next)
      setShake(`t${pos}`)
      later(afterVoice(() => setShake(null), 450, 900))
      // hear the difference: what you tapped, then what was asked
      later(afterVoice(() => { playForm(formOf(item.keys[pos]), soundOn); later(afterVoice(() => playForm(formOf(item.ask), soundOn), 300, 2500)) }, 250, 1500))
    }
  }

  const pickOption = (key) => {
    if (!item || busy) return
    const r = apply({ type: BeatEvent.TAP, payload: { key } })
    if (!r) return
    playForm(formOf(key), soundOn)
    if (r.next.last.outcome === Outcome.WORD_DONE) {
      fx('good')
      setBusy(true)
      setReveal({ keys: item.keys, i: item.keys.length - 1, filled: true })
      later(afterVoice(() => wordMoment(word, r.next), 200, 2000))
    } else {
      fx('bad')
      setCtx(r.next)
      setShake(`o${key}`)
      later(afterVoice(() => setShake(null), 450, 900))
      later(afterVoice(() => sayWord(word), 300, 2500))
    }
  }

  const pickTray = (tile) => {
    if (!item || busy) return
    const r = apply({ type: BeatEvent.TAP, payload: { trayId: tile.id } })
    if (!r) return
    playDrum(false, soundOn)
    setHit((h) => h + 1)
    playForm(formOf(tile.key), soundOn)
    const last = r.next.last
    if (last.outcome === Outcome.WRONG) {
      fx('bad')
      setCtx(r.next)
      setShake(`y${tile.id}`)
      later(afterVoice(() => setShake(null), 450, 900))
      // re-drum the word up to the beat being looked for
      later(afterVoice(() => beatOut(item.keys.slice(0, item.placed + 1)), 400, 2500))
    } else if (last.outcome === Outcome.WORD_DONE) {
      fx('good')
      setBusy(true)
      setCtx({ ...r.next, phase: Phase.PLAY, idx: ctx.idx, items: r.next.items })
      later(afterVoice(() => wordMoment(word, r.next), 300, 2000))
    } else {
      setCtx(r.next)
    }
  }

  /* ── views ── */
  const L = brickLabels()
  const celebrating = !!ctx && ctx.phase === Phase.WIN && !result
  const tileW = item && item.keys && item.keys.length > 4 ? 60 : 70
  const tp = { shake, lit, reduce, w: tileW, h: tileW + 10 }

  const hearBtn = item && (
    <RoundButton testId="beats-hear" onClick={() => sayWord(word)} label={t('beatsHearWord', 'Hear the word')} color="#2f86d6">
      <Volume2 className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
    </RoundButton>
  )

  /* the clue: the word's picture + hear button, then the word itself once solved */
  const clue = example ? (
    <button type="button" data-testid="game-example" onClick={() => { const w = BY_ID.get(example.id); beatOut(w.keys, { then: () => sayWord(w) }) }}
      aria-label={t('beatsHearWord', 'Hear the word')} className={`flex items-center gap-3 rounded-3xl px-4 py-2 ${FOCUS}`}
      style={{ background: 'linear-gradient(180deg,#fffdf4,#f1dfb2)', border: '4px solid #8a5426', boxShadow: 'inset 0 3px 0 #fff, 0 5px 0 #5a3414, 0 10px 14px rgba(0,0,0,.3)', outlineColor: '#fff59a' }}>
      {example.word.picture && <BrickPicture geez={example.word.geez} emoji={example.word.picture} size={84} />}
      <span className="geez text-[44px] font-black leading-none" style={{ color: '#2c4a7a', textShadow: '0 2px 0 #fff' }}>{example.word.geez}</span>
      <Volume2 className="h-7 w-7" color="#2f86d6" strokeWidth={3} aria-hidden="true" />
    </button>
  ) : item && (
    <div className="flex items-center gap-4">
      {word.picture && <BrickPicture geez={word.geez} emoji={word.picture} size={108} />}
      {hearBtn}
    </div>
  )

  const stage = (children, testId) => (
    <Baseplate className="mx-3 flex min-h-[150px] w-[calc(100%-24px)] items-center justify-center px-2 pb-3 pt-6" stud={24} style={{ zIndex: 1 }}>
      <div className="flex flex-wrap items-end justify-center gap-2.5" data-testid={testId}>{children}</div>
    </Baseplate>
  )

  let board = null
  let trayView = null
  let guideText = ''
  let GuideIcon = Hand
  if (item && ctx.kind === Kind.COUNT) {
    guideText = t('beatsBrickCount', 'Drum once for each beat')
    const slots = ctx.hint === 'slots' ? item.keys.length : 0
    const n = Math.max(taps, slots)
    const small = n > 6
    board = stage(
      reveal ? reveal.keys.slice(0, reveal.i + 1).map((k, i) => (
        <motion.div key={`r${i}`} initial={reduce ? false : { scale: 0, y: -30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }}>
          <BrickTile color={tileColor(i)} studs={2} width={tileW - 6} height={tileW + 4} depth={6} className="text-[34px]">{glyphOf(k)}</BrickTile>
        </motion.div>
      )) : Array.from({ length: n }).map((_, i) => (
        i < taps ? (
          <motion.div key={i} data-testid="beat-dot" initial={reduce ? false : { scale: 0, y: -40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 13 }}>
            <BrickTile color={BRICK_COLORS[i % 7]} studs={1} width={small ? 38 : 52} height={small ? 34 : 44} depth={5} />
          </motion.div>
        ) : (
          <span key={i} data-testid="beat-slot" className="block rounded-lg" style={{ width: small ? 38 : 52, height: small ? 34 : 44, border: '4px dashed #fff', background: 'rgba(60,34,12,.35)' }} />
        )
      )), 'beat-dots',
    )
    trayView = (
      <div className="flex items-center justify-center gap-3 pt-1">
        <RoundButton testId="beats-clear" onClick={() => { if (!busy && taps) setTaps(0) }} label={t('beatsAgain', 'Start the beats again')} color="#e2453c" className={`${busy || !taps ? 'opacity-40' : ''}`}>
          <RotateCcw className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
        </RoundButton>
        <motion.button
          type="button" data-testid="drum" onClick={drum} disabled={busy}
          animate={shake === 'drum' && !reduce ? { rotate: [0, -6, 6, -3, 3, 0] } : { rotate: 0 }}
          aria-label={t('beatsDrum', 'Drum: tap once for every beat')}
          className={`rounded-full ${FOCUS}`} style={{ outlineColor: '#fff59a' }}
        >
          <Kebero size={206} hit={hit} />
        </motion.button>
        <RoundButton testId="beats-done" onClick={() => { if (!busy && taps) done() }} label={t('beatsDone', 'That is all the beats')} color="#4fb04a" className={`${busy || !taps ? 'opacity-40' : ''}`}>
          <Check className="h-8 w-8" color="#fff" strokeWidth={4} aria-hidden="true" />
        </RoundButton>
      </div>
    )
  } else if (item && ctx.kind === Kind.WHICH) {
    guideText = t('beatsBrickWhich', 'Tap the beat you hear')
    GuideIcon = Ear
    board = stage(item.keys.map((k, i) => <Tile {...tp} key={i} k={k} i={i} testId={`beat-${i}`} tKey={`t${i}`} onClick={() => tapTile(i)} glow={ctx.hint === i} />), 'beat-tiles')
    trayView = (
      <div className="flex items-center justify-center gap-6 pt-1">
        <button type="button" data-testid="beats-ask" onClick={() => playForm(formOf(item.ask), soundOn)} aria-label={t('beatsAsk', 'Hear the beat to find')}
          className={`flex h-[84px] w-[84px] items-center justify-center rounded-full ${FOCUS}`} style={{ ...roundBtnCss('#f08a24'), outlineColor: '#fff59a' }}>
          <Volume2 className="h-11 w-11" color="#fff" strokeWidth={3} aria-hidden="true" />
        </button>
        <Kebero size={130} hit={hit} />
      </div>
    )
  } else if (item && ctx.kind === Kind.MISSING) {
    guideText = t('beatsBrickMissing', 'Fill the empty drum')
    const filled = reveal?.filled
    board = stage(item.keys.map((k, i) => (i === item.pos && !filled
      ? <Tile {...tp} key={i} k={k} i={i} testId="beat-gap" tKey="gap" gap onClick={() => sayWord(word)} />
      : <Tile {...tp} key={i} k={k} i={i} testId={`beat-${i}`} tKey={`t${i}`} filled={filled && i === item.pos} onClick={() => tapTile(i)} />)), 'beat-tiles')
    trayView = (
      <TrayWell className="flex flex-wrap justify-center gap-2.5" >
        <div className="flex flex-wrap justify-center gap-2.5" data-testid="beat-options">
          {item.options.map((k) => <Tile {...tp} key={k} k={k} i={-1} cream testId={`opt-${k}`} tKey={`o${k}`} onClick={() => pickOption(k)} glow={ctx.hint === k} />)}
        </div>
      </TrayWell>
    )
  } else if (item && ctx.kind === Kind.SPELL) {
    guideText = t('beatsBrickSpell', 'Build the word in order')
    board = stage(item.keys.map((k, i) => (i < item.placed
      ? <Tile {...tp} key={i} k={k} i={i} testId={`slot-${i}`} tKey={`s${i}`} filled onClick={() => playForm(formOf(k), soundOn)} />
      : <Tile {...tp} key={i} k={k} i={i} testId={`slot-${i}`} tKey={`s${i}`} gap onClick={() => beatOut(item.keys.slice(0, i + 1))} />)), 'beat-slots')
    trayView = (
      <TrayWell>
        <div className="flex flex-wrap justify-center gap-2.5" data-testid="beat-tray">
          {item.tray.filter((x) => !item.used.includes(x.id)).map((x) => <Tile {...tp} key={x.id} k={x.key} i={-1} cream testId={`tray-${x.id}`} tKey={`y${x.id}`} onClick={() => pickTray(x)} glow={ctx.hint === x.id} />)}
        </div>
      </TrayWell>
    )
  }

  const summaryView = result && ctx && (
    <BrickSummary
      testId="beats-summary"
      summary={result.summary}
      unlockedNew={result.unlockedNew}
      canNext={effLevel < Math.min(progress.unlocked, playable)}
      atMax={effLevel >= MAX_LEVEL}
      belowUnlock={effLevel >= progress.unlocked}
      item={(id) => (BY_ID.has(id) ? { label: BY_ID.get(id).geez, picture: BY_ID.get(id).picture } : { label: glyphOf(id) })}
      onHear={(id) => (BY_ID.has(id) ? beatOut(BY_ID.get(id).keys, { then: () => sayWord(BY_ID.get(id)) }) : playForm(formOf(id), soundOn))}
      onNext={() => { setLevel(effLevel + 1); setRound((r) => r + 1) }}
      onAgain={() => setRound((r) => r + 1)}
      onDone={onBack}
    />
  )

  const showing = ready && enough && ctx && !result
  return (
    <BrickScreen testId="brick-beats">
      <div className="relative min-h-0 overflow-hidden" style={{ flex: '1 1 auto', ...sceneStyle }}>
        <WoodTopBar onBack={onBack} value={ctx ? Math.min(ctx.idx, ctx.items.length) : 0} total={ctx ? ctx.items.length : 5} done={celebrating} />
        {celebrating && <Confetti reduce={reduce} count={36} />}
        {showing && (
          <div className="pointer-events-none absolute inset-x-0 top-[62px] z-30 flex justify-center">
            {celebrating ? <GuideSign icon={PartyPopper} tone="ok" text={t('beatsBrickWin', 'Great drumming!')} />
              : fb === 'try' ? <GuideSign icon={Ear} tone="try" text={L.retry} />
                : fb === 'ok' ? <GuideSign icon={ThumbsUp} tone="ok" text={L.good} />
                  : <GuideSign icon={GuideIcon} text={guideText || t('beatsBrickCount', 'Drum once for each beat')} />}
          </div>
        )}
        {!ready ? null : !enough ? (
          <div className="flex h-full items-center justify-center px-6 pt-16"><NeedMore onBack={onBack}><KokebSvg size={72} /></NeedMore></div>
        ) : !ctx ? null : result ? summaryView : (
          <div className="absolute inset-x-0 bottom-0 top-[124px] flex flex-col items-center justify-between pb-5">
            <div className="absolute right-3 top-1 z-20"><BrickStreak streak={ctx.streak} /></div>
            <div className="flex min-h-[104px] items-center">{clue}</div>
            <motion.div key={`${ctx.idx}`} initial={reduce ? { opacity: 0 } : { opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="w-full">
              {board}
            </motion.div>
          </div>
        )}
      </div>

      {showing && (
        <>
          <WoodTray style={{ minHeight: 200 }}>
            <div className="flex flex-1 flex-col justify-center" data-testid="beat-tray-area">{trayView}</div>
          </WoodTray>
          <WoodBottomBar>
            <BrickLevels max={MAX_LEVEL} current={effLevel} unlocked={progress.unlocked} playable={playable} best={progress.best} onPick={(lv) => { setLevel(lv); setRound((r) => r + 1) }} />
            <RoundButton onClick={() => setRound((r) => r + 1)} label={L.again} testId="again" color="#2f86d6">
              <RotateCcw className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
            </RoundButton>
          </WoodBottomBar>
        </>
      )}
    </BrickScreen>
  )
}
