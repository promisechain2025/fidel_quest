/* Shared non-component helpers for the learning games' UI (see components/gameKit.jsx). */
import { useEffect, useState } from 'react'

export const GO_BTN = { background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', color: '#fff', '--chunk-depth': '4px' }
export const PLAIN_BTN = { background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }

/** True on tablet-width screens (iPad portrait and up). */
export function useWide() {
  const q = '(min-width: 768px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches)
  useEffect(() => {
    const m = window.matchMedia?.(q)
    if (!m) return undefined
    const on = () => setWide(m.matches)
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [])
  return wide
}

