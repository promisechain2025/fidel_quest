import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Volume2, Play, Pause, Mic, Shuffle, Check, RotateCcw, ArrowRight, Gauge, Users } from 'lucide-react'
import { FIDEL_FAMILIES, ALL_FORMS, ORDERS, INDEXES } from '../platform/ethiopic'
import { playForm } from '../platform/audioEngine'
import { t } from '../platform/i18n'
import { buildMasterSequence, gradePronunciation, AUTOPLAY_SPEEDS, SPEED_ORDER, CLIP_LEAD_MS, nextOrder, sessionAccuracy } from '../fidelMaster'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

// Cheerful per-family gradients (the "color mixing" from Explore mode) so the
// abugida home reads as a bright, tappable chart rather than a grey table.
const TILE_GRADIENTS = [
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-purple-600',
  'from-cyan-400 to-sky-500',
]
const gradOf = (i) => TILE_GRADIENTS[i % TILE_GRADIENTS.length]
const formOf = (key) => INDEXES.byAudioKey.get(key)

/* On-device mic sample -> { peakRms, voicedMs }. Fully offline: the audio is
   analysed in-memory and discarded; nothing is recorded or transmitted. */
async function sampleMic(ms = 1500) {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) throw new Error('no-mic')
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) throw new Error('no-audio')
  // Never let an unanswered permission prompt freeze the button.
  const stream = await Promise.race([
    navigator.mediaDevices.getUserMedia({ audio: true }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('mic-timeout')), 6000)),
  ])
  const ac = new AC()
  try {
    const src = ac.createMediaStreamSource(stream)
    const analyser = ac.createAnalyser()
    analyser.fftSize = 1024
    src.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    let peak = 0
    let voicedFrames = 0
    let frames = 0
    const start = performance.now()
    await new Promise((resolve) => {
      const tick = () => {
        analyser.getFloatTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
        const rms = Math.sqrt(sum / buf.length)
        peak = Math.max(peak, rms)
        if (rms > 0.02) voicedFrames++
        frames++
        if (performance.now() - start < ms) requestAnimationFrame(tick)
        else resolve()
      }
      tick()
    })
    return { peakRms: peak, voicedMs: frames ? (voicedFrames / frames) * ms : 0 }
  } finally {
    stream.getTracks().forEach((tr) => tr.stop())
    ac.close?.()
  }
}

/* The "Say it" tool is the app's only microphone use (on-device only; nothing
   is recorded or uploaded). It can be turned OFF at build time so a first
   kids-category store submission ships with no mic permission and no extra
   review scrutiny — set VITE_ENABLE_MIC=false. Default on (web/PWA behavior). */
const MIC_ENABLED = import.meta.env?.VITE_ENABLE_MIC !== 'false'

const TABS = [
  { id: 'chart', icon: null, key: 'masterChart', label: 'Chart' },
  { id: 'auto', icon: Play, key: 'masterAuto', label: 'Auto-voice' },
  ...(MIC_ENABLED ? [{ id: 'say', icon: Mic, key: 'masterSay', label: 'Say it' }] : []),
]

function OrderChip({ active, label, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-1.5 text-xs font-black leading-tight ${FOCUS}`}
      style={{ background: active ? 'var(--go)' : 'var(--card)', color: active ? '#fff' : 'var(--muted)', border: '2px solid var(--line)', outlineColor: 'var(--sky)' }}>
      <span>{label}</span>
      {sub ? <span className="mono text-[10px] font-bold opacity-80">{sub}</span> : null}
    </button>
  )
}

function ToggleChip({ on, icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black ${FOCUS}`}
      style={{ background: on ? 'var(--go)' : 'var(--card)', color: on ? '#fff' : 'var(--muted)', border: '2px solid var(--line)', outlineColor: 'var(--sky)' }}>
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null} {label}
    </button>
  )
}

/* Fidel Master: master every letter of the abugida. Pack-aware (uses the
   active language's forms), fully offline. Three tools share one sequence. */
