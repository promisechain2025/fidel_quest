/* School Path Grade 1 drills: Word Build, Find-the-fidel, and Echo.
   English chrome (eGeez / Jibby stay the app names). Learning words stay
   Tigrinya. Tiles and echo lines are the unit's own authored text.
   Echo plays the line (Story Time's speak path) and asks the child to
   tap. No microphone, no invented lines, no new art. */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Volume2 } from 'lucide-react'
import { audio, playForm, playEffect } from '../platform/audioEngine'
import { speakLine } from '../platform/speakGeez'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { schoolPathLabel } from '../data/schoolPathGr1'
import {
  WordBuildPhase,
  FindPhase,
  EchoPhase,
  wordBuildInitial,
  wordBuildTransition,
  findFidelInitial,
  findFidelTransition,
  echoInitial,
  echoTransition,
} from '../schoolPathDrillCore'
import AnbessaSvg from './AnbessaSvg'
import { KokebSvg } from './KokebSvg'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOfChar = (ch) => INDEXES.byChar.get(ch)

function DrillHeader({ title, unitIndex, step, total, onBack }) {
  return (
    <header className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={t('back', 'Back')}
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`}
        style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}
      >
        <ChevronLeft className="h-6 w-6" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="text-lg font-black leading-tight">{title}</h1>
        <p className="truncate text-xs font-bold" style={{ color: 'var(--muted)' }}>
          {schoolPathLabel(unitIndex)}
        </p>
      </div>
      <div className="flex w-11 justify-end gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="block h-2.5 w-2.5 rounded-full"
            style={{ background: i < step ? 'var(--go)' : i === step ? 'var(--accent)' : 'var(--line)' }}
          />
        ))}
      </div>
    </header>
  )
}

function GoButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chunk mt-2 w-full max-w-xs rounded-2xl px-6 py-4 text-lg font-black text-white ${FOCUS}`}
      style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}
    >
      {children}
    </button>
  )
}

const tileFace = (state) => {
  if (state === 'used') return { background: 'var(--line)', borderColor: 'transparent', color: 'var(--muted)', opacity: 0.45 }
  if (state === 'wrong') return { background: 'radial-gradient(circle at 32% 26%, #ff9a8a, #e23b2c)', borderColor: '#8f160c', color: '#fff', opacity: 1 }
  if (state === 'hit') return { background: 'radial-gradient(circle at 35% 30%, #b6e88a, #59a52a)', borderColor: '#3f7a1e', color: '#14300c', opacity: 1 }
  return { background: 'radial-gradient(circle at 32% 26%, #ffe08a, #f5b91e)', borderColor: '#c98d0a', color: '#7c5200', opacity: 1 }
}

function SyllableTile({ ch, state, shake, onClick, label }) {
  const face = tileFace(state)
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={state === 'used'}
      aria-label={label}
      animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
      transition={shake ? { duration: 0.42 } : { duration: 0.15 }}
      className={`geez flex h-20 w-16 select-none items-center justify-center rounded-2xl border-b-4 text-4xl font-black ${FOCUS}`}
      style={{ ...face, outlineColor: 'var(--sky)' }}
    >
      {ch}
    </motion.button>
  )
}

