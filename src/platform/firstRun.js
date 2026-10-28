/* ============================================================================
   FIRST-LAUNCH SETUP — which friendly setup steps to show, once
   ----------------------------------------------------------------------------
   The first-launch language sheet grew into a short, skippable setup:

     1. lang      — learn alphabet + app text (the existing picker, shown only
                    when the device locale did not already decide it)
     2. reminder  — "Remind us to practise every day?" (native only: local
                    notifications do not exist on the web build)
     3. sound     — sounds & voice on/off (fresh installs only, and only as
                    part of a flow that has another step; never alone)

   Existing installs that already chose a language are NOT sent through the
   language step again; on the native app they see the reminder step once.
   Changing the language reloads the app, so the remaining steps are parked
   in `resume` and the flow picks up after the reload. Everything is local;
   nothing leaves the device.
   ========================================================================== */
import { t } from './i18n'

export const SETUP_KEY = 'fq.setup.v1'
export const SETUP_STEPS = Object.freeze(['lang', 'reminder', 'sound'])

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY))
    return s && typeof s === 'object' ? s : {}
  } catch {
    return {}
  }
}
function save(s) {
  try { localStorage.setItem(SETUP_KEY, JSON.stringify(s)) } catch { /* session only */ }
}

/** Plan the setup for this launch. Returns { steps, before } where `before`
    is how many steps were already done before a language reload (for the
    "Step 2 of 3" counter). An empty `steps` means: show nothing. */
export function planSetup({ native = false, fresh = false, langNeeded = false, reminderAlreadyOn = false } = {}) {
  const s = load()
  const reminderOk = native && !reminderAlreadyOn
  if (Array.isArray(s.resume)) {
    const steps = s.resume.filter((st) => st !== 'lang' && SETUP_STEPS.includes(st) && (st !== 'reminder' || reminderOk))
    if (!steps.length) { save({ done: true }); return { steps: [], before: 0 } }
    return { steps, before: Math.max(0, Number(s.before) || 0) }
  }
  if (s.done) return { steps: [], before: 0 }
  const steps = []
  if (langNeeded) steps.push('lang')
  if (reminderOk) steps.push('reminder')
  if (fresh && steps.length) steps.push('sound')
  return { steps, before: 0 }
}

/** About to reload for a language change: remember what is left. */
export function parkSetup(remaining, before) {
  save({ resume: remaining.filter((st) => st !== 'lang'), before })
}

/** The family finished or skipped the setup: never show it again. */
export function finishSetup() {
  save({ done: true })
}

export function setupDone() {
  return !!load().done
}

/** The daily reminder's notification copy. Kids-category safe: a friendly
    nudge from Anbessa, no purchase, no link, no urgency. */
export function reminderTexts() {
  return {
    title: t('remindTitle', 'Anbessa misses you!'),
    body: t('remindBody', 'Come learn a letter today.'),
  }
}
