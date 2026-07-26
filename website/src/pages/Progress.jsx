import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Card, CtaButton, Reveal } from '../components.jsx'
import ProgressReport from '../components/ProgressReport.jsx'
import { decodeProgressCard } from '../progressCard.js'
import { signedIn, apiFetch } from '../auth.js'
import { API_URL, APP_URL } from '../config.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

/* Renders a Progress Card link from the app (#p=<token>). Decoding happens
   entirely in this browser - the token never leaves the URL fragment. A
   signed-in parent can save it to a child profile for progress-over-time. */
export default function Progress() {
  const [snap, setSnap] = useState(null)
  const [checked, setChecked] = useState(false)
  const [children, setChildren] = useState(null)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const m = window.location.hash.match(/[#&]p=([^&]+)/)
    setSnap(m ? decodeProgressCard(m[1]) : null)
    setChecked(true)
  }, [])

  useEffect(() => {
    if (snap && API_URL && signedIn()) {
      apiFetch('/api/children').then((j) => setChildren(j.children)).catch(() => setChildren(null))
    }
  }, [snap])

  const save = async (childId) => {
    setError('')
    try {
      await apiFetch(`/api/children/${childId}/snapshots`, { method: 'POST', body: snap })
      setSaved(childId)
    } catch (err) { setError(err.message) }
  }

  const canSave = useMemo(() => snap && API_URL && children && children.length > 0, [snap, children])

  return (
    <div className="mx-auto max-w-2xl px-5 pb-10 pt-12 sm:px-6">
      <Seo title="Progress report - eGeez" description="A child's fidel journey, shared by their family from the eGeez app." path="/progress" />
      {!checked ? null : snap ? (
        <Reveal>
          <div className="mb-6 text-center">
            <img src="/art/anbessa-cheer.png" width={96} height={96} alt="" aria-hidden="true" className="mx-auto" />
            <h1 className="display-2 mt-2">{t('prgTitle', 'A progress report from eGeez')}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              {t('prgSub', 'Shared by the family - rendered right here in your browser, stored nowhere.')}
            </p>
          </div>
          <ProgressReport snap={snap} />

          {canSave && (
            <Card className="mt-5">
              <h3 className="font-black">{t('prgSaveT', 'Save to a profile')}</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                {t('prgSaveB', 'Keep this snapshot in your family dashboard to watch progress over time.')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {children.map((c) => (
                  <button key={c.id} type="button" onClick={() => save(c.id)}
                    className="chunk px-4 py-2 text-sm"
                    style={saved === c.id
                      ? { background: 'var(--go-soft)', color: 'var(--go-ink)', border: '2px solid var(--go)' }
                      : { background: 'var(--accent)', color: '#241a05', boxShadow: '0 3px 0 var(--accent-deep)' }}>
                    {saved === c.id ? <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t('prgSaved', 'Saved')}</span> : c.name}
                  </button>
                ))}
              </div>
              {error && <p className="mt-2 text-sm font-bold" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
              {saved && <p className="mt-3 text-sm"><Link to="/family" className="underline font-bold">{t('prgGoFamily', 'Open the family dashboard')}</Link></p>}
            </Card>
          )}
          {snap && API_URL && signedIn() && children && children.length === 0 && (
            <Card className="mt-5 text-center">
              <h3 className="font-black">{t('prgNoKidsT', 'Add a child to save this')}</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                {t('prgNoKidsB', 'You are signed in but have no child profiles yet. Add one in your family dashboard, then come back to this link to save the report.')}
              </p>
              <div className="mt-4"><CtaButton to="/family" tone="green">{t('prgAddChild', 'Go to the family dashboard')}</CtaButton></div>
            </Card>
          )}
          {snap && API_URL && !signedIn() && (
            <p className="mt-5 text-center text-sm" style={{ color: 'var(--muted)' }}>
              {t('prgSignInHint', 'Want to keep these over time?')}{' '}
              <Link to="/family" className="font-bold underline">{t('prgSignIn', 'Create a free family account')}</Link>
            </p>
          )}
        </Reveal>
      ) : (
        <Reveal>
          <div className="text-center">
            <img src="/art/anbessa-think.png" width={110} height={110} alt="" aria-hidden="true" className="mx-auto" />
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
