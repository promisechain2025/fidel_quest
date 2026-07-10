/* ============================================================================
   DROPDOWN — the app's own select
   ----------------------------------------------------------------------------
   A native <select> hands control to the platform (the iOS wheel steals the
   whole bottom of the screen and fights the sheet it sits in), so pickers
   use this instead: a chunky trigger button and an in-page option list,
   styled like every other control. Opens upward when asked (the language
   picker sits at the bottom of the Backpack sheet). Keyboard: Enter/Space
   opens, arrows move, Escape closes. Closes on any outside tap.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

export default function Dropdown({ value, options, onChange, label, geez = false, up = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const rootRef = useRef(null)
  const current = options.find(([id]) => id === value)

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close, true)
    return () => document.removeEventListener('pointerdown', close, true)
  }, [open])

  const pick = (id) => {
    setOpen(false)
    if (id !== value) onChange(id)
  }
  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) { setOpen(true); setHi(options.findIndex(([id]) => id === value)); e.preventDefault(); return }
    if (!open) return
    if (e.key === 'ArrowDown') { setHi((h) => Math.min(options.length - 1, h + 1)); e.preventDefault() }
    else if (e.key === 'ArrowUp') { setHi((h) => Math.max(0, h - 1)); e.preventDefault() }
    else if (e.key === 'Enter' || e.key === ' ') { if (hi >= 0) pick(options[hi][0]); e.preventDefault() }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKey}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2.5 text-sm font-black ${FOCUS}`}
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
      >
        <span className={`${geez ? 'geez ' : ''}truncate`}>{current ? current[1] : ''}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--muted)' }} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className={`absolute left-0 right-0 z-30 max-h-56 overflow-y-auto rounded-2xl border-2 p-1 shadow-lg ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
        >
          {options.map(([id, text], i) => {
            const active = id === value
            return (
              <li key={id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => pick(id)}
                  onPointerEnter={() => setHi(i)}
                  className={`${geez ? 'geez ' : ''}flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold ${FOCUS}`}
                  style={{
                    background: active ? 'var(--go)' : i === hi ? 'var(--go-soft)' : 'transparent',
                    color: active ? '#fff' : 'var(--ink)',
                    outlineColor: 'var(--sky)',
                  }}
                >
                  <span className="truncate">{text}</span>
                  {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
