/* The "New words!" moment: runs right after a letter family is mastered,
   over the words that family just unlocked. Build it (tap the letters in
   order - every tap speaks its letter), Say it (echo window, no mic),
   Prove it (read the word -> pick the picture, or rebuild from scratch).
   The machine is pure (platform/wordSteps); this file is presentation.
   Words without a recording still work fully - the letters carry the
   sound and the whole-word voice simply joins when it is recorded. */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, Volume2 } from 'lucide-react'
import { WordPhase, wordStepsTransition } from '../platform/wordSteps'
import { playForm, playEffect, audio } from '../platform/audioEngine'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { Hero, INDEXES, wordStepsStart } from '../FidelQuestApp'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOfChar = (ch) => INDEXES.byChar.get(ch)

const voiceWord = (word, soundOn) => {
  if (!word || word.noAudio) return
  const familyIndex = formOfChar(Array.from(word.geez)[0])?.familyIndex ?? 0
  audio.play(`words/${word.latin}`, { enabled: soundOn, chime: { familyIndex, order: 1 } })
}

/** The build surface shared by BUILD and the rebuild PROVE round: filled
    slots, then the shuffled tray. Every correct tap voices its letter. */
function BuildBoard({ word, ctx, onTile }) {
  const chars = Array.from(word.geez)
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-1.5" aria-hidden="true">
        {chars.map((ch, i) => (
          <span
            key={i}
            className={`geez flex h-14 w-12 items-center justify-center rounded-xl text-3xl font-black ${i < ctx.slot ? '' : 'border-2 border-dashed'}`}
            style={i < ctx.slot
              ? { background: 'radial-gradient(circle at 35% 30%, #ffe08a, #f5b91e)', color: '#7c5200', border: '2px solid #c98d0a' }
              : { borderColor: 'var(--line)', color: 'transparent' }}
          >
            {i < ctx.slot ? ch : '·'}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t('stoneTray', 'Letter cards')}>
        {ctx.tray.map((tile, i) => {
          const wrong = ctx.lastWrong === i
          return (
            <motion.button
              key={tile.id}
              type="button"
              disabled={tile.used}
              onClick={() => onTile(i)}
              aria-label={`Letter ${formOfChar(tile.ch)?.sound ?? tile.ch}`}
              animate={wrong ? { x: [0, -7, 7, -5, 5, 0], transition: { duration: 0.42 } } : { x: 0 }}
              className={`geez fq-land-card flex h-16 w-14 select-none items-center justify-center rounded-xl border-b-4 text-3xl font-black ${FOCUS}`}
              style={{
                background: tile.used ? 'var(--line)' : wrong ? 'radial-gradient(circle at 32% 26%, #ff9a8a, #e23b2c)' : 'radial-gradient(circle at 32% 26%, #f7d9a2, #e0a856)',
                borderColor: tile.used ? 'transparent' : wrong ? '#8f160c' : '#a06a30',
                color: tile.used ? 'var(--muted)' : wrong ? '#fff' : '#5b3a12',
                opacity: tile.used ? 0.4 : 1,
                outlineColor: 'var(--sky)',
              }}
            >
              {tile.ch}
            </motion.button>
          )
        })}
      </div>
    </>
  )
}

export default function WordSteps({ words, seed, soundOn = true, onDone, onSkip }) {
  const [ctx, setCtx] = useState(() => wordStepsStart(words, seed))
  const [yourTurn, setYourTurn] = useState(false)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  const act = (ev) => {
    const word = ctx.phase === WordPhase.PROVE ? ctx.rounds[ctx.qi]?.word : ctx.words[ctx.wi]
    const r = wordStepsTransition(ctx, ev)
    if (ev.type === 'TILE') {
      const tile = ctx.tray[ev.index]
      if (r.advanced && tile) playForm(formOfChar(tile.ch), soundOn)
      else if (r.next !== ctx) {
        playEffect('bad', soundOn)
        recordAnswer(`word:${word.latin}`, 'word:miss', 'words')
      }
    }
    if (ev.type === 'PICK') {
      if (r.advanced) playEffect('good', soundOn)
      else if (r.next !== ctx) {
        playEffect('bad', soundOn)
        recordAnswer(`word:${word.latin}`, `word:${ev.latin}`, 'words')
      }
    }
    if (r.completedWord) {
      recordAnswer(`word:${r.completedWord.latin}`, `word:${r.completedWord.latin}`, 'words')
      playEffect('good', soundOn)
      later(() => voiceWord(r.completedWord, soundOn), 500)
      if (r.next.phase === WordPhase.DONE) later(() => playEffect('win', soundOn), 1100)
    }
    setCtx(r.next)
  }

  // SAY: after the build's letter+word voicing clears, invite the echo, then
  // move on by itself - the child is speaking, not tapping.
  useEffect(() => {
    if (ctx.phase !== WordPhase.SAY) {
      setYourTurn(false)
      return undefined
    }
    const cue = setTimeout(() => setYourTurn(true), 1300)
    const done = setTimeout(() => setCtx((c) => wordStepsTransition(c, { type: 'SAY_DONE' }).next), 3400)
    return () => {
      clearTimeout(cue)
      clearTimeout(done)
    }
  }, [ctx.phase, ctx.wi])

  const word = ctx.phase === WordPhase.PROVE ? ctx.rounds[ctx.qi]?.word : ctx.words[ctx.wi]
  const round = ctx.phase === WordPhase.PROVE ? ctx.rounds[ctx.qi] : null
  const totalSteps = ctx.words.length + ctx.rounds.length
  const stepIndex = ctx.phase === WordPhase.DONE ? totalSteps : ctx.phase === WordPhase.PROVE ? ctx.words.length + ctx.qi : ctx.wi

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-10 pt-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onSkip} aria-label={t('dismiss', 'Not now')} className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex flex-1 justify-center gap-1.5" aria-label="Word steps">
          {Array.from({ length: totalSteps }, (_, i) => (
            <span key={i} className="block h-2.5 w-8 rounded-full" style={{ background: i < stepIndex ? 'var(--go)' : i === stepIndex ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>
        <span className="w-10 text-center text-xl" aria-hidden="true">✨</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          {ctx.phase === WordPhase.BUILD && (
            <motion.div key={`build-${ctx.wi}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-5">
              <p className="text-lg font-extrabold">{t('buildWord', 'Tap the letters in order')}</p>
              <p className="text-7xl" aria-hidden="true">{word?.picture}</p>
              <BuildBoard word={word} ctx={ctx} onTile={(i) => act({ type: 'TILE', index: i })} />
            </motion.div>
          )}

          {ctx.phase === WordPhase.SAY && (
            <motion.div key={`say-${ctx.wi}`} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-4">
              <p className="text-6xl" aria-hidden="true">{word?.picture}</p>
              <p className="geez text-6xl font-black">{word?.geez}</p>
              <button
                type="button"
                onClick={() => voiceWord(word, soundOn)}
                aria-label={t('hearIt', 'Hear it again')}
                className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl text-white ${FOCUS} ${word?.noAudio ? 'invisible' : ''}`}
                style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              </button>
              <div style={{ minHeight: 32 }}>
                <AnimatePresence>
                  {yourTurn && (
                    <motion.p key="turn" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-lg font-black" style={{ color: 'var(--go-ink)' }}>
                      <Mic className="h-5 w-5" aria-hidden="true" /> {t('yourTurn', 'Now you say it!')}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {ctx.phase === WordPhase.PROVE && round?.type === 'read' && (
            <motion.div key={`read-${ctx.qi}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-6">
              <p className="text-lg font-extrabold">{t('readAndMatch', 'Read the word, then tap its picture')}</p>
              <p className="geez text-6xl font-black">{round.word.geez}</p>
              <div className="grid w-full grid-cols-3 gap-3">
                {round.options.map((opt) => (
                  <motion.button
                    key={opt.latin}
                    type="button"
                    onClick={() => act({ type: 'PICK', latin: opt.latin })}
                    animate={ctx.lastWrong === opt.latin ? { x: [0, -7, 7, -5, 5, 0], transition: { duration: 0.42 } } : { x: 0 }}
                    className={`chunk flex h-24 items-center justify-center rounded-3xl border-2 text-5xl ${FOCUS}`}
                    style={{ background: 'var(--card)', borderColor: ctx.lastWrong === opt.latin ? 'var(--bad)' : 'var(--line)', boxShadow: '0 4px 0 var(--line)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}
                    aria-label={opt.latin}
                  >
                    <span aria-hidden="true">{opt.picture}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {ctx.phase === WordPhase.PROVE && round?.type === 'rebuild' && (
            <motion.div key={`rebuild-${ctx.qi}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-5">
              <p className="text-lg font-extrabold">{t('rebuildWord', 'Build the word for the picture')}</p>
              <p className="text-7xl" aria-hidden="true">{round.word.picture}</p>
              <BuildBoard word={round.word} ctx={ctx} onTile={(i) => act({ type: 'TILE', index: i })} />
            </motion.div>
          )}

          {ctx.phase === WordPhase.DONE && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full flex-col items-center gap-4">
              <Hero size={104} mood="happy" />
              <h2 className="text-2xl font-black">{t('wordsDoneTitle', 'You can read new words!')}</h2>
              <p className="font-bold" style={{ color: 'var(--muted)' }}>
                {t('wordsDoneBody', `${ctx.words.length} new words - Anbessa is so proud!`, { n: ctx.words.length })}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {ctx.words.map((w) => (
                  <span key={w.latin} className="geez rounded-2xl px-3 py-1.5 text-2xl font-black" style={{ background: 'var(--go-soft)', color: 'var(--go-ink)' }}>
                    {w.geez} <span className="text-xl" aria-hidden="true">{w.picture}</span>
                  </span>
                ))}
              </div>
              <button type="button" onClick={onDone} className={`chunk mt-2 w-full max-w-xs rounded-2xl px-6 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
                {t('keepGoing', 'Keep going!')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
