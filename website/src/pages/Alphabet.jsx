import { useEffect, useMemo, useState } from 'react'
import { Printer, X } from 'lucide-react'
import { Section, Card, CtaButton, Reveal } from '../components.jsx'
import { FAMILIES, ORDER_NAMES, GEEZ_ORDER_NAMES, ORDER_VOWELS } from '../fidelData.js'
import { APP_URL } from '../config.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

/* The full interactive fidel chart: 33 families x 7 vowel orders, from the
   app's validated letter table. Tap a letter for the big view; print gives
   a clean study chart (print css in tokens.css). */
export default function Alphabet() {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null) // { fam, order }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSel(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const families = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return FAMILIES
    return FAMILIES.filter((f) =>
      f.name.toLowerCase().includes(needle)
      || f.chars.includes(q.trim())
      || (f.word && (f.word.latin.includes(needle) || f.word.meaning.includes(needle))))
  }, [q])

  return (
    <>
      <Seo title="The Fidel alphabet chart - all 231 letters - eGeez" description="The full interactive Amharic fidel chart: 33 consonant families in 7 vowel orders, searchable and printable." path="/alphabet" />
      <div className="mx-auto max-w-5xl px-5 pt-12 text-center sm:px-6 print:hidden">
        <Reveal>
          <h1 className="display-1 mx-auto max-w-2xl">{t('alTitle', 'All 231 Amharic letters, one page')}</h1>
          <p className="lede mx-auto mt-4 max-w-2xl" style={{ color: 'var(--muted)' }}>
            {t('alLede', 'The fidel is a syllabary: Amharic uses 33 consonant families, each in 7 vowel orders. Read a row left to right and you can hear the vowel change. Tap any letter to see it big. (Tigrinya adds one more family, ቐ - a Tigrinya chart is coming.)')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={t('alSearch', 'Search: ha, ለ, selam…')}
              aria-label={t('alSearchLabel', 'Search the alphabet')}
              className="w-64 max-w-full rounded-xl px-4 py-2.5 text-[16px] font-bold"
              style={{ background: 'var(--card)', border: '2px solid var(--line)', color: 'var(--ink)' }}
            />
            <CtaButton onClick={() => window.print()} tone="ghost" className="!py-2.5">
              <Printer className="h-4 w-4" aria-hidden="true" /> {t('alPrint', 'Print this chart')}
            </CtaButton>
          </div>
        </Reveal>
      </div>

      {/* the 7 orders, explained */}
      <div className="mx-auto mt-8 max-w-5xl overflow-x-auto px-5 sm:px-6 print:hidden">
        <div className="mx-auto flex w-max gap-2 rounded-2xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
          {ORDER_NAMES.map((o, i) => (
            <div key={o} className="w-16 text-center">
              <div className="geez text-2xl font-black" style={{ color: 'var(--accent)' }}>{FAMILIES[1].chars[i]}</div>
              <div className="text-[11px] font-black">{GEEZ_ORDER_NAMES[i]}</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>l + {ORDER_VOWELS[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* chart */}
      <section className="print-chart mx-auto max-w-5xl px-5 py-10 sm:px-6">
        <h2 className="hidden text-center text-xl font-black print:block">eGeez - the Amharic Fidel chart (33 families x 7 orders)</h2>
        <div className="overflow-x-auto">
          <table className="mx-auto border-separate" style={{ borderSpacing: 4 }}>
            <thead>
              <tr>
                <th className="px-2 text-left text-xs font-black" style={{ color: 'var(--muted)' }}>{t('alFamily', 'Family')}</th>
                {ORDER_NAMES.map((o, i) => (
                  <th key={o} className="px-1 text-xs font-black" style={{ color: 'var(--muted)' }}>{GEEZ_ORDER_NAMES[i]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {families.map((f) => (
                <tr key={f.name}>
                  <th className="pr-2 text-right align-middle">
                    <div className="text-sm font-black">{f.name}</div>
                    {f.word && <div className="text-[10px] print:block" style={{ color: 'var(--muted)' }}>{f.word.latin} · {f.word.meaning}</div>}
                  </th>
                  {[...f.chars].map((ch, i) => (
                    <td key={i}>
                      <button
                        type="button"
                        onClick={() => setSel({ fam: f, order: i })}
                        aria-label={`${f.name}, ${GEEZ_ORDER_NAMES[i]} order: ${ch}`}
                        className="lt geez print-tile h-11 w-11 text-xl sm:h-12 sm:w-12 sm:text-2xl"
                        style={{ cursor: 'pointer' }}
                      >
                        {ch}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {families.length === 0 && (
          <p className="mt-6 text-center font-bold" style={{ color: 'var(--muted)' }}>{t('alNoMatch', 'No letters match that search.')}</p>
        )}
      </section>

      {/* big-letter dialog */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 print:hidden" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setSel(null)}>
          <div role="dialog" aria-modal="true" aria-label={`${sel.fam.name} ${GEEZ_ORDER_NAMES[sel.order]}`}
            className="w-full max-w-sm rounded-3xl p-7 text-center" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setSel(null)} aria-label="Close" className="float-right rounded-lg p-1.5" style={{ color: 'var(--muted)' }}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="lt geez mx-auto flex" style={{ width: 150, height: 150, fontSize: 88 }}>{sel.fam.chars[sel.order]}</div>
            <h3 className="mt-4 text-2xl font-black">
              {sel.fam.name} · {GEEZ_ORDER_NAMES[sel.order]} <span style={{ color: 'var(--muted)' }}>({ORDER_NAMES[sel.order]} order)</span>
            </h3>
            <p className="mt-1 text-sm font-bold" style={{ color: 'var(--muted)' }}>
              {t('alRow', 'The whole family:')} <span className="geez text-lg" style={{ color: 'var(--ink)' }}>{sel.fam.chars}</span>
            </p>
            {sel.fam.word && (
              <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
                {t('alWord', 'First word:')} <span className="geez font-black" style={{ color: 'var(--ink)' }}>{sel.fam.word.geez}</span> - {sel.fam.word.latin}, "{sel.fam.word.meaning}"
              </p>
            )}
            <div className="mt-5">
              <CtaButton href={APP_URL} tone="green">{t('alLearn', 'Learn it properly - with sound')}</CtaButton>
            </div>
          </div>
        </div>
      )}

      <Section center className="print:hidden" mark="ፊ">
        <Card wash className="mx-auto max-w-2xl text-center">
          <img src="/art/anbessa-happy.png" width={84} height={84} alt="" aria-hidden="true" className="mx-auto" />
          <h2 className="display-3 mt-2">{t('alCtaT', 'A chart shows letters. The app makes them stick.')}</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t('alCtaB', 'Every one of these letters is voiced, traced, played, and reviewed inside the eGeez journey - ten joyful minutes a day.')}
          </p>
          <div className="mt-5"><CtaButton href={APP_URL} tone="gold">{t('alCtaBtn', 'Start the free try-out')}</CtaButton></div>
        </Card>
      </Section>
    </>
  )
}
