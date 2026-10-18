/* ============================================================================
   PROFILE SLOT OFFER - the grown-up-facing purchase card (behind a gate)
   ----------------------------------------------------------------------------
   eGeez is a paid app that includes ONE child profile. Each further child
   is a one-time, non-consumable in-app purchase, bought in order, up to 6:
   the 2nd child $4.99, each child after $2.49 (platform/profileSlots.js).
   Prices on screen come from the store (localized); the copy itself names
   no currency.
   This card is the ONLY place the app sells anything, and it is only ever
   rendered behind the parental gate: inside Grown-Ups, or in the profile
   picker after the grown-up has passed the gate. A child never sees a price
   or a Buy button.

   Buy and Restore purchases go through the store (platform/iap.js). Restore
   is always offered next to Buy (Apple requires a restore mechanism for
   non-consumables) and stays reachable in Grown-Ups until all 6 are owned.
   On the web / PWA there is no store, so the card says where the purchase
   can be made instead of showing a dead button.
   ========================================================================== */
import { useEffect, useState } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { t } from '../platform/i18n'
import { isNativePlatform } from '../platform/native'
import { allowedProfiles, MAX_SLOTS } from '../platform/profileSlots'
import { iapAvailable, slotStorePrice, buyNextProfileSlot, restoreProfileSlots } from '../platform/iap'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const primary = { background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }
const ghost = { background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }

/**
 * onUnlocked() runs whenever a purchase / restore raised the profile limit.
 * compact: only the "N of 6" line + Restore purchases (Grown-Ups, when no
 * slot is needed right now). Test seams: `store` overrides iapAvailable(),
 * `native` overrides isNativePlatform().
 */
export default function ProfileSlotOffer({ onUnlocked, compact = false, store, native }) {
  const canBuy = store ?? iapAvailable()
  const onDevice = native ?? isNativePlatform()
  const [allowed, setAllowed] = useState(allowedProfiles)
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState('') // '' | 'buy' | 'restore'
  const [msg, setMsg] = useState('') // '' | 'pending' | 'error' | 'none' | 'unavailable' | 'restored'
  const next = allowed >= MAX_SLOTS ? 0 : allowed + 1

  useEffect(() => {
    let live = true
    setPrice('')
    if (canBuy && next && !compact) slotStorePrice(next).then((p) => { if (live) setPrice(p || '') }).catch(() => {})
    return () => { live = false }
  }, [canBuy, next, compact])

  const after = () => {
    const now = allowedProfiles()
    const raised = now > allowed
    setAllowed(now)
    if (raised) onUnlocked?.(now)
    return raised
  }
  const doBuy = async () => {
    if (busy) return
    setBusy('buy'); setMsg('')
    const r = await buyNextProfileSlot()
    setBusy('')
    if (r === 'purchased') after()
    else if (r === 'pending') setMsg('pending')
    else if (r === 'unavailable') setMsg('unavailable')
    else if (r === 'error') setMsg('error')
  }
  const doRestore = async () => {
    if (busy) return
    setBusy('restore'); setMsg('')
    const r = await restoreProfileSlots()
    setBusy('')
    if (r === 'restored') setMsg(after() ? '' : 'restored')
    else if (r === 'none') setMsg('none')
    else if (r === 'unavailable') setMsg('unavailable')
    else if (r === 'error') setMsg('error')
  }

  const status = msg && (
    <p role="status" className="mt-1.5 text-xs font-bold" style={{ color: msg === 'error' || msg === 'unavailable' ? 'var(--bad-ink)' : 'var(--muted)' }}>
      {msg === 'pending' && t('psPending', 'Waiting for a grown-up to approve the purchase. It unlocks as soon as they do.')}
      {msg === 'none' && t('psNone', 'No profile purchases were found for this App Store or Google Play account.')}
      {msg === 'restored' && t('psRestored', 'Purchases restored. Nothing new to unlock.')}
      {msg === 'error' && t('psError', 'The store did not respond. Check the connection and try again.')}
      {msg === 'unavailable' && t('psUnavailable', 'In-app purchases are not available on this device right now.')}
    </p>
  )
  const restoreBtn = (
    <button type="button" onClick={doRestore} disabled={!!busy} className={`chunk min-h-[44px] rounded-xl px-4 py-2 text-sm font-extrabold disabled:opacity-60 ${FOCUS}`} style={ghost}>
      {busy === 'restore' ? t('psRestoring', 'Checking your purchases…') : t('psRestore', 'Restore purchases')}
    </button>
  )
  const countLine = (
    <p className="flex items-center gap-1.5 text-sm font-extrabold" style={{ color: allowed >= MAX_SLOTS ? 'var(--go-ink)' : 'var(--ink)' }} data-testid="slots-count">
      {allowed >= MAX_SLOTS && <Check className="h-4 w-4" aria-hidden="true" />}
      {allowed >= MAX_SLOTS
        ? t('psAllOwned', 'All 6 kids profiles unlocked on this device.')
        : t('psCount', 'Kids profiles unlocked: {n} of 6', { n: allowed })}
    </p>
  )

  if (compact || !next) {
    return (
      <div data-testid="slots-compact">
        {countLine}
        {canBuy && next > 0 && <div className="mt-2">{restoreBtn}</div>}
        {status}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 p-3" style={{ borderColor: 'var(--line)', background: 'var(--paper)' }} data-testid="slot-offer">
      <p className="flex items-center gap-1.5 text-sm font-black">
        <UserPlus className="h-4 w-4" aria-hidden="true" /> {t('psTitle', 'Add child {n}', { n: next })}
      </p>
      <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
        {t('psBody', 'eGeez includes 1 child profile. Each extra child gets their own player, path, stars and rewards on this device. Every child after the 2nd is half price, up to 6 children. One-time in-app purchases, no subscription.')}
      </p>
      {canBuy ? (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={doBuy} disabled={!!busy} className={`chunk min-h-[44px] rounded-xl px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60 ${FOCUS}`} style={primary}>
              {busy === 'buy'
                ? t('psBusy', 'Opening the store…')
                : price
                  ? t('psBuy', 'Unlock profile {n} ({price})', { n: next, price })
                  : t('psBuyNoPrice', 'Unlock profile {n}', { n: next })}
            </button>
            {restoreBtn}
          </div>
          {status}
        </>
      ) : (
        <p className="mt-1.5 text-xs font-bold" style={{ color: 'var(--muted)' }}>
          {onDevice
            ? t('psUnavailable', 'In-app purchases are not available on this device right now.')
            : t('psStoreOnly', 'Extra kids profiles are in-app purchases in the eGeez app for iPhone, iPad and Android.')}
        </p>
      )}
    </div>
  )
}
