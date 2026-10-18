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
import { Volume2, Check, RotateCcw } from 'lucide-react'
import { audio, afterVoice, playForm, playEffect, playDrum } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { useWide, GO_BTN } from '../platform/gameUi'
import { dueList } from '../platform/roundProgress'
import { FOCUS, ALL_WORDS } from '../FidelQuestApp'
import KokebSvg from './KokebSvg'
import WordPicture from './Pictures'
import { GameHeader, LevelPills, StreakStars, ExampleSlot, RoundSummary, NeedMore } from './gameKit'
import {
  beatStock, playableIds, initBeats, beatsTransition, beatsSummary, maxPlayableLevel,
  loadBeats, saveBeats, applyRound, MAX_LEVEL, Phase, Kind, BeatEvent, Outcome,
} from '../keberoCore'

const STOCK = beatStock(ALL_WORDS)
const BY_ID = new Map(STOCK.map((w) => [w.id, w]))
const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''

/** The kebero: a CSS/SVG barrel drum (two heads, zig-zag lacing). */
export function Kebero({ size = 120, hit = 0 }) {
  const reduce = useReducedMotion()
  return (
    <motion.svg
      key={reduce ? 'k' : hit}
      width={size} height={size * 0.9} viewBox="0 0 120 108" aria-hidden="true"
      initial={reduce || !hit ? false : { scaleY: 0.86, scaleX: 1.06 }} animate={{ scaleY: 1, scaleX: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 12 }}
    >
      <ellipse cx="60" cy="98" rx="44" ry="7" fill="rgba(0,0,0,.25)" />
      <path d="M14 22 Q8 54 14 86 L106 86 Q112 54 106 22 Z" fill="#9b5a2a" stroke="#5a2f12" strokeWidth="3" />
      <path d="M14 22 L106 22 L106 34 L14 34 Z" fill="#d8553f" opacity=".9" />
      <path d="M14 74 L106 74 L106 86 L14 86 Z" fill="#3b8a3a" opacity=".9" />
      <path d="M18 34 L34 74 L50 34 L66 74 L82 34 L98 74" fill="none" stroke="#f3e2b3" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="60" cy="22" rx="46" ry="12" fill="#f3e2b3" stroke="#5a2f12" strokeWidth="3" />
      <ellipse cx="60" cy="22" rx="30" ry="6" fill="#e8d29a" />
    </motion.svg>
  )
}

