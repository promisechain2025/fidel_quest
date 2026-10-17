/* ============================================================================
   PRACTICE SYNC — opt-in class view (child side)
   ----------------------------------------------------------------------------
   The only network path from the child app, and only after a grown-up joins
   the child to a class with the teacher's join code. What leaves the device:
   the child's first name/nickname, the class code, and per-day practice
   numbers (minutes, sessions, items, accuracy, finished lessons/games, flags).
   Nothing else - no letters, no audio, no device ids.

   fq.classSync.v1 = {code, name, token, pending: [day], lastSyncAt}
     token: an opaque per-student secret issued by /api/practice/join; it can
            only write this student's own day rows.
   Offline-first: rows queue in `pending` and flush when online (on 'online',
   on show, and every 60 s). A failed flush keeps the queue.
   ========================================================================== */
import { loadPractice, setPracticeGoal, clampGoal } from './practice'
import { sanitizeClassCode } from './classroom'
import { sanitizeName } from '../utils/challenge'

export const SYNC_KEY = 'fq.classSync.v1'
const MAX_PENDING = 60

export function apiBase() {
  try {
    return String(import.meta.env?.VITE_API_URL || '').replace(/\/$/, '')
  } catch {
    return ''
  }
}

export function loadSync() {
  try {
    const s = JSON.parse(localStorage.getItem(SYNC_KEY))
    if (s && typeof s.token === 'string' && s.token && /^[A-Z0-9]{4,12}$/.test(s.code || '')) {
      return { code: s.code, name: String(s.name || ''), token: s.token, pending: Array.isArray(s.pending) ? s.pending.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) : [], lastSyncAt: s.lastSyncAt || null, className: s.className || '' }
    }
  } catch { /* none */ }
  return null
}

function saveSync(s) {
  try { localStorage.setItem(SYNC_KEY, JSON.stringify(s)) } catch { /* session only */ }
  return s
}

export function leaveSync() {
  try { localStorage.removeItem(SYNC_KEY) } catch { /* ignore */ }
}

/** Add days to the outgoing queue (no-op when not joined). */
export function queueDaySync(days) {
  const s = loadSync()
  if (!s) return
  saveSync({ ...s, pending: [...new Set([...s.pending, ...days])].sort().slice(-MAX_PENDING) })
}

/** The wire shape of one day - small, numbers only, flags as counts. */
export function wireRow(r) {
  return {
    day: r.day,
    activeMin: Math.floor((r.activeMs || 0) / 60000),
    sessions: r.sessions | 0, items: r.items | 0, answered: r.answered | 0, correct: r.correct | 0,
    lessons: r.lessons | 0, games: r.games | 0,
    flags: { rapidTap: r.flags?.rapidTap | 0, randomTap: r.flags?.randomTap | 0, audioLoop: r.flags?.audioLoop | 0 },
  }
}

/** Join a class with the teacher's code. Resolves {ok, error?}. */
export async function joinClassSync(code, name, { fetchImpl = globalThis.fetch, base = apiBase() } = {}) {
  const c = sanitizeClassCode(code)
  const n = sanitizeName(name)
  if (!/^[A-Z0-9]{4,12}$/.test(c) || !n) return { ok: false, error: 'invalid' }
  if (!base || !fetchImpl) return { ok: false, error: 'offline' }
  try {
    const res = await fetchImpl(`${base}/api/practice/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: c, name: n }) })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.token) return { ok: false, error: res.status === 404 ? 'unknown-class' : 'server' }
    const days = Object.keys(loadPractice().days).sort().slice(-14)
    saveSync({ code: c, name: n, token: body.token, pending: days, lastSyncAt: null, className: sanitizeName(body.className || '') })
    if (clampGoal(body.goalMin)) setPracticeGoal(body.goalMin)
    return { ok: true }
  } catch {
    return { ok: false, error: 'offline' }
  }
}

let flushing = null
/** Push queued days. Resolves {sent, kept}. Safe to call any time. */
export function flushSync({ fetchImpl = globalThis.fetch, base = apiBase(), days = null } = {}) {
  if (flushing) return flushing
  flushing = (async () => {
    const s = loadSync()
    if (!s || !s.pending.length || !base || !fetchImpl) return { sent: 0, kept: s?.pending.length || 0 }
    const all = days || loadPractice().days
    const rows = s.pending.map((d) => all[d]).filter(Boolean).map(wireRow)
    try {
      const res = await fetchImpl(`${base}/api/practice/sync`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Student ${s.token}` },
        body: JSON.stringify({ days: rows }),
      })
      if (res.status === 401 || res.status === 410) { leaveSync(); return { sent: 0, kept: 0, revoked: true } }
      if (!res.ok) return { sent: 0, kept: s.pending.length }
      const body = await res.json().catch(() => ({}))
      const latest = loadSync() || s
      const sentDays = new Set(s.pending)
      // Today keeps changing; the tracker re-queues it on its next save, so
      // the sent set can be dropped here without losing later minutes.
      saveSync({ ...latest, pending: latest.pending.filter((d) => !sentDays.has(d)), lastSyncAt: Date.now() })
      if (clampGoal(body.goalMin)) setPracticeGoal(body.goalMin)
      return { sent: rows.length, kept: 0 }
    } catch {
      return { sent: 0, kept: s.pending.length }
    }
  })().finally(() => { flushing = null })
  return flushing
}

let syncInstalled = false
export function installPracticeSync(win = typeof window !== 'undefined' ? window : null) {
  if (syncInstalled || !win) return
  syncInstalled = true
  const go = () => { flushSync().catch(() => {}) }
  win.addEventListener('online', go)
  win.addEventListener('pageshow', go)
  setInterval(go, 60000)
  setTimeout(go, 3000)
}
