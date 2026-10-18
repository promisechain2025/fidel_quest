import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CtaButton, Picture, Reveal } from '../components.jsx'
import ProgressReport from '../components/ProgressReport.jsx'
import { decodeProgressCard } from '../progressCard.js'
import { APP_URL } from '../config.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

/* Renders a Progress Card link from the app (#p=<token>). Decoding happens
   entirely in this browser - the token never leaves the URL fragment.
   Family accounts are closed, so the page only shows the report and a way
   back into the app. */
export default function Progress() {
  const [snap, setSnap] = useState(null)
  const [checked, setChecked] = useState(false)

  // Keyed on the router's hash, not a one-shot read of window.location:
  // opening a second card while already on this page must re-render it.
  const { hash } = useLocation()
  useEffect(() => {
    const m = (hash || '').match(/[#&]p=([^&]+)/)
    setSnap(m ? decodeProgressCard(m[1]) : null)
    setChecked(true)
  }, [hash])

  return (
    <div className="mx-auto max-w-2xl px-5 pb-10 pt-12 sm:px-6">
      <Seo title="Progress report - eGeez" description="A child's fidel journey, shared by their family from the eGeez app." path="/progress" />
      {!checked ? null : snap ? (
        <Reveal>
          <div className="mb-6 text-center">
            <Picture src="/art/anbessa-cheer.png" width={96} height={96} alt="" aria-hidden="true" className="mx-auto" />
            <h1 className="display-2 mt-2">{t('prgTitle', 'A progress report from eGeez')}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              {t('prgSub', 'Shared by the family - rendered right here in your browser, stored nowhere.')}
            </p>
          </div>
          <ProgressReport snap={snap} />
          <div className="mt-6 text-center">
            <CtaButton href={APP_URL} tone="green">{t('prgOpenApp', 'Open the app')}</CtaButton>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <div className="text-center">
            <Picture src="/art/anbessa-think.png" width={110} height={110} alt="" aria-hidden="true" className="mx-auto" />
            <h1 className="display-2 mt-3">{t('prgEmptyT', 'No report in this link')}</h1>
            <p className="lede mx-auto mt-3 max-w-md" style={{ color: 'var(--muted)' }}>
              {t('prgEmptyB', 'Progress reports are created inside the eGeez app: open the Grown-ups corner and tap "Share progress report" - then open that link here.')}
            </p>
            <div className="mt-6"><CtaButton href={APP_URL} tone="green">{t('prgOpenApp', 'Open the app')}</CtaButton></div>
          </div>
        </Reveal>
      )}
    </div>
  )
}
