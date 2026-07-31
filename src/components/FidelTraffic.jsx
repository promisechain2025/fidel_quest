/* ============================================================================
   FIDEL TRAFFIC (Meskel Square) — the renderer
   ----------------------------------------------------------------------------
   Thin shell over the pure trafficCore. Anbessa directs an all-way stop; each
   car carries a fidel on its roof plate. The child waves through whichever
   letter comes FIRST in the fidel order. Clear the road, the next intersection
   rolls in, five of them make a shift.

   Group play: 1-4 officers share one phone. Each takes a shift, the phone is
   passed on, and the day ends on a podium. No accounts, nothing leaves the
   device - it is just turn-taking, the way kids actually play together.

   Voicing follows the app standard - ONE voice per action:
     correct -> the released letter is spoken once as the car drives off
     wrong   -> a soft beep, then the RIGHT car glows and is spoken once
   No spoken instructions on top of that, ever.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, Flame, HelpCircle, Trophy } from 'lucide-react'
import { playForm, playEffect } from '../platform/audioEngine'
import { INDEXES, ALL_FORMS } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { Sprite2D, drawAnbessa, drawKokeb, FOCUS } from '../FidelQuestApp'
import {
  Phase, TrafficEvent, AMBULANCE,
  initTraffic, trafficTransition, correctLane,
  initMatchDay, recordShift, standings, poolCaps,
} from '../trafficCore'
import { loadTraffic, saveTrafficRun } from '../platform/trafficStore'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''

/* ── geometry: a top-down all-way stop ───────────────────────────────── */
const BOX = 356
const MID = BOX / 2
const JUNCTION = 52 // half-width of the centre box
const D0 = 100 // distance from centre to the front car
const D1 = 156 // ...and to the car queued behind it
const ANGLE = { N: 180, E: -90, S: 0, W: 90 } // base art faces up

function slotCentre(dir, slot) {
  const d = slot === 0 ? D0 : D1
  if (dir === 'N') return { x: MID, y: MID - d }
  if (dir === 'S') return { x: MID, y: MID + d }
  if (dir === 'E') return { x: MID + d, y: MID }
  return { x: MID - d, y: MID }
}
/** Where a released car drives to: straight across and out the far side. */
function exitCentre(dir) {
  const d = MID + 90
  if (dir === 'N') return { x: MID, y: MID + d }
  if (dir === 'S') return { x: MID, y: MID - d }
  if (dir === 'E') return { x: MID - d, y: MID }
  return { x: MID + d, y: MID }
}

/* ── the vehicles (drawn in code, no image assets) ───────────────────── */
const PAINT = {
  // Addis on the road: the blue-and-white minibus, the bajaj three-wheeler,
  // the green Anbessa city bus, a work lorry, and the ambulance that jumps
  // the queue.
  taxi: { body: '#2f5fa8', trim: '#eef4ff', glass: '#bcd4f5' },
  bajaj: { body: '#1f7d86', trim: '#d8f3f5', glass: '#b9e6ea' },
  bus: { body: '#1f6d52', trim: '#f4d27e', glass: '#bfe3d3' },
  lorry: { body: '#b4682f', trim: '#f3ddc4', glass: '#e6c9a8' },
  ambulance: { body: '#fdf6e6', trim: '#c0453a', glass: '#cfe0f2' },
}

