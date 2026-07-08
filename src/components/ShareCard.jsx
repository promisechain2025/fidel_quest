/* The viral loop (client-side only): render the child's Anbessa in its earned
   wardrobe onto a square card with their progress, then hand it to the OS
   share sheet (WhatsApp / social) via the Web Share API, falling back to a
   PNG download. No backend, no accounts, no data leaves the device unless the
   parent chooses to share the image. */
import { drawAnbessa, drawWearables } from '../FidelQuestApp'
import { track } from '../platform/analytics'
import { isNativePlatform } from '../platform/native'

const BG_TOP = '#fff3d6'
const BG_BOTTOM = '#ffd98a'

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/** Draw the whole share card at side S. Pure canvas draw (no image assets). */
export function drawShareCard(g, S, { forms = 0, worn = [] } = {}) {
  // Warm gradient ground.
  const grad = g.createLinearGradient(0, 0, 0, S)
  grad.addColorStop(0, BG_TOP)
  grad.addColorStop(1, BG_BOTTOM)
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)

  // Faint fidel confetti in the corners for texture.
  g.save()
  g.globalAlpha = 0.12
  g.fillStyle = '#b4560a'
  g.font = `700 ${S * 0.09}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const glyphs = ['ሀ', 'ለ', 'መ', 'ሠ', 'ቀ', 'በ', 'ተ', 'ኀ']
  const spots = [[0.12, 0.14], [0.88, 0.13], [0.1, 0.86], [0.9, 0.85], [0.5, 0.08]]
  spots.forEach(([fx, fy], i) => g.fillText(glyphs[i % glyphs.length], S * fx, S * fy))
  g.restore()

  // Title.
  g.fillStyle = '#7c3d00'
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.font = `900 ${S * 0.075}px system-ui, -apple-system, sans-serif`
  g.fillText('Fidel Quest', S / 2, S * 0.16)
  g.font = `700 ${S * 0.11}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
  g.fillStyle = '#dd8a00'
  g.fillText('ፊደል', S / 2, S * 0.28)

  // Anbessa in wardrobe, drawn on a temp canvas then composited.
  const D = Math.round(S * 0.5)
  const tmp = document.createElement('canvas')
  tmp.width = tmp.height = D
  const tg = tmp.getContext('2d')
  if (tg) {
    drawAnbessa(tg, D)
    if (worn.length) drawWearables(tg, D, worn)
    g.drawImage(tmp, (S - D) / 2, S * 0.3, D, D)
  }

  // Progress pill.
  const pillW = S * 0.72
  const pillH = S * 0.12
  const pillX = (S - pillW) / 2
  const pillY = S * 0.82
  g.fillStyle = '#ffffff'
  roundRect(g, pillX, pillY, pillW, pillH, pillH / 2)
  g.fill()
  g.fillStyle = '#179061'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `900 ${S * 0.055}px system-ui, sans-serif`
  g.fillText(`${forms} / 231 letters learned`, S / 2, pillY + pillH * 0.5)

  // Footer tagline.
  g.fillStyle = '#7c3d00'
  g.font = `700 ${S * 0.032}px system-ui, sans-serif`
  g.fillText('Learn the Amharic alphabet - free & offline', S / 2, S * 0.965)
}

async function toBlob(canvas) {
  return new Promise((resolve) => {
    if (canvas.toBlob) canvas.toBlob((b) => resolve(b), 'image/png')
    else resolve(null)
  })
}

/** Render the card and hand it to the share sheet, or download as a fallback.
    Returns 'shared' | 'downloaded' | 'cancelled' | 'unsupported'. */
export async function shareAnbessa({ forms = 0, worn = [] } = {}) {
  const S = 1080
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const g = canvas.getContext('2d')
  if (!g) return 'unsupported'
  drawShareCard(g, S, { forms, worn })

  const blob = await toBlob(canvas)
  const url = typeof window !== 'undefined' ? window.location.origin : ''
  const text = "I'm learning the Amharic alphabet with Anbessa the lion cub!"

  // Native shell: write the card to the cache and share the file URI via the OS
  // sheet (WebView navigator.share can't share an in-memory File reliably).
  if (blob && isNativePlatform()) {
    try {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ])
      const dataUrl = await blobToDataUrl(blob)
      const name = `fidel-quest-${Date.now()}.png`
      await Filesystem.writeFile({ path: name, data: dataUrl.split(',')[1], directory: Directory.Cache })
      const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache })
      await Share.share({ title: 'Fidel Quest', text, url, files: [uri] })
      track('share')
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
      // fall through to text/url share, then download
    }
  }

  try {
    if (blob && navigator.canShare) {
      const file = new File([blob], 'fidel-quest.png', { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Fidel Quest', text, url, files: [file] })
        track('share')
        return 'shared'
      }
    }
    if (navigator.share) {
      await navigator.share({ title: 'Fidel Quest', text, url })
      track('share')
      return 'shared'
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled'
    // fall through to download
  }

  if (blob) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'fidel-quest.png'
    a.click()
    URL.revokeObjectURL(a.href)
    track('share')
    return 'downloaded'
  }
  return 'unsupported'
}