export default function FidelMaster({ onBack, soundOn = true }) {
  const [tab, setTab] = useState('chart')
  const [mix, setMix] = useState(true)
  const [seed, setSeed] = useState(1)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState('slow')
  const [order, setOrder] = useState(null) // null = whole abugida, or 1..7
  const [sayWithMe, setSayWithMe] = useState(true) // echo pause by default
  const [autoAdvance, setAutoAdvance] = useState(false) // roll to the next order
  const [yourTurn, setYourTurn] = useState(false)
  const [micState, setMicState] = useState('idle') // idle | busy | result | nomic
  const [feedback, setFeedback] = useState(null) // { grade, accept }
  const [stats, setStats] = useState({ correct: 0, total: 0, missed: [] })
  const [openFam, setOpenFam] = useState(null) // family id expanded in the chart

  const seq = useMemo(() => buildMasterSequence(ALL_FORMS, { seed, mix, order }), [seed, mix, order])
  const form = seq[idx] ?? seq[0]
  const play = useCallback((f) => { if (soundOn) playForm(f, true) }, [soundOn])

  // Keep idx in range if the sequence rebuilds.
  useEffect(() => { setIdx((i) => (i >= seq.length ? 0 : i)) }, [seq.length])

  // Auto-voice: speak the current letter, then step on. "Say with me" holds a
  // repeat window (with a "your turn" cue) so the child can echo it. At the end
  // of a single-order pass, optionally roll on to the next vowel order.
  useEffect(() => {
    if (tab !== 'auto' || !playing) return undefined
    setYourTurn(false)
    play(seq[idx])
    const advance = () => {
      setYourTurn(false)
      if (idx >= seq.length - 1) {
        if (autoAdvance && order != null) setOrder((o) => nextOrder(o, ORDERS.length))
        setIdx(0)
      } else {
        setIdx(idx + 1)
      }
    }
    if (sayWithMe) {
      // Speed sets the repeat window too, so "slow" gives more time to echo.
      const cue = setTimeout(() => setYourTurn(true), CLIP_LEAD_MS)
      const step = setTimeout(advance, CLIP_LEAD_MS + AUTOPLAY_SPEEDS[speed])
      return () => { clearTimeout(cue); clearTimeout(step) }
    }
    const step = setTimeout(advance, AUTOPLAY_SPEEDS[speed])
    return () => clearTimeout(step)
  }, [tab, playing, idx, speed, seq, play, sayWithMe, autoAdvance, order])

  // Stop autoplay when leaving the auto tab.
  useEffect(() => { if (tab !== 'auto') setPlaying(false) }, [tab])

  // Say-it: play the model sound as each new letter appears.
  useEffect(() => {
    if (tab !== 'say') return
    setFeedback(null)
    setMicState((s) => (s === 'nomic' ? s : 'idle'))
    const timer = setTimeout(() => play(form), 250)
    return () => clearTimeout(timer)
  }, [tab, idx]) // eslint-disable-line react-hooks/exhaustive-deps

  const reshuffle = () => { setSeed((s) => (s % 9973) + 7); setIdx(0); setFeedback(null) }
  const step = (d) => { setPlaying(false); setIdx((i) => (i + d + seq.length) % seq.length) }

  const doSayIt = async () => {
    setMicState('busy')
    setFeedback(null)
    try {
      const sample = await sampleMic(1500)
      const g = gradePronunciation(sample)
      setFeedback(g)
      setMicState('result')
      setStats((s) => ({
        correct: s.correct + (g.accept ? 1 : 0),
        total: s.total + 1,
        missed: g.accept ? s.missed : [...s.missed, form.audioKey],
      }))
      if (g.accept) {
        setTimeout(() => setIdx((i) => (i + 1) % seq.length), 950)
      } else {
        setTimeout(() => play(form), 500) // coach: replay the model sound
      }
    } catch {
      setMicState('nomic')
    }
  }

  const accuracy = sessionAccuracy(stats)

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-12 pt-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="text-xl font-black leading-tight">{t('masterTitle', 'Fidel Master')}</h1>
        <span className="ml-auto text-sm font-black" style={{ color: 'var(--muted)' }}>{ALL_FORMS.length} {t('masterLetters', 'letters')}</span>
      </header>

      {/* Tabs */}
      <div className="mt-4 flex gap-2 rounded-2xl p-1" style={{ background: 'var(--card)', border: '2px solid var(--line)' }}>
        {TABS.map((tb) => {
          const on = tab === tb.id
          return (
            <button key={tb.id} type="button" onClick={() => setTab(tb.id)} aria-pressed={on}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-black ${FOCUS}`}
              style={{ background: on ? 'var(--sky)' : 'transparent', color: on ? '#fff' : 'var(--muted)', outlineColor: 'var(--accent)' }}>
              {tb.icon && <tb.icon className="h-4 w-4" aria-hidden="true" />}
              {t(tb.key, tb.label)}
            </button>
          )
        })}
      </div>

      {/* CHART (home): a bright, tappable abugida. Tap a family to hear its
          base letter and reveal its seven orders; or play the whole abugida. */}
      {tab === 'chart' && (
        <div className="mt-4 flex flex-col gap-4">
          <button type="button" onClick={() => { setOrder(null); setMix(true); reshuffle(); setTab('auto'); setPlaying(true) }}
            className={`chunk flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-rose-400 to-amber-400 px-5 py-4 text-lg font-black text-white ${FOCUS}`}
            style={{ boxShadow: '0 5px 0 rgba(0,0,0,0.18)', '--chunk-depth': '5px', outlineColor: 'var(--sky)' }}>
            <Shuffle className="h-6 w-6" aria-hidden="true" /> {t('masterPlayAbugida', 'Play the whole Abugida')}
          </button>

          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {FIDEL_FAMILIES.map((fam) => {
              const fi = fam.familyIndex ?? FIDEL_FAMILIES.indexOf(fam)
              const base = formOf(`${fam.id}-1`)
              const open = openFam === fam.id
              return (
                <button key={fam.id} type="button"
                  onClick={() => { play(base); setOpenFam(open ? null : fam.id) }}
                  aria-label={`Hear ${base?.char}`}
                  className={`chunk flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br ${gradOf(fi)} px-2 py-3 text-white ${FOCUS} ${open ? 'ring-4 ring-white/80' : ''}`}
                  style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.18)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
                  <span className="geez text-3xl font-black drop-shadow-md sm:text-4xl">{base?.char}</span>
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-black">{base?.sound}</span>
                </button>
              )
            })}
          </div>

          {/* Expanded family: its seven orders, coloured to match the tile */}
          {openFam && (() => {
            const fam = FIDEL_FAMILIES.find((f) => f.id === openFam)
            const fi = fam?.familyIndex ?? 0
            return (
              <motion.div key={openFam} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl bg-gradient-to-br ${gradOf(fi)} p-3`}>
                <p className="mb-2 px-1 text-sm font-black text-white/90">{fam?.name} · {ORDERS.length} orders</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {ORDERS.map((o) => {
                    const f = formOf(`${fam.id}-${o.index}`)
                    return (
                      <button key={o.index} type="button" onClick={() => play(f)} aria-label={`Hear ${f?.char}`}
                        className={`flex flex-col items-center rounded-xl bg-white/90 px-1 py-2 dark:bg-gray-900/80 ${FOCUS}`} style={{ outlineColor: '#fff' }}>
                        <span className="geez text-2xl font-black" style={{ color: 'var(--ink)' }}>{f?.char}</span>
                        <span className="mono text-[10px] font-black" style={{ color: 'var(--muted)' }}>{f?.sound}</span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )
          })()}
        </div>
      )}

      {/* AUTO-VOICE + SAY-IT share the big current-letter card */}
      {(tab === 'auto' || tab === 'say') && (
        <div className="mt-4 flex flex-col items-center gap-4">
          {/* Vowel-order selector: master one vowel at a time, or the abugida */}
          <div className="w-full overflow-x-auto pb-1">
            <div className="flex gap-1.5">
              <OrderChip active={order == null} label={t('masterAbugida', 'Abugida')} onClick={() => { setOrder(null); setIdx(0); setFeedback(null) }} />
              {ORDERS.map((o) => (
                <OrderChip key={o.index} active={order === o.index} label={o.geezName} sub={o.vowel} onClick={() => { setOrder(o.index); setIdx(0); setFeedback(null) }} />
              ))}
            </div>
          </div>

          <div className="flex w-full items-center justify-between text-sm font-black" style={{ color: 'var(--muted)' }}>
            <button type="button" onClick={() => setMix((m) => !m)} className={`flex items-center gap-1 rounded-lg px-2 py-1 ${FOCUS}`} style={{ outlineColor: 'var(--sky)' }} aria-pressed={mix}>
              <Shuffle className="h-4 w-4" aria-hidden="true" /> {mix ? t('masterMixed', 'Mixed') : t('masterInOrder', 'In order')}
            </button>
            <span>{idx + 1} / {seq.length}</span>
            <button type="button" onClick={reshuffle} className={`flex items-center gap-1 rounded-lg px-2 py-1 ${FOCUS}`} style={{ outlineColor: 'var(--sky)' }} aria-label={t('masterReshuffle', 'Reshuffle')}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <motion.button
            key={form?.audioKey}
            type="button"
            onClick={() => play(form)}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`geez flex h-56 w-56 items-center justify-center rounded-3xl text-9xl font-black text-white ${FOCUS}`}
            style={{ background: 'radial-gradient(circle at 34% 28%, var(--sky), var(--sky-deep))', boxShadow: '0 10px 24px rgba(0,0,0,0.25)', outlineColor: 'var(--accent)' }}
            aria-label={`Hear ${form?.char}`}
          >
            {form?.char}
          </motion.button>
          <p className="mono text-2xl font-black" style={{ color: 'var(--sky)' }}>{form?.sound}</p>

          {/* "Your turn" echo cue during the say-with-me repeat window */}
          {tab === 'auto' && sayWithMe && (
            <div className="flex items-center" style={{ minHeight: 30 }}>
              <AnimatePresence>
                {yourTurn && (
                  <motion.p key="turn" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-lg font-black" style={{ color: 'var(--go-ink)' }}>
                    <Mic className="h-5 w-5" aria-hidden="true" /> {t('yourTurn', 'Now you say it!')}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {tab === 'auto' && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => step(-1)} className={`chunk flex h-12 w-12 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--muted)', outlineColor: 'var(--sky)' }} aria-label="Previous">
                  <ArrowRight className="h-6 w-6 rotate-180" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setPlaying((p) => !p)} className={`chunk flex h-16 w-16 items-center justify-center rounded-full text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 5px 0 var(--go-deep)', '--chunk-depth': '5px', outlineColor: 'var(--sky)' }} aria-label={playing ? t('masterPause', 'Pause') : t('masterPlay', 'Play')}>
                  {playing ? <Pause className="h-8 w-8" aria-hidden="true" /> : <Play className="h-8 w-8" aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => step(1)} className={`chunk flex h-12 w-12 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--muted)', outlineColor: 'var(--sky)' }} aria-label="Next">
                  <ArrowRight className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4" style={{ color: 'var(--muted)' }} aria-hidden="true" />
                {SPEED_ORDER.map((s) => (
                  <button key={s} type="button" onClick={() => setSpeed(s)} aria-pressed={speed === s}
                    className={`rounded-full px-3 py-1 text-sm font-black ${FOCUS}`}
                    style={{ background: speed === s ? 'var(--sky)' : 'var(--card)', color: speed === s ? '#fff' : 'var(--muted)', border: '2px solid var(--line)', outlineColor: 'var(--accent)' }}>
                    {t(`speed_${s}`, s)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <ToggleChip on={sayWithMe} icon={Users} label={t('sayWithMe', 'Say with me')} onClick={() => setSayWithMe((v) => !v)} />
                {order != null && (
                  <ToggleChip on={autoAdvance} icon={ArrowRight} label={t('nextVowel', 'Then next vowel')} onClick={() => setAutoAdvance((v) => !v)} />
                )}
              </div>
            </div>
          )}

          {tab === 'say' && (
            <div className="flex w-full flex-col items-center gap-3">
              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.p key={feedback.grade + idx} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-2xl font-black" style={{ color: feedback.accept ? 'var(--go-ink)' : 'var(--accent)' }}>
                    {feedback.grade === 'great' ? t('sayGreat', 'Perfect! ⭐') : feedback.grade === 'good' ? t('sayGood', 'Nice try!') : t('sayAgain', 'Say it again with me')}
                  </motion.p>
                )}
              </AnimatePresence>

              {micState === 'nomic' ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-center text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('sayNoMic', 'No microphone — say it out loud, then tap Next!')}</p>
                  <button type="button" onClick={() => setIdx((i) => (i + 1) % seq.length)} className={`chunk flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
                    <Check className="h-5 w-5" aria-hidden="true" /> {t('sayISaidIt', 'I said it!')}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={doSayIt} disabled={micState === 'busy'}
                  className={`chunk flex items-center gap-2 rounded-2xl px-7 py-3 font-black text-white disabled:opacity-70 ${FOCUS}`}
                  style={{ background: micState === 'busy' ? 'var(--bad)' : 'var(--accent)', boxShadow: `0 4px 0 ${micState === 'busy' ? 'var(--bad-ink)' : 'var(--accent-deep, #a15b00)'}`, '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
                  <Mic className="h-6 w-6" aria-hidden="true" /> {micState === 'busy' ? t('sayListening', 'Listening...') : t('saySayIt', 'Say it')}
                </button>
              )}

              {accuracy != null && (
                <p className="text-sm font-black" style={{ color: 'var(--muted)' }}>
                  {t('sayScore', 'Score')}: {accuracy}% · {stats.correct}/{stats.total}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
