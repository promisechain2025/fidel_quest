/* Write your name in Fidel: a kid-sized syllabary keyboard. Pick a vowel sound,
   then tap a letter to add that syllable — exactly how Amharic is written, one
   consonant+vowel glyph at a time. The finished name renders onto a share card
   (components/ShareCard.jsx). On-device only; nothing leaves unless shared. */
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Volume2, Delete, Eraser, Share2 } from 'lucide-react'
import { t } from '../platform/i18n'
import { FIDEL_FAMILIES, ORDERS, INDEXES } from '../platform/ethiopic'
import { playForm } from '../platform/audioEngine'
import { shareName } from './ShareCard'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOf = (key) => INDEXES.byAudioKey.get(key)

export default function NameInFidel({ onBack, soundOn = true, worn = [] }) {
  const [order, setOrder] = useState(1) // the selected vowel order (1-7)
  const [letters, setLetters] = useState([]) // built-up array of form objects
  const [busy, setBusy] = useState(false)

  // The hear-the-name playback chain, cancellable so it stops on Clear /
  // Back / a re-tap instead of playing over whatever screen comes next.
  const playTimers = useRef([])
  const stopPlayback = () => { playTimers.current.forEach(clearTimeout); playTimers.current = [] }
  useEffect(() => stopPlayback, [])

  const append = (fam) => {
    const form = formOf(`${fam.id}-${order}`)
    if (!form) return
    playForm(form, soundOn)
    setLetters((ls) => [...ls, form])
  }
  const backspace = () => { stopPlayback(); setLetters((ls) => ls.slice(0, -1)) }
  const clearAll = () => { stopPlayback(); setLetters([]) }
  const playAll = () => {
    stopPlayback()
    playTimers.current = letters.map((f, i) => setTimeout(() => playForm(f, soundOn), i * 620))
  }

  const nameGeez = letters.map((f) => f.char).join('')
  const latin = letters.map((f) => f.sound).join('')

  const share = async () => {
    if (!letters.length) return
    setBusy(true)
    try { await shareName({ name: nameGeez, latin, worn }) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">{t('nameTitle', 'Write your name')}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('nameSub', 'Spell it in Fidel, one sound at a time')}</p>
        </div>
      </header>

      {/* The name so far */}
      <section className="mt-5 rounded-3xl border-2 p-4 text-center" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        {letters.length ? (
          <>
            <p className="geez break-words text-5xl font-black leading-tight" style={{ color: 'var(--ink)' }}>{nameGeez}</p>
            <p className="mt-1 text-sm font-bold" style={{ color: 'var(--muted)' }}>{latin}</p>
          </>
        ) : (
          <p className="py-2 text-base font-bold" style={{ color: 'var(--muted)' }}>{t('nameHint', 'Pick a vowel sound below, then tap letters to spell your name.')}</p>
        )}
        <div className="mt-3 flex justify-center gap-2">
          <button type="button" onClick={playAll} disabled={!letters.length} aria-label={t('namePlay', 'Hear the name')} className={`chunk flex h-10 w-10 items-center justify-center rounded-2xl disabled:opacity-40 ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', color: '#fff', outlineColor: 'var(--accent)' }}>
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={backspace} disabled={!letters.length} aria-label={t('nameBackspace', 'Remove last letter')} className={`chunk flex h-10 w-10 items-center justify-center rounded-2xl disabled:opacity-40 ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
            <Delete className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={clearAll} disabled={!letters.length} aria-label={t('nameClear', 'Clear')} className={`chunk flex h-10 w-10 items-center justify-center rounded-2xl disabled:opacity-40 ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
            <Eraser className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Vowel-sound selector */}
      <div className="mt-5">
        <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{t('nameVowel', 'Vowel sound')}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {ORDERS.map((o) => (
            <button key={o.index} type="button" aria-pressed={order === o.index} onClick={() => setOrder(o.index)} className={`chunk min-w-[3rem] rounded-2xl px-3 py-2 text-center font-black ${FOCUS}`} style={order === o.index
              ? { background: 'var(--accent)', boxShadow: '0 3px 0 var(--accent-deep)', '--chunk-depth': '3px', color: '#fff', outlineColor: 'var(--sky)' }
              : { background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
              <span className="geez block text-xl leading-none">{formOf(`ke-${o.index}`)?.char}</span>
              <span className="mt-0.5 block text-[11px] font-bold opacity-80">{o.vowel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Letter keyboard */}
      <div className="mt-5">
        <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{t('nameLetters', 'Letters')}</h2>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {FIDEL_FAMILIES.map((fam) => {
            const form = formOf(`${fam.id}-${order}`)
            return (
              <button key={fam.id} type="button" onClick={() => append(fam)} aria-label={form?.sound || fam.name} className={`chunk flex aspect-square flex-col items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
                <span className="geez text-2xl font-black leading-none" style={{ color: 'var(--ink)' }}>{form?.char}</span>
                <span className="mt-0.5 text-[10px] font-bold leading-none" style={{ color: 'var(--muted)' }}>{form?.sound}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Share */}
      <button type="button" onClick={share} disabled={busy || !letters.length} className={`chunk mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 font-black text-white disabled:opacity-50 ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
        <Share2 className="h-5 w-5" aria-hidden="true" /> {t('nameShare', 'Share my name')}
      </button>
      <p className="mt-3 text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>
        {t('namePrivacy', 'The card is made on this device. Nothing is shared unless you tap Share.')}
      </p>
    </div>
  )
}
