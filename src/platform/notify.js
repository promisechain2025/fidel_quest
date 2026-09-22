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

async function schedule({ title, body, hour = 17, minute = 0 } = {}) {
  if (!isNativePlatform()) return false
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
   returns whether it is actually armed. `texts` = { title, body, hour, minute }. */
export async function setReminder(on, texts) {
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