export function WordBuildScreen({ words = [], unitIndex, seed = 1, soundOn = true, onDone, onBack }) {
  const [ctx, setCtx] = useState(() => wordBuildInitial(words, seed))
  const word = ctx.words[ctx.wi]
  const chars = word ? [...word.geez] : []

  const tap = (index) => {
    if (ctx.phase !== WordBuildPhase.PICK) return
    const before = ctx
    const r = wordBuildTransition(ctx, { type: 'TILE', index })
    const tile = before.tray[index]
    const expected = chars[before.slot]
    const heard = formOfChar(expected)
    const picked = formOfChar(tile?.ch)
    if (heard && tile && !tile.used) recordAnswer(heard.audioKey, picked?.audioKey || 'miss', 'schoolpath')
    if (r.correct && tile) playForm(formOfChar(tile.ch), soundOn)
    else if (r.next !== ctx) playEffect('bad', soundOn)
    if (r.next.phase === WordBuildPhase.BUILT) playEffect('good', soundOn)
    setCtx(r.next)
  }

  const next = () => {
    const r = wordBuildTransition(ctx, { type: 'NEXT' })
    if (r.next.phase === WordBuildPhase.DONE) {
      playEffect('win', soundOn)
      onDone?.()
      return
    }
    setCtx(r.next)
  }

  const built = ctx.phase === WordBuildPhase.BUILT || ctx.phase === WordBuildPhase.DONE

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-4" data-testid="word-build">
      <DrillHeader
        title={t('wordBuildTitle', 'Word Build')}
        unitIndex={unitIndex}
        step={ctx.phase === WordBuildPhase.PICK ? ctx.wi : ctx.wi + 1}
        total={Math.max(ctx.words.length, 1)}
        onBack={onBack}
      />
      <main className="flex flex-1 flex-col items-center gap-5 pt-4 text-center" aria-live="polite">
        {built ? <AnbessaSvg size={96} mood="happy" pose="cheer" /> : <KokebSvg size={72} />}
        <p className="text-lg font-extrabold">
          {built
            ? t('wordBuildDone', 'You built it!')
            : t('wordBuildPrompt', 'Tap the letters in order')}
        </p>
        {word?.meaningEn && (
          <p className="text-base font-bold" style={{ color: 'var(--muted)' }}>{word.meaningEn}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2" aria-hidden="true">
          {chars.map((ch, i) => (
            <span
              key={i}
              className="geez flex h-16 w-14 items-center justify-center rounded-2xl text-4xl font-black"
              style={i < ctx.slot
                ? { background: 'radial-gradient(circle at 35% 30%, #ffe08a, #f5b91e)', color: '#7c5200', borderBottom: '4px solid #c98d0a' }
                : { background: 'var(--card)', border: '3px dashed var(--accent)', color: 'transparent' }}
            >
              {i < ctx.slot ? ch : '·'}
            </span>
          ))}
        </div>
        {ctx.phase === WordBuildPhase.PICK && (
          <div className="flex flex-wrap justify-center gap-3" role="group" aria-label={t('stoneTray', 'Letter cards')} data-testid="word-build-tray">
            {ctx.tray.map((tile, i) => {
              const wrong = ctx.lastWrong === i
              return (
                <SyllableTile
                  key={`${tile.id}-${wrong ? ctx.wrongTick : 'ok'}`}
                  ch={tile.ch}
                  state={tile.used ? 'used' : wrong ? 'wrong' : 'ready'}
                  shake={wrong}
                  onClick={() => tap(i)}
                  label={t('wordBuildTile', `Letter ${tile.ch}`, { ch: tile.ch })}
                />
              )
            })}
          </div>
        )}
        {ctx.phase === WordBuildPhase.PICK && ctx.lastWrong != null && (
          <p className="text-base font-black" style={{ color: 'var(--bad-ink)' }} data-testid="word-build-miss">
            {t('wordBuildMiss', 'Not that one — try again')}
          </p>
        )}
        {ctx.phase === WordBuildPhase.BUILT && (
          <div className="flex w-full flex-col items-center gap-3" data-testid="word-build-built">
            <p className="geez text-6xl font-black">{word.geez}</p>
            <GoButton onClick={next}>
              {ctx.wi + 1 < ctx.words.length ? t('wordBuildNext', 'Next word') : t('keepGoing', 'Keep going!')}
            </GoButton>
          </div>
        )}
      </main>
    </div>
  )
}

export function FindFidelScreen({ targets = [], unitIndex, soundOn = true, onDone, onBack }) {
  const [ctx, setCtx] = useState(() => findFidelInitial(targets))
  const item = ctx.targets[ctx.ti]
  const chars = item ? [...item.geez] : []
  const found = ctx.phase === FindPhase.FOUND

  const tap = (index) => {
    if (ctx.phase !== FindPhase.HUNT || !item) return
    const r = findFidelTransition(ctx, { type: 'TAP', index })
    const heard = formOfChar(item.target)
    const picked = formOfChar(chars[index])
    if (heard) recordAnswer(heard.audioKey, picked?.audioKey || 'miss', 'schoolpath')
    if (r.correct) {
      playForm(heard, soundOn)
      playEffect('good', soundOn)
    } else if (r.next !== ctx) {
      playEffect('bad', soundOn)
    }
    setCtx(r.next)
  }

  const next = () => {
    const r = findFidelTransition(ctx, { type: 'NEXT' })
    if (r.next.phase === FindPhase.DONE) {
      playEffect('win', soundOn)
      onDone?.()
      return
    }
    setCtx(r.next)
  }

  const place = item?.position === 'final'
    ? t('findFidelEnd', 'It is the last letter')
    : t('findFidelMid', 'It is in the middle')

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-4" data-testid="find-fidel">
      <DrillHeader
        title={t('findFidelTitle', 'Find the letter')}
        unitIndex={unitIndex}
        step={ctx.phase === FindPhase.HUNT ? ctx.ti : ctx.ti + 1}
        total={Math.max(ctx.targets.length, 1)}
        onBack={onBack}
      />
      <main className="flex flex-1 flex-col items-center gap-5 pt-4 text-center" aria-live="polite">
        {found ? <AnbessaSvg size={96} mood="happy" pose="cheer" /> : <KokebSvg size={72} />}
        <p className="text-lg font-extrabold">
          {found ? t('findFidelYes', 'Yes!') : t('findFidelPrompt', 'Tap this letter in the word')}
        </p>
        {item && (
          <div
            className="geez flex h-24 w-24 items-center justify-center rounded-full text-5xl font-black"
            style={{ background: 'radial-gradient(circle at 35% 30%, #ffe08a, #f5b91e)', color: '#7c5200', borderBottom: '5px solid #c98d0a' }}
            aria-hidden="true"
          >
            {item.target}
          </div>
        )}
        {!found && item && (
          <p className="text-base font-bold" style={{ color: 'var(--muted)' }}>{place}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3" role="group" aria-label={t('findFidelWord', 'The word')} data-testid="find-fidel-word">
          {chars.map((ch, i) => {
            const wrong = !found && ctx.lastWrong === i
            const hit = found && i === item.index
            return (
              <SyllableTile
                key={`${ctx.ti}-${i}-${wrong ? ctx.wrongTick : 'ok'}`}
                ch={ch}
                state={hit ? 'hit' : wrong ? 'wrong' : 'ready'}
                shake={wrong}
                onClick={found ? null : () => tap(i)}
                label={t('findFidelTile', `Letter ${ch}`, { ch })}
              />
            )
          })}
        </div>
        {!found && ctx.lastWrong != null && (
          <p className="text-base font-black" style={{ color: 'var(--bad-ink)' }} data-testid="find-fidel-miss">
            {t('findFidelMiss', 'Look again')}
          </p>
        )}
        {found && (
          <div className="flex w-full flex-col items-center gap-2" data-testid="find-fidel-found">
            {item.meaningEn && (
              <p className="text-base font-bold" style={{ color: 'var(--muted)' }}>{item.meaningEn}</p>
            )}
            <p className="geez text-5xl font-black">{item.geez}</p>
            <GoButton onClick={next}>
              {ctx.ti + 1 < ctx.targets.length ? t('findFidelNext', 'Next word') : t('keepGoing', 'Keep going!')}
            </GoButton>
          </div>
        )}
      </main>
    </div>
  )
}

const BOOK_CARD =
  'radial-gradient(120% 82% at 50% 12%, rgba(120,190,255,0.28), rgba(120,190,255,0.06) 48%, transparent 64%),' +
  'linear-gradient(180deg, var(--card) 0%, var(--paper) 100%)'

export function EchoScreen({ lines = [], unitIndex, soundOn = true, onDone, onBack }) {
  const [ctx, setCtx] = useState(() => echoInitial(lines))
  const cancelRef = useRef(() => {})
  const line = ctx.lines[ctx.li]
  const listening = ctx.phase === EchoPhase.LISTEN
  const said = ctx.phase === EchoPhase.SAID

  const stop = () => {
    cancelRef.current()
    cancelRef.current = () => {}
    audio.stopVoice()
  }

  useEffect(() => {
    if (!listening || !line?.geez) return undefined
    cancelRef.current = speakLine(line.geez, soundOn)
    return () => {
      cancelRef.current()
      cancelRef.current = () => {}
      audio.stopVoice()
    }
  }, [listening, ctx.li, line?.geez, soundOn])

  useEffect(() => () => {
    cancelRef.current()
    audio.stopVoice()
  }, [])

  const back = () => {
    stop()
    onBack?.()
  }

  const again = () => {
    if (!line) return
    const r = echoTransition(ctx, { type: 'AGAIN' })
    if (!r.correct) return
    stop()
    cancelRef.current = speakLine(line.geez, soundOn)
  }

  const saidIt = () => {
    const r = echoTransition(ctx, { type: 'SAID' })
    if (!r.advanced) return
    stop()
    playEffect('good', soundOn)
    setCtx(r.next)
  }

  const next = () => {
    const r = echoTransition(ctx, { type: 'NEXT' })
    if (!r.advanced) return
    stop()
    if (r.next.phase === EchoPhase.DONE) {
      playEffect('win', soundOn)
      onDone?.()
      return
    }
    setCtx(r.next)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-4" data-testid="echo">
      <DrillHeader
        title={t('echoTitle', 'Echo')}
        unitIndex={unitIndex}
        step={listening ? ctx.li : ctx.li + 1}
        total={Math.max(ctx.lines.length, 1)}
        onBack={back}
      />
      <main className="flex flex-1 flex-col items-center gap-5 pt-4 text-center" aria-live="polite">
        {said ? <AnbessaSvg size={96} mood="happy" pose="cheer" /> : <KokebSvg size={72} />}
        <p className="text-lg font-extrabold" data-testid={listening ? 'echo-listen' : 'echo-said'}>
          {listening ? t('echoPrompt', 'Listen, then say it') : t('echoSaid', 'You said it!')}
        </p>
        {line && (
          <motion.div
            className="relative w-full overflow-hidden rounded-[28px] px-6 py-8"
            style={{ background: BOOK_CARD, border: '2px solid var(--line)', boxShadow: '0 6px 0 var(--line)' }}
            animate={listening ? { scale: [1, 1.015, 1] } : { scale: 1 }}
            transition={listening ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
            data-testid="echo-line"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-[26px]"
              style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.14), rgba(0,0,0,0.03) 70%, transparent)' }}
            />
            <p className="geez text-5xl font-black leading-tight">{line.geez}</p>
            {line.meaningEn && (
              <p className="mt-3 text-base font-bold" style={{ color: 'var(--muted)' }}>{line.meaningEn}</p>
            )}
          </motion.div>
        )}
        <button
          type="button"
          onClick={again}
          className={`chunk flex h-16 w-full max-w-xs items-center justify-center gap-3 rounded-2xl text-lg font-black text-white ${FOCUS}`}
          style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}
        >
          <Volume2 className="h-7 w-7" aria-hidden="true" />
          {t('echoAgain', 'Hear again')}
        </button>
        {listening && (
          <GoButton onClick={saidIt}>{t('echoSaidIt', 'I said it')}</GoButton>
        )}
        {said && (
          <GoButton onClick={next}>
            {ctx.li + 1 < ctx.lines.length ? t('echoNext', 'Next line') : t('keepGoing', 'Keep going!')}
          </GoButton>
        )}
      </main>
    </div>
  )
}
