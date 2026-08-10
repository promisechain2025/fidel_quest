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
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Lock, Volume2, BookOpen } from 'lucide-react'
import { audio, afterVoice, playEffect } from '../platform/audioEngine'
import { INDEXES, getActivePackId } from '../platform/ethiopic'
import { storyLibrary, storyWords, wordAudioFor, loadStoriesRead, markStoryRead } from '../platform/stories'
import { loadJourney, learnedFamilyIds } from '../journey'
import { recordAnswer } from '../platform/telemetry'
import { sayPrompt } from '../platform/prompts'
import { t, getLang } from '../platform/i18n'
import { FOCUS } from '../FidelQuestApp'
import AnbessaSvg from './AnbessaSvg'
import WordPicture from './Pictures'
import StoryScene from './StoryScene'
import { Harag, LetterTile } from './Manuscript'

const famGlyph = (id) => INDEXES.byAudioKey.get(`${id}-1`)?.char || id

/* Page-turn like a book leaf: the outgoing page folds away over the spine
   while the next swings in from the opposite edge (3D rotateY + a slide, so
   it reads as paper turning, not a card spinning). `dir` is +1 forward,
   -1 back. Reduced-motion swaps in a plain crossfade below. */
const BOOK_TURN = {
  enter: (dir) => ({ rotateY: dir >= 0 ? -78 : 78, x: dir >= 0 ? '38%' : '-38%', opacity: 0 }),
  center: { rotateY: 0, x: 0, opacity: 1 },
  exit: (dir) => ({ rotateY: dir >= 0 ? 78 : -78, x: dir >= 0 ? '-38%' : '38%', opacity: 0 }),
}
const FADE_TURN = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }

/* A soft cartoon scene behind the page's picture: a sky glow up top and a
   ground tint below, layered over the card so it works in light and dark. */
const SCENE_BG =
  'radial-gradient(120% 82% at 50% 16%, rgba(120,190,255,0.22), rgba(120,190,255,0.06) 46%, transparent 62%),' +
  'linear-gradient(180deg, transparent 58%, rgba(122,182,96,0.20))'

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

