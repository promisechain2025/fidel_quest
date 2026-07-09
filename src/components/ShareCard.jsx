/* The viral loop (client-side only): render the child's Anbessa in its earned
   wardrobe onto a square card with their progress, then hand it to the OS
   share sheet (WhatsApp / social) via the Web Share API, falling back to a
   PNG download. No backend, no accounts, no data leaves the device unless the
   parent chooses to share the image. */
import { drawAnbessa, drawWearables } from '../FidelQuestApp'
import { track } from '../platform/analytics'
import { isNativePlatform, isApplePlatform } from '../platform/native'
import { appStoreUrl } from '../platform/gift'

/** The link that travels with shares so the recipient can find the app:
    VITE_APP_URL when set (the canonical web/store landing), else the App
    Store page on APPLE native builds only (an apps.apple.com link is useless
    to Android relatives), else this deployment's own origin on the web.
    May return '' on native - callers must omit empty urls from the payload. */
export function appShareUrl() {
  const env = import.meta.env?.VITE_APP_URL
  if (typeof env === 'string' && env.trim()) return env.trim()
  if (isNativePlatform()) return isApplePlatform() ? appStoreUrl() : ''
  return typeof window !== 'undefined' ? window.location.origin : ''
}

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

/** Draw the whole share card at side S. Pure canvas draw (no image assets).
    `headline` (e.g. "Selam learned 8 letters!") personalizes milestone shares;
    without it the card shows the generic ፊደል wordmark. */
