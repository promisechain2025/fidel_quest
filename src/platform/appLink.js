/* ============================================================================
   Links that must open the APP (class invites, homework, results, challenges)
   ----------------------------------------------------------------------------
   The PWA lives at https://easygeez.com/app/ and the marketing site at the
   root. A link built from `location.origin` alone (https://easygeez.com/#…)
   opens the marketing site, which knows nothing about #class / #assign /
   #receipt / #challenge. So every app link keeps the app's path:

     web PWA (VITE_BASE=/app/)   https://easygeez.com/app/#assign=…
     local vite / root build     http://localhost:5173/#assign=…
     Capacitor (no web path)     https://easygeez.com/app/#assign=…

   VITE_APP_URL wins when it is an http(s) URL (the canonical public app).
   Native shells have a capacitor://localhost or https://localhost origin
   that nobody else can open, so they always use the public app URL.
   ========================================================================== */
import { isNativePlatform } from './native'
import { linkBase } from '../utils/linkBase'

export { linkBase }

export const CANONICAL_APP_URL = 'https://easygeez.com/app'

const isHttp = (s) => /^https?:\/\//i.test(String(s || '').trim())

/** The base for every link that should land inside the app. */
export function appLinkUrl({
  env = import.meta.env?.VITE_APP_URL,
  native = isNativePlatform(),
  location = typeof window !== 'undefined' ? window.location : null,
  base = import.meta.env?.BASE_URL || '/',
} = {}) {
  if (isHttp(env)) return linkBase(env)
  if (native || !location || !isHttp(location.origin)) return CANONICAL_APP_URL
  return linkBase(`${location.origin}${base.startsWith('/') ? base : `/${base}`}`)
}
