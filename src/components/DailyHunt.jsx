/* Daily Letter Hunt — the Akukulu-style daily comeback game. Jibby has hidden
   today's letters around a meadow; Kokeb calls a sound and the child taps the
   letter that says it. One seeded hunt per calendar day; finishing it opens
   the daily gift treasure (wired by the app shell). Pure machine lives in
   platform/hunt.js; this file is only the scene. */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Volume2, Gift, Star } from 'lucide-react'
import { t, randomPraise, randomEncourage } from '../platform/i18n'
import { playForm, playEffect } from '../platform/audioEngine'
import { recordAnswer } from '../platform/telemetry'
import { buildHunt, huntTransition, huntTarget } from '../platform/hunt'
import { drawAnbessa, drawHyena, Sprite2D } from '../FidelQuestApp'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

/* The six hiding places: position (percent of the scene) plus a cover shape
   drawn with plain CSS blobs, so the meadow needs no image assets. */
const SPOTS = [
  { left: 14, top: 26, cover: 'cloud' },
  { left: 66, top: 20, cover: 'tree' },
  { left: 30, top: 52, cover: 'bush' },
  { left: 76, top: 56, cover: 'rock' },
  { left: 12, top: 74, cover: 'grass' },
  { left: 56, top: 78, cover: 'bush' },
]

const FRUIT_TONES = ['#ff7a59', '#ffc24b', '#8ed069', '#5db7ff', '#e6459a']

function Cover({ kind }) {
  if (kind === 'cloud') {
    return (
      <div className="relative h-10 w-20" aria-hidden="true">
        <span className="absolute bottom-0 left-0 h-8 w-9 rounded-full bg-white/95" />
        <span className="absolute bottom-0 left-5 h-10 w-11 rounded-full bg-white/95" />
        <span className="absolute bottom-0 right-0 h-7 w-8 rounded-full bg-white/95" />
      </div>
    )
  }
  if (kind === 'tree') {
    return (
      <div className="relative flex h-16 w-16 flex-col items-center" aria-hidden="true">
        <span className="h-11 w-14 rounded-full" style={{ background: '#4f9a44' }} />
        <span className="-mt-1 h-6 w-3 rounded-b-md" style={{ background: '#7a4a26' }} />
      </div>
    )
  }
  if (kind === 'rock') {
    return <div className="h-9 w-14 rounded-t-full rounded-b-xl" style={{ background: '#a9a4ad', boxShadow: 'inset -6px -4px 0 #8d8894' }} aria-hidden="true" />
  }
  if (kind === 'grass') {
    return (
      <div className="flex h-8 items-end gap-0.5" aria-hidden="true">
        {[10, 16, 12, 18, 11].map((h, i) => (
          <span key={i} className="w-1.5 rounded-t-full" style={{ height: h * 1.6, background: i % 2 ? '#5faa52' : '#4c9944' }} />
        ))}
      </div>
    )
  }
  // bush
  return (
    <div className="relative h-10 w-20" aria-hidden="true">
      <span className="absolute bottom-0 left-0 h-8 w-9 rounded-full" style={{ background: '#57a24b' }} />
      <span className="absolute bottom-0 left-6 h-10 w-10 rounded-full" style={{ background: '#4c9944' }} />
      <span className="absolute bottom-0 right-0 h-7 w-8 rounded-full" style={{ background: '#5faa52' }} />
    </div>
  )
}

/* Character sprites use the shared Sprite2D (same renderer as every other
   screen), so art fixes reach the hunt too. */

/* Holiday dressing for the meadow (from the Ethiopian calendar): adey abeba
   daisies for Enkutatash/Meskel, stars for Genna, water drops for Timkat,
   little pennants for the national days. Pure decoration, never interactive. */
