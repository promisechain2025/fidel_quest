/* ============================================================================
   FIDEL TRAFFIC (Meskel Square) — the renderer
   ----------------------------------------------------------------------------
   Thin shell over the pure trafficCore. Anbessa directs an all-way stop; each
   car carries a fidel on its roof plate. The child waves through whichever
   letter comes FIRST in the fidel order.

   Only the car AT THE LINE shows its plate - the ones queued behind are
   covered and reveal as they pull up, so the road can never be pre-solved.
   Cars keep arriving; if every lane backs up, arrivals are turned away and the
   city's flow meter drops. Flow is what is worth optimising, and it is never a
   fail state: the shift always finishes and nothing ever blocks a child.

   Three whistles a shift buy a hint, so knowing beats guessing.

   Group play: 1-4 officers share ONE city. The phone passes after every
   intersection (seconds of waiting, not minutes) and everybody plays the same
   board, so the podium is not decided by who drew the luckier road.

   Voicing follows the app standard - ONE voice per action:
     correct -> the released letter is spoken once as the car drives off
     wrong   -> a soft beep, then the RIGHT car glows and is spoken once
   Impact on a correct tap is carried by press, motion and haptics rather than
   a second sound, so the right answer always feels better than the wrong one.
   Look: Block Church toy-brick style (Oct 2026 rebuild) - a studded green
   baseplate with grey brick roads, chunky brick cars with studs, a wooden
   top bar and bottom bar, brick buttons. Logic is unchanged (trafficCore).
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Flame, Trophy, Megaphone, Gauge, ArrowLeft, Star } from 'lucide-react'
import { BrickScreen, GameStage, FitBox, WoodButton, WoodBottomBar, RoundButton, Baseplate, Confetti, brickCss, studCss, shade, woodBtnCss } from './brickKit'
import { publicUrl } from '../platform/publicUrl'
import { playForm, playEffect } from '../platform/audioEngine'
import { INDEXES, ALL_FORMS, FIDEL_FAMILIES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { FOCUS } from '../FidelQuestApp'
import AnbessaSvg from './AnbessaSvg'
import KokebSvg from './KokebSvg'
import {
  Phase, TrafficEvent, AMBULANCE, WHISTLES_PER_SHIFT,
  initTraffic, trafficTransition, correctLane, starsFor,
  initMatchDay, recordShift, standings, poolCaps,
} from '../trafficCore'
import { loadTraffic, saveTrafficRun } from '../platform/trafficStore'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''
const PAIR_WINDOW_MS = 900 // a second release this soon may count as a double
const TICK_MS = 250

/* ── geometry: a top-down all-way stop ───────────────────────────────── */
const BOX = 356
const MID = BOX / 2
const JUNCTION = 52
const D0 = 100
const D1 = 156
const ANGLE = { N: 180, E: -90, S: 0, W: 90 } // base art faces up

function slotCentre(dir, slot) {
  const d = slot === 0 ? D0 : D1
  if (dir === 'N') return { x: MID, y: MID - d }
  if (dir === 'S') return { x: MID, y: MID + d }
  if (dir === 'E') return { x: MID + d, y: MID }
  return { x: MID - d, y: MID }
}
function exitCentre(dir) {
  const d = MID + 40
  if (dir === 'N') return { x: MID, y: MID + d }
  if (dir === 'S') return { x: MID, y: MID - d }
  if (dir === 'E') return { x: MID - d, y: MID }
  return { x: MID + d, y: MID }
}

/* ── the vehicles (drawn in code, no image assets) ───────────────────── */
const PAINT = {
  taxi: { body: '#2f86d6', glass: '#cfe6fb' },
  bajaj: { body: '#4fb04a', glass: '#d6f2cf' },
  bus: { body: '#f2c230', glass: '#fff3c4' },
  lorry: { body: '#f08a24', glass: '#ffe0bf' },
  ambulance: { body: '#f4f1ea', glass: '#d4e6f7' },
}
const BRICK_ROW = ['#43b02e', '#2f86d6', '#f08a24', '#7a4fc9']
const SCENE = publicUrl('/img/games/brick-meadow.webp')
const ROAD = '#8d96a3'
/** Where this car is headed - the child needs it to spot a safe double. */
const TURN_PATH = {
  S: 'M20 -2 l0 -7 M16 -6 l4 -4 l4 4',
  L: 'M20 -2 l0 -4 l-7 0 M15 -10 l-4 4 l4 4',
  R: 'M20 -2 l0 -4 l7 0 M25 -10 l4 4 l-4 4',
}

