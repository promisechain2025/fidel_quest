/* Parent-account session for the website (hub API JWT). Token lives in
   localStorage egz.site.token; helpers wrap fetch with the bearer header. */
import { API_URL } from './config.js'

const KEY = 'egz.site.token'

export function getToken() {
  try { return localStorage.getItem(KEY) || '' } catch { return '' }
}
export function setToken(tok) {
  try { tok ? localStorage.setItem(KEY, tok) : localStorage.removeItem(KEY) } catch { /* private mode */ }
}
export const signedIn = () => !!getToken()

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  // Only 401 means "your token is bad, sign in again". A 403 is a valid
  // session doing something not permitted (e.g. "link a teacher first") and
  // must NOT wipe the login.
  if (res.status === 401) setToken('')
  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`)
    err.status = res.status
    err.code = json.code || ''
    throw err
  }
  return json
}

export async function login(email, password) {
  const { token } = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
  setToken(token)
}
export async function register(name, email, password, role = 'parent') {
  const { token } = await apiFetch('/api/auth/register', { method: 'POST', body: { name, email, password, role } })
  setToken(token)
}
export const signOut = () => setToken('')
