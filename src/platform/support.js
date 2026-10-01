/* Support/paid-app helpers shared by the SupportAsk dialog and the
   Grown-ups card. No backend anywhere: buying happens in the app stores
   (Apple gifting via the Backpack Gift guide, Play gift cards on Android),
   and the family share below hands the relative the exact link to pay at. */
import { t } from './i18n'
import { nativeShare } from './native'
import { appStoreUrl } from './gift'
import { appShareUrl } from '../components/ShareCard'

export function buyUrl() {
  const env = import.meta.env?.VITE_BUY_URL
  if (typeof env === 'string' && env.trim()) return env.trim()
  return appStoreUrl()
}

/** The site's published privacy policy (same text as public/privacy.html).
    Verified live (HTTP 200, "Privacy - eGeez") on 2026-10-01. */
export const DEFAULT_PRIVACY_URL = 'https://www.easygeez.com/privacy'

/** The privacy-policy URL for the in-app link. Apple 5.1.1(i) requires the
    policy to be reachable INSIDE the app, so this is never empty:
    VITE_PRIVACY_URL wins when set, otherwise the site's real /privacy page
    (never the marketing/landing URL - a "Privacy policy" link must open the
    policy). Pass `env` only in tests. */
export function privacyUrl(env = import.meta.env) {
  const v = env?.VITE_PRIVACY_URL
  return typeof v === 'string' && v.trim() ? v.trim() : DEFAULT_PRIVACY_URL
}

/** The QA "Open everything" shortcut is a developer tool: shown in dev builds
    (npm run dev) or when a build opts in with VITE_QA_UNLOCK=true, never in a
    store/production build. The ?unlock URL param still works for QA. */
export function qaUnlockEnabled(env = import.meta.env) {
  return !!(env?.DEV || env?.VITE_QA_UNLOCK === 'true')
}

export function feedbackMailto() {
  const to = (import.meta.env?.VITE_FEEDBACK_EMAIL || 'promisechain.net@gmail.com').trim()
  const subject = encodeURIComponent('eGeez feedback')
  const body = encodeURIComponent(t('payFeedbackBody', 'What we liked:\n\nWhat should be better:\n\nWhy we did not buy it:\n'))
  return `mailto:${to}?subject=${subject}&body=${body}`
}

/** Ask a relative (often abroad) to gift the app. The link is the place they
    can PAY - the store page when we have one - falling back to the app URL. */
export function shareWithFamily() {
  return nativeShare({
    title: 'eGeez',
    text: t('payShareText', 'Our kids are learning the Ethiopian alphabet with eGeez. Could you gift us the app?'),
    url: buyUrl() || appShareUrl(),
  })
}
