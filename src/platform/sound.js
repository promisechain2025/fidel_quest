/* ============================================================================
   SOUND SETTING — one key for the whole app
   ----------------------------------------------------------------------------
   Three modes historically stored their own mute flag (fq2.sound '0'/'1',
   fq3.sound '0'/'1', fidel-quest-sound 'on'/'off'), so muting the main app
   left Skylands and Classic loud. One device-level key now rules them all,
   with a one-time migration that respects an existing mute in ANY legacy
   key (a parent who muted somewhere meant it). Device setting, not child
   progress - deliberately outside the progress registry and profile swap.
   ========================================================================== */

const KEY = 'fq.sound.v1'
const LEGACY = [
  { key: 'fq2.sound', off: '0' },
  { key: 'fq3.sound', off: '0' },
  { key: 'fidel-quest-sound', off: 'off' },
]

function migrate() {
  try {
    if (localStorage.getItem(KEY) != null) return
    let sawLegacy = false
    let anyOff = false
    for (const { key, off } of LEGACY) {
      const v = localStorage.getItem(key)
      if (v != null) {
        sawLegacy = true
        if (v === off) anyOff = true
      }
    }
    if (sawLegacy) localStorage.setItem(KEY, anyOff ? '0' : '1')
    for (const { key } of LEGACY) localStorage.removeItem(key)
  } catch {
    /* storage blocked - default applies */
  }
}

export function soundEnabled() {
  try {
    migrate()
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* session-only */
  }
  return !!on
}
