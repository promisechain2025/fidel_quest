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
