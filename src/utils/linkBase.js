/* Pure URL helper shared by every "open the app" link builder (classroom,
   challenges). No imports, so it is safe anywhere. See platform/appLink.js. */

/** Normalize an app URL to "scheme://host/path" with no trailing slash,
    query, hash, or index.html - the part a `/#kind=token` is appended to. */
export function linkBase(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    const u = new URL(raw)
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      const path = u.pathname.replace(/\/index\.html$/, '/').replace(/\/+$/, '')
      return `${u.origin}${path}`
    }
  } catch { /* not absolute - fall through */ }
  return raw.replace(/[#?].*$/, '').replace(/\/index\.html$/, '/').replace(/\/+$/, '')
}
