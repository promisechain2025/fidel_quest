/* ============================================================================
   REP CODE CARD - a representative's unlock code (Grown-Ups, WEB ONLY)
   ----------------------------------------------------------------------------
   Families in Ethiopia, Eritrea and other African countries where App Store
   / Play payments are hard buy a code from a local eGeez representative.
   The code unlocks one package (Core, Prayer Book or both) on this browser.
   It is checked by the hub API (single-use, tied to the rep).

   Only mounted inside Grown-Ups, which is already behind the parental gate.
   Labels are English only (app UI text is never Amharic / Tigrinya). Never rendered in the
   iOS / Android apps (store rules, docs/rep-codes.md): repCodesAvailable()
   is false there, and the card returns null.
   ========================================================================== */
import { useState } from 'react'
import { KeyRound, Check } from 'lucide-react'
import { repCodesAvailable, redeemRepCode } from '../platform/repCodes'
import { repGrants } from '../platform/packages'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const primary = { background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }

export const PKG_NAMES = {
  core: 'Full course',
  prayer: 'Prayer Book',
  bundle: 'Full course + Prayer Book',
}
const ERR = {
  used: 'This code was already used.',
  expired: 'This code has expired.',
  revoked: 'This code was cancelled.',
  offline: 'No connection. Try again.',
  other: 'That code did not work. Check the letters.',
}

function Tri({ s, className = '' }) {
  return <span lang="en" className={className}>{s}</span>
}

/** available / redeem are test + screenshot seams. */
export default function RepCodeCard({ available, redeem = redeemRepCode, onUnlocked }) {
  const show = available ?? repCodesAvailable()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [owned, setOwned] = useState(() => repGrants().map((g) => g.pkg))
  if (!show) return null

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setErr('')
    const r = await redeem(code)
    setBusy(false)
    if (r.ok) {
      setOwned((o) => [...new Set([...o, r.pkg])])
      setCode('')
      onUnlocked?.(r.pkg)
    } else setErr(ERR[r.reason] ? r.reason : 'other')
  }

  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }} data-testid="rep-code-card">
      <h3 className="flex items-start gap-2 text-base font-black">
        <KeyRound className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
        <Tri s="Code from an eGeez representative" />
      </h3>
      {owned.length > 0 && (
        <ul className="mt-3 grid gap-1" data-testid="rep-owned">
          {owned.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm font-black" style={{ color: 'var(--go-ink)' }}>
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><Tri s={PKG_NAMES[p]} />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-3">
        <label htmlFor="rep-code" className="sr-only">Code</label>
        <div className="flex gap-2">
          <input
            id="rep-code"
            value={code}
            onChange={(e) => { setCode(e.target.value); setErr('') }}
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={24}
            placeholder="EGR-XXXXX-XXXX-XXXX"
            aria-invalid={err ? true : undefined}
            className={`mono w-full rounded-2xl border-2 px-3 py-3 font-black uppercase tracking-wider ${FOCUS}`}
            style={{ background: 'var(--paper)', borderColor: err ? 'var(--bad)' : 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
          />
          <button type="submit" disabled={busy || !code.trim()} className={`chunk shrink-0 rounded-2xl px-4 font-extrabold text-white ${FOCUS}`} style={primary} data-testid="rep-code-submit">
            <span>{busy ? '…' : 'Unlock'}</span>
          </button>
        </div>
        {err && <p role="alert" className="mt-2 text-sm font-bold" style={{ color: 'var(--bad)' }}><Tri s={ERR[err]} /></p>}
      </form>
    </section>
  )
}
