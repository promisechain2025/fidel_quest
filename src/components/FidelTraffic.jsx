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
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, Flame, Trophy } from 'lucide-react'
import { playForm, playEffect } from '../platform/audioEngine'
import { INDEXES, ALL_FORMS, FIDEL_FAMILIES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { Sprite2D, drawAnbessa, drawKokeb, FOCUS } from '../FidelQuestApp'
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
  taxi: { body: '#2f5fa8', trim: '#eef4ff', glass: '#bcd4f5' },
  bajaj: { body: '#1f7d86', trim: '#d8f3f5', glass: '#b9e6ea' },
  bus: { body: '#1f6d52', trim: '#f4d27e', glass: '#bfe3d3' },
  lorry: { body: '#b4682f', trim: '#f3ddc4', glass: '#e6c9a8' },
  ambulance: { body: '#fdf6e6', trim: '#c0453a', glass: '#cfe0f2' },
}
/** Where this car is headed - the child needs it to spot a safe double. */
const TURN_PATH = {
  S: 'M20 -2 l0 -7 M16 -6 l4 -4 l4 4',
  L: 'M20 -2 l0 -4 l-7 0 M15 -10 l-4 4 l4 4',
  R: 'M20 -2 l0 -4 l7 0 M25 -10 l4 4 l-4 4',
}

function CarArt({ kind, turn = 'S' }) {
  const p = PAINT[kind] || PAINT.taxi
  const isBus = kind === 'bus' || kind === 'lorry'
  return (
    <svg width="44" height="62" viewBox="0 0 40 62" aria-hidden="true">
      <g transform="translate(0,8)">
        <rect x="0.5" y="12" width="5" height="12" rx="2.5" fill="#243043" />
        <rect x="34.5" y="12" width="5" height="12" rx="2.5" fill="#243043" />
        <rect x="0.5" y="32" width="5" height="12" rx="2.5" fill="#243043" />
        <rect x="34.5" y="32" width="5" height="12" rx="2.5" fill="#243043" />
        <rect x="3" y="1.5" width="34" height="51" rx={isBus ? 7 : 10} fill={p.body} />
        <rect x="3" y="1.5" width="34" height="51" rx={isBus ? 7 : 10} fill="none" stroke="rgba(0,0,0,.22)" strokeWidth="1.5" />
        <rect x="8" y="7" width="24" height="12" rx="4" fill={p.glass} />
        <rect x="8" y="38" width="24" height="9" rx="3.5" fill={p.glass} opacity=".85" />
        <rect x="6" y="23" width="28" height="6" rx="3" fill={p.trim} opacity={kind === 'ambulance' ? 0 : 0.9} />
        {kind === AMBULANCE && (
          <g>
            <rect x="16.5" y="22" width="7" height="18" rx="1.5" fill={p.trim} />
            <rect x="11" y="27.5" width="18" height="7" rx="1.5" fill={p.trim} />
          </g>
        )}
        <circle cx="10" cy="4.5" r="2.2" fill="#ffe9a8" />
        <circle cx="30" cy="4.5" r="2.2" fill="#ffe9a8" />
      </g>
      {/* turn indicator, ahead of the bonnet */}
      <path d={TURN_PATH[turn] || TURN_PATH.S} transform="translate(0,10)" fill="none" stroke="#ffd76b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
        boxShadow: glowing ? '0 0 0 4px var(--go), 0 0 20px 5px rgba(89,165,42,.5)' : 'none',
      }}
    >
      <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', transform: `rotate(${angle}deg)` }}>
        <CarArt kind={car.kind} turn={car.turn} />
      </span>
      <span
        className={car.covered ? '' : 'geez'}
        style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
          minWidth: 34, padding: '2px 6px', borderRadius: 7,
          background: car.covered ? '#cdbb92' : 'var(--cream, #fdf6e6)',
          border: '1.5px solid #b4882f',
          color: '#5b3d05', fontSize: 22, fontWeight: 900, lineHeight: 1.15,
          boxShadow: '0 1px 2px rgba(0,0,0,.35)',
        }}
      >
        {car.covered ? '  ' : glyphOf(car.key)}
      </span>
    </motion.button>
  )
}

