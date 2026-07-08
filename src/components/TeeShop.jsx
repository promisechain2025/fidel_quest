import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Lock, Download, ShoppingBag, X, Check } from 'lucide-react'
import { TEE_DESIGNS, teeUnlocked, unlockedTees, nextTeeAt, markTeesSeen, teeName } from '../tees'
import { wornLayers } from '../journey'
import { t, getLang } from '../platform/i18n'
import { track } from '../platform/analytics'
import { drawTee, saveTee, orderTee, shopConfigured } from './TeeCard'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

/** Canvas thumbnail/preview of one tee design. */
function TeeCanvas({ design, forms, worn, size = 150, dim = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = c.height = Math.round(size * 2) // crisp on retina
    const g = c.getContext('2d')
    if (!g) return
    drawTee(g, c.width, design, { forms, worn })
  }, [design, forms, worn, size])
  return (
    <canvas
      ref={ref}
      className="rounded-2xl"
      style={{ width: size, height: size, filter: dim ? 'grayscale(0.85) opacity(0.55)' : 'none' }}
      aria-hidden="true"
    />
  )
}

/* Tee Shop: the reward-to-merch loop. Each chapter mastered unlocks a shirt
   design; parents can save it or order a real one. Opt-in and offline-safe. */
export default function TeeShop({ stats, collection, onBack }) {
  const lang = getLang()
  const forms = stats.forms
  const families = stats.families
  const worn = wornLayers(collection)
  const [preview, setPreview] = useState(null)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const nextAt = nextTeeAt(families)

  // Seeing the shop clears the "new design" badge for everything unlocked.
  useEffect(() => {
    track('tee_view')
    markTeesSeen(unlockedTees(families).map((d) => d.id))
  }, [families])

  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const doSave = async (design) => {
    setBusy(true)
    const r = await saveTee(design, { forms, worn })
    setBusy(false)
    if (r === 'downloaded') flash(t('teeSaved', 'Design saved! Print it anywhere.'))
  }
  const doOrder = async (design) => {
    setBusy(true)
    const r = await orderTee(design, { forms, worn })
    setBusy(false)
    if (r === 'saved') flash(t('teeSaved', 'Design saved! Print it anywhere.'))
    else if (r === 'ordered') flash(t('teeOrdered', 'Opening the shop for a grown-up...'))
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-12 pt-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="text-xl font-black leading-tight">{t('teeTitle', 'Anbessa Tee Shop')}</h1>
      </header>

      <p className="mt-3 rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: 'var(--card)', border: '2px solid var(--line)', color: 'var(--muted)' }}>
        {t('teeIntro', 'Earn a new shirt design every chapter — Anbessa wears your alphabet! Save the picture or ask a grown-up to order a real shirt.')}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        {TEE_DESIGNS.map((design) => {
          const unlocked = teeUnlocked(design, families)
          return (
            <button
              key={design.id}
              type="button"
              disabled={!unlocked}
              onClick={() => unlocked && setPreview(design)}
              aria-label={unlocked ? `${teeName(design, lang)} — open` : `${teeName(design, lang)} — locked, learn ${design.unlock} letters`}
              className={`chunk relative flex flex-col items-center gap-2 rounded-3xl p-3 ${FOCUS}`}
              style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)', '--chunk-depth': '4px', outlineColor: 'var(--sky)', cursor: unlocked ? 'pointer' : 'default' }}
            >
              <TeeCanvas design={design} forms={forms} worn={worn} size={140} dim={!unlocked} />
              <span className="text-center text-sm font-black leading-tight">{teeName(design, lang)}</span>
              {unlocked ? (
                <span className="text-[11px] font-bold" style={{ color: 'var(--go-ink)' }}>{t('teeUnlocked', 'Unlocked!')}</span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--muted)' }}>
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('teeLockedAt', `Learn ${design.unlock} letters`, { n: design.unlock })}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {nextAt != null && (
        <p className="mt-5 text-center text-sm font-bold" style={{ color: 'var(--muted)' }}>
          {t('teeNext', `Learn ${Math.max(0, nextAt - families)} more families to unlock the next shirt!`, { n: Math.max(0, nextAt - families) })}
        </p>
      )}

      {/* Preview + purchase modal */}
      <AnimatePresence>
        {preview && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreview(null)}>
            <motion.div role="dialog" aria-modal="true" aria-label={teeName(preview, lang)} className="w-full max-w-sm rounded-3xl p-5" style={{ background: 'var(--paper)' }} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-black">{teeName(preview, lang)}{lang === 'en' && <span className="geez font-black" style={{ color: 'var(--muted)' }}> · {preview.am}</span>}</h2>
                <button type="button" onClick={() => setPreview(null)} aria-label="Close" className={`flex h-9 w-9 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex justify-center">
                <TeeCanvas design={preview} forms={forms} worn={worn} size={230} />
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => doOrder(preview)}
                  disabled={busy}
                  className={`chunk flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-black text-white disabled:opacity-60 ${FOCUS}`}
                  style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}
                >
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" /> {t('teeOrder', 'Order a real shirt')}
                </button>
                <button
                  type="button"
                  onClick={() => doSave(preview)}
                  disabled={busy}
                  className={`chunk flex items-center justify-center gap-2 rounded-2xl px-6 py-2.5 font-black disabled:opacity-60 ${FOCUS}`}
                  style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}
                >
                  <Download className="h-5 w-5" aria-hidden="true" /> {t('teeSave', 'Save the design')}
                </button>
                <p className="mt-1 text-center text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
                  {shopConfigured() ? t('teeGrownup', 'Ordering opens a shop — ask a grown-up.') : t('teeSaveHint', 'Save the picture and print it on any shirt.')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-2xl px-5 py-3 font-black text-white shadow-lg" style={{ background: 'var(--go)' }}>
            <Check className="h-5 w-5" aria-hidden="true" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
