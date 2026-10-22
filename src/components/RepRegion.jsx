/* ============================================================================
   REP REGION + REPRESENTATIVES (Grown-Ups, WEB ONLY)
   ----------------------------------------------------------------------------
   RepRegionToggle: manual override of the country hint (auto / rep / store).
   RepresentativesList: the official reps from /representatives.json (empty
   until the owner adds people who agreed to be listed). Grown-Ups only,
   behind the parental gate; Amharic + Tigrinya first, English underneath.
   ========================================================================== */
import { useEffect, useState } from 'react'
import { Globe, Users } from 'lucide-react'
import { regionOverride, setRegionOverride } from '../platform/repCountries'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const card = { background: 'var(--card)', borderColor: 'var(--line)' }
const muted = { color: 'var(--muted)' }

function Tri({ am, ti, en }) {
  return (<span><span lang="am" className="block">{am}</span><span lang="ti" className="block">{ti}</span><span lang="en" className="block text-xs font-semibold" style={muted}>{en}</span></span>)
}

const OPTS = [
  { v: 'auto', am: 'ራስ-ሰር', ti: 'ባዕሉ', en: 'Automatic' },
  { v: 'rep', am: 'በወኪል', ti: 'ብወኪል', en: 'Through a representative' },
  { v: 'store', am: 'በካርድ / መደብር', ti: 'ብካርድ / ድኳን', en: 'Card / app store' },
]

export function RepRegionToggle({ onChange }) {
  const [v, setV] = useState(regionOverride)
  return (
    <section className="rounded-3xl border-2 p-4" style={card} data-testid="rep-region">
      <h3 className="flex items-start gap-2 text-base font-black"><Globe className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" /><Tri am="የክፍያ መንገድ" ti="መንገዲ ክፍሊት" en="How you pay" /></h3>
      <div className="mt-3 grid gap-2" role="radiogroup">
        {OPTS.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={v === o.v} data-testid={`rep-region-${o.v}`}
            onClick={() => { setRegionOverride(o.v); setV(o.v); onChange?.(o.v) }}
            className={`chunk rounded-2xl border-2 px-3 py-2 text-left text-sm font-extrabold ${FOCUS}`}
            style={{ background: v === o.v ? 'var(--tile)' : 'var(--paper)', borderColor: v === o.v ? 'var(--tile-deep)' : 'var(--line)', outlineColor: 'var(--sky)' }}>
            <Tri am={o.am} ti={o.ti} en={o.en} />
          </button>
        ))}
      </div>
    </section>
  )
}

export function RepresentativesList({ load }) {
  const [reps, setReps] = useState(null)
  useEffect(() => {
    let live = true
    const get = load || (() => fetch(`${import.meta.env?.BASE_URL || '/'}representatives.json`).then((r) => r.json()))
    get().then((d) => { if (live) setReps(Array.isArray(d?.representatives) ? d.representatives : []) }).catch(() => { if (live) setReps([]) })
    return () => { live = false }
  }, [load])
  return (
    <section className="rounded-3xl border-2 p-4" style={card} data-testid="rep-list">
      <h3 className="flex items-start gap-2 text-base font-black"><Users className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" /><Tri am="የeGeez ወኪሎች" ti="ወኪላት eGeez" en="eGeez representatives" /></h3>
      {reps && reps.length === 0 && (
        <p className="mt-2 text-sm font-bold" data-testid="rep-list-empty"><Tri am="ወኪሎች በቅርቡ ይዘረዘራሉ።" ti="ወኪላት ኣብ ቀረባ ክዝርዘሩ እዮም።" en="Representatives will be listed here soon." /></p>
      )}
      {reps && reps.length > 0 && (
        <ul className="mt-2 grid gap-2">
          {reps.map((r) => (
            <li key={r.id} className="rounded-2xl border-2 p-2 text-sm font-bold" style={{ borderColor: 'var(--line)' }}>
              <span className="block font-black">{r.name}</span>
              <span className="block" style={muted}>{[r.city, r.country].filter(Boolean).join(', ')}</span>
              {r.phone && <span className="block mono">{r.phone}</span>}
              {r.telegram && <span className="block mono">{r.telegram}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
