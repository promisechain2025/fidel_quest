/* Daily reminder: opt-in, native-only, time choosable (default 6 PM; a
   family that opted in before times existed keeps 5 PM). */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const native = vi.hoisted(() => ({ on: true }))
const LN = vi.hoisted(() => ({
  perm: 'granted',
  requestPermissions: vi.fn(),
  cancel: vi.fn(async () => {}),
  schedule: vi.fn(async () => {}),
}))
vi.mock('./native', () => ({ isNativePlatform: () => native.on }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: LN }))

const {
  reminderOn, setReminder, initReminder, getReminderTime, setReminderTime, formatReminderTime,
  timeInputValue, REMINDER_PRESETS, DEFAULT_REMINDER_TIME,
} = await import('./notify')

const TEXTS = { title: 'Anbessa misses you!', body: 'Come learn a letter today.' }

beforeEach(() => {
  native.on = true
  LN.perm = 'granted'
  LN.requestPermissions.mockReset().mockImplementation(async () => ({ display: LN.perm }))
  LN.schedule.mockClear()
  LN.cancel.mockClear()
})

const lastSchedule = () => LN.schedule.mock.calls.at(-1)[0].notifications[0]

describe('reminder time', () => {
  it('defaults to 6:00 PM for a new family, with 4 PM / 6 PM / 7:30 PM presets', () => {
    expect(getReminderTime()).toEqual({ hour: 18, minute: 0 })
    expect(DEFAULT_REMINDER_TIME).toEqual({ hour: 18, minute: 0 })
    expect(REMINDER_PRESETS.map(timeInputValue)).toEqual(['16:00', '18:00', '19:30'])
  })

  it('keeps 5:00 PM for a family that opted in before the time was choosable', () => {
    localStorage.setItem('fq.reminder.v1', '1')
    expect(getReminderTime()).toEqual({ hour: 17, minute: 0 })
  })

  it('saves valid times only', () => {
    expect(setReminderTime(19, 30)).toBe(true)
    expect(getReminderTime()).toEqual({ hour: 19, minute: 30 })
    expect(localStorage.getItem('fq.reminder.time.v1')).toBe('19:30')
    expect(setReminderTime(24, 0)).toBe(false)
    expect(setReminderTime(7, 60)).toBe(false)
    expect(setReminderTime(7.5, 0)).toBe(false)
    expect(getReminderTime()).toEqual({ hour: 19, minute: 30 })
  })

  it('formats for display', () => {
    expect(formatReminderTime({ hour: 18, minute: 0 }, 'en')).toMatch(/^6:00\s?PM$/)
    expect(formatReminderTime({ hour: 19, minute: 30 }, 'de')).toBe('19:30')
  })
})

describe('setReminder', () => {
  it('turning on asks permission in that moment and schedules a daily repeat at the saved time', async () => {
    setReminderTime(16, 0)
    expect(await setReminder(true, TEXTS)).toBe(true)
    expect(LN.requestPermissions).toHaveBeenCalledTimes(1)
    const n = lastSchedule()
    expect(n.schedule.on).toEqual({ hour: 16, minute: 0 })
    expect(n.schedule.repeats).toBe(true)
    expect(reminderOn()).toBe(true)
  })

  it('a fresh opt-in pins the 6 PM default (not the legacy 5 PM)', async () => {
    expect(await setReminder(true, TEXTS)).toBe(true)
    expect(lastSchedule().schedule.on).toEqual({ hour: 18, minute: 0 })
    expect(getReminderTime()).toEqual({ hour: 18, minute: 0 })
  })

  it('notification copy is kids-safe: friendly, no purchase, no link', async () => {
    await setReminder(true, TEXTS)
    const { title, body } = lastSchedule()
    for (const s of [title, body]) {
      expect(s).not.toMatch(/https?:|www\.|buy|price|\$|purchase|unlock|sale|offer/i)
    }
  })

  it('permission denied leaves it off', async () => {
    LN.perm = 'denied'
    expect(await setReminder(true, TEXTS)).toBe(false)
    expect(reminderOn()).toBe(false)
    expect(LN.schedule).not.toHaveBeenCalled()
  })

  it('turning off cancels; on the web it never schedules', async () => {
    await setReminder(true, TEXTS)
    expect(await setReminder(false)).toBe(false)
    expect(LN.cancel).toHaveBeenCalled()
    native.on = false
    LN.schedule.mockClear()
    expect(await setReminder(true, TEXTS)).toBe(false)
    expect(LN.schedule).not.toHaveBeenCalled()
  })

  it('boot re-arms only an opted-in reminder, at its saved time', async () => {
    await initReminder(TEXTS)
    expect(LN.schedule).not.toHaveBeenCalled()
    localStorage.setItem('fq.reminder.v1', '1')
    localStorage.setItem('fq.reminder.time.v1', '19:30')
    await initReminder(TEXTS)
    expect(lastSchedule().schedule.on).toEqual({ hour: 19, minute: 30 })
  })
})
