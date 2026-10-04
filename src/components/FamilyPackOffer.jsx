/* ============================================================================
   FAMILY PACK OFFER - the grown-up-facing purchase card (behind a gate)
   ----------------------------------------------------------------------------
   eGeez is a paid app that includes ONE child profile. The Family Pack is a
   one-time, non-consumable in-app purchase (store product id family_pack)
   that unlocks up to 6 children on this device. This card is the ONLY place
   the app sells anything, and it is only ever rendered behind the parental
   gate: inside Grown-Ups, or in the profile picker after the grown-up has
   passed the gate. A child never sees a price or a Buy button.

   Buy and Restore Purchases go through the store (platform/iap.js). Restore
   is always offered next to Buy (Apple requires a restore mechanism for
   non-consumables). On the web / PWA there is no store, so the card says
   where the Family Pack can be bought instead of showing a dead button.
   ========================================================================== */
import { useEffect, useState } from 'react'
import { Check, Users } from 'lucide-react'
import { t } from '../platform/i18n'
import { isNativePlatform } from '../platform/native'
import { familyPackUnlocked } from '../platform/familyPack'
import { iapAvailable, familyPackStorePrice, buyFamilyPack, restoreFamilyPack } from '../platform/iap'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const primary = { background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }
const ghost = { background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }

/**
 * onUnlocked() runs once the Family Pack is owned (bought or restored).
 * Test seams: `store` overrides iapAvailable(), `native` overrides
 * isNativePlatform().
 */
export default function FamilyPackOffer({ onUnlocked, store, native }) {
  const canBuy = store ?? iapAvailable()
  const onDevice = native ?? isNativePlatform()
  const [owned, setOwned] = useState(familyPackUnlocked)
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState('') // '' | 'buy' | 'restore'
  const [msg, setMsg] = useState('') // '' | 'pending' | 'error' | 'none' | 'unavailable'

  useEffect(() => {
    let live = true
    if (canBuy && !owned) familyPackStorePrice().then((p) => { if (live) setPrice(p || '') }).catch(() => {})
    return () => { live = false }
  }, [canBuy, owned])

  const unlocked = () => { setOwned(true); setMsg(''); onUnlocked?.() }
  const doBuy = async () => {
    if (busy) return
    setBusy('buy'); setMsg('')
    const r = await buyFamilyPack()
    setBusy('')
    if (r === 'purchased') unlocked()
    else if (r === 'pending') setMsg('pending')
    else if (r === 'unavailable') setMsg('unavailable')
    else if (r === 'error') setMsg('error')
  }
  const doRestore = async () => {
    if (busy) return
    setBusy('restore'); setMsg('')
    const r = await restoreFamilyPack()
    setBusy('')
    if (r === 'restored') unlocked()
    else if (r === 'none') setMsg('none')
    else if (r === 'unavailable') setMsg('unavailable')
    else setMsg('error')
  }

  if (owned) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-extrabold" style={{ color: 'var(--go-ink)' }} data-testid="family-pack-owned">
        <Check className="h-4 w-4" aria-hidden="true" /> {t('fpOwned', 'Family Pack unlocked: up to 6 children on this device.')}
      </p>
    )
  }

  return (
    <div className="rounded-2xl border-2 p-3" style={{ borderColor: 'var(--line)', background: 'var(--paper)' }} data-testid="family-pack-offer">
      <p className="flex items-center gap-1.5 text-sm font-black">
        <Users className="h-4 w-4" aria-hidden="true" /> {t('fpTitle', 'Family Pack')}
      </p>
      <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
        {t('fpBody', 'eGeez includes 1 child profile. The Family Pack is a one-time in-app purchase that gives up to 6 children their own player, path, stars and rewards on this device. No subscription.')}
      </p>
      {canBuy ? (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={doBuy} disabled={!!busy} className={`chunk min-h-[44px] rounded-xl px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60 ${FOCUS}`} style={primary}>
              {busy === 'buy'
                ? t('fpBusy', 'Opening the store…')
                : price
                  ? t('fpBuy', 'Get the Family Pack ({price})', { price })
                  : t('fpBuyNoPrice', 'Get the Family Pack')}
            </button>
            <button type="button" onClick={doRestore} disabled={!!busy} className={`chunk min-h-[44px] rounded-xl px-4 py-2 text-sm font-extrabold disabled:opacity-60 ${FOCUS}`} style={ghost}>
              {busy === 'restore' ? t('fpRestoring', 'Checking your purchases…') : t('fpRestore', 'Restore purchases')}
            </button>
          </div>
          {msg && (
            <p role="status" className="mt-1.5 text-xs font-bold" style={{ color: msg === 'error' || msg === 'unavailable' ? 'var(--bad-ink)' : 'var(--muted)' }}>
              {msg === 'pending' && t('fpPending', 'Waiting for a grown-up to approve the purchase. It unlocks as soon as they do.')}
              {msg === 'none' && t('fpNone', 'No Family Pack was found for this App Store or Google Play account.')}
              {msg === 'error' && t('fpError', 'The store did not respond. Check the connection and try again.')}
              {msg === 'unavailable' && t('fpUnavailable', 'In-app purchases are not available on this device right now.')}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1.5 text-xs font-bold" style={{ color: 'var(--muted)' }}>
          {onDevice
            ? t('fpUnavailable', 'In-app purchases are not available on this device right now.')
            : t('fpStoreOnly', 'The Family Pack is an in-app purchase in the eGeez app for iPhone, iPad and Android.')}
        </p>
      )}
    </div>
  )
}
