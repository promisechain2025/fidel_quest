/* ============================================================================
   LINE UP — the place-the-seven-forms renderer
   ----------------------------------------------------------------------------
   Thin shell over the pure lineupCore. A family's seven forms lie scattered
   as loose cards; each belongs in one numbered home slot.

   TWO ways to place, because drag-only was the wrong ask of a four-year-old:

     TAP   pick a card (it lifts and speaks), then tap a number. This is the
           primary path - the child's two taps say exactly what a drag says
           ("this letter" / "this place") with none of the aiming.
     DRAG  still works for anyone who prefers it, with slack: the drop point
           only has to land NEAR a slot (SLOT_SLACK), and the nearest empty
           slot inside that margin wins. framer's `dragSnapToOrigin` springs
           a card back to where it lay on a miss.

   Note the game is NOT "tap the right card" - every card is right somewhere.
   The answer is the PLACE, so tapping a card can never auto-place it.

   Voicing is once per interaction: picking a card speaks its form, and the
   drop answers with a chime, not a second reading of the same letter (two
   voices back to back read as a correction even when the child was right).
   Fill all seven -> Anbessa cheers.
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

// How far outside a slot a drop still counts (px). A slot is 44x62, so this
// roughly doubles its catching area without letting a drop reach past its
// neighbour's centre.
const SLOT_SLACK = 22

export default function FidelLineup({ soundOn, onBack, families = [] }) {
  const pool = families.length ? families : ['ha']
  const startRef = useRef(Math.floor(Math.random() * pool.length)) // cosmetic pick
  const [round, setRound] = useState(0)
  const family = pool[(startRef.current + round) % pool.length]
  const [ctx, setCtx] = useState(() => initLineup(family, (round + 1) * 89 + startRef.current))
  // The card in hand. Set by a tap OR by starting a drag - both mean "this
  // letter" - and cleared once it lands somewhere.
  const [held, setHeld] = useState(null)
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
    setHeld(null)
    sayPrompt('lineupFind', soundOn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const won = ctx.phase === Phase.WIN

  const pickUp = (key) => {
    setHeld(key)
    playForm(formOf(key), soundOn) // the ONE voice of this interaction
  }

  const place = (key, slot) => {
    if (!key || slot < 0 || ctx.slots[slot] != null) return
    recordAnswer(ctx.order[slot], key, 'lineup')
    const r = lineupTransition(ctx, { type: LineupEvent.PLACE, payload: { key, slot } })
    if (r.accepted) {
      setHeld(null)
      playEffect('good', soundOn)
      setCtx(r.next)
      if (r.next.phase === Phase.WIN) setTimeout(() => playEffect('win', soundOn), 200)
    } else {
      // Wrong home. Keep the card in hand so the next try is one tap, and do
      // not re-read the letter - the child just heard it, and a second
      // reading right after a buzz sounds like the letter was the mistake.
      playEffect('bad', soundOn)
    }
  }

  /** The empty slot a point lands on or near, or -1. Ties go to the nearest
      centre, so overlapping slack never picks the wrong neighbour. */
  const slotAt = (px, py) => {
    let best = -1
    let bestDist = Infinity
    slotRefs.current.forEach((el, i) => {
      if (!el || ctx.slots[i] != null) return
      const r = el.getBoundingClientRect()
      if (px < r.left - SLOT_SLACK || px > r.right + SLOT_SLACK) return
      if (py < r.top - SLOT_SLACK || py > r.bottom + SLOT_SLACK) return
      const d = Math.hypot(px - (r.left + r.right) / 2, py - (r.top + r.bottom) / 2)
      if (d < bestDist) { bestDist = d; best = i }
    })
    return best
  }

  const onDrop = (key, event, info) => {
    const px = (event && typeof event.clientX === 'number') ? event.clientX : info.point.x
    const py = (event && typeof event.clientY === 'number') ? event.clientY : info.point.y
    const target = slotAt(px, py)
    if (target < 0) return // dropped on nothing -> snaps back, still in hand
    place(key, target)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-lg font-black">{t('lineupTitle', 'Line them up!')}</h1>
        <div className="w-11" />
      </header>

      <main className="flex flex-1 flex-col items-center gap-4 pt-2">
        <Sprite2D draw={won ? drawAnbessa : drawKokeb} size={won ? 92 : 64} mood="happy" pose={won ? 'cheer' : 'stand'} />

        {/* The seven home slots: empty ones show the Arabic + Ge'ez numeral
           and TAKE A TAP once a card is in hand; filled ones show the landed
           card as a gold tile. */}
        <div className="flex items-end justify-center gap-1" role="group" aria-label={t('lineupSlots', 'The seven places')}>
          {ctx.slots.map((k, i) => (
            <div
              key={i}
              ref={(el) => { slotRefs.current[i] = el }}
              className="flex items-center justify-center"
              style={{ width: 44, height: 62 }}
            >
              {k ? (
                <div role="img" aria-label={t('lineupSlotFilled', 'Place {n}: {g}', { n: i + 1, g: glyphOf(k) })}>
                  <FidelCard glyph={glyphOf(k)} size={40} done />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => place(held, i)}
                  disabled={!held}
                  aria-label={t('lineupSlotEmpty', 'Put the letter in place {n}', { n: i + 1 })}
                  className={`flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed ${FOCUS}`}
                  style={{
                    borderColor: held ? 'var(--go)' : 'var(--line)',
                    background: held ? 'var(--go-soft)' : 'var(--paper)',
                    cursor: held ? 'pointer' : 'default',
                    outlineColor: 'var(--sky)',
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, color: held ? 'var(--go-ink)' : 'var(--muted)' }}>{i + 1}</span>
                  <span className="geez" style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.15, color: 'var(--accent)' }}>{GEEZ_DIGITS[i]}</span>
                </button>
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
                  onPointerDown={() => pickUp(key)}
                  onDragEnd={(e, info) => onDrop(key, e, info)}
                  aria-label={t('lineupCard', 'Letter {g}', { g: glyphOf(key) })}
                  aria-pressed={held === key}
                  className={`absolute rounded-2xl ${FOCUS}`}
                  style={{
                    left: `${home.x}%`, top: `${home.y}%`,
                    rotate: reduce || held === key ? 0 : `${home.tilt}deg`,
                    zIndex: held === key ? 20 : 1,
                    scale: held === key && !reduce ? 1.1 : 1,
                    // A held card wears the same green as the waiting slots,
                    // so "this letter is going somewhere" reads at a glance.
                    boxShadow: held === key ? '0 0 0 4px var(--go)' : 'none',
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
            {held
              ? t('lineupHintPlace', 'Now tap the number it belongs to.')
              : t('lineupHintPick', 'Tap a letter, then tap its number.')}
          </p>
        )}
      </main>
    </div>
  )
}
