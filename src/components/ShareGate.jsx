/* ============================================================================
   SHARE GATE — a parental gate in front of any share / link-out
   ----------------------------------------------------------------------------
   Kids-category rules (Apple 1.3, Google Play Families) require a parental
   gate before a child can open the OS share sheet or any link out. Every
   "Share Anbessa" surface routes its share through this so a child hits the
   same hold-and-answer gate used by Postcards / Support / Teacher / Grown-Ups.

   Usage:
     const { requestShare, gate } = useShareGate()
     <button onClick={() => requestShare(doShare)}>Share</button>
     {gate}   // render once in the component tree
   ========================================================================== */
import { useCallback, useState } from 'react'
import ParentalGate from './ParentalGate'
import { t } from '../platform/i18n'

export function useShareGate() {
  const [pending, setPending] = useState(null) // the share fn awaiting the gate
  const requestShare = useCallback((fn) => setPending(() => fn), [])
  const close = useCallback(() => setPending(null), [])

  const gate = pending ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        className="w-full max-w-sm rounded-3xl px-6 py-3"
        style={{ background: 'var(--card)', border: '2px solid var(--line)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <ParentalGate
          intro={t('shareGateIntro', 'Sharing is for a grown-up — you choose where it goes.')}
          onOpen={() => {
            const fn = pending
            setPending(null)
            fn?.()
          }}
        />
        <button type="button" onClick={close} className="mx-auto block pb-2 text-sm font-bold" style={{ color: 'var(--muted)' }}>
          {t('notNow', 'Not now')}
        </button>
      </div>
    </div>
  ) : null

  return { requestShare, gate }
}
