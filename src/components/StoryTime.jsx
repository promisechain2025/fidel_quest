/* ============================================================================
   STORY TIME — the decodable-story reader
   ----------------------------------------------------------------------------
   Library -> reader -> celebration. The library shows every story; locked
   ones display exactly which letters will open them (motivation pointing
   back at the Journey). In the reader every word is a tappable chip: words
   with a recorded clip play it, everything else is spelled letter-by-letter
   through the letter audio - the mp3-optional contract holds. Page turns
   are user actions (cut the voice, act); "Read to me" chains word audio
   through afterVoice so it always plays out.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Lock, Volume2, BookOpen } from 'lucide-react'
import { audio, afterVoice, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { storyLibrary, storyWords, wordAudioFor, loadStoriesRead, markStoryRead } from '../platform/stories'
import { loadJourney, learnedFamilyIds } from '../journey'
import { t } from '../platform/i18n'
import { Sprite2D, drawAnbessa, FOCUS } from '../FidelQuestApp'
import WordPicture from './Pictures'

const famGlyph = (id) => INDEXES.byAudioKey.get(`${id}-1`)?.char || id

/** Speak one Ge'ez word: recorded clip when the pack has one, else spell
    it letter-by-letter. Returns a cancel fn for the spelling chain. */
function speakWord(geez, soundOn) {
  const w = wordAudioFor(geez)
  if (w && !w.noAudio) {
    audio.play(`words/${w.latin}`, { enabled: soundOn })
    return () => {}
  }
  const chars = Array.from(geez).filter((ch) => INDEXES.byChar.has(ch))
  let cancelled = false
  let cancelStep = () => {}
  const step = (i) => {
    if (cancelled || i >= chars.length) return
    const form = INDEXES.byChar.get(chars[i])
    audio.play(`letters/${form.audioKey}`, { enabled: soundOn, chime: { familyIndex: form.familyIndex, order: form.order + 1 } })
    cancelStep = afterVoice(() => step(i + 1), 350)
  }
  step(0)
  return () => {
    cancelled = true
    cancelStep()
  }
}

