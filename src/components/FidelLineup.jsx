/* ============================================================================
   LINE UP — the drag renderer
   ----------------------------------------------------------------------------
   Thin shell over the pure lineupCore. A family's seven forms lie scattered
   as loose cards; the child DRAGS each into its numbered home slot. framer's
   `dragSnapToOrigin` springs a card straight back to where it lay on a wrong
   drop, so "if it's wrong you get back to where it was" is free. A correct
   drop unmounts the scattered card and re-renders it locked in its slot.

   Slot hit-testing is done at drop time against the live slot rects, so it
   holds up on any viewport. Board is voiced (picking a card speaks its form)
   but never depends on audio. Fill all seven -> Anbessa cheers.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { sayPrompt } from '../platform/prompts'
import { t } from '../platform/i18n'
import { Sprite2D, drawAnbessa, drawKokeb, FOCUS } from '../FidelQuestApp'
import { FidelCard, GEEZ_DIGITS } from './FidelCard'
import { initLineup, lineupTransition, Phase, LineupEvent } from '../lineupCore'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''

// Seven dispersed anchor points (percent of the scatter area) - a loose,
// tossed-on-the-table look that never overlaps. Cards keep their anchor for
// the whole round so placed neighbours leaving never reshuffles the rest.
const ANCHORS = [
  { x: 4, y: 2 }, { x: 40, y: 0 }, { x: 74, y: 4 },
  { x: 19, y: 34 }, { x: 56, y: 33 },
  { x: 6, y: 65 }, { x: 44, y: 66 },
]
const TILTS = [-7, 5, -4, 7, -6, 4, -3]

export default function FidelLineup({ soundOn, onBack, families = [] }) {
  const pool = families.length ? families : ['ha']
  const startRef = useRef(Math.floor(Math.random() * pool.length)) // cosmetic pick
  const [round, setRound] = useState(0)
  const family = pool[(startRef.current + round) % pool.length]
  const [ctx, setCtx] = useState(() => initLineup(family, (round + 1) * 89 + startRef.current))
  const reduce = useReducedMotion()
  const slotRefs = useRef([])

  // A stable scatter position per card key, fixed for the round. The nth card
  // in the freshly-shuffled tray takes the nth anchor.
  const homeByKey = useMemo(() => {
    const m = new Map()
    ctx.tray.forEach((k, i) => m.set(k, { ...ANCHORS[i % ANCHORS.length], tilt: TILTS[i % TILTS.length] }))
    return m
    // recompute only when a new round deals a new tray
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  useEffect(() => {
    setCtx(initLineup(family, (round + 1) * 89 + startRef.current))
    sayPrompt('lineupFind', soundOn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const won = ctx.phase === Phase.WIN

  const onPickUp = (key) => playForm(formOf(key), soundOn)

  const onDrop = (key, event, info) => {
    const px = (event && typeof event.clientX === 'number') ? event.clientX : info.point.x
    const py = (event && typeof event.clientY === 'number') ? event.clientY : info.point.y
    // Which slot (if any) did the card land over?
    let target = -1
    slotRefs.current.forEach((el, i) => {
      if (!el || ctx.slots[i] != null) return
      const r = el.getBoundingClientRect()
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) target = i
    })
    if (target < 0) return // dropped on nothing -> snaps back
    recordAnswer(ctx.order[target], key, 'lineup')
    const r = lineupTransition(ctx, { type: LineupEvent.PLACE, payload: { key, slot: target } })
    if (r.accepted) {
      playForm(formOf(key), soundOn)
      setCtx(r.next)
      if (r.next.phase === Phase.WIN) setTimeout(() => playEffect('win', soundOn), 200)
    } else {
      // wrong home: gentle miss + re-chant so the child hears it again
      playEffect('bad', soundOn)
      setTimeout(() => playForm(formOf(key), soundOn), 300)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--focus)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-lg font-black">{t('lineupTitle', 'Line them up!')}</h1>
        <div className="w-11" />
      </header>

      <main className="flex flex-1 flex-col items-center gap-4 pt-2">
        <Sprite2D draw={won ? drawAnbessa : drawKokeb} size={won ? 92 : 64} mood="happy" pose={won ? 'cheer' : 'stand'} />

        {/* the seven home slots: empty ones show the Arabic + Ge'ez numeral,
           filled ones show the landed card as a gold tile */}
        <div className="flex items-end justify-center gap-1" aria-hidden="true">
          {ctx.slots.map((k, i) => (
            <div
              key={i}
              ref={(el) => { slotRefs.current[i] = el }}
              className="flex items-center justify-center"
              style={{ width: 44, height: 62 }}
            >
              {k ? (
                <FidelCard glyph={glyphOf(k)} size={40} done />
              ) : (
                <div
                  className="flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed"
                  style={{ borderColor: 'var(--line)', background: 'var(--paper)' }}
                >
                  <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, color: 'var(--muted)' }}>{i + 1}</span>
                  <span className="geez" style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.15, color: 'var(--accent)' }}>{GEEZ_DIGITS[i]}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {!won ? (
          /* the scattered cards */
          <div className="relative w-full" style={{ height: 330, maxWidth: 340, touchAction: 'none' }}>
            {ctx.tray.map((key) => {
              const home = homeByKey.get(key) || { x: 40, y: 40, tilt: 0 }
              return (
                <motion.button
                  key={key}
                  type="button"
                  drag
                  dragSnapToOrigin
                  dragMomentum={false}
                  whileDrag={{ scale: 1.12, zIndex: 30, rotate: 0 }}
                  onPointerDown={() => onPickUp(key)}
                  onDragEnd={(e, info) => onDrop(key, e, info)}
                  aria-label={glyphOf(key)}
                  className={`absolute rounded-2xl ${FOCUS}`}
                  style={{
                    left: `${home.x}%`, top: `${home.y}%`,
                    rotate: reduce ? 0 : `${home.tilt}deg`,
                    background: 'transparent', border: 'none', padding: 0,
                    cursor: 'grab', touchAction: 'none',
                  }}
                >
                  <FidelCard glyph={glyphOf(key)} size={62} />
                </motion.button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="text-center text-base font-black" style={{ color: 'var(--muted)' }}>{t('lineupWin', 'Perfect order!')}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRound((r) => r + 1)} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
                {t('orderAgain', 'Another one!')}
              </button>
              <button type="button" onClick={onBack} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
                {t('orderDone', 'Done')}
              </button>
            </div>
          </div>
        )}
        {!won && (
          <p className="px-4 text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>
            {t('lineupHint', 'Drag each letter to its number.')}
          </p>
        )}
      </main>
    </div>
  )
}
