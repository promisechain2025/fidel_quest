/* Two-chip toggle shared by the games: practise "My letters" (the ones learned
   on the Journey so far) or "All letters" (the whole abugida). Controlled -
   the parent game owns the scope state (seeded from the shared preference) and
   persists it via setScope so the choice carries across games. */
import { t } from '../platform/i18n'
import { SCOPES, learnedCount } from '../platform/letterScope'
import { FIDEL_FAMILIES } from '../platform/ethiopic'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

export default function ScopeToggle({ scope, onChange, className = '' }) {
  const learned = learnedCount()
  const total = FIDEL_FAMILIES.length // 33 (Amharic) or 34 (Tigrinya, +qhe)
  const options = [
    { id: SCOPES.LEARNED, label: t('scopeLearned', 'My letters'), sub: `${learned}/${total}` },
    { id: SCOPES.ALL, label: t('scopeAll', 'All letters'), sub: `${total}` },
  ]
  return (
    <div className={`flex items-center gap-1.5 ${className}`} role="group" aria-label={t('scopeLabel', 'Which letters')}>
      {options.map(({ id, label, sub }) => {
        const on = scope === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => { if (!on) onChange(id) }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black ${FOCUS}`}
            style={{ background: on ? 'var(--go)' : 'var(--card)', color: on ? '#fff' : 'var(--muted)', border: '2px solid var(--line)', outlineColor: 'var(--sky)' }}
          >
            {label}
            <span className="mono text-[11px] font-bold opacity-80">{sub}</span>
          </button>
        )
      })}
    </div>
  )
}