function CarArt({ kind, turn = 'S' }) {
  const p = PAINT[kind] || PAINT.taxi
  const long = kind === 'bus' || kind === 'lorry'
  const W = 40, H = long ? 60 : 54
  const wheel = { position: 'absolute', width: 7, height: 13, borderRadius: 3, background: 'linear-gradient(90deg,#1d232c,#3a4350,#1d232c)', boxShadow: '0 2px 0 #0d1015' }
  return (
    <span aria-hidden="true" style={{ position: 'relative', display: 'block', width: W + 8, height: H + 14 }}>
      {/* turn indicator, ahead of the bonnet */}
      <svg width={W + 8} height="14" viewBox="-4 -12 48 14" style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={TURN_PATH[turn] || TURN_PATH.S} fill="none" stroke="#ffd23a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1px 0 #7a4a20)' }} />
      </svg>
      <span style={{ position: 'absolute', left: 4, top: 12, width: W, height: H }}>
        {[[-4, 8], [W - 3, 8], [-4, H - 21], [W - 3, H - 21]].map(([x, y], i) => <span key={i} style={{ ...wheel, left: x, top: y }} />)}
        <span style={{ position: 'absolute', inset: 0, borderRadius: 9, ...brickCss(p.body, 4) }} />
        {/* windscreen + rear window */}
        <span style={{ position: 'absolute', left: 7, right: 7, top: 5, height: 9, borderRadius: 4, background: p.glass, boxShadow: `inset 0 -2px 0 ${shade(p.glass, -0.2)}` }} />
        <span style={{ position: 'absolute', left: 8, right: 8, bottom: 5, height: 7, borderRadius: 3, background: p.glass, opacity: 0.85 }} />
        {/* toy studs on the roof ends */}
        {[10, 30].map((x) => <span key={x} style={{ position: 'absolute', left: x - 6, bottom: 14, ...studCss(p.body, 12) }} />)}
        {kind === AMBULANCE && (
          <span style={{ position: 'absolute', left: 14, top: 15, width: 12, height: 4, background: '#e2453c', borderRadius: 2, boxShadow: '0 0 6px #e2453c' }} />
        )}
        <span style={{ position: 'absolute', left: 4, top: -1, width: 6, height: 4, borderRadius: 2, background: '#fff4b0' }} />
        <span style={{ position: 'absolute', right: 4, top: -1, width: 6, height: 4, borderRadius: 2, background: '#fff4b0' }} />
      </span>
    </span>
  )
}

/** A car at the stop. The body rotates to face the junction; the plate stays
    upright so the glyph is always readable. A queued car's plate is covered. */
function Car({ car, angle, glowing, onClick, disabled, reduce }) {
  const label = car.covered
    ? t('trCarHidden', 'Car waiting in the queue')
    : t('trCarLabel', 'Car with the letter {g}', { g: glyphOf(car.key) })
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={disabled || reduce ? undefined : { scale: 0.88 }}
      className={`absolute ${FOCUS}`}
      style={{
        left: 0, top: 0, width: 68, height: 68, marginLeft: -34, marginTop: -34,
        background: 'transparent', border: 'none', padding: 0,
        cursor: disabled ? 'default' : 'pointer', outlineColor: 'var(--sky)',
        borderRadius: 18,
        pointerEvents: disabled ? 'none' : 'auto',
        boxShadow: glowing ? '0 0 0 4px #ffd23a, 0 0 22px 6px rgba(255,210,58,.7)' : 'none',
      }}
    >
      <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', transform: `rotate(${angle}deg)` }}>
        <CarArt kind={car.kind} turn={car.turn} />
      </span>
      <span
        className={car.covered ? '' : 'geez'}
        style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
          minWidth: 36, minHeight: 32, padding: '1px 6px', borderRadius: 8,
          background: car.covered ? 'linear-gradient(#d9c49a,#b99a62)' : 'linear-gradient(#ffffff,#f1ead8)',
          border: '2px solid #7a4a20',
          color: '#3d2408', fontSize: 23, fontWeight: 900, lineHeight: 1.2,
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 3px 0 #5a3414',
        }}
      >
        {car.covered ? '  ' : glyphOf(car.key)}
      </span>
    </motion.button>
  )
}