function CarArt({ kind }) {
  const p = PAINT[kind] || PAINT.taxi
  const isBus = kind === 'bus' || kind === 'lorry'
  return (
    <svg width="44" height="58" viewBox="0 0 40 54" aria-hidden="true">
      {/* wheels */}
      <rect x="0.5" y="12" width="5" height="12" rx="2.5" fill="#243043" />
      <rect x="34.5" y="12" width="5" height="12" rx="2.5" fill="#243043" />
      <rect x="0.5" y="32" width="5" height="12" rx="2.5" fill="#243043" />
      <rect x="34.5" y="32" width="5" height="12" rx="2.5" fill="#243043" />
      {/* body */}
      <rect x="3" y="1.5" width="34" height="51" rx={isBus ? 7 : 10} fill={p.body} />
      <rect x="3" y="1.5" width="34" height="51" rx={isBus ? 7 : 10} fill="none" stroke="rgba(0,0,0,.22)" strokeWidth="1.5" />
      {/* windscreen + rear glass */}
      <rect x="8" y="7" width="24" height="12" rx="4" fill={p.glass} />
      <rect x="8" y="38" width="24" height="9" rx="3.5" fill={p.glass} opacity=".85" />
      {/* a stripe down the flank - the minibus/bus livery */}
      <rect x="6" y="23" width="28" height="6" rx="3" fill={p.trim} opacity={kind === 'ambulance' ? 0 : 0.9} />
      {/* ambulance cross */}
      {kind === AMBULANCE && (
        <g>
          <rect x="16.5" y="22" width="7" height="18" rx="1.5" fill={p.trim} />
          <rect x="11" y="27.5" width="18" height="7" rx="1.5" fill={p.trim} />
        </g>
      )}
      {/* headlights */}
      <circle cx="10" cy="4.5" r="2.2" fill="#ffe9a8" />
      <circle cx="30" cy="4.5" r="2.2" fill="#ffe9a8" />
    </svg>
  )
}

/** A car at the stop: body rotates to face the junction, the plate stays
    upright so the glyph is always readable (never a sideways letter). */
function Car({ car, angle, glowing, onClick, disabled }) {
  const label = t('trCarLabel', 'Car with the letter {g}', { g: glyphOf(car.key) })
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`absolute ${FOCUS}`}
      style={{
        left: 0, top: 0, width: 68, height: 68, marginLeft: -34, marginTop: -34,
        background: 'transparent', border: 'none', padding: 0,
        cursor: disabled ? 'default' : 'pointer', outlineColor: 'var(--sky)',
        borderRadius: 18,
        boxShadow: glowing ? '0 0 0 4px var(--go), 0 0 22px 6px rgba(89,165,42,.55)' : 'none',
      }}
    >
      <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', transform: `rotate(${angle}deg)` }}>
        <CarArt kind={car.kind} />
      </span>
      {/* upright roof plate */}
      <span
        className="geez"
        style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
          minWidth: 34, padding: '2px 6px', borderRadius: 7,
          background: 'var(--cream, #fdf6e6)', border: '1.5px solid #b4882f',
          color: '#5b3d05', fontSize: 22, fontWeight: 900, lineHeight: 1.15,
          boxShadow: '0 1px 2px rgba(0,0,0,.35)',
        }}
      >
        {glyphOf(car.key)}
      </span>
    </button>
  )
}

/* ── screens ─────────────────────────────────────────────────────────── */

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