/* ── small pieces ────────────────────────────────────────────────────── */

function Header({ title, onBack, right = null }) {
  return (
    <header className="flex items-center gap-2">
      <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
        <ChevronLeft className="h-6 w-6" aria-hidden="true" />
      </button>
      <h1 className="flex-1 text-center text-lg font-black">{title}</h1>
      <div className="flex w-11 justify-end">{right}</div>
    </header>
  )
}

const Chunk = ({ children, onClick, tone = 'go', className = '' }) => (
  <button
    type="button" onClick={onClick}
    className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS} ${className}`}
    style={tone === 'go'
      ? { background: 'var(--go)', color: '#fff', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }
      : { background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}
  >
    {children}
  </button>
)

const Stars = ({ n }) => (
  <div className="flex gap-1" role="img" aria-label={t('trStars', '{n} of 3 stars', { n })}>
    {[0, 1, 2].map((i) => (
      <span key={i} aria-hidden="true" style={{ fontSize: 26, lineHeight: 1, color: i < n ? 'var(--accent)' : 'var(--line)' }}>
        {i < n ? '★' : '☆'}
      </span>
    ))}
  </div>
)

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

  /* ── not enough letters yet ── */
  if (!enough) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
        <Header title={t('trTitle', 'Fidel Traffic')} onBack={onBack} />
        <main className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <Sprite2D draw={drawAnbessa} size={96} mood="happy" pose="stand" />
          <p className="max-w-xs text-base font-black" style={{ color: 'var(--muted)' }}>
            {t('trNeedMore', 'Learn a few more letters and the road will open!')}
          </p>
          <Chunk onClick={onBack}>{t('orderDone', 'Done')}</Chunk>
        </main>
      </div>
    )
  }

  if (stage === 'setup') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
        <Header title={t('trTitle', 'Fidel Traffic')} onBack={onBack} />
        <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Sprite2D draw={drawAnbessa} size={104} mood="happy" pose="stand" />
          <p className="max-w-xs font-bold" style={{ color: 'var(--muted)' }}>
            {t('trTagline', 'Wave through the car whose letter comes first!')}
          </p>
          <p className="mono text-xs font-black uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
            {t('trOfficers', 'How many officers?')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Chunk onClick={() => beginDay(1)}>{t('trSolo', 'Just me')}</Chunk>
            {[2, 3, 4].map((n) => (
              <Chunk key={n} tone="card" onClick={() => beginDay(n)}>
                {t('trOfficerCount', '{n} officers', { n })}
              </Chunk>
            ))}
          </div>
          {best > 0 && (
            <p className="text-sm font-black" style={{ color: 'var(--muted)' }}>
              {t('trBest', 'Best shift')}: {best}
            </p>
          )}
        </main>
      </div>
    )
  }

  if (stage === 'pass') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
        <Header title={t('trTitle', 'Fidel Traffic')} onBack={onBack} />
        <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Sprite2D draw={drawKokeb} size={92} mood="happy" pose="stand" />
          <h2 className="text-2xl font-black">{t('trPassTitle', 'Pass the phone!')}</h2>
          <p className="max-w-xs font-bold" style={{ color: 'var(--muted)' }}>
            {t('trPassBody', '{who}, you are on duty.', { who: t('trOfficerN', 'Officer {n}', { n: day.turn + 1 }) })}
          </p>
          <Chunk onClick={() => (ctx ? setStage('play') : startShift())}>{t('trReady', 'I am ready')}</Chunk>
        </main>
      </div>
    )
  }

  if (stage === 'shift' && ctx) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
        <Header title={t('trTitle', 'Fidel Traffic')} onBack={onBack} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Sprite2D draw={drawAnbessa} size={112} mood="happy" pose="cheer" />
          <h2 className="text-2xl font-black">{t('trShiftDone', 'Shift complete!')}</h2>
          <Stars n={starsFor(ctx)} />
          <p className="text-4xl font-black" style={{ color: 'var(--go)' }}>{ctx.score}</p>
          <p className="text-sm font-black" style={{ color: 'var(--muted)' }}>
            {t('trFlowLabel', 'City flow')}: {ctx.flow}% &middot; {t('trStreakBest', 'Longest streak')}: {ctx.bestCombo}
          </p>
          {ctx.pairs > 0 && (
            <p className="text-sm font-black" style={{ color: 'var(--sky)' }}>
              {t('trPairsMade', 'Waved through together: {n}', { n: ctx.pairs })}
            </p>
          )}
          {ctx.perfect && (
            <p className="rounded-full px-4 py-1.5 text-sm font-black" style={{ background: 'var(--go-soft)', color: 'var(--go-ink)' }}>
              {t('trPerfect', 'Perfect shift - no mix-ups!')}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Chunk onClick={() => (day.players.length > 1 ? setStage('final') : setStage('setup'))}>
              {day.players.length > 1 ? t('trSeeResults', 'See the results') : t('trAgain', 'Drive again')}
            </Chunk>
            <Chunk tone="card" onClick={onBack}>{t('orderDone', 'Done')}</Chunk>
          </div>
        </main>
      </div>
    )
  }

  if (stage === 'final') {
    const table = standings(day)
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
        <Header title={t('trTitle', 'Fidel Traffic')} onBack={onBack} />
        <main className="flex flex-1 flex-col items-center justify-center gap-5">
          <Sprite2D draw={drawAnbessa} size={104} mood="happy" pose="cheer" />
          <h2 className="text-xl font-black">{t('trStandings', 'Traffic officers')}</h2>
          <ul className="w-full max-w-xs space-y-2">
            {table.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: i === 0 ? 'var(--go-soft)' : 'var(--card)', border: `2px solid ${i === 0 ? 'var(--go)' : 'var(--line)'}` }}>
                {i === 0
                  ? <Trophy className="h-5 w-5 shrink-0" aria-hidden="true" style={{ color: 'var(--accent)' }} />
                  : <span className="w-5 shrink-0 text-center text-sm font-black" style={{ color: 'var(--muted)' }}>{i + 1}</span>}
                <span className="flex-1 truncate font-black">{t('trOfficerN', 'Officer {n}', { n: p.id + 1 })}</span>
                <span className="font-black" style={{ color: 'var(--accent)' }}>{p.score}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-center gap-3">
            <Chunk onClick={() => setStage('setup')}>{t('trAgain', 'Drive again')}</Chunk>
            <Chunk tone="card" onClick={onBack}>{t('orderDone', 'Done')}</Chunk>
          </div>
        </main>
      </div>
    )
  }

  /* ── the intersection ── */
  if (!ctx) return null
  const tierName = ctx.tier === 'meskel'
    ? t('trTierMeskel', 'Meskel Square')
    : ctx.tier === 'downtown' ? t('trTierDowntown', 'Downtown') : t('trTierStreet', 'Quiet street')

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-5 pt-4">
      <Header
        title={tierName}
        onBack={onBack}
        right={<span className="text-base font-black" style={{ color: 'var(--accent)' }}>{ctx.score}</span>}
      />

      {/* flow meter - the thing worth protecting */}
      <div className="mt-2 flex items-center gap-2">
        <span className="mono text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {t('trFlow', 'Flow')}
        </span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}
          role="img" aria-label={`${t('trFlowLabel', 'City flow')}: ${ctx.flow}%`}>
          <motion.div className="h-full rounded-full"
            animate={{ width: `${ctx.flow}%` }} transition={{ duration: reduce ? 0 : 0.4 }}
            style={{ background: ctx.flow > 60 ? 'var(--go)' : ctx.flow > 30 ? 'var(--accent)' : 'var(--bad)' }} />
        </div>
        {ctx.combo >= 2 && (
          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black"
            style={{ background: 'var(--go-soft)', color: 'var(--go-ink)' }}>
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />{ctx.combo}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-1.5"
        role="img" aria-label={t('trProgress', 'Intersection {a} of {b}', { a: ctx.index + 1, b: ctx.target })}>
        {Array.from({ length: ctx.target }).map((_, i) => (
          <span key={i} className="block h-2 w-6 rounded-full"
            style={{ background: i < ctx.cleared ? 'var(--go)' : i === ctx.index ? 'var(--accent)' : 'var(--line)' }} />
        ))}
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="relative" style={{ width: BOX, height: BOX, maxWidth: '100%', overflow: 'hidden' }}>
          <div className="absolute rounded-3xl" style={{ inset: 0, background: 'var(--card)', border: '2px solid var(--line)' }} />
          <div className="absolute" style={{ left: MID - JUNCTION, top: 8, width: JUNCTION * 2, bottom: 8, background: 'var(--paper)' }} />
          <div className="absolute" style={{ top: MID - JUNCTION, left: 8, height: JUNCTION * 2, right: 8, background: 'var(--paper)' }} />
          {[-1, 1].map((s) => (
            <div key={s} className="absolute" style={{
              left: MID - 1, top: 14, width: 2, height: MID - JUNCTION - 14, opacity: .5,
              transform: s === 1 ? `translateY(${MID + JUNCTION}px)` : 'none',
              backgroundImage: 'repeating-linear-gradient(var(--accent) 0 10px, transparent 10px 20px)',
            }} />
          ))}
          {[-1, 1].map((s) => (
            <div key={`h${s}`} className="absolute" style={{
              top: MID - 1, left: 14, height: 2, width: MID - JUNCTION - 14, opacity: .5,
              transform: s === 1 ? `translateX(${MID + JUNCTION}px)` : 'none',
              backgroundImage: 'repeating-linear-gradient(90deg, var(--accent) 0 10px, transparent 10px 20px)',
            }} />
          ))}
          <div className="absolute grid place-items-center rounded-2xl"
            style={{ left: MID - JUNCTION, top: MID - JUNCTION, width: JUNCTION * 2, height: JUNCTION * 2, background: 'var(--card)', border: '2px dashed var(--line)' }}>
            <Sprite2D draw={drawAnbessa} size={62} mood="happy" pose={cheer ? 'cheer' : 'stand'} />
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
                  {pops.filter((p) => p.id === car.id).map((p) => (
                    <motion.span key={p.id} className="pointer-events-none absolute font-black"
                      initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -34 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.76 }}
                      style={{ left: '50%', top: -6, transform: 'translateX(-50%)', color: 'var(--go)', fontSize: 17 }}>
                      +{p.n}
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

        {/* three whistles a shift - knowing beats guessing */}
        <button
          type="button"
          onClick={blowWhistle}
          disabled={ctx.whistles <= 0}
          aria-label={t('trWhistleLabel', 'Blow the whistle for a hint. {n} left', { n: ctx.whistles })}
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${FOCUS}`}
          style={{
            background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)',
            color: ctx.whistles > 0 ? 'var(--muted)' : 'var(--line)', opacity: ctx.whistles > 0 ? 1 : 0.55,
          }}
        >
          {t('trWhistle', 'Whistle')}
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: WHISTLES_PER_SHIFT }).map((_, i) => (
              <span key={i} className="block h-2.5 w-2.5 rounded-full"
                style={{ background: i < ctx.whistles ? 'var(--accent)' : 'var(--line)' }} />
            ))}
          </span>
        </button>
      </main>
    </div>
  )
}