/* ── small pieces ────────────────────────────────────────────────────── */

/** Wooden top bar: back plank, a title sign, and an optional right slot. */
function Header({ title, onBack, right = null }) {
  return (
    <header className="relative z-10 flex items-center gap-2 px-3 pb-1 pt-3">
      <WoodButton onClick={onBack} label={t('back', 'Back')}>
        <ArrowLeft className="h-7 w-7" strokeWidth={3} color="#f6c22c" style={{ filter: 'drop-shadow(0 2px 0 #7a4a20)' }} aria-hidden="true" />
      </WoodButton>
      <h1 className="min-w-0 flex-1 truncate rounded-2xl px-3 py-2 text-center text-lg font-black"
        style={{ background: 'linear-gradient(180deg,#fff8e2,#f4dfb0)', border: '4px solid #8a5426', color: '#5a3414', boxShadow: 'inset 0 3px 0 rgba(255,255,255,.55), 0 4px 0 #5a3414' }}>
        {title}
      </h1>
      <div className="flex min-w-14 justify-end">{right}</div>
    </header>
  )
}

const BTN_COLORS = { go: '#43b02e', card: '#2f86d6' }
const Chunk = ({ children, onClick, tone = 'go', className = '' }) => {
  const c = BTN_COLORS[tone] || BTN_COLORS.go
  return (
    <button
      type="button" onClick={onClick}
      className={`bk-btn relative min-h-14 rounded-2xl px-6 pb-3 pt-4 text-lg font-black text-white ${FOCUS} ${className}`}
      style={{ ...brickCss(c, 6), textShadow: `0 2px 0 ${shade(c, -0.45)}`, outlineColor: '#ffd23a' }}
    >
      {[0.25, 0.75].map((x) => (
        <span key={x} aria-hidden="true" className="absolute" style={{ top: -6, left: `${x * 100}%`, transform: 'translateX(-50%)', ...studCss(c, 18) }} />
      ))}
      {children}
    </button>
  )
}

const Stars = ({ n }) => (
  <div className="flex gap-2" role="img" aria-label={t('trStars', '{n} of 3 stars', { n })}>
    {[0, 1, 2].map((i) => (
      <Star key={i} aria-hidden="true" className="h-11 w-11" strokeWidth={2.2}
        fill={i < n ? '#ffd23a' : 'rgba(255,255,255,.55)'} color={i < n ? '#c4841c' : '#9aa7b4'}
        style={{ filter: i < n ? 'drop-shadow(0 3px 0 #a86a10)' : 'none' }} />
    ))}
  </div>
)

/** Shared brick-world shell for the menu screens (setup / pass / results). */
function BrickPage({ title, onBack, children, confetti = false, reduce }) {
  return (
    <BrickScreen testId="fidel-traffic">
      <GameStage style={{ background: '#cfe8f7' }}
        behind={<div aria-hidden="true" className="pointer-events-none absolute -inset-4" style={{ background: `url(${SCENE}) center bottom / cover no-repeat`, filter: 'saturate(1.05)' }} />}
        head={<Header title={title} onBack={onBack} />}>
        {confetti && <Confetti reduce={reduce} />}
        <div className="absolute inset-0 overflow-y-auto px-4 pb-4 pt-2">
          <div className="flex min-h-full items-center justify-center">
            <main className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl px-5 py-6 text-center"
              style={{ background: 'rgba(255,248,226,.94)', border: '4px solid #8a5426', color: '#5a3414', boxShadow: 'inset 0 4px 0 rgba(255,255,255,.6), 0 8px 0 #5a3414, 0 16px 22px rgba(0,0,0,.3)' }}>
              {children}
            </main>
          </div>
        </div>
      </GameStage>
    </BrickScreen>
  )
}

const rumble = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms) } catch { /* unsupported */ } }

/* ── the screen ──────────────────────────────────────────────────────── */

