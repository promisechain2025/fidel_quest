/* ============================================================================
   DAILY REMINDER  —  a gentle nudge back (retention)
   ----------------------------------------------------------------------------
   Native-only local notification (Capacitor); a no-op on the web. Strictly
   OPT-IN: nothing is scheduled until a grown-up turns it on, at which point we
   request OS permission (asking in context, not on first launch). The choice
   persists so it survives reinstalls of the JS but is re-armed on native boot.
   No network, no accounts.
   ========================================================================== */
import { isNativePlatform } from './native'

const FLAG = 'fq.reminder.v1'
const REMINDER_ID = 4201
const ASSIGN_REMINDER_ID = 4202 // legacy single id (keyless back-compat)
const ASSIGN_REMINDER_BASE = 4300 // per-assignment ids: base + hash(key)

/* A stable OS-notification id per assignment key, so several homework
   reminders coexist instead of one clobbering the next. Keyless callers keep
   the legacy single id. Collisions across the 200-slot span are harmless
   (worst case two rare simultaneous assignments share a nudge). */
function assignReminderId(key) {
  if (!key) return ASSIGN_REMINDER_ID
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return ASSIGN_REMINDER_BASE + (h % 200)
}

export function reminderOn() {
  try { return localStorage.getItem(FLAG) === '1' } catch { return false }
}

/* ── reminder time ──
   Stored as "HH:MM" (24h, device-local). A new family defaults to 6:00 PM
   (after school, before dinner). A family that switched the reminder on
   before the time was choosable keeps the old fixed 5:00 PM. */
const TIME_KEY = 'fq.reminder.time.v1'
export const DEFAULT_REMINDER_TIME = Object.freeze({ hour: 18, minute: 0 })
const LEGACY_REMINDER_TIME = Object.freeze({ hour: 17, minute: 0 })
/** The quick choices offered in first-launch setup: 4 PM, 6 PM, 7:30 PM. */
export const REMINDER_PRESETS = Object.freeze([
  Object.freeze({ hour: 16, minute: 0 }),
  Object.freeze({ hour: 18, minute: 0 }),
  Object.freeze({ hour: 19, minute: 30 }),
])

function validTime(hour, minute) {
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

export function getReminderTime() {
  try {
    const m = /^(\d{1,2}):(\d{2})$/.exec(localStorage.getItem(TIME_KEY) || '')
    if (m) {
      const hour = Number(m[1])
      const minute = Number(m[2])
      if (validTime(hour, minute)) return { hour, minute }
    }
  } catch { /* storage blocked */ }
  return reminderOn() ? { ...LEGACY_REMINDER_TIME } : { ...DEFAULT_REMINDER_TIME }
}

/** Save the reminder time. Does not (re)schedule; call setReminder(true)
    afterwards when the reminder is on. Returns false for a bad time. */
export function setReminderTime(hour, minute = 0) {
  if (!validTime(hour, minute)) return false
  try {
    localStorage.setItem(TIME_KEY, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  } catch { /* session only */ }
  return true
}

/** "6:00 PM" in the app-text language (falls back to English). */
export function formatReminderTime({ hour, minute } = DEFAULT_REMINDER_TIME, lang = 'en') {
  const d = new Date(2000, 0, 1, hour, minute)
  try {
    return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(d)
  } catch {
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(d)
  }
}

/** "18:30" for an <input type="time">. */
export function timeInputValue({ hour, minute } = DEFAULT_REMINDER_TIME) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

async function schedule({ title, body, hour, minute } = {}) {
  if (!isNativePlatform()) return false
  if (!validTime(hour, minute)) ({ hour, minute } = getReminderTime())
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
    await LocalNotifications.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: title || 'Anbessa misses you!',
        body: body || 'Come learn a letter today.',
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
      }],
    })
    return true
  } catch {
    return false
  }
}

async function cancel() {
  if (!isNativePlatform()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
  } catch { /* ignore */ }
}

/** Turn the daily reminder on/off. `on` schedules (and requests permission);
   returns whether it is actually armed. `texts` = { title, body } plus an
   optional { hour, minute }; without them the saved reminder time is used. */
export async function setReminder(on, texts) {
  // Pin the time the family sees right now before the on-flag flips, so a
  // fresh opt-in keeps the 6 PM default rather than the legacy 5 PM.
  if (on) {
    let saved = null
    try { saved = localStorage.getItem(TIME_KEY) } catch { /* ignore */ }
    if (!saved) { const cur = getReminderTime(); setReminderTime(cur.hour, cur.minute) }
  }
  try { localStorage.setItem(FLAG, on ? '1' : '0') } catch { /* session only */ }
  if (!on) { await cancel(); return false }
  const armed = await schedule(texts)
  if (!armed) { try { localStorage.setItem(FLAG, '0') } catch { /* ignore */ } }
  return armed
}

/** Native boot: re-arm the reminder if the grown-up had it on. */
export async function initReminder(texts) {
  if (!isNativePlatform() || !reminderOn()) return
  await schedule(texts)
}

/* ── homework due reminder (one-off, tied to an assignment's due date) ──
   When a student opens a class assignment, nudge them on the due day so
   homework does not slip. Piggybacks the SAME opt-in as the daily reminder
   (reminderOn) so it never prompts a child on its own, and uses a separate
   id so it does not disturb the daily nudge. Native-only; no-op on web. */
export async function scheduleAssignmentDue({ due, title, body, hour = 16, key } = {}) {
  if (!isNativePlatform() || !reminderOn()) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(due || ''))) return false
  const [y, m, d] = due.split('-').map(Number)
  const at = new Date(y, m - 1, d, hour, 0, 0)
  if (at.getTime() <= Date.now()) return false // due date already past
  const id = assignReminderId(key)
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    await LocalNotifications.cancel({ notifications: [{ id }] })
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title: title || 'Homework due today',
        body: body || 'Finish your eGeez class assignment.',
        schedule: { at, allowWhileIdle: true },
      }],
    })
    return true
  } catch {
    return false
  }
}

export async function cancelAssignmentDue(key) {
  if (!isNativePlatform()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: assignReminderId(key) }] })
  } catch { /* ignore */ }
}
