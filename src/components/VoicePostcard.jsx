/* Voice Postcard: the reverse of Family Voice. The child records a short
   message ("Selam!", their newest letters, anything) and the app packages it
   as a warm card image + a WAV voice note, shared together to the family
   WhatsApp thread. Research on distributed immigrant families shows shared
   artifacts beat awkward translated calls - this is the child's voice
   travelling back to the grandparent, in the family's language.
   Recording stays on-device; nothing leaves until a grown-up passes the gate
   and picks a share target. */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Mic, Square, Play, RotateCcw, Send } from 'lucide-react'
import { t } from '../platform/i18n'
import { playEffect } from '../platform/audioEngine'
import { getActivePackId } from '../platform/ethiopic'
import { startRecorder, normalizeClip, recordSupported } from '../platform/voicePack'
import { shareVoicePostcard, appShareUrl } from './ShareCard'
import ParentalGate from './ParentalGate'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const MAX_SECONDS = 20
const RECORD_ENABLED = import.meta.env?.VITE_FAMILY_VOICE_RECORD !== 'false'

/* What the RECIPIENT reads is written in the family's heritage language -
   the learning pack (Amharic or Tigrinya) - regardless of the child's UI
   language. The child speaks to Gashe / Ayay in the first person: "I am
   learning the fidel to know my culture and my roots - may your
   encouragement never leave me." Text provided by the product owner. */
const RECIPIENT_STRINGS = {
  am: {
    card: ['ጋሼ ባህሌናና ሕብረተሰቤን ለማወቅ ፊደላት እየተማርኩ ነው።', 'ብርታትህ ኣይለየኝ።'],
    shareText: 'ጋሼ ባህሌናና ሕብረተሰቤን ለማወቅ ፊደላት እየተማርኩ ነው። ብርታትህ ኣይለየኝ።',
  },
  ti: {
    card: ['ኣያይ ባሕለይን መበቆለይን ንምፍላጥ ትግርኛ ፊደል እምሃር ኣለኹ።', 'መትብባዕኹም ኣይፈለየኒ'],
    shareText: 'ኣያይ ባሕለይን መበቆለይን ንምፍላጥ ትግርኛ ፊደል እምሃር ኣለኹ። መትብባዕኹም ኣይፈለየኒ',
  },
}
/* The link line stays in English on purpose - it matches every other share
   in the app (Anbessa card, name card), while the personal message above it
   speaks to Gashe / Ayay in the family's language. */
const SHARE_INVITE = 'Share Fidel Quest with others:'
/* Future: once the paid store listing is live, the postcard can also invite
   Gashe / Ayay to gift back - a real Tee Shop shirt or an App Store gift
   (platform/gift.js) - closing the loop in both directions. */

