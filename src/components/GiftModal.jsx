/* "Send this app as a gift" - a share-style sheet that walks a grown-up through
   Apple's built-in Gift App flow (see src/platform/gift.js for why this is the
   honest path: Apple has no deep link to the gift sheet, so we open the store
   page and show the two taps). Apple-only, since Google Play has no per-app
   gifting. Nothing here handles money or data - Apple owns the whole purchase. */
import { motion } from 'framer-motion'
import { Gift, X, ExternalLink } from 'lucide-react'
import { canOpenAppStore, openAppStoreForGift } from '../platform/gift'
import { isNativePlatform } from '../platform/native'
import { track } from '../platform/analytics'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

const STEPS = [
  'Tap "Open App Store" below to go to the Fidel Quest page.',
  'On that page, tap the share button (the box with an arrow, or the ...).',
  'Choose "Gift App".',
  "Enter the child's (or their parent's) email, add a note, and send.",
]

export default function GiftModal({ onClose }) {
  const ready = canOpenAppStore()
  const open = () => {
    if (!openAppStoreForGift(isNativePlatform())) return
    track('gift_open_store')
  }
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Send Fidel Quest as a gift"
        className="flex w-full max-w-md flex-col rounded-3xl p-5"
        style={{ background: 'var(--paper)' }}
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: 'var(--accent)' }} aria-hidden="true">
              <Gift className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black leading-tight">Send this app as a gift</h2>
              <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                Give Fidel Quest to a child on their iPhone or iPad
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
            <X className="h-6 w-6" />
          </button>
        </div>

        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Apple handles the payment and gives you a one-time gift. The child
          redeems it once on their device, then it is used up.
        </p>

        <ol className="mt-4 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: 'var(--sky)' }} aria-hidden="true">
                {i + 1}
              </span>
              <span className="text-sm font-semibold leading-snug" style={{ color: 'var(--ink)' }}>
                {step}
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={open}
          disabled={!ready}
          className={`chunk mt-5 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-extrabold text-white ${FOCUS}`}
          style={{
            background: ready ? 'var(--accent)' : 'var(--line)',
            boxShadow: ready ? '0 4px 0 var(--accent-deep)' : 'none',
            '--chunk-depth': '4px',
            outlineColor: 'var(--sky)',
            cursor: ready ? 'pointer' : 'not-allowed',
          }}
        >
          <ExternalLink className="h-5 w-5" aria-hidden="true" />
          Open App Store
        </button>
        {!ready && (
          <p className="mt-2 text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            Available once Fidel Quest is published on the App Store.
          </p>
        )}
        {ready && (
          <p className="mt-2 text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            Gifting works on Apple devices. On Android, share the app link instead.
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}
