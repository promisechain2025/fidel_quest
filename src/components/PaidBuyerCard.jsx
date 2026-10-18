/* Grown-Ups (behind the parental gate), native builds only: the paid-buyer
   re-entry code (platform/paidBuyer.js). Shows this device's code to write
   down, and accepts a code after a reinstall / on a new phone. No prices,
   no store or web links - it only keeps what the family already bought. */
import { useEffect, useState } from 'react'
import { KeyRound, Check } from 'lucide-react'
import { t } from '../platform/i18n'
import { loadPaidBuyer, redeemPaidBuyerCode, ensurePaidBuyerMark } from '../platform/paidBuyer'

export default function PaidBuyerCard() {
  const [mark, setMark] = useState(loadPaidBuyer)
  const [entry, setEntry] = useState('')
  const [state, setState] = useState('') // '' | 'ok' | 'bad'
  useEffect(() => {
    if (!mark) ensurePaidBuyerMark().then((m) => m && setMark(m)).catch(() => {})
  }, [mark])
  const submit = async (e) => {
    e.preventDefault()
    const ok = await redeemPaidBuyerCode(entry)
    setState(ok ? 'ok' : 'bad')
    if (ok) { setMark(loadPaidBuyer()); setEntry('') }
  }
  return (
    <section data-testid="paid-buyer-card" className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        <KeyRound className="h-4 w-4" aria-hidden="true" /> {t('pbTitle', 'Purchase code')}
      </h2>
      <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
        {t('pbHint', 'Write this code down. If you reinstall eGeez or move to a new phone, enter it here to keep what you bought.')}
      </p>
      {mark?.code && (
        <p data-testid="paid-buyer-code" className="mono mt-3 select-all text-lg font-black tracking-widest" style={{ color: 'var(--ink)' }}>{mark.code}</p>
      )}
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input value={entry} onChange={(e) => { setEntry(e.target.value); setState('') }} placeholder="EGL-XXXXXX-XXXXXXX"
          aria-label={t('pbEnter', 'Enter a purchase code')} data-testid="paid-buyer-input"
          className="mono min-h-[44px] min-w-0 flex-1 rounded-xl border-2 px-3 text-sm font-bold uppercase"
          style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }} />
        <button type="submit" className="min-h-[44px] rounded-xl px-3 text-xs font-extrabold text-white" style={{ background: 'var(--sky)' }}>
          {t('pbApply', 'Apply')}
        </button>
      </form>
      {state === 'ok' && <p className="mt-2 flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--go-ink)' }}><Check className="h-4 w-4" aria-hidden="true" />{t('pbOk', 'Code accepted.')}</p>}
      {state === 'bad' && <p className="mt-2 text-xs font-bold" style={{ color: 'var(--bad-ink)' }}>{t('pbBad', 'That code is not valid.')}</p>}
    </section>
  )
}
