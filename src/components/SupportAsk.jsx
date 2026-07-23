/* ============================================================================
   SUPPORT ASK — the friendly after-trial dialog (see platform/license.js)
   ----------------------------------------------------------------------------
   Shown at most once per day once the free trial is over. The paths (buy, ask a
   relative to gift it, honest feedback) are ADULT actions, so - per the kids
   store rules (Apple 1.3 / 5.1.4, purchases + links out behind a parental gate)
   - they sit behind the same hold-and-answer gate as the Grown-Ups area. The
   child sees only Anbessa + "ask a grown-up", and can always dismiss (never
   blocked). On native the purchase runs through the in-app purchase (3.1.1),
   not an external link.
   ========================================================================== */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Share2, ShoppingBag } from 'lucide-react'
import { t } from '../platform/i18n'
import { grantFeedbackGrace, licenseState, FEEDBACK_GRACE_DAYS, TRIAL_DAYS } from '../platform/license'
import { buyUrl, feedbackMailto, shareWithFamily } from '../platform/support'
import { iapAvailable, buyFamilyPack } from '../platform/iap'
import ParentalGate from './ParentalGate'
import { Sprite2D, drawAnbessa } from '../FidelQuestApp'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

export default function SupportAsk({ onClose, onFeedbackGranted }) {
  const [unlocked, setUnlocked] = useState(false) // parental gate passed
  const [thanked, setThanked] = useState(false)
  const [iapMsg, setIapMsg] = useState('')
  const buy = buyUrl()
  // the honest-feedback extension is one-time; afterwards buy/gift only
  const [canFeedback] = useState(() => licenseState().feedbackAvailable)

  const feedback = () => {
    grantFeedbackGrace()
    setThanked(true)
    onFeedbackGranted?.()
    try { window.open(feedbackMailto(), '_blank', 'noopener') } catch { /* no mail app */ }
  }
  // Purchases must use in-app purchase where it exists (Apple 3.1.1); the
  // external store link is the web-only fallback.
  const doBuy = async () => {
    setIapMsg('')
    if (iapAvailable()) {
      const r = await buyFamilyPack()
      if (r === 'purchased') { onClose?.(); try { window.location.reload() } catch { /* ignore */ } }
      else if (r === 'error' || r === 'unavailable') setIapMsg('error')
    } else {
      try { window.open(buy, '_blank', 'noopener,noreferrer') } catch { /* no browser */ }
    }
  }

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div role="dialog" aria-modal="true" aria-label={t('payTitle', 'Keep learning with eGeez')} className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl p-6 text-center" style={{ background: 'var(--paper)' }} initial={{ scale: 0.85, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
        <Sprite2D draw={drawAnbessa} size={96} mood="happy" />
        <h2 className="mt-2 text-2xl font-black">{t('payTitle', 'Keep learning with eGeez')}</h2>
        <p className="mt-1 font-bold" style={{ color: 'var(--muted)' }}>
          {t('payBody', 'Your {n}-day free try-out is finished. Buying the app keeps it working for your child - and keeps it growing.', { n: TRIAL_DAYS })}
        </p>

        {!unlocked ? (
          /* Adult-only actions behind the parental gate. */
          <div className="mt-4 flex flex-col items-center gap-2">
            <ParentalGate onOpen={() => setUnlocked(true)} intro={t('payGateIntro', 'This is for a grown-up: buying, gifting, or sending feedback.')} />
            <button type="button" onClick={onClose} className={`text-sm font-extrabold ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
              {t('dismiss', 'Not now')}
            </button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {thanked ? (
              <p className="font-bold" style={{ color: 'var(--go-ink)' }}>
                {t('payFeedbackDone', 'Thank you! {n} more free days added.', { n: FEEDBACK_GRACE_DAYS })}
              </p>
            ) : (
              <>
                {(iapAvailable() || buy) && (
                  <button type="button" onClick={doBuy} className={`chunk flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
                    <ShoppingBag className="h-5 w-5" aria-hidden="true" /> {t('payBuy', 'Buy the app')}
                  </button>
                )}
                {iapMsg === 'error' && (
                  <p className="text-xs font-bold" style={{ color: 'var(--bad-ink)' }}>{t('iapError', 'Purchase is unavailable right now - please try again later.')}</p>
                )}
                <button type="button" onClick={shareWithFamily} className={`chunk flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep)', '--chunk-depth': '4px', outlineColor: 'var(--accent)' }}>
                  <Share2 className="h-5 w-5" aria-hidden="true" /> {t('payFamily', 'Ask family to gift it')}
                </button>
                <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>
                  {t('payFamilyHint', 'No way to pay where you live? A relative anywhere in the world can gift it - share this with them.')}
                </p>
                {canFeedback && (
                  <>
                    <button type="button" onClick={feedback} className={`chunk flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)', '--chunk-depth': '4px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
                      <MessageCircle className="h-5 w-5" aria-hidden="true" /> {t('payFeedback', 'Not buying? Tell us honestly why')}
                    </button>
                    <p className="flex items-center justify-center gap-1 text-xs font-bold" style={{ color: 'var(--muted)' }}>
                      <Heart className="h-3.5 w-3.5" aria-hidden="true" /> {t('payFeedbackHint', 'Honest feedback earns {n} more free days.', { n: FEEDBACK_GRACE_DAYS })}
                    </p>
                  </>
                )}
              </>
            )}
            <button type="button" onClick={onClose} className={`text-sm font-extrabold ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
              {thanked ? t('continue', 'Continue') : t('dismiss', 'Not now')}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
