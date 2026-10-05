/* The website trial's grown-up ask, and the paid app's unlock-code card.
   On the web, store links and the code field sit behind the same hold-and-
   answer gate as Grown-Ups, so a child sees a short message and nothing
   that leaves the app. On the paid native app, GrownUpWebTrialCard shows
   the install's stable code (and the in-app review button) — it is only
   mounted inside Grown-Ups, which is already behind that gate. */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { t } from '../platform/i18n'
import { APP_PRICE, APP_STORE_URL, PLAY_STORE_URL } from '../platform/storeLinks'
import { deviceUnlockCode, redeemUnlockCode, loadWebTrial, webTrialActive } from '../platform/webTrial'
import { maybeRequestReview } from '../platform/reviewPrompt'
import { isNativePlatform } from '../platform/native'
import ParentalGate from './ParentalGate'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

const storeBtn = {
  background: 'var(--go)',
  boxShadow: '0 3px 0 var(--go-deep)',
  '--chunk-depth': '3px',
}

function StoreLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`chunk flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-center text-sm font-extrabold text-white ${FOCUS}`}
      style={storeBtn}
    >
      {children}
    </a>
  )
}

function ReviewLinks() {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
        {t('wtReviewBody', 'If eGeez is helping your family, a short review on the App Store or Google Play helps other families find it.')}
      </p>
      <div className="mt-3 grid gap-2">
        <StoreLink href={APP_STORE_URL}>{t('wtReviewAppStore', 'Review on the App Store')}</StoreLink>
        <StoreLink href={PLAY_STORE_URL}>{t('wtReviewPlay', 'Review on Google Play')}</StoreLink>
      </div>
    </div>
  )
}

function CodeForm({ onUnlocked, onDone }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const submit = (e) => {
    e.preventDefault()
    if (redeemUnlockCode(code)) {
      setError(false)
      onUnlocked?.()
      onDone?.()
    } else {
      setError(true)
    }
  }
  return (
    <form onSubmit={submit} className="mt-4">
      <label className="block text-sm font-black" htmlFor="wt-code">
        {t('wtCodeLabel', 'Already bought the app? Enter the unlock code from Grown-Ups on the phone.')}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="wt-code"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(false) }}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={16}
          placeholder={t('wtCodePh', 'Unlock code')}
          aria-invalid={error || undefined}
          aria-describedby={error ? 'wt-code-error' : undefined}
          className={`mono w-full rounded-2xl border-2 px-4 py-3 font-black uppercase tracking-wider ${FOCUS}`}
          style={{ background: 'var(--paper)', borderColor: error ? 'var(--bad)' : 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
        />
        <button type="submit" className={`chunk shrink-0 rounded-2xl px-4 font-extrabold text-white ${FOCUS}`} style={storeBtn}>
          {t('wtUnlock', 'Unlock')}
        </button>
      </div>
      {error && (
        <p id="wt-code-error" role="alert" className="mt-2 text-sm font-bold" style={{ color: 'var(--bad)' }}>
          {t('wtCodeBad', 'That code did not work. Check the letters and try again.')}
        </p>
      )}
    </form>
  )
}

export default function WebTrialPaywall({ onClose, onUnlocked }) {
  const [pastGate, setPastGate] = useState(false)
  const [done, setDone] = useState(false)
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wt-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border-2 p-5"
        style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="wt-title" className="text-xl font-black leading-tight">
            {t('wtKidTitle', 'Time to ask a grown-up')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('wtNotNow', 'Not now')} className={`chunk flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--paper)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {!pastGate && !done && (
          <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {t('wtKidBody', 'You have had three visits with eGeez. A grown-up can keep the games, stories, and lessons going.')}
          </p>
        )}
        {!pastGate && !done && (
          <ParentalGate intro={t('wtGateIntro', 'This part is for grown-ups. It links to the app stores and the unlock code.')} onOpen={() => setPastGate(true)} />
        )}
        {pastGate && !done && (
          <div className="mt-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              {t('wtParentBody', 'The phone app is a one-time {price} purchase. Buying it on the App Store or Google Play unlocks this website forever on this device.', { price: APP_PRICE })}
            </p>
            <div className="mt-3 grid gap-2">
              <StoreLink href={APP_STORE_URL}>{t('wtAppStore', 'App Store')}</StoreLink>
              <StoreLink href={PLAY_STORE_URL}>{t('wtPlay', 'Google Play')}</StoreLink>
            </div>
            <CodeForm onUnlocked={onUnlocked} onDone={() => setDone(true)} />
          </div>
        )}
        {done && (
          <div className="mt-3">
            <p role="status" className="text-sm font-black" style={{ color: 'var(--go-ink)' }}>
              {t('wtCodeOk', 'Unlocked. This browser has the full eGeez, forever.')}
            </p>
            <ReviewLinks />
            <button type="button" onClick={onClose} className={`chunk mt-4 min-h-11 w-full rounded-2xl px-4 py-3 text-sm font-extrabold text-white ${FOCUS}`} style={storeBtn}>
              {t('continue', 'Continue')}
            </button>
          </div>
        )}
        {!done && (
          <button type="button" onClick={onClose} className={`mt-4 min-h-11 w-full rounded-2xl text-sm font-extrabold ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
            {t('wtNotNow', 'Not now')}
          </button>
        )}
      </div>
    </div>
  )
}