export function drawShareCard(g, S, { forms = 0, worn = [], headline = '' } = {}) {
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
  if (headline) {
    // Personalized milestone: shrink to fit the card width. The headline is
    // localized (Amharic/Tigrinya UIs pass Ge'ez, and the nickname itself can
    // be Ge'ez), so the stack must name the bundled Ethiopic face.
    const hFont = (px) => `900 ${px}px 'Noto Sans Ethiopic', 'Abyssinica SIL', system-ui, -apple-system, sans-serif`
    g.fillStyle = '#b4560a'
    let size = S * 0.075
    g.font = hFont(size)
    while (g.measureText(headline).width > S * 0.9 && size > S * 0.04) {
      size -= S * 0.004
      g.font = hFont(size)
    }
    g.fillText(headline, S / 2, S * 0.285)
  } else {
    g.font = `700 ${S * 0.11}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
    g.fillStyle = '#dd8a00'
    g.fillText('ፊደል', S / 2, S * 0.28)
  }

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

/** Draw the "my name in Fidel" card at side S: the child's name rendered big in
    Ge'ez is the hero, Anbessa waves below, with the latin reading + app tagline.
    Pure canvas (no image assets), same warm identity as the progress card. */
export function drawNameCard(g, S, { name = '', latin = '', worn = [] } = {}) {
  const grad = g.createLinearGradient(0, 0, 0, S)
  grad.addColorStop(0, BG_TOP)
  grad.addColorStop(1, BG_BOTTOM)
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)

  // Faint fidel confetti for texture.
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

  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'

  // Eyebrow.
  g.fillStyle = '#7c3d00'
  g.font = `900 ${S * 0.05}px system-ui, -apple-system, sans-serif`
  g.fillText('Fidel Quest', S / 2, S * 0.13)

  // The name in Ge'ez — the hero. Shrink to fit within the card width.
  g.fillStyle = '#c85400'
  let size = S * 0.2
  g.font = `900 ${size}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
  while (g.measureText(name).width > S * 0.86 && size > S * 0.07) {
    size -= S * 0.006
    g.font = `900 ${size}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
  }
  g.fillText(name || 'ስም', S / 2, S * 0.31)

  // Latin reading underneath.
  if (latin) {
    g.fillStyle = '#9a5a1a'
    g.font = `700 ${S * 0.045}px system-ui, -apple-system, sans-serif`
    g.fillText(latin, S / 2, S * 0.37)
  }

  // Anbessa waving in the earned wardrobe.
  const D = Math.round(S * 0.42)
  const tmp = document.createElement('canvas')
  tmp.width = tmp.height = D
  const tg = tmp.getContext('2d')
  if (tg) {
    drawAnbessa(tg, D)
    if (worn.length) drawWearables(tg, D, worn)
    g.drawImage(tmp, (S - D) / 2, S * 0.4, D, D)
  }

  // Caption pill.
  const pillW = S * 0.66
  const pillH = S * 0.12
  const pillX = (S - pillW) / 2
  const pillY = S * 0.83
  g.fillStyle = '#ffffff'
  roundRect(g, pillX, pillY, pillW, pillH, pillH / 2)
  g.fill()
  g.fillStyle = '#179061'
  g.textBaseline = 'middle'
  g.font = `900 ${S * 0.05}px system-ui, sans-serif`
  g.fillText('My name in Fidel', S / 2, pillY + pillH * 0.5)

  // Footer tagline.
  g.fillStyle = '#7c3d00'
  g.textBaseline = 'alphabetic'
  g.font = `700 ${S * 0.032}px system-ui, sans-serif`
  g.fillText('Write yours - Fidel Quest, free & offline', S / 2, S * 0.965)
}

async function toBlob(canvas) {
  return new Promise((resolve) => {
    if (canvas.toBlob) canvas.toBlob((b) => resolve(b), 'image/png')
    else resolve(null)
  })
}

/** Render the card and hand it to the share sheet, or download as a fallback.
    Returns 'shared' | 'downloaded' | 'cancelled' | 'unsupported'. */
export async function shareAnbessa({ forms = 0, worn = [], headline = '' } = {}) {
  const S = 1080
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const g = canvas.getContext('2d')
  if (!g) return 'unsupported'
  drawShareCard(g, S, { forms, worn, headline })

  const blob = await toBlob(canvas)
  const url = appShareUrl()
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
      await Share.share({ title: 'Fidel Quest', text, ...(url ? { url } : {}), files: [uri] })
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
        await navigator.share({ title: 'Fidel Quest', text, ...(url ? { url } : {}), files: [file] })
        track('share')
        return 'shared'
      }
    }
    if (navigator.share) {
      await navigator.share({ title: 'Fidel Quest', text, ...(url ? { url } : {}) })
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

/** Draw the voice-postcard image at side S: a big Ge'ez greeting, Anbessa in
    wardrobe, and a voice-note bubble so the recipient knows to listen. The
    caption strings arrive pre-localized (the drawer stays language-blind). */
export function drawVoicePostcard(g, S, { heading = 'ሰላም!', lines = [], worn = [] } = {}) {
  const grad = g.createLinearGradient(0, 0, 0, S)
  grad.addColorStop(0, BG_TOP)
  grad.addColorStop(1, BG_BOTTOM)
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)

  g.save()
  g.globalAlpha = 0.12
  g.fillStyle = '#b4560a'
  g.font = `700 ${S * 0.09}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const glyphs = ['ሀ', 'ለ', 'መ', 'ሠ', 'ቀ', 'በ', 'ተ', 'ኀ']
  const spots = [[0.12, 0.14], [0.88, 0.13], [0.1, 0.86], [0.9, 0.85]]
  spots.forEach(([fx, fy], i) => g.fillText(glyphs[i % glyphs.length], S * fx, S * fy))
  g.restore()

  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.fillStyle = '#7c3d00'
  g.font = `900 ${S * 0.05}px system-ui, -apple-system, sans-serif`
  g.fillText('Fidel Quest', S / 2, S * 0.12)

  // The greeting, big and warm.
  g.fillStyle = '#c85400'
  g.font = `900 ${S * 0.16}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
  g.fillText(heading, S / 2, S * 0.28)

  // Anbessa in the earned wardrobe.
  const D = Math.round(S * 0.44)
  const tmp = document.createElement('canvas')
  tmp.width = tmp.height = D
  const tg = tmp.getContext('2d')
  if (tg) {
    drawAnbessa(tg, D)
    if (worn.length) drawWearables(tg, D, worn)
    g.drawImage(tmp, (S - D) / 2, S * 0.32, D, D)
  }

  // Voice-note bubble: rounded pill with a play triangle + waveform bars, so
  // even before pressing play the card reads as "there is a voice in here".
  const bw = S * 0.6
  const bh = S * 0.12
  const bx = (S - bw) / 2
  const by = S * 0.79
  g.fillStyle = '#ffffff'
  roundRect(g, bx, by, bw, bh, bh / 2)
  g.fill()
  g.fillStyle = '#179061'
  g.beginPath()
  const tx = bx + bh * 0.52
  const ty = by + bh / 2
  g.moveTo(tx - bh * 0.14, ty - bh * 0.2)
  g.lineTo(tx + bh * 0.2, ty)
  g.lineTo(tx - bh * 0.14, ty + bh * 0.2)
  g.closePath()
  g.fill()
  const bars = [0.3, 0.62, 0.45, 0.75, 0.5, 0.68, 0.35, 0.58, 0.42]
  bars.forEach((h, i) => {
    const x = bx + bh * 0.95 + i * (bw - bh * 1.35) / bars.length
    g.fillRect(x, ty - (bh * h) / 2, S * 0.012, bh * h)
  })

  // Caption under the bubble: up to two fit-to-width lines, set in the
  // Ethiopic face since the message to the family is written in Ge'ez.
  const caption = (lines || []).filter(Boolean)
  const capFont = (px) => `800 ${px}px 'Noto Sans Ethiopic', 'Abyssinica SIL', system-ui, sans-serif`
  const capY = caption.length > 1 ? [S * 0.935, S * 0.975] : [S * 0.965]
  caption.slice(0, 2).forEach((cap, i) => {
    g.fillStyle = '#7c3d00'
    let size = S * 0.036
    g.font = capFont(size)
    while (g.measureText(cap).width > S * 0.92 && size > S * 0.024) {
      size -= S * 0.002
      g.font = capFont(size)
    }
    g.fillText(cap, S / 2, capY[i])
  })
}

/** Share the voice postcard: the card PNG plus the recorded voice as a WAV,
    handed together to the share sheet (a picture + a voice note is the native
    WhatsApp idiom). Falls back to sharing just the voice, then to downloading
    both. Returns 'shared' | 'downloaded' | 'cancelled' | 'unsupported'. */
export async function shareVoicePostcard({ voice, heading, lines, worn = [], text = '' } = {}) {
  if (!voice) return 'unsupported'
  const S = 1080
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const g = canvas.getContext('2d')
  if (g) drawVoicePostcard(g, S, { heading, lines, worn })
  const png = g ? await toBlob(canvas) : null

  if (isNativePlatform()) {
    try {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ])
      const uris = []
      const stamp = Date.now()
      if (png) {
        const dataUrl = await blobToDataUrl(png)
        await Filesystem.writeFile({ path: `fidel-postcard-${stamp}.png`, data: dataUrl.split(',')[1], directory: Directory.Cache })
        uris.push((await Filesystem.getUri({ path: `fidel-postcard-${stamp}.png`, directory: Directory.Cache })).uri)
      }
      const voiceUrl = await blobToDataUrl(voice)
      await Filesystem.writeFile({ path: `fidel-voice-${stamp}.wav`, data: voiceUrl.split(',')[1], directory: Directory.Cache })
      uris.push((await Filesystem.getUri({ path: `fidel-voice-${stamp}.wav`, directory: Directory.Cache })).uri)
      await Share.share({ title: 'Fidel Quest', text, files: uris })
      track('postcard')
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
    }
  }

  const wavFile = typeof File !== 'undefined' ? new File([voice], 'fidel-voice.wav', { type: 'audio/wav' }) : null
  const pngFile = png && typeof File !== 'undefined' ? new File([png], 'fidel-postcard.png', { type: 'image/png' }) : null
  try {
    if (navigator.canShare && wavFile) {
      const both = pngFile ? [pngFile, wavFile] : [wavFile]
      if (navigator.canShare({ files: both })) {
        await navigator.share({ title: 'Fidel Quest', text, files: both })
        track('postcard')
        return 'shared'
      }
      if (navigator.canShare({ files: [wavFile] })) {
        await navigator.share({ title: 'Fidel Quest', text, files: [wavFile] })
        track('postcard')
        return 'shared'
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled'
  }

  try {
    for (const [blob, fname] of [[png, 'fidel-postcard.png'], [voice, 'fidel-voice.wav']]) {
      if (!blob) continue
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fname
      a.click()
      URL.revokeObjectURL(a.href)
    }
    track('postcard')
    return 'downloaded'
  } catch {
    return 'unsupported'
  }
}

/** Render the "my name in Fidel" card and hand it to the share sheet (or
    download as a fallback). Returns the same status strings as shareAnbessa. */
export async function shareName({ name = '', latin = '', worn = [] } = {}) {
  const S = 1080
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const g = canvas.getContext('2d')
  if (!g) return 'unsupported'
  drawNameCard(g, S, { name, latin, worn })

  const blob = await toBlob(canvas)
  const url = appShareUrl()
  const text = latin
    ? `${latin} - written in the Amharic alphabet with Fidel Quest!`
    : 'My name in the Amharic alphabet, written with Fidel Quest!'

  if (blob && isNativePlatform()) {
    try {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ])
      const dataUrl = await blobToDataUrl(blob)
      const fname = `fidel-name-${Date.now()}.png`
      await Filesystem.writeFile({ path: fname, data: dataUrl.split(',')[1], directory: Directory.Cache })
      const { uri } = await Filesystem.getUri({ path: fname, directory: Directory.Cache })
      await Share.share({ title: 'Fidel Quest', text, ...(url ? { url } : {}), files: [uri] })
      track('share')
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
    }
  }

  try {
    if (blob && navigator.canShare) {
      const file = new File([blob], 'fidel-name.png', { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Fidel Quest', text, ...(url ? { url } : {}), files: [file] })
        track('share')
        return 'shared'
      }
    }
    if (navigator.share) {
      await navigator.share({ title: 'Fidel Quest', text, ...(url ? { url } : {}) })
      track('share')
      return 'shared'
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled'
  }

  if (blob) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'fidel-name.png'
    a.click()
    URL.revokeObjectURL(a.href)
    track('share')
    return 'downloaded'
  }
  return 'unsupported'
}
