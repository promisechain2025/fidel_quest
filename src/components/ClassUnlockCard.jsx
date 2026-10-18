/* Teacher Mode: generate / rotate the class's web unlock (platform/classUnlock.js).
   Students who open the class invite link get the full easygeez.com/app on
   that browser until the code expires; a grown-up can also type the code in
   the trial screen. Grown-up area: t() with English fallbacks. */
import { useState } from 'react'
import { KeyRound, RefreshCw } from 'lucide-react'
import { t } from '../platform/i18n'
import { mintClassUnlock, DURATIONS } from '../platform/classUnlock'
import { setClassUnlock } from '../platform/classroom'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

export const unlockLive = (u, now = Date.now()) => !!u && now < u.expiresAt

export default function ClassUnlockCard({ code, cls, onChanged, now = Date.now() }) {
  const [days, setDays] = useState(cls.unlock?.days || 30)
  const [busy, setBusy] = useState(false)
  const live = unlockLive(cls.unlock, now)
  const make = async () => {
    setBusy(true)
    const gen = cls.unlock ? (cls.unlock.gen + 1) % 31 : 0
    const c = await mintClassUnlock({ classCode: code, days, gen, now })
    if (c) setClassUnlock(code, { code: c, days, gen, expiresAt: now + days * 86400000 })
    setBusy(false)
    onChanged?.()
  }
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }} data-testid="class-unlock-card">
      <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        <KeyRound className="h-4 w-4" aria-hidden="true" /> {t('cuTitle', 'Unlock the web app for this class')}
      </h2>
      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
        {t('cuHint', 'For families without the phone app: students who open your invite link get the full easygeez.com/app until the code expires. Rotate it if it gets shared outside the class.')}
      </p>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label={t('cuDuration', 'Valid for (days)')}>
        {DURATIONS.map((d) => (
          <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => setDays(d)}
            className={`min-h-[44px] flex-1 rounded-xl border-2 text-sm font-black tabular-nums ${FOCUS}`}
            style={days === d ? { background: 'var(--go-soft)', borderColor: 'var(--go)', color: 'var(--go-ink)', outlineColor: 'var(--sky)' } : { borderColor: 'var(--line)', outlineColor: 'var(--sky)' }}>
            {t('cuDays', '{n} days', { n: d })}
          </button>
        ))}
      </div>
      {live && (
        <div className="mt-3 rounded-2xl border-2 p-3 text-center" style={{ borderColor: 'var(--line)', background: 'var(--paper)' }}>
          <p className="mono text-lg font-black tracking-wider" data-testid="class-unlock-code">{cls.unlock.code}</p>
          <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>
            {t('cuExpires', 'Works until {date} · version {g}', { date: new Date(cls.unlock.expiresAt).toLocaleDateString(), g: cls.unlock.gen + 1 })}
          </p>
        </div>
      )}
      <button type="button" disabled={busy} onClick={make} data-testid="class-unlock-make"
        className={`chunk mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-white ${FOCUS}`}
        style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
        {cls.unlock ? <RefreshCw className="h-5 w-5" aria-hidden="true" /> : <KeyRound className="h-5 w-5" aria-hidden="true" />}
        {cls.unlock ? t('cuRotate', 'Make a new code') : t('cuMake', 'Make unlock code')}
      </button>
      <p className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
        {t('cuLimit', 'Works on this device without a server. Codes expire; once the class view is connected, rotating also switches off older codes.')}
      </p>
    </section>
  )
}