const DRESS_SPOTS = [[8, 62], [24, 88], [46, 66], [64, 90], [84, 70], [92, 52], [36, 78], [72, 60]]
function Dressing({ kind }) {
  if (!kind) return null
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {DRESS_SPOTS.map(([x, y], i) => (
        <span key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
          {kind === 'flowers' && (
            <span className="relative block h-4 w-4">
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <span key={a} className="absolute left-1/2 top-1/2 h-2 w-1 rounded-full" style={{ background: '#ffd34d', transform: `translate(-50%,-100%) rotate(${a}deg)`, transformOrigin: '50% 100%' }} />
              ))}
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: '#b4560a' }} />
            </span>
          )}
          {kind === 'stars' && <span className="block text-base" style={{ color: '#ffd34d', textShadow: '0 0 6px rgba(255,211,77,0.8)' }}>✦</span>}
          {kind === 'drops' && <span className="block h-2.5 w-2 rounded-b-full rounded-t-[80%]" style={{ background: '#5db7ff', opacity: 0.85 }} />}
          {kind === 'flags' && <span className="block h-3 w-4" style={{ background: `linear-gradient(#1aa15a 33%, #ffd34d 33% 66%, #e6304f 66%)`, borderRadius: 2 }} />}
        </span>
      ))}
    </div>
  )
}

