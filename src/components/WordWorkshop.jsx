/* ============================================================================
   WORD WORKSHOP — the renderer
   ----------------------------------------------------------------------------
   The reading-bridge game. Anbessa shows a picture (and says the word); the
   child builds the word by tapping its letters in order onto the bench. Each
   correct letter snaps into the next slot and is spoken; a wrong tap gently
   re-cues the needed letter. Build the whole word -> Anbessa cheers and the
   word + its meaning are revealed.

   Thin shell over the pure workshopCore; letter cards reuse FidelCard so it
   sits in the same deck as Order / Line Up / Match.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, Volume2 } from 'lucide-react'
import { playForm, playEffect, audio } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { Sprite2D, drawAnbessa, drawKokeb, FOCUS, ALL_WORDS } from '../FidelQuestApp'
import WordPicture, { DRAWN_PICTURES } from './Pictures'
import { FidelCard } from './FidelCard'
import { initWorkshop, workshopTransition, wordToKeys, Phase, WorkshopEvent } from '../workshopCore'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''

// Short words that have an owned drawn picture and are fully spelled from real
// forms, so the cue is a real illustration (never a bare emoji).
const BUILDABLE = ALL_WORDS.filter((w) => {
  const chars = Array.from(w.geez)
  return DRAWN_PICTURES.includes(w.picture) && chars.length >= 2 && chars.length <= 4 && wordToKeys(w.geez).length === chars.length
})

// The family ids a word is spelled from (used to gate by learned letters).
const wordFamilies = (w) => Array.from(w.geez).map((ch) => INDEXES.byChar.get(ch)?.familyId)
// Distractor tray letters, drawn from the SAME learned pool so a wrong choice
// is always a letter the child could plausibly know (never a random unknown).
const learnedKeys = (famSet) => ALL_WORDS.length && famSet.size
  ? [...new Set(BUILDABLE.flatMap((w) => wordToKeys(w.geez)).filter((k) => famSet.has(INDEXES.byAudioKey.get(k)?.familyId)))]
  : null

export default function WordWorkshop({ soundOn, onBack, families = [] }) {
  const famSet = useMemo(() => new Set(families), [families])
  // Only words the child can actually read: every letter from a learned
  // family. Falls back to the full buildable set for a brand-new player.
  const pool = useMemo(() => {
    const scoped = famSet.size ? BUILDABLE.filter((w) => wordFamilies(w).every((f) => famSet.has(f))) : []
    return scoped.length ? scoped : (BUILDABLE.length ? BUILDABLE : ALL_WORDS)
  }, [famSet])
  const distractPool = useMemo(() => learnedKeys(famSet), [famSet])
  const startRef = useRef(Math.floor(Math.random() * 997))
  const [round, setRound] = useState(0)
  const word = pool[(startRef.current + round) % pool.length]
  // Difficulty ramps with each word cleared this session: 2 -> 5 distractors.
  const distractors = Math.min(5, 2 + Math.floor(round / 2))
  const [ctx, setCtx] = useState(() => initWorkshop(word, (round + 1) * 101 + startRef.current, distractPool, distractors))
  const reduce = useReducedMotion()

  const sayWord = () => audio.play(`words/${word.latin}`, { enabled: soundOn, chime: { familyIndex: word.familyIndex || 0, order: 1 } })

  useEffect(() => {
    setCtx(initWorkshop(word, (round + 1) * 101 + startRef.current, distractPool, distractors))
    const id = setTimeout(sayWord, 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const won = ctx.phase === Phase.WIN
  // remaining tray letters (drop one instance as each is placed, in order)
  const remaining = useMemo(() => {
    const used = ctx.target.slice(0, ctx.placed)
    const out = []
    const counts = {}
    used.forEach((k) => { counts[k] = (counts[k] || 0) + 1 })
    for (const k of ctx.tray) {
      if (counts[k] > 0) counts[k] -= 1
      else out.push(k)
    }
    return out
  }, [ctx.tray, ctx.target, ctx.placed])

  const tapCard = (key) => {
    if (won) return
    const want = ctx.target[ctx.placed]
    recordAnswer(want, key, 'workshop')
    const r = workshopTransition(ctx, { type: WorkshopEvent.TAP, payload: { key } })
    if (r.accepted) {
      playForm(formOf(key), soundOn)
      setCtx(r.next)
      if (r.next.phase === Phase.WIN) setTimeout(() => { playEffect('win', soundOn); sayWord() }, 260)
    } else {
      playEffect('bad', soundOn)
      setTimeout(() => playForm(formOf(want), soundOn), 260)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-lg font-black">{t('workshopTitle', 'Build the word!')}</h1>
        <div className="w-11" />
      </header>

      <main className="flex flex-1 flex-col items-center gap-5 pt-2">
        <Sprite2D draw={won ? drawAnbessa : drawKokeb} size={won ? 92 : 60} mood="happy" pose={won ? 'cheer' : 'stand'} />

        {/* the picture cue - what word are we building? tap to hear it */}
        <button
          type="button"
          onClick={sayWord}
          aria-label={t('workshopSay', 'Say the word')}
          className={`flex flex-col items-center gap-1 rounded-3xl px-5 py-3 ${FOCUS}`}
          style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}
        >
          <div className="flex items-center gap-2">
            <WordPicture emoji={word.picture} size={72} />
            <Volume2 className="h-5 w-5" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>
        </button>

        {/* the word being built: one slot per letter, filled left to right */}
        <div className="flex items-center justify-center gap-1.5">
          {ctx.target.map((k, i) => {
            const filled = i < ctx.placed
            const current = i === ctx.placed && !won
            return filled ? (
              <FidelCard key={i} glyph={glyphOf(k)} size={46} done />
            ) : (
              <div
                key={i}
                className="rounded-xl border-2 border-dashed"
                style={{ width: 46, height: 64, background: 'var(--paper)', borderColor: current ? 'var(--go)' : 'var(--line)', boxShadow: current ? '0 0 0 3px var(--go-soft)' : 'none' }}
              />
            )
          })}
        </div>

        {won ? (
          <div className="flex flex-col items-center gap-3">
            <p className="geez text-3xl font-black" style={{ color: 'var(--ink)' }}>{word.geez}</p>
            <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{word.latin}{word.meaning ? ` - ${word.meaning}` : ''}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRound((r) => r + 1)} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
                {t('workshopNext', 'Next word!')}
              </button>
              <button type="button" onClick={onBack} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
                {t('orderDone', 'Done')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2.5 px-2">
            {remaining.map((k, idx) => (
              <motion.button
                key={`${k}-${idx}`}
                type="button"
                onClick={() => tapCard(k)}
                whileTap={reduce ? undefined : { scale: 0.92 }}
                aria-label={glyphOf(k)}
                className={`rounded-2xl ${FOCUS}`}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <FidelCard glyph={glyphOf(k)} size={54} />
              </motion.button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
