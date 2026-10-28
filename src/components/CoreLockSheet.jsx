/* ============================================================================
   LOCK SHEET - a kid tapped a locked package screen (1.4, VITE_PACKAGES=1)
   ----------------------------------------------------------------------------
   One sheet for every locked entry point: Core (games, stories, path past
   unit 1) and the Prayer Book (locked prayers). App text is English only -
   UI text is never Amharic / Tigrinya (Ge'ez learning content is separate).
   Kid-facing: no price, no Buy button (Apple kids rule). It says "ask a
   grown-up" and opens the Grown-Ups door, which has its own ParentalGate and
   then lands on PackageOffer with this package highlighted.
   ========================================================================== */
import { Lock, UserRound, X } from 'lucide-react'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
export const LOCK_BODY = {
  core: 'Ask a grown-up to unlock the full course',
  prayer: 'Ask a grown-up to unlock the Prayer Book',
}

export default function CoreLockSheet({ onClose, onGrownUps, pkg = 'core' }) {
  const p = pkg === 'prayer' ? 'prayer' : 'core'
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center" style={{ background: 'rgba(0,0,0,0.55)' }} data-testid="core-lock" data-pkg={p}>
      <div role="dialog" aria-modal="true" aria-labelledby="cl-title" lang="en" className="w-full max-w-sm rounded-3xl border-2 p-5 text-center" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Close" data-testid="core-lock-close" className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--paper)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <Lock className="mx-auto h-16 w-16" aria-hidden="true" style={{ color: 'var(--muted)' }} />
        <h2 id="cl-title" className="mt-2 text-2xl font-black">This part is locked</h2>
        <p className="mt-1 text-lg font-bold" style={{ color: 'var(--muted)' }}>{LOCK_BODY[p]}</p>
        <button type="button" onClick={() => onGrownUps?.(p)} data-testid="core-lock-grownups" className={`chunk mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 py-2 text-lg font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <UserRound className="h-5 w-5" aria-hidden="true" />Grown-ups: unlock
        </button>
      </div>
    </div>
  )
}
