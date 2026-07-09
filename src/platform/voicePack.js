/* ============================================================================
   FAMILY VOICE PACKS  —  a loved one's voice for the letters
   ----------------------------------------------------------------------------
   Record (adult) -> store on-device (IndexedDB) -> share a .fidelvoice file ->
   import on the child's device -> Anbessa speaks in that voice. No backend;
   nothing leaves the device except the file a grown-up chooses to send.
   See docs/family-voice.md. Pure helpers (encode/decode, slots) are exported
   for tests; storage/recording are environment-guarded.
   ========================================================================== */
import { FIDEL_FAMILIES, INDEXES } from './ethiopic'
import { audio } from './audioEngine'
import { isNativePlatform } from './native'

const DB_NAME = 'fq.voice'
const STORE = 'packs'
const ACTIVE_KEY = 'fq.voice.active'
export const GREETING_KEY = 'extra/greeting'
export const FILE_FMT = 'fidelvoice/1'
export const LETTER_SLOT_COUNT = FIDEL_FAMILIES.length

/** The recordable slots: the 33 base letters (order 1) + a greeting. */
export function voiceSlots() {
  const letters = FIDEL_FAMILIES.map((f) => {
    const form = INDEXES.byAudioKey.get(`${f.id}-1`)
    return { key: `letters/${f.id}-1`, char: form?.char || Array.from(f.chars)[0], sound: form?.sound || f.id }
  })
  return [...letters, { key: GREETING_KEY, char: '☺', sound: 'greeting', greeting: true }]
}

/** Recording needs the mic; import + playback never do. */
export function recordSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
}

/* ── pure encode / decode ─────────────────────────────────────────────── */

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',')
  const head = dataUrl.slice(0, comma)
  const b64 = dataUrl.slice(comma + 1)
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'audio/webm'
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

/** Serialize a pack ({ name, createdAt, clips:{key:Blob} }) to a .fidelvoice
   JSON string (base64 data URIs, dependency-free and self-contained). */
export async function packToFileText(pack) {
  const clips = {}
  for (const [key, blob] of Object.entries(pack.clips || {})) clips[key] = await blobToDataUrl(blob)
  return JSON.stringify({ fmt: FILE_FMT, name: pack.name || 'Family', createdAt: pack.createdAt || 0, clips })
}

/** Parse a received .fidelvoice string back into { name, createdAt, clips:{key:Blob} }. */
export function fileTextToPack(text) {
  const data = JSON.parse(text)
  if (!data || data.fmt !== FILE_FMT || typeof data.clips !== 'object') throw new Error('not-a-fidelvoice-file')
  const clips = {}
  for (const [key, v] of Object.entries(data.clips)) {
    if (typeof v === 'string' && v.startsWith('data:')) clips[key] = dataUrlToBlob(v)
  }
  return { name: String(data.name || 'Family').slice(0, 24), createdAt: Number(data.createdAt) || 0, clips }
}

/* ── IndexedDB storage ────────────────────────────────────────────────── */

function idb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no-indexeddb'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
const store = (db, mode) => db.transaction(STORE, mode).objectStore(STORE)
const reqP = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })

async function putPack(pack) { const db = await idb(); await reqP(store(db, 'readwrite').put(pack)); return pack.id }
async function getPack(id) { const db = await idb(); return (await reqP(store(db, 'readonly').get(id))) || null }

/** Lightweight list (no blobs) for the picker UI. */
export async function listVoices() {
  try {
    const db = await idb()
    const all = (await reqP(store(db, 'readonly').getAll())) || []
    return all.map(({ id, name, createdAt, clips }) => ({ id, name, createdAt, count: Object.keys(clips || {}).length }))
  } catch {
    return []
  }
}

