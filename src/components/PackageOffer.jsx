/* ============================================================================
   PACKAGE OFFER - buy Core / Prayer Book / both (Grown-Ups, native, 1.4)
   ----------------------------------------------------------------------------
   Only in the free-download build (VITE_PACKAGES=1) and only inside
   Grown-Ups (behind the parental gate): a child never sees a price or a Buy
   button. Prices come from the store (localized). Restore purchases sits
   next to Buy (Apple 3.1.1). No links or prices that point outside the
   store (anti-steering). Renders nothing when packages are off.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react'
import { Check, ShoppingBag } from 'lucide-react'
import { packagesEnabled, packagesToOffer, ownedContent, PACKAGE_PRICE_FALLBACK } from '../platform/packages'
import { iapAvailable, buyPackage, packageStorePrice, restorePurchases } from '../platform/iap'
import { PKG_NAMES } from './RepCodeCard'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const primary = { background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }
const ghost = { background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }
const MSG = {
  pending: 'Waiting for a grown-up to approve.',
  error: 'Something went wrong. Try again.',
  none: 'No purchases found for this store account.',
  restored: 'Purchases restored.',
  unavailable: 'The store is not available right now.',
}

/** Test / screenshot seams: enabled, store, buy, restore, priceOf.
    highlight: 'core' | 'prayer' - the package a kid's lock sheet asked for. */
export default function PackageOffer({ enabled, store, buy = buyPackage, restore = restorePurchases, priceOf = packageStorePrice, highlight }) {
  const hiRef = useRef(null)
  const on = enabled ?? packagesEnabled()
  const canBuy = store ?? iapAvailable()
  const [tick, setTick] = useState(0)
  const [prices, setPrices] = useState({})
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const offer = on ? packagesToOffer() : []
  const owned = on ? [...ownedContent()] : []

  useEffect(() => {
    if (!on || !canBuy) return undefined
    let live = true
    for (const p of ['core', 'prayer', 'bundle']) priceOf(p).then((v) => { if (live && v) setPrices((o) => ({ ...o, [p]: v })) }).catch(() => {})
    return () => { live = false }
  }, [on, canBuy, priceOf])

  useEffect(() => {
    if (highlight && hiRef.current) hiRef.current.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [highlight])

  if (!on) return null
  const doBuy = async (p) => {
    if (busy) return
    setBusy(p); setMsg('')
    const r = await buy(p)
    setBusy('')
    if (r === 'purchased') setTick((n) => n + 1)
    else if (MSG[r]) setMsg(r)
  }
  const doRestore = async () => {
    if (busy) return
    setBusy('restore'); setMsg('')
    const r = await restore()
    setBusy('')
    setTick((n) => n + 1)
    if (MSG[r]) setMsg(r)
  }

  return (
    <section key={tick} className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }} data-testid="package-offer">
      <h3 className="flex items-center gap-2 text-base font-black"><ShoppingBag className="h-5 w-5" aria-hidden="true" /><span><span className="block">Packages</span><span className="block text-xs font-semibold" style={{ color: 'var(--muted)' }}>One-time purchase, no subscription</span></span></h3>
      {owned.length > 0 && (
        <ul className="mt-3 grid gap-1">
          {owned.map((c) => (
            <li key={c} className="flex items-start gap-2 text-sm font-black" style={{ color: 'var(--go-ink)' }}><Check className="mt-0.5 h-4 w-4" aria-hidden="true" /><span>{PKG_NAMES[c]}</span></li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid gap-2">
        {canBuy && offer.map((p) => (
          <button key={p} ref={p === highlight ? hiRef : undefined} type="button" onClick={() => doBuy(p)} disabled={!!busy} data-testid={`buy-${p}`} data-highlighted={p === highlight || undefined} className={`chunk flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 py-2 text-left font-extrabold text-white ${FOCUS}`} style={p === highlight ? { ...primary, outline: '4px solid var(--sun, #f5b400)', outlineOffset: '3px' } : primary}>
            <span>{PKG_NAMES[p]}</span>
            <span className="shrink-0">{busy === p ? '…' : (prices[p] || PACKAGE_PRICE_FALLBACK[p])}</span>
          </button>
        ))}
        {canBuy && (
          <button type="button" onClick={doRestore} disabled={!!busy} data-testid="restore-packages" className={`chunk min-h-11 rounded-2xl px-4 py-2 text-sm font-extrabold ${FOCUS}`} style={ghost}>
            Restore purchases
          </button>
        )}
      </div>
      {msg && <p role="status" className="mt-2 text-sm font-bold">{MSG[msg]}</p>}
    </section>
  )
}