export default function FidelTraffic({ soundOn, onBack, families = [] }) {
  const pool = useMemo(() => {
    // A day-one child has learned nothing, and `families` arrives empty. That
    // must mean the FIRST family (what every sibling game does) - never the
    // whole 231-letter alphabet.
    const fam = new Set(families.length ? families : [FIDEL_FAMILIES[0].id])
    return ALL_FORMS.filter((f) => fam.has(f.familyId)).map((f) => f.audioKey)
  }, [families])
  const caps = useMemo(() => poolCaps(pool), [pool])
  const enough = caps.forms >= 3

  const [stage, setStage] = useState('setup') // setup | pass | play | shift | final
  const [day, setDay] = useState(() => initMatchDay(1))
  const [ctx, setCtx] = useState(null)
  const [hintLane, setHintLane] = useState(-1)
  const [leaving, setLeaving] = useState(null)
  const [shake, setShake] = useState(-1)
  const [pops, setPops] = useState([]) // floating "+N" rewards
  const [cheer, setCheer] = useState(false)
  const [best, setBest] = useState(() => loadTraffic().best)
  const reduce = useReducedMotion()
  const timers = useRef([])
  const cueTimer = useRef(null)
  const lastRelease = useRef(0)
  const turnBase = useRef(0) // score at the start of this officer's turn

  const after = (ms, fn) => { const id = setTimeout(fn, ms); timers.current.push(id); return id }
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; cueTimer.current = null }
  useEffect(() => clearTimers, [])

  // Live traffic: cars keep arriving while the child works.
  const playing = stage === 'play' && !!ctx && ctx.phase === Phase.PLAY
  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => {
      setCtx((cur) => (cur && cur.phase === Phase.PLAY
        ? trafficTransition(cur, { type: TrafficEvent.TICK, payload: { dt: TICK_MS / 1000 } }).next
        : cur))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [playing])

  const startShift = () => {
    // One city, one seed: every officer plays the same board, so the podium is
    // never decided by who drew the easier road.
    const fresh = initTraffic(((Date.now() % 100000) + 1) >>> 0, pool)
    setCtx(fresh)
    turnBase.current = 0
    setHintLane(-1); setLeaving(null); setShake(-1); setPops([])
    setStage('play')
  }

  const beginDay = (count) => {
    const d = initMatchDay(count)
    setDay(d)
    if (count > 1) setStage('pass')
    else startShift()
  }

  const popReward = (n, key) => {
    setPops((p) => [...p, { id: key, n }])
    after(760, () => setPops((p) => p.filter((x) => x.id !== key)))
  }

  const finishTurn = (finalCtx, done) => {
    setDay((d) => recordShift(d, {
      score: finalCtx.score - turnBase.current, cleared: 1, bestCombo: finalCtx.bestCombo,
      misses: finalCtx.misses, pairs: finalCtx.pairs, perfect: finalCtx.perfect,
    }))
    if (done) {
      const totals = saveTrafficRun({ score: finalCtx.score, cleared: finalCtx.cleared, perfect: finalCtx.perfect })
      setBest(totals.best)
      setStage('shift')
    } else {
      turnBase.current = finalCtx.score
      setStage('pass')
    }
  }

  const release = (laneIndex) => {
    if (!ctx || ctx.phase !== Phase.PLAY || leaving) return
    if (cueTimer.current) { clearTimeout(cueTimer.current); cueTimer.current = null }
    const now = Date.now()
    const want = correctLane(ctx)
    const wantKey = ctx.lanes[want]?.cars[0]?.key
    const gotKey = ctx.lanes[laneIndex]?.cars[0]?.key
    const quick = now - lastRelease.current < PAIR_WINDOW_MS
    const r = trafficTransition(ctx, { type: TrafficEvent.RELEASE, payload: { lane: laneIndex, quick } })
    if (!r.accepted) return

    // Namespaced so the ORDERING ledger never touches the RECOGNITION
    // scheduler; a road where an ambulance holds the line tests the exception,
    // not the alphabet, so it is not recorded at all.
    const vipAtLine = ctx.lanes.some((l) => l.cars[0] && l.cars[0].vip)
    if (!vipAtLine) recordAnswer(`ord:${wantKey}`, `ord:${gotKey}`, 'traffic')

    if (r.correct) {
      const car = ctx.lanes[laneIndex].cars[0]
      lastRelease.current = now
      setHintLane(-1)
      playForm(formOf(car.key), soundOn) // the one voice for this action
      rumble(12)
      setCheer(true); after(520, () => setCheer(false))
      popReward(r.next.score - ctx.score, car.id)
      if (reduce) setCtx(r.next)
      else { setLeaving({ ...car, laneIndex }); after(340, () => { setLeaving(null); setCtx(r.next) }) }

      if (r.next.phase === Phase.WIN) {
        after(reduce ? 240 : 600, () => { playEffect('win', soundOn); rumble(40); finishTurn(r.next, true) })
      } else if (r.next.cleared > ctx.cleared) {
        after(reduce ? 200 : 540, () => {
          playEffect('good', soundOn)
          if (day.players.length > 1) finishTurn(r.next, false)
        })
      }
    } else {
      playEffect('bad', soundOn)
      rumble(25)
      setShake(laneIndex)
      after(320, () => setShake(-1))
      setHintLane(r.want)
      cueTimer.current = after(420, () => { cueTimer.current = null; playForm(formOf(wantKey), soundOn) })
      after(1500, () => setHintLane(-1))
      setCtx(r.next)
    }
  }

  const blowWhistle = () => {
    if (!ctx || ctx.phase !== Phase.PLAY || leaving) return
    if (cueTimer.current) { clearTimeout(cueTimer.current); cueTimer.current = null }
    const r = trafficTransition(ctx, { type: TrafficEvent.WHISTLE })
    if (!r.accepted) { playEffect('bad', soundOn); return } // out of whistles
    setCtx(r.next)
    setHintLane(r.want)
    playForm(formOf(ctx.lanes[r.want]?.cars[0]?.key), soundOn)
    after(1500, () => setHintLane(-1))
  }

  const TITLE = t('trTitle', 'Fidel Traffic')
  const ink = { color: '#7a5634' }

  /* ── not enough letters yet ── */
  if (!enough) {
    return (
      <BrickPage title={TITLE} onBack={onBack} reduce={reduce}>
        <AnbessaSvg size={104} mood="happy" pose="stand" />
        <p className="max-w-xs text-lg font-black" style={ink}>
          {t('trNeedMore', 'Learn a few more letters and the road will open!')}
        </p>
        <Chunk onClick={onBack}>{t('orderDone', 'Done')}</Chunk>
      </BrickPage>
    )
  }

  if (stage === 'setup') {
    return (
      <BrickPage title={TITLE} onBack={onBack} reduce={reduce}>
        <AnbessaSvg size={112} mood="happy" pose="stand" />
        <p className="max-w-xs text-lg font-black leading-snug" style={ink}>
          {t('trTagline', 'Wave through the car whose letter comes first!')}
        </p>
        <p className="text-sm font-black uppercase tracking-widest" style={{ color: '#c4641c' }}>
          {t('trOfficers', 'How many officers?')}
        </p>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 pt-1">
          <Chunk onClick={() => beginDay(1)}>{t('trSolo', 'Just me')}</Chunk>
          {[2, 3, 4].map((n) => (
            <Chunk key={n} tone="card" onClick={() => beginDay(n)}>
              {t('trOfficerCount', '{n} officers', { n })}
            </Chunk>
          ))}
        </div>
        {best > 0 && (
          <p className="flex items-center gap-1.5 text-base font-black" style={ink}>
            <Trophy className="h-5 w-5" color="#c4841c" aria-hidden="true" />
            {t('trBest', 'Best shift')}: {best}
          </p>
        )}
      </BrickPage>
    )
  }

  if (stage === 'pass') {
    return (
      <BrickPage title={TITLE} onBack={onBack} reduce={reduce}>
        <KokebSvg size={96} />
        <h2 className="text-2xl font-black">{t('trPassTitle', 'Pass the phone!')}</h2>
        <p className="max-w-xs text-lg font-black" style={ink}>
          {t('trPassBody', '{who}, you are on duty.', { who: t('trOfficerN', 'Officer {n}', { n: day.turn + 1 }) })}
        </p>
        <Chunk onClick={() => (ctx ? setStage('play') : startShift())}>{t('trReady', 'I am ready')}</Chunk>
      </BrickPage>
    )
  }

  if (stage === 'shift' && ctx) {
    return (
      <BrickPage title={TITLE} onBack={onBack} reduce={reduce} confetti={starsFor(ctx) >= 2}>
        <AnbessaSvg size={112} mood="happy" pose="cheer" />
        <h2 className="text-2xl font-black">{t('trShiftDone', 'Shift complete!')}</h2>
        <Stars n={starsFor(ctx)} />
        <p className="text-5xl font-black" style={{ color: '#2e9a28', textShadow: '0 3px 0 #bfe3b0' }}>{ctx.score}</p>
        <p className="text-sm font-black" style={ink}>
          {t('trFlowLabel', 'City flow')}: {ctx.flow}% &middot; {t('trStreakBest', 'Longest streak')}: {ctx.bestCombo}
        </p>
        {ctx.pairs > 0 && (
          <p className="text-sm font-black" style={{ color: '#1f5fb8' }}>
            {t('trPairsMade', 'Waved through together: {n}', { n: ctx.pairs })}
          </p>
        )}
        {ctx.perfect && (
          <p className="rounded-full px-4 py-1.5 text-sm font-black text-white" style={{ ...brickCss('#43b02e', 3) }}>
            {t('trPerfect', 'Perfect shift - no mix-ups!')}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 pt-1">
          <Chunk onClick={() => (day.players.length > 1 ? setStage('final') : setStage('setup'))}>
            {day.players.length > 1 ? t('trSeeResults', 'See the results') : t('trAgain', 'Drive again')}
          </Chunk>
          <Chunk tone="card" onClick={onBack}>{t('orderDone', 'Done')}</Chunk>
        </div>
      </BrickPage>
    )
  }

  if (stage === 'final') {
    const table = standings(day)
    return (
      <BrickPage title={TITLE} onBack={onBack} reduce={reduce} confetti>
        <AnbessaSvg size={104} mood="happy" pose="cheer" />
        <h2 className="text-xl font-black">{t('trStandings', 'Traffic officers')}</h2>
        <ul className="w-full max-w-xs space-y-3">
          {table.map((p, i) => {
            const c = BRICK_ROW[i % BRICK_ROW.length]
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-white" style={{ ...brickCss(c, 4), textShadow: `0 2px 0 ${shade(c, -0.45)}` }}>
                {i === 0
                  ? <Trophy className="h-6 w-6 shrink-0" aria-hidden="true" color="#fff" />
                  : <span className="w-6 shrink-0 text-center text-base font-black">{i + 1}</span>}
                <span className="flex-1 truncate font-black">{t('trOfficerN', 'Officer {n}', { n: p.id + 1 })}</span>
                <span className="text-lg font-black">{p.score}</span>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 pt-1">
          <Chunk onClick={() => setStage('setup')}>{t('trAgain', 'Drive again')}</Chunk>
          <Chunk tone="card" onClick={onBack}>{t('orderDone', 'Done')}</Chunk>
        </div>
      </BrickPage>
    )
  }

  /* ── the intersection ── */
  if (!ctx) return null
  const tierName = ctx.tier === 'meskel'
    ? t('trTierMeskel', 'Meskel Square')
    : ctx.tier === 'downtown' ? t('trTierDowntown', 'Downtown') : t('trTierStreet', 'Quiet street')
  const flowColor = ctx.flow > 60 ? '#43b02e' : ctx.flow > 30 ? '#f2c230' : '#e2453c'

  return (
    <BrickScreen testId="fidel-traffic">
      <GameStage style={{ background: '#cfe8f7' }}
        behind={(
          <>
            <div aria-hidden="true" className="pointer-events-none absolute -inset-4" style={{ background: `url(${SCENE}) center bottom / cover no-repeat`, filter: 'blur(5px) saturate(.85) brightness(1.06)' }} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(255,255,255,.55), rgba(255,255,255,0) 100%)' }} />
          </>
        )}
        head={(
          <div className="relative z-10">
            <Header
              title={tierName}
              onBack={onBack}
              right={(
                <span className="flex h-14 min-w-14 items-center justify-center gap-1 rounded-full px-3 text-lg font-black" style={{ ...woodBtnCss, color: '#fff', textShadow: '0 2px 0 #5a3414' }}>
                  <Star className="h-5 w-5" fill="#ffd23a" color="#c4841c" aria-hidden="true" />{ctx.score}
                </span>
              )}
            />
            {/* flow meter - the thing worth protecting */}
            <div className="mx-3 mt-1 flex items-center gap-2 rounded-full px-2 py-1.5" style={{ background: 'rgba(30,60,110,.35)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.3)' }}>
              <Gauge className="h-5 w-5 shrink-0" color="#fff" strokeWidth={2.6} aria-hidden="true" />
              <div className="h-4 flex-1 overflow-hidden rounded-full" style={{ background: 'linear-gradient(#fff,#d8e4ee)' }}
                role="img" aria-label={`${t('trFlowLabel', 'City flow')}: ${ctx.flow}%`}>
                <motion.div className="h-full rounded-full"
                  animate={{ width: `${ctx.flow}%` }} transition={{ duration: reduce ? 0 : 0.4 }}
                  style={{ background: `linear-gradient(${shade(flowColor, 0.35)}, ${flowColor})`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.5)' }} />
              </div>
              {ctx.combo >= 2 && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-black text-white" style={brickCss('#f08a24', 2)}>
                  <Flame className="h-4 w-4" aria-hidden="true" />{ctx.combo}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5"
              role="img" aria-label={t('trProgress', 'Intersection {a} of {b}', { a: ctx.index + 1, b: ctx.target })}>
              {Array.from({ length: ctx.target }).map((_, i) => (
                <span key={i} className="block h-3 w-7 rounded-md"
                  style={i < ctx.cleared ? brickCss('#43b02e', 2) : i === ctx.index ? brickCss('#f2c230', 2) : { background: 'rgba(255,255,255,.7)', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.12)' }} />
              ))}
            </div>
          </div>
        )}>
        <FitBox w={BOX + 16} h={BOX + 24} anchor="center" pad={6}>
          <Baseplate testId="traffic-board" color="#4fb04a" stud={24} style={{ width: BOX + 8, height: BOX + 8, margin: 4 }}>
            <div className="absolute" style={{ left: 4, top: 4, width: BOX, height: BOX, overflow: 'hidden', borderRadius: 14 }}>
              {/* grey brick roads */}
              <div className="absolute" style={{ left: MID - JUNCTION, top: 0, width: JUNCTION * 2, bottom: 0, background: `linear-gradient(90deg, ${shade(ROAD, -0.2)}, ${ROAD} 12%, ${ROAD} 88%, ${shade(ROAD, -0.2)})` }} />
              <div className="absolute" style={{ top: MID - JUNCTION, left: 0, height: JUNCTION * 2, right: 0, background: `linear-gradient(180deg, ${shade(ROAD, -0.2)}, ${ROAD} 12%, ${ROAD} 88%, ${shade(ROAD, -0.2)})` }} />
              {[-1, 1].map((sd) => (
                <div key={sd} className="absolute" style={{
                  left: MID - 3, top: 8, width: 6, height: MID - JUNCTION - 8,
                  transform: sd === 1 ? `translateY(${MID + JUNCTION - 8}px)` : 'none',
                  backgroundImage: 'repeating-linear-gradient(#ffd23a 0 12px, transparent 12px 24px)', borderRadius: 3,
                }} />
              ))}
              {[-1, 1].map((sd) => (
                <div key={`h${sd}`} className="absolute" style={{
                  top: MID - 3, left: 8, height: 6, width: MID - JUNCTION - 8,
                  transform: sd === 1 ? `translateX(${MID + JUNCTION - 8}px)` : 'none',
                  backgroundImage: 'repeating-linear-gradient(90deg, #ffd23a 0 12px, transparent 12px 24px)', borderRadius: 3,
                }} />
              ))}
              {/* zebra stop lines */}
              {['N', 'S', 'E', 'W'].map((d) => {
                const v = d === 'N' || d === 'S'
                const off = d === 'N' || d === 'W' ? MID - JUNCTION - 10 : MID + JUNCTION + 2
                return <div key={`z${d}`} className="absolute" style={v
                  ? { left: MID - JUNCTION + 4, width: JUNCTION * 2 - 8, top: off, height: 8, backgroundImage: 'repeating-linear-gradient(90deg,#fff 0 8px,transparent 8px 14px)', opacity: 0.9 }
                  : { top: MID - JUNCTION + 4, height: JUNCTION * 2 - 8, left: off, width: 8, backgroundImage: 'repeating-linear-gradient(#fff 0 8px,transparent 8px 14px)', opacity: 0.9 }} />
              })}
              {/* Anbessa on a round brick podium in the middle */}
              <div className="absolute grid place-items-center rounded-full"
                style={{ left: MID - 40, top: MID - 40, width: 80, height: 80, ...brickCss('#f2c230', 5) }}>
                <AnbessaSvg size={62} mood="happy" pose={cheer ? 'cheer' : 'stand'} />
              </div>

              {ctx.lanes.map((lane, li) => lane.cars.map((car, slot) => {
                const c = slotCentre(lane.dir, slot)
                const isFront = slot === 0
                const hidden = leaving && leaving.id === car.id
                return (
                  <motion.div
                    key={car.id}
                    className="absolute"
                    initial={false}
                    animate={{
                      left: c.x, top: c.y, opacity: hidden ? 0 : 1,
                      x: shake === li && isFront && !reduce ? [0, -5, 5, -4, 0] : 0,
                    }}
                    transition={{ left: { duration: reduce ? 0 : 0.28 }, top: { duration: reduce ? 0 : 0.28 }, x: { duration: 0.3 } }}
                  >
                    <Car
                      car={car}
                      angle={ANGLE[lane.dir]}
                      glowing={hintLane === li && isFront}
                      disabled={!isFront || !!leaving}
                      reduce={reduce}
                      onClick={() => release(li)}
                    />
                    <AnimatePresence>
                      {pops.filter((pp) => pp.id === car.id).map((pp) => (
                        <motion.span key={pp.id} className="pointer-events-none absolute font-black"
                          initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -34 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.76 }}
                          style={{ left: '50%', top: -6, transform: 'translateX(-50%)', color: '#fff', fontSize: 20, textShadow: '0 2px 0 #2e7a1e, 0 0 6px #2e7a1e' }}>
                          +{pp.n}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )
              }))}

              <AnimatePresence>
                {leaving && (() => {
                  const from = slotCentre(leaving.dir, 0)
                  const to = exitCentre(leaving.dir)
                  return (
                    <motion.div key={`go-${leaving.id}`} className="absolute"
                      initial={{ left: from.x, top: from.y, opacity: 1 }}
                      animate={{ left: to.x, top: to.y, opacity: 0 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.34, ease: 'easeIn' }}
                      style={{ pointerEvents: 'none' }}>
                      <Car car={leaving} angle={ANGLE[leaving.dir]} disabled reduce />
                    </motion.div>
                  )
                })()}
              </AnimatePresence>
            </div>
          </Baseplate>
        </FitBox>
      </GameStage>

      <WoodBottomBar>
        {/* three whistles a shift - knowing beats guessing */}
        <RoundButton
          onClick={blowWhistle}
          label={t('trWhistleLabel', 'Blow the whistle for a hint. {n} left', { n: ctx.whistles })}
          color={ctx.whistles > 0 ? '#f2c230' : '#9aa7b4'}
          testId="whistle"
        >
          <Megaphone className="h-7 w-7" color="#fff" strokeWidth={2.8} aria-hidden="true" />
        </RoundButton>
        <span className="flex gap-2" aria-hidden="true">
          {Array.from({ length: WHISTLES_PER_SHIFT }).map((_, i) => (
            <span key={i} style={{ display: 'block', ...studCss(i < ctx.whistles ? '#f2c230' : '#7a6a58', 22) }} />
          ))}
        </span>
        <span className="flex h-14 w-14 items-center justify-center rounded-full" aria-hidden="true" style={{ ...woodBtnCss }}>
          <Star className="h-7 w-7" fill={ctx.combo >= 2 ? '#ffd23a' : '#f6c22c'} color="#c4841c" />
        </span>
      </WoodBottomBar>
    </BrickScreen>
  )
}