function rateMessage(status) {
  if (status === 'asked') return t('gpRateAsked', 'If a review card appears, it is optional. Thank you.')
  if (status === 'cooldown' || status === 'session' || status === 'limit') return t('gpRateSoon', 'Thanks. We will ask again later so we do not interrupt too often.')
  if (status === 'unavailable') return t('gpRateUnavailable', 'The review card is not available on this device right now.')
  return ''
}

/** Paid app: the website unlock code, plus a rate button.
    Website trial: a place to enter that code (and, once unlocked, review links).
    Renders nothing on a native-style dev server that is not the /app build
    and not the paid shell — except ?previewUnlock=1 in dev, which shows the
    paid-app card so it can be reviewed in a browser. */
export function GrownUpWebTrialCard({ onUnlocked }) {
  const previewNative = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('previewUnlock') === '1'
  const native = isNativePlatform()
  const showNative = native || previewNative
  const showWeb = !showNative && webTrialActive()
  const [code] = useState(() => (showNative ? deviceUnlockCode() : ''))
  const [copied, setCopied] = useState(false)
  const [unlocked, setUnlocked] = useState(() => !!loadWebTrial().unlocked)
  const [rateMsg, setRateMsg] = useState('')

  useEffect(() => {
    if (!native) return undefined
    maybeRequestReview('unlock-code')
    return undefined
  }, [native])

  if (!showNative && !showWeb) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  const rate = async () => {
    const status = await maybeRequestReview('grownups')
    setRateMsg(rateMessage(status))
  }

  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }} data-testid={showNative ? 'unlock-code-card' : 'web-unlock-card'}>
      {showNative ? (
        <>
          <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {t('gpWebCodeTitle', 'Website unlock code')}
          </h2>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {t('gpWebCodeBody', 'Type this code into eGeez at easygeez.com/app. It unlocks that browser forever. The phone app you bought stays fully open either way.')}
          </p>
          <p className="mono mt-3 text-center text-2xl font-black tracking-[0.2em]" data-testid="unlock-code" style={{ color: 'var(--ink)' }}>{code}</p>
          <button type="button" onClick={copy} className={`chunk mt-3 min-h-11 w-full rounded-2xl px-4 py-2 text-sm font-extrabold ${FOCUS}`} style={{ background: 'var(--paper-2)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
            {copied ? t('gpWebCodeCopied', 'Copied') : t('gpWebCodeCopy', 'Copy code')}
          </button>
          <div className="mt-4 border-t-2 pt-4" style={{ borderColor: 'var(--line)' }}>
            <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {t('gpRateTitle', 'Enjoying eGeez?')}
            </h3>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              {t('gpRateBody', 'A review helps other families. The store may show a short card; it is optional, and we only ask once in a while.')}
            </p>
            <button type="button" onClick={rate} className={`chunk mt-3 min-h-11 w-full rounded-2xl px-4 py-2 text-sm font-extrabold text-white ${FOCUS}`} style={storeBtn}>
              {t('gpRateCta', 'Rate eGeez')}
            </button>
            {rateMsg && <p role="status" className="mt-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>{rateMsg}</p>}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {t('wtWebRedeemTitle', 'Unlock this browser')}
          </h2>
          {unlocked ? (
            <>
              <p className="mt-1 text-sm font-black" style={{ color: 'var(--go-ink)' }}>{t('wtWebUnlocked', 'This browser is unlocked.')}</p>
              <ReviewLinks />
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                {t('wtWebRedeemBody', 'If you already bought the phone app, enter the code from Grown-Ups there. This website stays unlocked on this device.')}
              </p>
              <CodeForm
                onUnlocked={onUnlocked}
                onDone={() => setUnlocked(true)}
              />
            </>
          )}
        </>
      )}
    </section>
  )
}
