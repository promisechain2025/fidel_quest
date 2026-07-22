import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Share2, Check } from 'lucide-react'
import { Hero } from '../FidelQuestApp'
import { WEARABLE_SLOTS, ownedInSlot, wornLayers } from '../journey'
import { t } from '../platform/i18n'
import { shareCtaLabel } from '../platform/experiments'
import { shareAnbessa } from './ShareCard'
import { Harag } from './Manuscript'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const SLOT_LABEL = { hat: 'Hats', scarf: 'Scarves', cape: 'Capes' }

/* Anbessa's Closet (the viral loop's home): dress the lion in earned
   wearables, then share a card. The collection is the child's identity and
   the parent's brag - both drive installs. */
export default function Closet({ collection, stats, onEquip, onBack }) {
  const worn = wornLayers(collection)
  const [sharing, setSharing] = useState(false)
  const [toast, setToast] = useState(null)
  const anyOwned = WEARABLE_SLOTS.some((s) => ownedInSlot(collection, s).length > 0)

  const share = async () => {
    setSharing(true)
    const result = await shareAnbessa({ forms: stats.forms, worn })
    setSharing(false)
    if (result === 'downloaded') setToast(t('shareSaved', 'Saved! Share it anywhere.'))
    else if (result === 'shared') setToast(t('shareThanks', 'Thanks for sharing!'))
    if (result === 'downloaded' || result === 'shared') setTimeout(() => setToast(null), 2600)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-12 pt-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="text-xl font-black leading-tight">{t('closetTitle', "Anbessa's Closet")}</h1>
      </header>
      <div className="mt-2 flex justify-center"><Harag /></div>

      {/* Big live preview + progress + share. */}
      <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl p-5" style={{ background: 'var(--card)', border: '2px solid var(--line)' }}>
        <motion.div key={worn.map((w) => w.id).join(',')} initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 15 }}>
          <Hero size={148} worn={worn} />
        </motion.div>
        <p className="text-lg font-black tabular-nums" style={{ color: 'var(--go-ink)' }}>
          {t('lettersLearned', `${stats.forms} / ${stats.totalForms} letters learned`, { n: stats.forms, total: stats.totalForms })}
        </p>
        <button
          type="button"
          onClick={share}
          disabled={sharing}
          className={`chunk flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-white disabled:opacity-60 ${FOCUS}`}
          style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}
        >
          <Share2 className="h-5 w-5" aria-hidden="true" /> {shareCtaLabel(t)}
        </button>
      </div>

      {/* Wardrobe by slot. */}
      {anyOwned ? (
        <div className="mt-6 flex flex-col gap-5">
          {WEARABLE_SLOTS.map((slot) => {
            const items = ownedInSlot(collection, slot)
            if (!items.length) return null
            const wornId = collection?.worn?.[slot]
            return (
              <section key={slot}>
                <h2 className="mb-2 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  {t(`slot.${slot}`, SLOT_LABEL[slot])}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {items.map((item) => {
                    const on = wornId === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onEquip(slot, item.id)}
                        aria-pressed={on}
                        aria-label={`${item.name}${on ? ', worn' : ''}`}
                        className={`chunk relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 ${FOCUS}`}
                        style={{ background: on ? 'var(--go-soft)' : 'var(--card)', borderColor: on ? 'var(--go)' : 'var(--line)', boxShadow: `0 4px 0 ${on ? 'var(--go)' : 'var(--line)'}`, '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}
                      >
                        <Hero size={60} worn={[item]} />
                        {on && <Check className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-white p-0.5" style={{ color: 'var(--go)' }} aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <p className="mt-8 rounded-2xl px-5 py-6 text-center font-bold" style={{ background: 'var(--card)', border: '2px solid var(--line)', color: 'var(--muted)' }}>
          {t('closetEmpty', 'Finish lessons to earn hats, scarves and capes for Anbessa!')}
        </p>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-2xl px-5 py-3 font-black text-white shadow-lg"
            style={{ background: 'var(--go)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
