/* Family Voice: let a grown-up record the letters in their own voice, test it,
   and share it as a file; anyone can import a received voice so Anbessa speaks
   in it. On-device only (IndexedDB); nothing is uploaded. See
   docs/family-voice.md. The child-facing side (import + choose) needs no mic;
   only the grown-up "record" flow does. */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Mic, Square, Play, Check, Share2, Upload, Trash2, Users } from 'lucide-react'
import { t } from '../platform/i18n'
import {
  voiceSlots, LETTER_SLOT_COUNT, GREETING_KEY, recordSupported,
  listVoices, deleteVoice, activeVoiceId, setActiveVoice,
  saveRecordedVoice, importVoiceFromText, exportAndShareVoice, startRecorder,
} from '../platform/voicePack'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
// Recording (the only mic use) can be turned off at build time so a store build
// ships import + playback only and declares no microphone. Default on.
const RECORD_ENABLED = import.meta.env?.VITE_FAMILY_VOICE_RECORD !== 'false'
const playBlob = (blob) => { try { new Audio(URL.createObjectURL(blob)).play() } catch { /* ignore */ } }

export default function FamilyVoice({ onBack }) {
  const [mode, setMode] = useState('home') // 'home' | 'record'
  const [voices, setVoices] = useState([])
  const [active, setActive] = useState(activeVoiceId())
  const [toast, setToast] = useState(null)
  const fileRef = useRef(null)

  const refresh = () => listVoices().then(setVoices)
  useEffect(() => { refresh() }, [])
  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(null), 2200); return () => clearTimeout(id) }, [toast])

  const choose = async (id) => { await setActiveVoice(id); setActive(id); setToast(id ? t('fvNowSpeaking', 'Anbessa now speaks in this voice') : t('fvDefaultVoice', 'Back to the default voice')) }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const id = await importVoiceFromText(await file.text())
      await refresh()
      await choose(id)
      setToast(t('fvImported', 'Voice imported!'))
    } catch {
      setToast(t('fvImportFail', "That file isn't a Fidel Quest voice."))
    }
  }

  if (mode === 'record') {
    return <RecordVoice onDone={async (id) => { await refresh(); if (id) await choose(id); setMode('home') }} onCancel={() => setMode('home')} />
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">{t('fvTitle', 'Family Voice')}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('fvSub', 'Let Anbessa speak in a loved one’s voice')}</p>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-5">
        {/* Who's speaking */}
        <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            <Users className="h-4 w-4" aria-hidden="true" /> {t('fvWhoSpeaks', 'Who’s speaking?')}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <VoiceChip label={t('fvDefault', 'Default')} on={!active} onClick={() => choose(null)} />
            {voices.map((v) => (
              <VoiceChip key={v.id} label={v.name} sub={`${v.count}`} on={active === v.id} onClick={() => choose(v.id)}
                onDelete={async () => { await deleteVoice(v.id); if (active === v.id) setActive(null); refresh() }} />
            ))}
          </div>
          {voices.length === 0 && (
            <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              {t('fvEmpty', 'No family voices yet. Record one, or import a voice a relative sent you.')}
            </p>
          )}
        </section>

        {/* Import */}
        <button type="button" onClick={() => fileRef.current?.click()} className={`chunk flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep)', '--chunk-depth': '4px', outlineColor: 'var(--accent)' }}>
          <Upload className="h-5 w-5" aria-hidden="true" /> {t('fvImport', 'Import a voice')}
        </button>
        <input ref={fileRef} type="file" accept=".fidelvoice,application/json" className="hidden" onChange={onImport} />

        {/* Record (grown-ups) — hidden entirely when recording is disabled */}
        {RECORD_ENABLED && (
        <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{t('fvForGrownups', 'For grown-ups')}</h2>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {t('fvRecordBlurb', 'Record the letters in your own voice, then share the file with your child by WhatsApp. A grandparent far away can record for kids here — and the other way around.')}
          </p>
          {recordSupported() ? (
            <button type="button" onClick={() => setMode('record')} className={`chunk mt-3 flex items-center gap-2 rounded-2xl px-4 py-3 font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--accent)', boxShadow: '0 4px 0 var(--accent-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
              <Mic className="h-5 w-5" aria-hidden="true" /> {t('fvRecordBtn', 'Record a new voice')}
            </button>
          ) : (
            <p className="mt-3 text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('fvNoMic', 'Recording needs a microphone — use a phone or tablet.')}</p>
          )}
        </section>
        )}

        <p className="text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          {t('fvPrivacy', 'Voices stay on this device. Nothing is uploaded — a voice only travels in the file you choose to share.')}
        </p>
      </div>

      {toast && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-x-0 bottom-6 z-50 mx-auto w-max max-w-[90%] rounded-full px-5 py-2.5 text-sm font-black text-white shadow-lg" style={{ background: 'var(--go)' }}>
          {toast}
        </motion.div>
      )}
    </div>
  )
}

