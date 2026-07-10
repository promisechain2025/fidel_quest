/* The viral loop (client-side only): render the child's Anbessa in its earned
   wardrobe onto a square card with their progress, then hand it to the OS
   share sheet (WhatsApp / social) via the Web Share API, falling back to a
   PNG download. No backend, no accounts, no data leaves the device unless the
   parent chooses to share the image. */
import { drawAnbessa, drawWearables } from '../FidelQuestApp'
import { track } from '../platform/analytics'
import { isNativePlatform, isApplePlatform } from '../platform/native'
import { appStoreUrl } from '../platform/gift'
import { blobToDataUrl } from '../platform/voicePack'

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

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/* ── shared card scaffold: every card starts from the same warm ground ── */
const CONFETTI_SPOTS = [[0.12, 0.14], [0.88, 0.13], [0.1, 0.86], [0.9, 0.85], [0.5, 0.08]]
function drawCardBase(g, S, { confetti = 5 } = {}) {
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
  CONFETTI_SPOTS.slice(0, confetti).forEach(([fx, fy], i) => g.fillText(glyphs[i % glyphs.length], S * fx, S * fy))
  g.restore()
}

/** Anbessa in the earned wardrobe, composited via a temp canvas. */
function drawHero(g, S, { worn = [], y = 0.3, d = 0.5 } = {}) {
  const D = Math.round(S * d)
  const tmp = document.createElement('canvas')
  tmp.width = tmp.height = D
  const tg = tmp.getContext('2d')
  if (!tg) return
  drawAnbessa(tg, D)
  if (worn.length) drawWearables(tg, D, worn)
  g.drawImage(tmp, (S - D) / 2, S * y, D, D)
}

/** Draw the whole share card at side S. Pure canvas draw (no image assets).
    `headline` (e.g. "Selam learned 8 letters!") personalizes milestone shares;
    without it the card shows the generic ፊደል wordmark. */
export function drawShareCard(g, S, { forms = 0, worn = [], headline = '' } = {}) {
  drawCardBase(g, S)

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

  drawHero(g, S, { worn, y: 0.3, d: 0.5 })

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
  drawCardBase(g, S)

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

  drawHero(g, S, { worn, y: 0.4, d: 0.42 })

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

/* ── the one share cascade every card goes through ─────────────────────────
   files: [{ blob, name, type }] (null entries skipped). Order matters: if a
   multi-file share is refused, the LAST file is retried alone - it carries
   the essential payload (the postcard's voice note). allowTextOnly controls
   whether a text/url-only share is an acceptable degraded result (true for
   picture cards, false when the file IS the message).
   Returns 'shared' | 'downloaded' | 'cancelled' | 'unsupported'. */
async function shareFiles({ files = [], text = '', url = '', event = 'share', allowTextOnly = true } = {}) {
  const real = files.filter((f) => f && f.blob)
  const payload = { title: 'Fidel Quest', text, ...(url ? { url } : {}) }

  // Native shell: write to the cache and share file URIs via the OS sheet
  // (WebView navigator.share can't share an in-memory File reliably).
  if (real.length && isNativePlatform()) {
    try {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ])
      const stamp = Date.now()
      const uris = []
      for (const f of real) {
        const path = `${stamp}-${f.name}`
        const dataUrl = await blobToDataUrl(f.blob)
        await Filesystem.writeFile({ path, data: dataUrl.split(',')[1], directory: Directory.Cache })
        uris.push((await Filesystem.getUri({ path, directory: Directory.Cache })).uri)
      }
      await Share.share({ ...payload, files: uris })
      track(event)
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
      // fall through to the web share, then download
    }
  }

  try {
    if (real.length && navigator.canShare && typeof File !== 'undefined') {
      const sets = real.length > 1 ? [real, [real[real.length - 1]]] : [real]
      for (const set of sets) {
        const fs = set.map((f) => new File([f.blob], f.name, { type: f.type }))
        if (navigator.canShare({ files: fs })) {
          await navigator.share({ ...payload, files: fs })
          track(event)
          return 'shared'
        }
      }
    }
    if (allowTextOnly && navigator.share) {
      await navigator.share(payload)
      track(event)
      return 'shared'
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled'
    // fall through to download
  }

  if (real.length) {
    try {
      for (const f of real) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(f.blob)
        a.download = f.name
        a.click()
        URL.revokeObjectURL(a.href)
      }
      track(event)
      return 'downloaded'
    } catch { /* fall through */ }
  }
  return 'unsupported'
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
  return shareFiles({
    files: [{ blob: await toBlob(canvas), name: 'fidel-quest.png', type: 'image/png' }],
    text: "I'm learning the Amharic alphabet with Anbessa the lion cub!",
    url: appShareUrl(),
  })
}

/** Draw the voice-postcard image at side S: a big Ge'ez greeting, Anbessa in
    wardrobe, and a voice-note bubble so the recipient knows to listen. The
    caption strings arrive pre-localized (the drawer stays language-blind). */
export function drawVoicePostcard(g, S, { heading = 'ሰላም!', lines = [], worn = [] } = {}) {
  drawCardBase(g, S, { confetti: 4 })

  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.fillStyle = '#7c3d00'
  g.font = `900 ${S * 0.05}px system-ui, -apple-system, sans-serif`
  g.fillText('Fidel Quest', S / 2, S * 0.12)

  // The greeting, big and warm.
  g.fillStyle = '#c85400'
  g.font = `900 ${S * 0.16}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
  g.fillText(heading, S / 2, S * 0.28)

  drawHero(g, S, { worn, y: 0.32, d: 0.44 })

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
  return shareFiles({
    files: [
      png ? { blob: png, name: 'fidel-postcard.png', type: 'image/png' } : null,
      { blob: voice, name: 'fidel-voice.wav', type: 'audio/wav' },
    ],
    text,
    event: 'postcard',
    // A text-only share without the recording would be a message with no
    // voice in it - fall to downloading the files instead.
    allowTextOnly: false,
  })
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
  return shareFiles({
    files: [{ blob: await toBlob(canvas), name: 'fidel-name.png', type: 'image/png' }],
    text: latin
      ? `${latin} - written in the Amharic alphabet with Fidel Quest!`
      : 'My name in the Amharic alphabet, written with Fidel Quest!',
    url: appShareUrl(),
  })
}