export default function FidelTraffic({ soundOn, onBack, families = [] }) {
  // The child's learned letters, all orders - the plates come from here.
  const pool = useMemo(() => {
    const fam = new Set(families)
    const inScope = fam.size ? ALL_FORMS.filter((f) => fam.has(f.familyId)) : ALL_FORMS
    return inScope.map((f) => f.audioKey)
  }, [families])
  const caps = useMemo(() => poolCaps(pool), [pool])
  const enough = caps.forms >= 3

  const [stage, setStage] = useState('setup') // setup | pass | play | shift | final
  const [day, setDay] = useState(() => initMatchDay(1))
  const [ctx, setCtx] = useState(null)
  const [hintLane, setHintLane] = useState(-1)
  const [leaving, setLeaving] = useState(null) // the car currently driving off
  const [buzz, setBuzz] = useState(-1)
  const reduce = useReducedMotion()
  const timers = useRef([])
  const [best, setBest] = useState(() => loadTraffic().best)

  const after = (ms, fn) => { const id = setTimeout(fn, ms); timers.current.push(id); return id }
  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current = [] }, [])

  const startShift = (nextDay = day) => {
    const seed = ((Date.now() % 100000) + nextDay.turn * 7919 + 1) >>> 0
    setCtx(initTraffic(seed, pool))
    setHintLane(-1); setLeaving(null); setBuzz(-1)
    setStage('play')
  }

  const beginDay = (count) => {
    const d = initMatchDay(count)
    setDay(d)
    if (count > 1) setStage('pass')
    else startShift(d)
  }

  const release = (laneIndex) => {
    if (!ctx || ctx.phase !== Phase.PLAY || leaving) return
    const want = correctLane(ctx)
    const wantKey = ctx.lanes[want]?.cars[0]?.key
    const gotKey = ctx.lanes[laneIndex]?.cars[0]?.key
    const r = trafficTransition(ctx, { type: TrafficEvent.RELEASE, payload: { lane: laneIndex } })
    if (!r.accepted) return
    recordAnswer(wantKey, gotKey, 'traffic')

    if (r.correct) {
      const car = ctx.lanes[laneIndex].cars[0]
      setHintLane(-1)
      // ONE voice: the letter that just drove through.
      playForm(formOf(car.key), soundOn)
      if (reduce) {
        setCtx(r.next)
      } else {
        setLeaving({ ...car, laneIndex })
        after(360, () => { setLeaving(null); setCtx(r.next) })
      }
      if (r.next.phase === Phase.WIN) {
        after(reduce ? 260 : 620, () => { playEffect('win', soundOn); finishShift(r.next) })
      } else if (r.next.cleared > ctx.cleared) {
        after(reduce ? 200 : 560, () => playEffect('good', soundOn))
      }
    } else {
      // Never a block: buzz, then glow + speak the car that should have gone.
      playEffect('bad', soundOn)
      setBuzz(laneIndex)
      after(340, () => setBuzz(-1))
      setHintLane(r.want)
      after(420, () => playForm(formOf(wantKey), soundOn))
      after(1600, () => setHintLane(-1))
      setCtx(r.next)
    }
  }

  const askAnbessa = () => {
    if (!ctx || ctx.phase !== Phase.PLAY) return
    const want = correctLane(ctx)
    setHintLane(want)
    playForm(formOf(ctx.lanes[want]?.cars[0]?.key), soundOn)
    after(1600, () => setHintLane(-1))
  }

  const finishShift = (finalCtx) => {
    const totals = saveTrafficRun({ score: finalCtx.score, cleared: finalCtx.cleared, perfect: finalCtx.perfect })
    setBest(totals.best)
    setDay((d) => recordShift(d, finalCtx))
    setStage('shift')
  }

  const afterShift = () => {
    if (day.done) { setStage('final'); return }
    setStage('pass')
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

  /* ── who is playing ── */
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

  /* ── pass the phone ── */
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
          <Chunk onClick={() => startShift(day)}>{t('trReady', 'I am ready')}</Chunk>
        </main>
      </div>
    )
  }

  /* ── shift summary ── */
  if (stage === 'shift' && ctx) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
        <Header title={t('trTitle', 'Fidel Traffic')} onBack={onBack} />
        <main className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <Sprite2D draw={drawAnbessa} size={112} mood="happy" pose="cheer" />
          <h2 className="text-2xl font-black">{t('trShiftDone', 'Shift complete!')}</h2>
          <p className="text-4xl font-black" style={{ color: 'var(--go)' }}>{ctx.score}</p>
          <p className="text-sm font-black" style={{ color: 'var(--muted)' }}>
            {t('trStreakBest', 'Longest streak')}: {ctx.bestCombo}
          </p>
          {ctx.perfect && (
            <p className="rounded-full px-4 py-1.5 text-sm font-black" style={{ background: 'var(--go-soft)', color: 'var(--go-ink)' }}>
              {t('trPerfect', 'Perfect shift - no mix-ups!')}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Chunk onClick={afterShift}>
              {day.done ? t('trSeeResults', 'See the results') : t('trNextOfficer', 'Next officer')}
            </Chunk>
            <Chunk tone="card" onClick={onBack}>{t('orderDone', 'Done')}</Chunk>
          </div>
        </main>
      </div>
    )
  }

  /* ── the podium ── */
  if (stage === 'final') {
    const table = standings(day)
    const solo = day.players.length === 1
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
        <Header title={t('trTitle', 'Fidel Traffic')} onBack={onBack} />
        <main className="flex flex-1 flex-col items-center justify-center gap-5">
          <Sprite2D draw={drawAnbessa} size={104} mood="happy" pose="cheer" />
          <h2 className="text-xl font-black">{solo ? t('trWin', 'The city is flowing!') : t('trStandings', 'Traffic officers')}</h2>
          <ul className="w-full max-w-xs space-y-2">
            {table.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: i === 0 ? 'var(--go-soft)' : 'var(--card)', border: `2px solid ${i === 0 ? 'var(--go)' : 'var(--line)'}` }}>
                {i === 0
                  ? <Trophy className="h-5 w-5 shrink-0" aria-hidden="true" style={{ color: 'var(--accent)' }} />
                  : <span className="w-5 shrink-0 text-center text-sm font-black" style={{ color: 'var(--muted)' }}>{i + 1}</span>}
                <span className="flex-1 truncate font-black">{t('trOfficerN', 'Officer {n}', { n: p.id + 1 })}</span>
                {p.perfect > 0 && <span className="text-xs font-black" style={{ color: 'var(--go-ink)' }}>{t('trPerfectShort', 'perfect')}</span>}
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

      {/* HUD: which intersection, and the streak */}
      <div className="mt-1 flex items-center justify-center gap-3">
        <div className="flex gap-1.5" role="img" aria-label={t('trProgress', 'Intersection {a} of {b}', { a: ctx.index + 1, b: ctx.target })}>
          {Array.from({ length: ctx.target }).map((_, i) => (
            <span key={i} className="block h-2 w-6 rounded-full"
              style={{ background: i < ctx.cleared ? 'var(--go)' : i === ctx.index ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>
        {ctx.combo >= 2 && (
          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black"
            style={{ background: 'var(--go-soft)', color: 'var(--go-ink)' }}>
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />{ctx.combo}
          </span>
        )}
      </div>

      <p className="mt-2 text-center text-sm font-bold" style={{ color: 'var(--muted)' }}>
        {t('trHow', 'Wave through the letter that comes first')}
      </p>

      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="relative" style={{ width: BOX, height: BOX, maxWidth: '100%' }}>
          {/* the roads */}
          <div className="absolute rounded-3xl" style={{ inset: 0, background: 'var(--card)', border: '2px solid var(--line)' }} />
          <div className="absolute" style={{ left: MID - JUNCTION, top: 8, width: JUNCTION * 2, bottom: 8, background: 'var(--paper)' }} />
          <div className="absolute" style={{ top: MID - JUNCTION, left: 8, height: JUNCTION * 2, right: 8, background: 'var(--paper)' }} />
          {/* lane dashes */}
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
          {/* the junction box + Anbessa on duty */}
          <div className="absolute grid place-items-center rounded-2xl"
            style={{ left: MID - JUNCTION, top: MID - JUNCTION, width: JUNCTION * 2, height: JUNCTION * 2, background: 'var(--card)', border: '2px dashed var(--line)' }}>
            <Sprite2D draw={drawAnbessa} size={62} mood="happy" pose="stand" />
          </div>

          {/* cars at the stop */}
          {ctx.lanes.map((lane, li) => lane.cars.map((car, slot) => {
            const c = slotCentre(lane.dir, slot)
            const isFront = slot === 0
            const hidden = leaving && leaving.id === car.id
            return (
              <motion.div
                key={car.id}
                className="absolute"
                style={{ left: c.x, top: c.y, opacity: hidden ? 0 : 1 }}
                animate={buzz === li && isFront && !reduce ? { x: [0, -5, 5, -4, 0] } : { x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Car
                  car={car}
                  angle={ANGLE[lane.dir]}
                  glowing={hintLane === li && isFront}
                  disabled={!isFront || !!leaving}
                  onClick={() => release(li)}
                />
              </motion.div>
            )
          }))}

          {/* the released car driving across and away */}
          <AnimatePresence>
            {leaving && (() => {
              const from = slotCentre(leaving.dir, 0)
              const to = exitCentre(leaving.dir)
              return (
                <motion.div
                  key={`go-${leaving.id}`}
                  className="absolute"
                  initial={{ left: from.x, top: from.y, opacity: 1 }}
                  animate={{ left: to.x, top: to.y, opacity: 0.15 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.36, ease: 'easeIn' }}
                  style={{ pointerEvents: 'none' }}
                >
                  <Car car={leaving} angle={ANGLE[leaving.dir]} disabled />
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={askAnbessa}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black ${FOCUS}`}
          style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', color: 'var(--muted)' }}
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          {t('trHint', 'Ask Anbessa')}
        </button>
      </main>
    </div>
  )
}