export default function StoryTime({ soundOn, onBack }) {
  const [library] = useState(() => storyLibrary(learnedFamilyIds(loadJourney())))
  const [readCounts, setReadCounts] = useState(() => loadStoriesRead().read)
  const [story, setStory] = useState(null)
  const [pageIdx, setPageIdx] = useState(0)
  const [finished, setFinished] = useState(false)
  const [spokenWord, setSpokenWord] = useState(-1)
  const cancelRef = useRef(() => {})

  useEffect(() => () => cancelRef.current(), [])
  const stopSpeech = () => {
    cancelRef.current()
    audio.stopVoice()
    setSpokenWord(-1)
  }

  const openStory = (s) => {
    stopSpeech()
    setStory(s)
    setPageIdx(0)
    setFinished(false)
  }
  const closeReader = () => {
    stopSpeech()
    setStory(null)
    setFinished(false)
  }

  const page = story?.pages[pageIdx]
  const words = page ? storyWords(page.g) : []

  const tapWord = (w, i) => {
    stopSpeech()
    setSpokenWord(i)
    cancelRef.current = speakWord(w, soundOn)
  }

  /** Read the whole page: each word in order, waiting for the voice. */
  const readToMe = () => {
    stopSpeech()
    let cancelled = false
    let cancelStep = () => {}
    const step = (i) => {
      if (cancelled || i >= words.length) {
        if (!cancelled) setSpokenWord(-1)
        return
      }
      setSpokenWord(i)
      const cancelWord = speakWord(words[i], soundOn)
      cancelStep = afterVoice(() => step(i + 1), 500)
      const prev = cancelStep
      cancelStep = () => {
        cancelWord()
        prev()
      }
    }
    step(0)
    cancelRef.current = () => {
      cancelled = true
      cancelStep()
    }
  }

  const nextPage = () => {
    stopSpeech()
    if (pageIdx + 1 < story.pages.length) {
      setPageIdx(pageIdx + 1)
      return
    }
    const count = markStoryRead(story.id)
    setReadCounts((r) => ({ ...r, [story.id]: count }))
    setFinished(true)
    playEffect('win', soundOn)
  }
  const prevPage = () => {
    stopSpeech()
    if (pageIdx === 0) closeReader()
    else setPageIdx(pageIdx - 1)
  }

  /* ── celebration ── */
  if (story && finished) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
        <Sprite2D draw={drawAnbessa} size={120} mood="happy" />
        <h1 className="text-2xl font-black">{t('storyDoneTitle', 'You read a whole story!')}</h1>
        <p className="geez text-xl font-black">{story.title.g}</p>
        <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>
          {t('storyDoneBody', 'Anbessa is proud. Real reading, all by yourself!')}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => openStory(story)} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
            {t('storyAgain', 'Read it again')}
          </button>
          <button type="button" onClick={closeReader} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
            {t('storyMore', 'More stories')}
          </button>
        </div>
      </div>
    )
  }

  /* ── reader ── */
  if (story) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-4">
        <header className="flex items-center gap-2">
          <button type="button" onClick={prevPage} aria-label={t('storyBack', 'Back')} className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex flex-1 items-center justify-center gap-1.5" aria-label={t('storyProgress', `Page ${pageIdx + 1} of ${story.pages.length}`, { n: pageIdx + 1, total: story.pages.length })}>
            {story.pages.map((_, i) => (
              <span key={i} className="h-2.5 rounded-full transition-all" style={{ width: i === pageIdx ? 22 : 10, background: i <= pageIdx ? 'var(--go)' : 'var(--line)' }} />
            ))}
          </div>
          <div className="w-10" />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="flex justify-center" aria-hidden="true"><WordPicture emoji={page.pic} size={110} /></div>
          <AnimatePresence mode="wait">
            <motion.div key={pageIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center justify-center gap-2 px-2">
              {words.map((w, i) => (
                <button
                  key={`${pageIdx}-${i}`}
                  type="button"
                  onClick={() => tapWord(w, i)}
                  className={`geez chunk rounded-2xl border-2 px-3 py-2 text-4xl font-black ${FOCUS}`}
                  style={{
                    background: spokenWord === i ? 'var(--go-soft)' : 'var(--card)',
                    borderColor: spokenWord === i ? 'var(--go)' : 'var(--line)',
                    boxShadow: '0 3px 0 var(--line)',
                    '--chunk-depth': '3px',
                  }}
                >
                  {w}
                </button>
              ))}
              <span className="geez text-4xl font-black" style={{ color: 'var(--muted)' }}>።</span>
            </motion.div>
          </AnimatePresence>
          <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{page.en}</p>
        </main>

        <div className="flex items-center gap-3">
          <button type="button" onClick={readToMe} aria-label={t('storyReadToMe', 'Read to me')} className={`chunk flex h-14 w-14 items-center justify-center rounded-2xl text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep)', '--chunk-depth': '4px' }}>
            <Volume2 className="h-6 w-6" />
          </button>
          <button type="button" onClick={nextPage} className={`chunk flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-lg font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
            {pageIdx + 1 < story.pages.length ? t('storyNext', 'Next page') : t('storyFinish', 'The end!')}
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  /* ── library ── */
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('storyBack', 'Back')} className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex flex-1 items-center justify-center gap-2 text-lg font-black">
          <BookOpen className="h-5 w-5" aria-hidden="true" /> {t('storyTitle', 'Story Time')}
        </h1>
        <div className="w-10" />
      </header>
      <p className="mt-1 text-center text-sm font-bold" style={{ color: 'var(--muted)' }}>
        {t('storySub', 'Little books you can already read - every letter is one you learned.')}
      </p>
      <ul className="mt-4 space-y-2.5">
        {library.map((s) => (
          <li key={s.id}>
            {s.unlocked ? (
              <button type="button" onClick={() => openStory(s)} className={`chunk flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left ${FOCUS}`} style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '0 4px 0 var(--line)', '--chunk-depth': '4px' }}>
                <span className="text-3xl" aria-hidden="true">{s.pages[0].pic}</span>
                <span className="min-w-0 flex-1">
                  <span className="geez block truncate text-lg font-black">{s.title.g}</span>
                  <span className="block truncate text-xs font-bold" style={{ color: 'var(--muted)' }}>{s.title.en}</span>
                </span>
                {readCounts[s.id] > 0 && (
                  <span className="rounded-lg px-2 py-0.5 text-[11px] font-black text-white" style={{ background: 'var(--star)' }}>
                    {t('storyReadN', `Read x${readCounts[s.id]}`, { n: readCounts[s.id] })}
                  </span>
                )}
              </button>
            ) : (
              <div className="flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 opacity-80" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
                <Lock className="h-5 w-5 shrink-0" style={{ color: 'var(--muted)' }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="geez block truncate text-lg font-black" style={{ color: 'var(--muted)' }}>{s.title.g}</span>
                  <span className="block text-xs font-bold" style={{ color: 'var(--muted)' }}>
                    {t('storyLocked', 'Learn these letters to open:')}{' '}
                    <span className="geez">{s.missing.slice(0, 3).map(famGlyph).join(' ')}</span>
                    {s.missing.length > 3 ? ` +${s.missing.length - 3}` : ''}
                  </span>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[11px] font-bold" style={{ color: 'var(--muted)' }}>
        {t('storyDraftNote', 'Early-reader Amharic, reviewed with love - tell us if a line sounds off!')}
      </p>
    </div>
  )
}
