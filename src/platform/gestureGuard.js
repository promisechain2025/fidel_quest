/* Accidental zoom / hold guards for a kids' app.

   Kids pinch, double-tap, triple-tap, hold, drag across text and press with a
   whole hand. None of that may zoom the page, select text, open the iOS
   callout / Android context menu / desktop right-click menu, or pull-refresh.
   CSS does most of it (index.css: touch-action, user-select,
   -webkit-touch-callout, overscroll-behavior, text-size-adjust). iOS ignores
   user-scalable=no and fires gesture* events, and desktop browsers zoom on
   Ctrl+wheel / Ctrl+plus, so those are cancelled here.

   Exception: the Grown-Ups area (a node with data-allow-zoom) may be
   zoomed for readability, and text fields stay selectable and editable. */

const ALLOW = '[data-allow-zoom]'
const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

const asEl = (t) => (t && t.nodeType === 1 ? t : t && t.parentElement) || null
export const isEditable = (t) => !!asEl(t)?.closest?.(EDITABLE)
export const zoomAllowed = (t) => !!asEl(t)?.closest?.(ALLOW) || (typeof document !== 'undefined' && !!document.querySelector(ALLOW) && !t)

/* Returns true when the event must be cancelled. Pure so it can be tested. */
export function shouldBlock(type, e) {
  const t = e.target
  switch (type) {
    case 'gesturestart':
    case 'gesturechange':
    case 'gestureend':
      return !zoomAllowed(t)
    case 'touchmove':
      return !!e.touches && e.touches.length > 1 && !zoomAllowed(t)
    case 'wheel':
      return !!(e.ctrlKey || e.metaKey) && !zoomAllowed(t)
    case 'keydown':
      return !!(e.ctrlKey || e.metaKey) && ['+', '-', '=', '_', '0'].includes(e.key) && !zoomAllowed(t) && !isEditable(t)
    case 'contextmenu':
    case 'selectstart':
      return !isEditable(t)
    case 'dragstart':
      return !isEditable(t)
    case 'dblclick':
      return !isEditable(t) && !zoomAllowed(t)
    default:
      return false
  }
}

let installed = false
export function installGestureGuards(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || installed) return () => {}
  installed = true
  const on = (type, opts) => {
    const h = (e) => { if (shouldBlock(type, e)) e.preventDefault() }
    doc.addEventListener(type, h, opts)
    return () => doc.removeEventListener(type, h, opts)
  }
  const off = [
    ...['gesturestart', 'gesturechange', 'gestureend', 'touchmove', 'wheel', 'keydown'].map((t) => on(t, { passive: false })),
    ...['contextmenu', 'selectstart', 'dragstart', 'dblclick'].map((t) => on(t, false)),
  ]
  return () => { off.forEach((f) => f()); installed = false }
}
