/* ============================================================================
   ADD TO HOME SCREEN - shown after a rep code unlocks eGeez on the web.
   English only. Hidden in the native apps and when already installed.
   os / available / prompt are test + screenshot seams.
   ========================================================================== */
import { useEffect, useState } from 'react'
import { Smartphone, Download } from 'lucide-react'
import { deviceOs, getInstallPrompt, onInstallPrompt, promptInstall, installStepAvailable } from '../platform/installPrompt'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const primary = { background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }

function Steps({ os }) {
  if (os === 'ios') {
    return (
      <div data-testid="a2hs-ios">
        <p className="text-sm font-black">iPhone / iPad (Safari)</p>
        <ol className="ml-5 list-decimal text-sm font-bold">
          <li>Open easygeez.com/app in Safari.</li>
          <li>Tap the Share button (square with an arrow up).</li>
          <li>Tap “Add to Home Screen”, then “Add”.</li>
        </ol>
      </div>
    )
  }
  return (
    <div data-testid="a2hs-android">
      <p className="text-sm font-black">Android (Chrome)</p>
      <ol className="ml-5 list-decimal text-sm font-bold">
        <li>Open easygeez.com/app in Chrome.</li>
        <li>Tap the menu ⋮ (top right).</li>
        <li>Tap “Add to Home screen” or “Install app”.</li>
      </ol>
    </div>
  )
}

export default function AddToHomeScreen({ os: osProp, available, prompt = promptInstall }) {
  const show = available ?? installStepAvailable()
  const [os] = useState(() => osProp ?? deviceOs())
  const [canInstall, setCanInstall] = useState(() => !!getInstallPrompt())
  const [done, setDone] = useState(false)
  useEffect(() => onInstallPrompt((e) => setCanInstall(!!e)), [])
  if (!show) return null

  const order = os === 'ios' ? ['ios', 'android'] : ['android', 'ios']
  const install = async () => {
    const r = await prompt()
    if (r === 'accepted') setDone(true)
  }

  return (
    <div className="mt-3 rounded-2xl border-2 p-3" style={{ background: 'var(--paper)', borderColor: 'var(--go)' }} data-testid="a2hs" data-os={os}>
      <h4 className="flex items-start gap-2 text-base font-black">
        <Smartphone className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
        <span>Add eGeez to your home screen</span>
      </h4>
      <p className="mt-1 text-sm font-bold">Your code works in this browser. Add eGeez to your home screen so it opens like an app.</p>
      {done ? (
        <p className="mt-2 text-sm font-black" style={{ color: 'var(--go-ink)' }} data-testid="a2hs-done">Done! Look for eGeez on your home screen.</p>
      ) : (
        <>
          {canInstall && os !== 'ios' && (
            <button type="button" onClick={install} className={`chunk mt-2 flex items-center gap-2 rounded-2xl px-4 py-2 font-extrabold text-white ${FOCUS}`} style={primary} data-testid="a2hs-install">
              <Download className="h-5 w-5" aria-hidden="true" /><span>Install app</span>
            </button>
          )}
          <div className="mt-2 grid gap-2">
            <Steps os={order[0]} />
            {os === 'other' && <Steps os={order[1]} />}
          </div>
          {os !== 'other' && (
            <details className="mt-2 text-sm">
              <summary className="font-bold">{os === 'ios' ? 'Using Android?' : 'Using an iPhone?'}</summary>
              <div className="mt-1"><Steps os={order[1]} /></div>
            </details>
          )}
          <p className="mt-2 text-xs font-bold">Use the same browser where you entered the code.</p>
        </>
      )}
    </div>
  )
}
