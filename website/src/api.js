import { API_URL, CONTACT_EMAIL } from './config.js'

/** Shown when the API cannot be reached at all (offline, DNS, CORS, down). */
export const UNREACHABLE = 'Could not reach the server. Try again in a moment.'

/* POST a form to the hub API (../api). When API_URL is unset (static-only
   deploy), fall back to opening the visitor's mail client prefilled - the
   site keeps working with zero backend. */
export async function submitForm(path, data, mailSubject) {
  if (!API_URL) {
    const body = Object.entries(data)
      .filter(([, v]) => v != null && String(v).length)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n')
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(body)}`
    return { ok: true, mailto: true }
  }
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    // Without this the visitor sees the browser's raw TypeError, i.e. the
    // literal words "Failed to fetch".
    throw new Error(UNREACHABLE)
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.')
  return json
}
