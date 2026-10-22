/* ============================================================================
   CORE LOCK SHEET - a kid tapped a Core-only screen (1.4, VITE_PACKAGES=1)
   ----------------------------------------------------------------------------
   Kid-facing: no English, no price, no Buy button. It only says "ask a
   grown-up" and offers the Grown-Ups door (which has its own ParentalGate,
   where PackageOffer / the rep code live).
   ========================================================================== */
import { Lock, UserRound, X } from 'lucide-react'
import { getActivePackId } from '../platform/ethiopic'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const TXT = {
  ti: { title: 'እዚ ተዓጽዩ ኣሎ', body: 'ንወላዲ ሕተት', open: 'ዓበይቲ', close: 'ዕጸው' },
  am: { title: 'ይህ ተቆልፏል', body: 'ወላጅህን ጠይቅ', open: 'ለወላጆች', close: 'ዝጋ' },
}

export default function CoreLockSheet({ onClose, onGrownUps, pack = getActivePackId() }) {
  const lang = pack === 'ti' ? 'ti' : 'am'
  const T = TXT[lang]
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center" style={{ background: 'rgba(0,0,0,0.55)' }} data-testid="core-lock">
      <div role="dialog" aria-modal="true" aria-labelledby="cl-title" lang={lang} className="w-full max-w-sm rounded-3xl border-2 p-5 text-center" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label={T.close} data-testid="core-lock-close" className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--paper)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <Lock className="mx-auto h-16 w-16" aria-hidden="true" style={{ color: 'var(--muted)' }} />
        <h2 id="cl-title" className="mt-2 text-2xl font-black">{T.title}</h2>
        <p className="mt-1 text-lg font-bold" style={{ color: 'var(--muted)' }}>{T.body}</p>
        <button type="button" onClick={onGrownUps} data-testid="core-lock-grownups" className={`chunk mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 py-2 text-lg font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <UserRound className="h-5 w-5" aria-hidden="true" />{T.open}
        </button>
      </div>
    </div>
  )
}
