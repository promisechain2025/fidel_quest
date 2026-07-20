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