export default function VoicePostcard({ worn = [], soundOn = true, onBack }) {
  const [phase, setPhase] = useState('idle') // idle | recording | ready | gate | sending | sent
  const [clip, setClip] = useState(null) // WAV blob
  const [seconds, setSeconds] = useState(0)
  const [toast, setToast] = useState(null)
  const recRef = useRef(null)
  const timerRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => () => { recRef.current?.cancel?.(); clearInterval(timerRef.current) }, [])
  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  const name = (() => { try { return (localStorage.getItem('fq.nickname') || '').trim() } catch { return '' } })()

  const begin = async () => {
    try {
      recRef.current = await startRecorder()
      setSeconds(0)
      setPhase('recording')
      timerRef.current = setInterval(() => setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) finish()
        return s + 1
      }), 1000)
    } catch {
      setToast(t('fvNoMic', 'Recording needs a microphone — use a phone or tablet.'))
    }
  }

  const finish = async () => {
    clearInterval(timerRef.current)
    const rec = recRef.current
    recRef.current = null
    if (!rec) return
    const raw = await rec.stop()
    // Normalize to WAV so it plays on any device the family owns.
    const wav = await normalizeClip(raw)
    setClip(wav)
    setPhase('ready')
    playEffect('good', soundOn)
  }

  const replay = () => {
    if (!clip) return
    try {
      audioRef.current?.pause?.()
      audioRef.current = new Audio(URL.createObjectURL(clip))
      audioRef.current.play()
    } catch { /* no Audio (tests) */ }
  }

  const send = async () => {
    setPhase('sending')
    const r = RECIPIENT_STRINGS[getActivePackId()] || RECIPIENT_STRINGS.am
    // Sign with the child's nickname when set, then add the app link with an
    // invite so Gashe / Ayay can pass Fidel Quest on to others.
    const url = appShareUrl()
    const message = name ? `${r.shareText} — ${name}` : r.shareText
    const result = await shareVoicePostcard({
      voice: clip,
      heading: 'ሰላም!',
      lines: r.card,
      worn,
      text: url ? `${message}\n\n${SHARE_INVITE} ${url}` : message,
    })
    if (result === 'shared') { setPhase('sent'); setToast(t('pcShared', 'Postcard sent!')) }
    else if (result === 'downloaded') { setPhase('sent'); setToast(t('pcSaved', 'Saved! Share it anywhere.')) }
    else setPhase('ready')
  }

  if (phase === 'gate') {
    return (
      <div className="mx-auto min-h-screen max-w-xl px-5 pt-5">
        <button type="button" onClick={() => setPhase('ready')} aria-label={t('back', 'Back')} className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <ParentalGate intro={t('pcGateIntro', 'Sending is for grown-ups — you pick who receives it.')} onOpen={send} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">{t('pcTitle', 'Voice Postcard')}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('pcSub', 'Send your voice to someone you love')}</p>
        </div>
      </header>

      {!RECORD_ENABLED || !recordSupported() ? (
        <p className="mt-10 text-center font-bold" style={{ color: 'var(--muted)' }}>{t('fvNoMic', 'Recording needs a microphone — use a phone or tablet.')}</p>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-6 text-center">
          <p className="max-w-xs text-base font-bold" style={{ color: 'var(--ink)' }}>
            {t('pcHint', 'Say “Selam!”, say your newest letters, or sing — Ayat and Abbat would love to hear you.')}
          </p>

          {/* The one big button */}
          {phase !== 'ready' && phase !== 'sent' && (
            <motion.button
              type="button"
              onClick={phase === 'recording' ? finish : begin}
              animate={phase === 'recording' ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 0.9, repeat: Infinity }}
              className={`flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-full font-black text-white ${FOCUS}`}
              style={{ background: phase === 'recording' ? 'var(--bad)' : 'var(--accent)', boxShadow: `0 6px 0 ${phase === 'recording' ? 'var(--bad-deep)' : 'var(--accent-deep)'}`, outlineColor: 'var(--sky)' }}
              aria-label={phase === 'recording' ? t('pcStop', 'Stop') : t('pcRecord', 'Record')}
            >
              {phase === 'recording' ? <Square className="h-9 w-9" fill="currentColor" aria-hidden="true" /> : <Mic className="h-10 w-10" aria-hidden="true" />}
              <span className="text-sm">{phase === 'recording' ? `${seconds}s` : t('pcRecord', 'Record')}</span>
            </motion.button>
          )}

          {(phase === 'ready' || phase === 'sent') && (
            <>
              <div className="flex items-center gap-3">
                <button type="button" onClick={replay} aria-label={t('pcListen', 'Listen')} className={`chunk flex h-16 w-16 items-center justify-center rounded-full text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 5px 0 var(--sky-deep)', '--chunk-depth': '5px', outlineColor: 'var(--accent)' }}>
                  <Play className="h-7 w-7" fill="currentColor" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => { setClip(null); setPhase('idle') }} aria-label={t('pcRedo', 'Record again')} className={`chunk flex h-16 w-16 items-center justify-center rounded-full ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 5px 0 var(--line)', '--chunk-depth': '5px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
                  <RotateCcw className="h-7 w-7" aria-hidden="true" />
                </button>
              </div>
              <motion.button
                type="button"
                onClick={() => setPhase('gate')}
                disabled={phase === 'sending'}
                animate={phase === 'sent' ? {} : { scale: [1, 1.04, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className={`chunk flex items-center gap-2 rounded-2xl px-7 py-3.5 text-lg font-black text-white disabled:opacity-60 ${FOCUS}`}
                style={{ background: 'var(--go)', boxShadow: '0 5px 0 var(--go-deep)', '--chunk-depth': '5px', outlineColor: 'var(--sky)' }}
              >
                <Send className="h-5 w-5" aria-hidden="true" /> {phase === 'sent' ? t('pcSendAgain', 'Send again') : t('pcSend', 'Send to family')}
              </motion.button>
            </>
          )}

          <p className="max-w-xs text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            {t('pcPrivacy', 'The recording stays on this device. It only travels when a grown-up sends it.')}
          </p>
        </div>
      )}

      {toast && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-x-0 bottom-6 z-50 mx-auto w-max max-w-[90%] rounded-full px-5 py-2.5 text-sm font-black text-white shadow-lg" style={{ background: 'var(--go)' }}>
          {toast}
        </motion.div>
      )}
    </div>
  )
}