export default function StoryTime({ soundOn, onBack, onStoryComplete = null }) {
  const [library] = useState(() => storyLibrary(learnedFamilyIds(loadJourney()), undefined, getActivePackId()))
  const [readCounts, setReadCounts] = useState(() => loadStoriesRead().read)
  const [story, setStory] = useState(null)
  const [pageIdx, setPageIdx] = useState(0)
  const [dir, setDir] = useState(1) // page-turn direction: +1 forward, -1 back
  const [finished, setFinished] = useState(false)
  const [quiz, setQuiz] = useState(null) // null | 'asking' | 'missed' | 'done'
  const [spokenWord, setSpokenWord] = useState(-1)
  const cancelRef = useRef(() => {})
  const narrGen = useRef(0) // bumps on every nav; late narration for an old page bails
  const finishedOnceRef = useRef(false) // did this open reach the celebration?
  const reduceMotion = useReducedMotion()

  useEffect(() => () => cancelRef.current(), [])
  const stopSpeech = () => {
    narrGen.current++
    cancelRef.current()
    audio.stopVoice()
    setSpokenWord(-1)
  }

  const openStory = (s) => {
    stopSpeech()
    finishedOnceRef.current = false
    setDir(1)
    setStory(s)
    setPageIdx(0)
    setQuiz(null)
    setFinished(false)
  }
  const closeReader = () => {
    stopSpeech()
    setStory(null)
    setFinished(false)
  }
  /** Leave the reader for good: on the Journey-node path this completes the
      node (which navigates away); from the Backpack it returns to the library. */
  const leaveReader = () => {
    if (finishedOnceRef.current && onStoryComplete) onStoryComplete()
    else closeReader()
  }

  const page = story?.pages[pageIdx]
  const words = useMemo(() => (page ? storyWords(page.g) : []), [page])
  const showGloss = getLang() === 'en' // English meaning captions only for an English UI

  const tapWord = (w, i) => {
    stopSpeech()
    setSpokenWord(i)
    // Reading telemetry: a tapped word is a help request - the one signal
    // the reading surface produces. Prefixed key so letter-practice
    // consumers (which filter on real audio keys) never see it.
    recordAnswer(`sword:${w}`, `sword:${w}:help`, 'story')
    cancelRef.current = speakWord(w, soundOn)
  }

  /** The page's recorded-narration key, pack-aware (Amharic under stories/,
      Tigrinya under stories/ti/). */
  const narrationKey = (idx) => `stories/${getActivePackId() === 'ti' ? 'ti/' : ''}${story.id}-${idx + 1}`

  /** Play the page's human narration when one is recorded; resolves to
      whether it played, so callers can fall back to word-by-word reading. */
  const playNarration = async (idx = pageIdx) => {
    if (!story) return false
    const gen = narrGen.current
    const key = narrationKey(idx)
    const ok = await audio.covered(key)
    // Superseded by a page turn while covered() was resolving, or nothing recorded.
    if (!ok || gen !== narrGen.current) return false
    audio.stopVoice()
    setSpokenWord(-1)
    // chimeOnMiss:false -> if the clip fails to load, stay silent (never a
    // letter-chime mid-story); word-by-word is the explicit fallback.
    audio.play(key, { enabled: soundOn, chimeOnMiss: false })
    return true
  }

  /** Read the whole page: prefer the recorded narration, else chain each
      word (real clip where one exists, else spell it out). */
  const readWordsAloud = () => {
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
  const readToMe = () => {
    playNarration().then((played) => { if (!played) readWordsAloud() })
  }

  // Auto-read each page: play the recorded narration when there is one; on the
  // first page with no recording yet, fall back to the spoken tap-hint.
  useEffect(() => {
    if (!story || finished || quiz) return
    let alive = true
    playNarration(pageIdx).then((played) => {
      if (alive && !played && pageIdx === 0) sayPrompt('tapWords', soundOn)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx, story, finished, quiz])

  const nextPage = () => {
    stopSpeech()
    if (pageIdx + 1 < story.pages.length) {
      setDir(1)
      setPageIdx(pageIdx + 1)
      return
    }
    // One comprehension question before the celebration, when the story
    // has one: turning pages is not reading, answering shows it was.
    if (story.q && quiz !== 'done') {
      setQuiz('asking')
      return
    }
    finishStory()
  }
  const finishStory = () => {
    const count = markStoryRead(story.id)
    setReadCounts((r) => ({ ...r, [story.id]: count }))
    // A completed read is a correct 'story' event - together with the
    // sword: help taps this gives Grown-Ups a real reading signal.
    recordAnswer(`story:${story.id}`, `story:${story.id}`, 'story')
    // Show the celebration first; node completion (which navigates away) is
    // deferred to leaveReader so the child sees "Read it again" / "More".
    finishedOnceRef.current = true
    setQuiz(null)
    setFinished(true)
    playEffect('win', soundOn)
  }
  const answerQuiz = (opt) => {
    if (opt.ok) {
      recordAnswer(`storyq:${story.id}`, `storyq:${story.id}`, 'story')
      playEffect('good', soundOn)
      setQuiz('done')
      finishStory()
    } else {
      recordAnswer(`storyq:${story.id}`, `storyq:${story.id}:miss`, 'story')
      playEffect('bad', soundOn)
      setQuiz('missed')
    }
  }
  const prevPage = () => {
    stopSpeech()
    if (pageIdx === 0) leaveReader()
    else {
      setDir(-1)
      setPageIdx(pageIdx - 1)
    }
  }

  /* ── celebration ── */
  if (story && finished) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-7 text-center">
        <AnbessaSvg size={120} mood="happy" />
        <h1 className="text-2xl font-black">{t('storyDoneTitle', 'You read a whole story!')}</h1>
        <p className="geez text-xl font-black">{story.title.g}</p>
        <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>
          {t('storyDoneBody', 'Anbessa is proud. Real reading, all by yourself!')}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => openStory(story)} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
            {t('storyAgain', 'Read it again')}
          </button>
          <button type="button" onClick={leaveReader} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
            {t('storyMore', 'More stories')}
          </button>
        </div>
      </div>
    )
  }

  /* ── comprehension question ── */
  if (story && (quiz === 'asking' || quiz === 'missed')) {
    return (
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-7 text-center" aria-live="polite">
        {/* A way out must always exist: without this the child is confined to
           guessing among the pictures with no back/exit (breaks the #1 rule). */}
        <button type="button" onClick={leaveReader} aria-label={t('back', 'Back')} className={`absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--focus)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <AnbessaSvg size={90} mood={quiz === 'missed' ? 'worried' : 'happy'} />
        {/* Always show the question - a story without a Ge'ez question string
           would otherwise render NO prompt on a non-English UI, leaving the
           child guessing blind. */}
        <h1 className="text-xl font-black">{story.q.g ? <span className="geez">{story.q.g}</span> : story.q.en}</h1>
        {story.q.g && showGloss && <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{story.q.en}</p>}
        <div className="flex gap-4">
          {story.q.a.map((opt, i) => (
            <button key={i} type="button" onClick={() => answerQuiz(opt)} aria-label={opt.alt || opt.pic} className={`chunk flex h-32 w-32 items-center justify-center rounded-3xl border-2 ${FOCUS}`} style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '0 5px 0 var(--line)', '--chunk-depth': '5px' }}>
              <WordPicture emoji={opt.pic} size={84} />
            </button>
          ))}
        </div>
        {quiz === 'missed' && (
          <p className="text-sm font-bold" style={{ color: 'var(--bad-ink)' }}>{t('storyQAgain', 'Look at the story again - you can do it!')}</p>
        )}
      </div>
    )
  }

  /* ── reader ── */
  if (story) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-7 pb-6 pt-4">
        <header className="flex items-center gap-2">
          <button type="button" onClick={prevPage} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--focus)' }}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div role="img" className="flex flex-1 items-center justify-center gap-1.5" aria-label={t('storyProgress', `Page ${pageIdx + 1} of ${story.pages.length}`, { n: pageIdx + 1, total: story.pages.length })}>
            {story.pages.map((_, i) => (
              <span key={i} className="h-2.5 rounded-full transition-all" style={{ width: i === pageIdx ? 22 : 10, background: i <= pageIdx ? 'var(--go)' : 'var(--line)' }} />
            ))}
          </div>
          <div className="w-11" />
        </header>

        <main className="relative flex-1" style={{ perspective: 1600 }}>
          <AnimatePresence custom={dir} initial={false}>
            <motion.div
              key={pageIdx}
              custom={dir}
              variants={reduceMotion ? FADE_TURN : BOOK_TURN}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0.18 : 0.52, ease: [0.33, 0.66, 0.4, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-[26px] px-6 py-6 text-center"
              style={{
                transformStyle: 'preserve-3d',
                background: 'var(--card)',
                border: '2px solid var(--line)',
                boxShadow: '0 10px 26px rgba(0,0,0,0.16)',
              }}
            >
              {/* book spine shadow down the left edge */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[26px]" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.16), rgba(0,0,0,0.04) 55%, transparent)' }} />
              {/* illustrated picture-book scene (falls back to the plain
                  picture on a page/pack without a scene) */}
              {page.scene ? (
                <StoryScene scene={page.scene} width={338} height={220} className="shadow-sm" rounded={22} />
              ) : (
                <div className="flex items-center justify-center rounded-3xl" style={{ width: 190, height: 150, background: SCENE_BG, border: '1.5px solid var(--line)' }} aria-hidden="true">
                  <WordPicture emoji={page.pic} size={120} />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2 px-1">
                {words.map((w, i) => (
                  <button
                    key={`${pageIdx}-${i}`}
                    type="button"
                    onClick={() => tapWord(w, i)}
                    className={`geez chunk rounded-2xl border-2 px-3 py-2 text-4xl font-black ${FOCUS}`}
                    style={{
                      background: spokenWord === i ? 'var(--go-soft)' : 'var(--paper)',
                      borderColor: spokenWord === i ? 'var(--go)' : 'var(--line)',
                      boxShadow: '0 3px 0 var(--line)',
                      '--chunk-depth': '3px',
                    }}
                  >
                    {w}
                  </button>
                ))}
                <span className="geez text-4xl font-black" style={{ color: 'var(--muted)' }}>።</span>
              </div>
              {showGloss && <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{page.en}</p>}
            </motion.div>
          </AnimatePresence>
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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-7 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--focus)' }}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex flex-1 items-center justify-center gap-2 text-lg font-black">
          <BookOpen className="h-5 w-5" aria-hidden="true" /> {t('storyTitle', 'Story Time')}
        </h1>
        <div className="w-11" />
      </header>
      <p className="mt-1 text-center text-sm font-bold" style={{ color: 'var(--muted)' }}>
        {t('storySub', 'Little books you can already read - every letter is one you learned.')}
      </p>
      <div className="mt-2 flex justify-center"><Harag /></div>
      {library.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <AnbessaSvg size={90} />
          <p className="max-w-xs text-sm font-bold" style={{ color: 'var(--muted)' }}>
            {t('storyNonePack', 'Story books in this language are on their way! Every letter you learn now will be ready to read them.')}
          </p>
        </div>
      )}
      <ul className="mt-4 space-y-2.5">
        {library.map((s) => (
          <li key={s.id}>
            {s.unlocked ? (
              <button type="button" onClick={() => openStory(s)} className={`chunk flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left ${FOCUS}`} style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '0 4px 0 var(--line)', '--chunk-depth': '4px' }}>
                <LetterTile glyph={Array.from(s.title.g)[0]} size={44} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="geez block truncate text-lg font-black">{s.title.g}</span>
                  {showGloss && <span className="block truncate text-xs font-bold" style={{ color: 'var(--muted)' }}>{s.title.en}</span>}
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