export async function deleteVoice(id) {
  try {
    const db = await idb()
    await reqP(store(db, 'readwrite').delete(id))
    if (activeVoiceId() === id) await setActiveVoice(null)
  } catch { /* ignore */ }
}

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v${Date.now()}-${Math.floor(Math.random() * 1e6)}`)

export async function saveRecordedVoice(name, clips) {
  const id = newId()
  await putPack({ id, name: (name || 'My voice').slice(0, 24), createdAt: Date.now(), clips })
  return id
}

export async function importVoiceFromText(text) {
  const { name, createdAt, clips } = fileTextToPack(text)
  if (!Object.keys(clips).length) throw new Error('empty-voice-file')
  const id = newId()
  await putPack({ id, name, createdAt: createdAt || Date.now(), clips })
  return id
}

/* ── activation (wire into the audio engine) ──────────────────────────── */

let activeUrls = []
function revokeActive() {
  if (typeof URL !== 'undefined' && URL.revokeObjectURL) activeUrls.forEach((u) => URL.revokeObjectURL(u))
  activeUrls = []
}

/** Turn a clip map ({key:Blob}) into object URLs and point the engine at them. */
export function activateClips(clips) {
  revokeActive()
  if (typeof URL === 'undefined' || !URL.createObjectURL) return {}
  const map = {}
  for (const [key, blob] of Object.entries(clips || {})) {
    const url = URL.createObjectURL(blob)
    activeUrls.push(url)
    map[key] = url
  }
  audio.setFamilyPack(map)
  return map
}

export function clearActiveVoice() {
  revokeActive()
  audio.setFamilyPack(null)
}

export function activeVoiceId() {
  try { return localStorage.getItem(ACTIVE_KEY) } catch { return null }
}

/** Make `id` the voice Anbessa speaks in (or null for the built-in voice). */
export async function setActiveVoice(id) {
  if (!id) {
    clearActiveVoice()
    try { localStorage.removeItem(ACTIVE_KEY) } catch { /* ignore */ }
    return
  }
  const pack = await getPack(id)
  if (!pack) return
  activateClips(pack.clips)
  try { localStorage.setItem(ACTIVE_KEY, id) } catch { /* session only */ }
}

/** Boot: re-activate the last chosen voice so it survives reloads. */
export async function initVoice() {
  const id = activeVoiceId()
  if (!id) return
  try { await setActiveVoice(id) } catch { /* pack gone; ignore */ }
}

/* ── share the pack as a .fidelvoice file ─────────────────────────────── */

/** Bundle a pack into a .fidelvoice file and hand it to the OS share sheet
   (WhatsApp/Telegram/email), falling back to a download. Returns
   'shared' | 'downloaded' | 'unsupported'. */
export async function exportAndShareVoice(pack) {
  const text = await packToFileText(pack)
  const safe = (pack.name || 'family').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const filename = `${safe || 'family'}.fidelvoice`
  const caption = `A Fidel Quest voice from ${pack.name || 'family'} - open it in Fidel Quest so Anbessa speaks in this voice.`

  if (isNativePlatform()) {
    try {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
      const b64 = btoa(unescape(encodeURIComponent(text)))
      await Filesystem.writeFile({ path: filename, data: b64, directory: Directory.Cache })
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
      await Share.share({ title: 'Fidel Quest voice', text: caption, files: [uri] })
      return 'shared'
    } catch { /* fall through to web share / download */ }
  }

  const blob = new Blob([text], { type: 'application/json' })
  const file = typeof File !== 'undefined' ? new File([blob], filename, { type: 'application/json' }) : null
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: 'Fidel Quest voice', text: caption, files: [file] })
      return 'shared'
    }
  } catch { /* user cancelled or unsupported; fall through */ }
  try {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
    return 'downloaded'
  } catch {
    return 'unsupported'
  }
}

/* ── recording (adult flow; mic) ──────────────────────────────────────── */

/** Start a recorder; resolve to { stop, cancel }. stop() -> Blob. */
export async function startRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const chunks = []
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => {
    try { return MediaRecorder.isTypeSupported(m) } catch { return false }
  })
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
  rec.start()
  const teardown = () => stream.getTracks().forEach((t) => t.stop())
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => { teardown(); resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })) }
        try { rec.stop() } catch { teardown(); resolve(new Blob(chunks)) }
      }),
    cancel: () => { try { rec.stop() } catch { /* ignore */ } teardown() },
  }
}