/** One beat tile (a fidel on a drum head), or an empty drum for a gap. */
function Tile({ k, i, testId, onClick, glow = false, gap = false, filled = false, tKey, shake, lit, reduce, size: tileSize }) {
  return (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={onClick}
      animate={shake === tKey && !reduce ? { x: [0, -7, 7, -4, 4, 0] } : lit === i && !reduce ? { y: -8, scale: 1.1 } : { x: 0, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      aria-label={gap ? t('beatsGap', 'Missing beat') : glyphOf(k)}
      className={`geez relative flex items-center justify-center rounded-2xl font-black ${FOCUS}`}
      style={{
        width: tileSize, height: tileSize, fontSize: tileSize * 0.5,
        background: gap ? 'transparent' : lit === i || filled ? '#ffd65a' : '#f3e2b3',
        color: '#5a2f12',
        border: gap ? '3px dashed #f3e2b3' : `3px solid ${glow ? 'var(--go)' : '#9b5a2a'}`,
        boxShadow: glow ? '0 0 0 4px var(--go), 0 0 16px var(--go)' : gap ? 'none' : '0 4px 0 #5a2f12',
        outlineColor: 'var(--sky)',
      }}
    >
      {gap ? <span className="text-3xl" aria-hidden="true">🥁</span> : glyphOf(k)}
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
  const wide = useWide()
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
      playEffect('good', soundOn)
      setBusy(true)
      setCtx({ ...r.next, phase: Phase.PLAY, idx: ctx.idx }) // hold the item on screen for the reveal
      beatOut(w.keys, { show: true, then: () => { setBusy(false); setTaps(0); wordMoment(w, r.next) } })
    } else {
      playEffect('bad', soundOn)
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
      playEffect('good', soundOn)
      setLit(pos)
      playForm(formOf(item.keys[pos]), soundOn)
      if (last.wordDone) wordMoment(word, r.next)
      else { setBusy(true); later(afterVoice(() => { setBusy(false); setLit(null); setCtx(r.next) }, 500, 2500)) }
    } else {
      playEffect('bad', soundOn)
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
      playEffect('good', soundOn)
      setBusy(true)
      setReveal({ keys: item.keys, i: item.keys.length - 1, filled: true })
      later(afterVoice(() => wordMoment(word, r.next), 200, 2000))
    } else {
      playEffect('bad', soundOn)
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
      playEffect('bad', soundOn)
      setCtx(r.next)
      setShake(`y${tile.id}`)
      later(afterVoice(() => setShake(null), 450, 900))
      // re-drum the word up to the beat being looked for
      later(afterVoice(() => beatOut(item.keys.slice(0, item.placed + 1)), 400, 2500))
    } else if (last.outcome === Outcome.WORD_DONE) {
      playEffect('good', soundOn)
      setBusy(true)
      setCtx({ ...r.next, phase: Phase.PLAY, idx: ctx.idx, items: r.next.items })
      later(afterVoice(() => wordMoment(word, r.next), 300, 2000))
    } else {
      setCtx(r.next)
    }
  }

  /* ── views ── */
  const tileSize = wide ? 84 : 62
  const tp = { shake, lit, reduce, size: tileSize }

  const hearBtn = item && (
    <button type="button" data-testid="beats-hear" onClick={() => sayWord(word)} aria-label={t('beatsHearWord', 'Hear the word')} className={`flex h-14 w-14 items-center justify-center rounded-full text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep, #2c6cb0)' }}>
      <Volume2 className="h-7 w-7" aria-hidden="true" />
    </button>
  )

  let board = null
  if (item && ctx.kind === Kind.COUNT) {
    const slots = ctx.hint === 'slots' ? item.keys.length : 0
    board = (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          {word.picture && <WordPicture emoji={word.picture} size={wide ? 96 : 72} />}
          {hearBtn}
        </div>
        {/* beat dots: what you drummed (and the slots, after two misses) */}
        <div className="flex min-h-[44px] items-center gap-2" data-testid="beat-dots">
          {reveal ? reveal.keys.slice(0, reveal.i + 1).map((k, i) => (
            <motion.span key={`r${i}`} initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} className="geez flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-black" style={{ background: '#ffd65a', color: '#5a2f12' }}>{glyphOf(k)}</motion.span>
          )) : Array.from({ length: Math.max(taps, slots) }).map((_, i) => (
            <motion.span key={i} data-testid={i < taps ? 'beat-dot' : 'beat-slot'} initial={reduce || i >= taps ? false : { scale: 0 }} animate={{ scale: 1 }} className="block rounded-full" style={{ width: 22, height: 22, background: i < taps ? '#d8553f' : 'transparent', border: '3px solid #d8553f' }} />
          ))}
        </div>
        <motion.button
          type="button" data-testid="drum" onClick={drum} disabled={busy}
          animate={shake === 'drum' && !reduce ? { rotate: [0, -6, 6, -3, 3, 0] } : { rotate: 0 }}
          aria-label={t('beatsDrum', 'Drum: tap once for every beat')}
          className={`rounded-full ${FOCUS}`} style={{ outlineColor: 'var(--sky)' }}
        >
          <Kebero size={wide ? 220 : 170} hit={hit} />
        </motion.button>
        <div className="flex items-center gap-3">
          <button type="button" data-testid="beats-clear" onClick={() => setTaps(0)} disabled={busy || !taps} aria-label={t('beatsAgain', 'Start the beats again')} className={`flex h-12 w-12 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', opacity: taps ? 1 : 0.4 }}>
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" data-testid="beats-done" onClick={done} disabled={busy || !taps} aria-label={t('beatsDone', 'That is all the beats')} className={`chunk flex h-12 min-w-[96px] items-center justify-center gap-1 rounded-2xl px-4 font-black ${FOCUS}`} style={{ ...GO_BTN, opacity: taps ? 1 : 0.5 }}>
            <Check className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  } else if (item && ctx.kind === Kind.WHICH) {
    board = (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          {hearBtn}
          <button type="button" data-testid="beats-ask" onClick={() => playForm(formOf(item.ask), soundOn)} aria-label={t('beatsAsk', 'Hear the beat to find')} className={`flex h-14 items-center gap-2 rounded-full px-4 text-white ${FOCUS}`} style={{ background: 'var(--accent)' }}>
            <span className="text-2xl" aria-hidden="true">🥁</span><span aria-hidden="true">❓</span><Volume2 className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-3" data-testid="beat-tiles">
          {item.keys.map((k, i) => <Tile {...tp} key={i} k={k} i={i} testId={`beat-${i}`} tKey={`t${i}`} onClick={() => tapTile(i)} glow={ctx.hint === i} />)}
        </div>
        <Kebero size={wide ? 140 : 110} hit={hit} />
      </div>
    )
  } else if (item && ctx.kind === Kind.MISSING) {
    const filled = reveal?.filled
    board = (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          {word.picture && <WordPicture emoji={word.picture} size={wide ? 88 : 64} />}
          {hearBtn}
        </div>
        <div className="flex flex-wrap justify-center gap-3" data-testid="beat-tiles">
          {item.keys.map((k, i) => (i === item.pos && !filled
            ? <Tile {...tp} key={i} k={k} i={i} testId="beat-gap" tKey="gap" gap onClick={() => sayWord(word)} />
            : <Tile {...tp} key={i} k={k} i={i} testId={`beat-${i}`} tKey={`t${i}`} filled={filled && i === item.pos} onClick={() => tapTile(i)} />))}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-3" data-testid="beat-options">
          {item.options.map((k) => <Tile {...tp} key={k} k={k} i={-1} testId={`opt-${k}`} tKey={`o${k}`} onClick={() => pickOption(k)} glow={ctx.hint === k} />)}
        </div>
      </div>
    )
  } else if (item && ctx.kind === Kind.SPELL) {
    board = (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          {word.picture && <WordPicture emoji={word.picture} size={wide ? 88 : 64} />}
          {hearBtn}
        </div>
        <div className="flex flex-wrap justify-center gap-3" data-testid="beat-slots">
          {item.keys.map((k, i) => (i < item.placed
            ? <Tile {...tp} key={i} k={k} i={i} testId={`slot-${i}`} tKey={`s${i}`} filled onClick={() => playForm(formOf(k), soundOn)} />
            : <Tile {...tp} key={i} k={k} i={i} testId={`slot-${i}`} tKey={`s${i}`} gap onClick={() => beatOut(item.keys.slice(0, i + 1))} />))}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-3" data-testid="beat-tray">
          {item.tray.filter((x) => !item.used.includes(x.id)).map((x) => <Tile {...tp} key={x.id} k={x.key} i={-1} testId={`tray-${x.id}`} tKey={`y${x.id}`} onClick={() => pickTray(x)} glow={ctx.hint === x.id} />)}
        </div>
      </div>
    )
  }

  const summaryView = result && ctx && (
    <RoundSummary
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
      wide={wide}
    />
  )

  return (
    <div className="mx-auto flex min-h-dvh max-w-md md:max-w-2xl flex-col px-4 pb-6 pt-4">
      <GameHeader title={t('beatsTitle', 'Kebero Beats')} onBack={onBack} />
      <main className="flex flex-1 flex-col items-center justify-center gap-3">
        {!ready ? null : !enough ? (
          <NeedMore onBack={onBack}><KokebSvg size={72} /></NeedMore>
        ) : !ctx ? null : result ? summaryView : (
          <>
            <LevelPills max={MAX_LEVEL} current={effLevel} unlocked={progress.unlocked} playable={playable} best={progress.best} onPick={(lv) => { setLevel(lv); setRound((r) => r + 1) }} />
            <div className="flex items-center gap-3">
              <StreakStars streak={ctx.streak} />
              <span className="flex gap-1" aria-hidden="true" data-testid="beats-progress">
                {ctx.items.map((_, i) => <span key={i} className="block rounded-full" style={{ width: 9, height: 9, background: i < ctx.idx ? 'var(--go)' : i === ctx.idx ? 'var(--accent)' : 'var(--line)' }} />)}
              </span>
            </div>
            <ExampleSlot wide={wide} example={example} onTap={() => { const w = BY_ID.get(example.id); beatOut(w.keys, { then: () => sayWord(w) }) }} />
            <motion.div key={`${ctx.idx}`} initial={reduce ? { opacity: 0 } : { opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="w-full">
              {board}
            </motion.div>
          </>
        )}
      </main>
    </div>
  )
}