export default function DailyHunt({ seed, forms, soundOn = true, treasureReady = false, dress = null, onTreasure, onDone, onBack }) {
  const [ctx, setCtx] = useState(() => buildHunt(seed, forms))
  const [feedback, setFeedback] = useState(null) // 'good' | 'bad'
  const feedbackTimer = useRef(null)
  const revoiceTimer = useRef(null)
  useEffect(() => () => { clearTimeout(feedbackTimer.current); clearTimeout(revoiceTimer.current) }, [])
  const doneRef = useRef(false)
  const target = huntTarget(ctx)
  const targetForm = ctx.hidden.find((f) => f.audioKey === target) || null
  const done = ctx.status === 'done'

  // Kokeb calls each new target (and the first one after a beat).
  useEffect(() => {
    if (!targetForm) return undefined
    const timer = setTimeout(() => playForm(targetForm, soundOn), 550)
    return () => clearTimeout(timer)
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (done && !doneRef.current) {
      doneRef.current = true
      playEffect('win', soundOn)
      onDone?.(ctx)
    }
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (key) => {
    const heard = huntTarget(ctx)
    const { next, accepted } = huntTransition(ctx, { type: 'TAP', key })
    if (!accepted) return
    const good = next.found.length > ctx.found.length
    if (heard) recordAnswer(heard, key, 'hunt')
    clearTimeout(revoiceTimer.current)
    if (good) {
      // Just the happy chime - the kid already knows the letter they found,
      // and Kokeb calls the next one right after.
      playEffect('good', soundOn)
    } else {
      // Miss sound first, then Kokeb repeats the letter she is asking for.
      playEffect('bad', soundOn)
      const f = ctx.hidden.find((x) => x.audioKey === heard)
      if (f) revoiceTimer.current = setTimeout(() => playForm(f, soundOn), 650)
    }
    setFeedback(good ? 'good' : 'bad')
    clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 900)
    setCtx(next)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-8 pt-4">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-black leading-tight">{t('huntTitle', 'Daily Letter Hunt')}</h1>
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('huntSub', 'Jibby hid the letters! Find them by sound')}</p>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1 rounded-2xl px-3 py-1.5 font-black" style={{ background: 'var(--card)', border: '2px solid var(--line)' }}>
          <Star className="h-4 w-4" fill="currentColor" style={{ color: 'var(--star)' }} aria-hidden="true" />
          <span className="mono text-sm">{ctx.found.length}/{ctx.order.length}</span>
        </span>
      </header>

      {/* The meadow */}
      <div className="relative mt-4 w-full overflow-hidden rounded-3xl border-2" style={{ aspectRatio: '4 / 5', borderColor: 'var(--line)', background: 'linear-gradient(#bfe3ff 0%, #d8efff 46%, #8fc86a 46%, #7ab857 100%)' }}>
        {/* sun */}
        <span className="absolute right-5 top-4 h-10 w-10 rounded-full" style={{ background: '#ffd34d', boxShadow: '0 0 24px 6px rgba(255,211,77,0.55)' }} aria-hidden="true" />
        <Dressing kind={dress} />
        {/* Jibby peeks from the corner, cheekier while a letter is ducking */}
        <motion.div className="absolute -right-2 bottom-1" animate={feedback === 'bad' ? { y: [8, -4, 8] } : { y: 8 }} transition={{ duration: 0.7 }} aria-hidden="true">
          <Sprite2D draw={drawHyena} size={72} mood={feedback === 'bad' ? 'agitated' : 'grin'} />
        </motion.div>

        {ctx.hidden.map((f, i) => {
          const spot = SPOTS[f.spot]
          const isFound = ctx.found.includes(f.audioKey)
          const ducking = feedback === 'bad' && ctx.lastWrong === f.audioKey
          return (
            <div key={f.audioKey} className="absolute flex flex-col items-center" style={{ left: `${spot.left}%`, top: `${spot.top}%` }}>
              <motion.button
                type="button"
                disabled={isFound || done}
                onClick={() => tap(f.audioKey)}
                aria-label={isFound ? `${f.sound}, ${t('huntFoundOne', 'found')}` : `${t('huntHidden', 'hiding letter')} ${f.sound}`}
                animate={isFound ? { y: -14, scale: 1.12 } : ducking ? { y: [0, 16, 6], x: [0, -5, 5, 0] } : { y: 6 }}
                transition={{ type: 'spring', stiffness: 240, damping: 15 }}
                className={`geez relative z-0 flex h-14 w-14 items-center justify-center rounded-full text-3xl font-black ${FOCUS}`}
                style={{
                  background: FRUIT_TONES[i % FRUIT_TONES.length],
                  color: '#3c2a10',
                  border: '3px solid rgba(0,0,0,0.12)',
                  boxShadow: isFound ? '0 0 0 4px var(--star)' : '0 4px 0 rgba(0,0,0,0.15)',
                  outlineColor: 'var(--sky)',
                }}
              >
                {f.char}
                {isFound && <Star className="absolute -right-2 -top-2 h-5 w-5" fill="currentColor" style={{ color: 'var(--star)' }} aria-hidden="true" />}
              </motion.button>
              {/* the cover sits in front so the letter peeks from behind it;
                 pointer-events-none so tapping the bush still taps the letter
                 (little fingers get the whole mound as the hit target) */}
              <div className="pointer-events-none z-10 -mt-3">
                <Cover kind={spot.cover} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Call bar / completion */}
      {!done ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <p className="text-base font-extrabold">{t('huntFind', 'Find the letter that says')}</p>
          <button
            type="button"
            onClick={() => targetForm && playForm(targetForm, soundOn)}
            aria-label={t('huntListen', 'Hear the sound again')}
            className={`chunk flex items-center gap-2 rounded-2xl px-4 py-2.5 font-black text-white ${FOCUS}`}
            style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep)', '--chunk-depth': '4px', outlineColor: 'var(--accent)' }}
          >
            <Volume2 className="h-5 w-5" aria-hidden="true" />
            <span className="mono">“{targetForm?.sound}”</span>
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-col items-center gap-3 text-center">
          <Sprite2D draw={drawAnbessa} size={96} mood="happy" />
          <h2 className="text-2xl font-black">{t('huntDoneTitle', 'You found them all!')}</h2>
          {treasureReady ? (
            <motion.button
              type="button"
              onClick={onTreasure}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className={`chunk flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-white ${FOCUS}`}
              style={{ background: 'var(--accent)', boxShadow: '0 4px 0 var(--accent-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}
            >
              <Gift className="h-5 w-5" aria-hidden="true" /> {t('huntTreasure', 'Open the treasure')}
            </motion.button>
          ) : (
            <button type="button" onClick={onBack} className={`chunk rounded-2xl px-6 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
              {t('continue', 'Continue')}
            </button>
          )}
          <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('huntTomorrow', 'Come back tomorrow — Jibby will hide new letters!')}</p>
        </motion.div>
      )}

      {/* praise / encourage toast */}
      <AnimatePresence>
        {feedback && !done && (
          <motion.p
            key={feedback + ctx.found.length + ctx.wrong}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-center text-lg font-black"
            style={{ color: feedback === 'good' ? 'var(--go-ink)' : 'var(--bad-ink)' }}
            aria-live="polite"
          >
            {feedback === 'good' ? randomPraise() : randomEncourage()}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
