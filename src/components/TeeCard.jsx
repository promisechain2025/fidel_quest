/* Render a T-shirt design to canvas (no image assets), and hand it off:
   save a print-ready PNG, or open the operator's store to order a real shirt.
   Pure drawing so it works for both the on-screen thumbnails and the high-res
   export. The store URL is configured by the operator (VITE_SHOP_URL); until
   it is set, "order" gracefully falls back to saving the design. */
import { drawAnbessa, drawWearables } from '../FidelQuestApp'
import { track } from '../platform/analytics'

const SHOP_URL = import.meta.env?.VITE_SHOP_URL || null

/** Lighten (amt>0) or darken (amt<0) a #rrggbb hex by amt (0-255). */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const clamp = (v) => Math.max(0, Math.min(255, v))
  const r = clamp((n >> 16) + amt)
  const g = clamp(((n >> 8) & 0xff) + amt)
  const b = clamp((n & 0xff) + amt)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/** Draw one T-shirt design at side S. `design` is a TEE_DESIGNS entry. */
export function drawTee(g, S, design, { forms = 0, worn = [] } = {}) {
  const cx = S / 2
  const shirt = design.shirt
  g.clearRect(0, 0, S, S)

  // Soft studio background so the shirt reads on any screen.
  const bg = g.createLinearGradient(0, 0, 0, S)
  bg.addColorStop(0, '#faf6ec')
  bg.addColorStop(1, '#f0e7d2')
  g.fillStyle = bg
  g.fillRect(0, 0, S, S)

  // ── the shirt ──
  // sleeves (behind the body)
  g.fillStyle = shade(shirt, -22)
  for (const s of [-1, 1]) {
    g.beginPath()
    g.moveTo(cx + s * S * 0.2, S * 0.26)
    g.lineTo(cx + s * S * 0.42, S * 0.36)
    g.lineTo(cx + s * S * 0.36, S * 0.52)
    g.lineTo(cx + s * S * 0.2, S * 0.44)
    g.closePath()
    g.fill()
  }
  // body
  g.fillStyle = shirt
  roundRect(g, cx - S * 0.24, S * 0.26, S * 0.48, S * 0.62, S * 0.05)
  g.fill()
  // shoulders fill the gap to the sleeves
  g.beginPath()
  g.moveTo(cx - S * 0.24, S * 0.3)
  g.lineTo(cx - S * 0.2, S * 0.26)
  g.lineTo(cx + S * 0.2, S * 0.26)
  g.lineTo(cx + S * 0.24, S * 0.3)
  g.closePath()
  g.fill()
  // collar
  g.fillStyle = shade(shirt, -30)
  g.beginPath()
  g.ellipse(cx, S * 0.28, S * 0.09, S * 0.045, 0, 0, Math.PI)
  g.fill()
  g.fillStyle = '#faf6ec'
  g.beginPath()
  g.ellipse(cx, S * 0.275, S * 0.075, S * 0.036, 0, 0, Math.PI)
  g.fill()
  // hem + sleeve cuffs
  g.strokeStyle = shade(shirt, -30)
  g.lineWidth = S * 0.006
  g.beginPath()
  g.moveTo(cx - S * 0.22, S * 0.86)
  g.lineTo(cx + S * 0.22, S * 0.86)
  g.stroke()

  // ── the printed design on the chest ──
  const pcx = cx
  const pcy = S * 0.56
  const pr = S * 0.155
  // print circle
  g.fillStyle = 'rgba(255,255,255,0.94)'
  g.beginPath()
  g.arc(pcx, pcy, pr, 0, 7)
  g.fill()
  g.strokeStyle = design.ink
  g.lineWidth = S * 0.006
  g.stroke()

  // Anbessa (in the child's earned wardrobe) inside the print.
  const D = Math.round(pr * 1.7)
  const tmp = typeof document !== 'undefined' ? document.createElement('canvas') : null
  const tg = tmp?.getContext?.('2d')
  if (tg) {
    tmp.width = tmp.height = D
    drawAnbessa(tg, D)
    if (worn.length) drawWearables(tg, D, worn)
    g.drawImage(tmp, pcx - D / 2, pcy - D / 2 - pr * 0.12, D, D)
  }

  // Ge'ez motif arc above Anbessa.
  g.fillStyle = design.ink
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `900 ${S * 0.05}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
  g.fillText(design.motif, pcx, pcy - pr * 0.62)

  // Progress ribbon under the print.
  g.fillStyle = design.ink
  roundRect(g, cx - S * 0.2, S * 0.74, S * 0.4, S * 0.058, S * 0.029)
  g.fill()
  g.fillStyle = '#ffffff'
  g.font = `800 ${S * 0.03}px system-ui, sans-serif`
  g.fillText(`${forms} / 231 ${forms === 231 ? 'MASTERED' : 'letters'}`, cx, S * 0.769)

  // Design name (English) tucked at the bottom of the shirt.
  g.fillStyle = shade(shirt, -55)
  g.font = `800 ${S * 0.026}px system-ui, sans-serif`
  g.fillText(design.name.toUpperCase(), cx, S * 0.83)
}

async function toBlob(canvas) {
  return new Promise((resolve) => {
    if (canvas.toBlob) canvas.toBlob((b) => resolve(b), 'image/png')
    else resolve(null)
  })
}

/** Render the design at print resolution and download it as a PNG.
    Returns 'downloaded' | 'unsupported'. */
export async function saveTee(design, { forms = 0, worn = [] } = {}) {
  const S = 1400
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const g = canvas.getContext('2d')
  if (!g) return 'unsupported'
  drawTee(g, S, design, { forms, worn })
  const blob = await toBlob(canvas)
  if (!blob) return 'unsupported'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `fidel-quest-tee-${design.id}.png`
  a.click()
  URL.revokeObjectURL(a.href)
  track('tee_save')
  return 'downloaded'
}

/** Open the operator's store to order a real shirt (design id passed through
    so the storefront can preselect it). Falls back to saving the PNG when no
    store is configured. Returns 'ordered' | 'saved' | 'unsupported'. */
export async function orderTee(design, opts) {
  if (SHOP_URL) {
    const sep = SHOP_URL.includes('?') ? '&' : '?'
    const url = `${SHOP_URL}${sep}design=${encodeURIComponent(design.id)}`
    track('tee_order')
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
    return 'ordered'
  }
  const r = await saveTee(design, opts)
  return r === 'downloaded' ? 'saved' : 'unsupported'
}

export const shopConfigured = () => !!SHOP_URL