function VoiceChip({ label, sub, on, onClick, onDelete }) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-full" style={{ border: '2px solid', borderColor: on ? 'var(--go)' : 'var(--line)', background: on ? 'var(--go)' : 'var(--paper)' }}>
      <button type="button" aria-pressed={on} onClick={onClick} className={`px-3 py-1.5 text-sm font-black ${FOCUS}`} style={{ color: on ? '#fff' : 'var(--ink)', outlineColor: 'var(--sky)' }}>
        {label}{sub ? <span className="ml-1 text-[11px] font-bold opacity-75">{sub}</span> : null}
      </button>
      {onDelete && (
        <button type="button" aria-label={t('fvDelete', 'Delete voice')} onClick={onDelete} className={`px-2 py-1.5 ${FOCUS}`} style={{ color: on ? '#fff' : 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </span>
  )
}

/* ── the grown-up recorder ── */
function RecordVoice({ onDone, onCancel }) {
  const slots = voiceSlots()
  const [name, setName] = useState('')
  const [clips, setClips] = useState({}) // key -> Blob
  const [recKey, setRecKey] = useState(null) // slot currently recording
  const recRef = useRef(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => () => { recRef.current?.cancel?.() }, [])

  const toggleRecord = async (key) => {
    if (recKey && recKey !== key) return
    if (recKey === key) {
      const blob = await recRef.current.stop()
      recRef.current = null
      setRecKey(null)
      if (blob && blob.size) { setClips((c) => ({ ...c, [key]: blob })); playBlob(blob) }
      return
    }
    try {
      recRef.current = await startRecorder()
      setRecKey(key)
    } catch {
      recRef.current = null
    }
  }

  const done = Object.keys(clips).filter((k) => k !== GREETING_KEY).length
  const canSave = done > 0

  const save = async () => {
    setBusy(true)
    const id = await saveRecordedVoice(name.trim(), clips)
    setBusy(false)
    onDone(id)
  }
  const share = async () => {
    setBusy(true)
    await exportAndShareVoice({ name: name.trim() || 'Family', clips, createdAt: Date.now() })
    setBusy(false)
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-28 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onCancel} aria-label={t('back', 'Back')} className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black leading-tight">{t('fvRecordTitle', 'Record your voice')}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('fvRecordHint', 'Tap a letter to record it, tap again to stop. Tap ✓ to hear it back.')}</p>
        </div>
        <span className="mono rounded-full px-3 py-1.5 text-sm font-black" style={{ background: 'var(--card)', border: '2px solid var(--line)' }}>{done}/{LETTER_SLOT_COUNT}</span>
      </header>

      <input
        type="text" value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} maxLength={24}
        placeholder={t('fvNamePh', 'Whose voice? e.g. Grandma')} aria-label={t('fvNameLabel', "Voice name")}
        className={`mt-4 w-full rounded-2xl border-2 px-4 py-3 font-bold ${FOCUS}`}
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
      />

      <div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-6">
        {slots.map((slot) => {
          const has = !!clips[slot.key]
          const rec = recKey === slot.key
          const dim = recKey && !rec
          return (
            <button
              key={slot.key} type="button" disabled={dim}
              onClick={() => (has && !recKey ? playBlob(clips[slot.key]) : toggleRecord(slot.key))}
              className={`geez relative flex aspect-square flex-col items-center justify-center rounded-2xl text-2xl font-black ${FOCUS}`}
              style={{
                background: rec ? 'var(--bad)' : has ? 'var(--go-soft)' : 'var(--card)',
                border: '2px solid', borderColor: rec ? 'var(--bad)' : has ? 'var(--go)' : 'var(--line)',
                color: rec ? '#fff' : has ? 'var(--go-ink)' : 'var(--ink)', opacity: dim ? 0.4 : 1, outlineColor: 'var(--sky)',
              }}
              aria-label={slot.greeting ? t('fvGreetingSlot', 'Greeting') : `${slot.sound}${has ? ' recorded' : ''}`}
            >
              <span className={slot.greeting ? 'text-base not-italic' : ''}>{slot.greeting ? t('fvGreetingShort', 'Hi!') : slot.char}</span>
              <span className="absolute right-1 top-1">
                {rec ? <Square className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" /> : has ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Mic className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />}
              </span>
              {has && !recKey && <Play className="absolute bottom-1 h-3 w-3 opacity-70" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      {/* Sticky actions: use this voice here, or share the file with a child */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-xl gap-2 border-t-2 p-3" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
        <button type="button" onClick={save} disabled={!canSave || busy} className={`chunk flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', opacity: canSave && !busy ? 1 : 0.5, outlineColor: 'var(--sky)' }}>
          <Check className="h-5 w-5" aria-hidden="true" /> {t('fvUseVoice', 'Use it here')}
        </button>
        <button type="button" onClick={share} disabled={!canSave || busy} className={`chunk flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--accent)', boxShadow: '0 4px 0 var(--accent-deep)', '--chunk-depth': '4px', opacity: canSave && !busy ? 1 : 0.5, outlineColor: 'var(--sky)' }}>
          <Share2 className="h-5 w-5" aria-hidden="true" /> {t('fvShare', 'Share with a child')}
        </button>
      </div>
    </div>
  )
}
