# Family Voice — Anbessa speaks in a loved one's voice

> Status: **v1 in progress** (record → test → share pack → import → play).
> No backend. Nothing leaves the device except the pack file a grown-up chooses
> to send. Flagged for review where it touches the microphone (adult flow only).

## Why

Fidel Quest's real advantage is not that it teaches an alphabet — it is that it
teaches a **heritage** alphabet to **diaspora families**. The single most
powerful, un-copyable hook is letting a child hear the letters in the voice of
someone they love: a parent in the US recording for kids in Ethiopia, a
grandmother in Asmara recording for grandkids in Frankfurt.

It is also the strongest viral vector we have: every relative who records
becomes a stakeholder who shares. The recorder → sharer → new-family loop is
how a heritage app grows without ads.

## The core constraint: it is *remote*

The recorder and the listener are on **different devices, usually different
countries**. So the voice has to travel. v1 does this the way diaspora families
already share everything — a **file over WhatsApp/Telegram** — with **no
server**:

```
Grandma's phone (recorder)                Kid's phone (player)
──────────────────────────                ─────────────────────
record 33 base letters + name    ──►      receives .fidelvoice file
test / re-record                          (WhatsApp, email, AirDrop…)
"Share this voice"  ──────────────────►   opens app → "Import a voice"
  bundles one .fidelvoice file            Anbessa now speaks in Grandma's voice
```

A cloud sync (upload → download by code) is a **later** option; it needs a
backend, accounts, and storing children-directed voice — all of which we avoid
in v1.

## Scope of a pack (keep it light + high-emotion)

- The **33 base letters** (order 1) — the "family alphabet". This carries the
  emotion and keeps the file small.
- The child's **name** (a short custom clip).
- One **greeting / blessing** ("Selam, Anbessa!").

Not all 231 forms — too much to record, and the base letters are the payload.
Uncovered keys (vowel forms, words) fall through to the built-in voice; the mix
is fine and degrades gracefully.

## Architecture

### Audio resolution (the key insight)
The engine already resolves each sound through a cascade
(`src/platform/audioEngine.js`, `resolveSource`). A family pack is a **new
top-priority layer** keyed by the **logical** key (`letters/ha-1`), placed
**above** the language override:

```
familyPack[logicalKey]   ← NEW: the loved one's clip, if recorded
memory (artifact data URIs)
file (built-in mp3, after effectiveKey remap)
chime (synth floor)
```

It must sit above the override because language packs remap the physical key
(Amharic voices the ge'ez order of the gutturals like the 4th: `ha-1`→`ha-4`).
The family recorded *their own* pronunciation for the letter the child sees, so
no remap applies — resolve on the logical key and stop.

Engine surface: `audio.setFamilyPack(map | null)`, where `map` is
`{ 'letters/ha-1': objectURL, … }`. `resolveSource` checks it first. Null clears
it (back to the built-in voice).

### Storage
- Clips are audio **Blobs** in **IndexedDB** (`fq.voice` store) — too big for
  localStorage. A pack = `{ id, name, clips: { logicalKey: Blob }, createdAt }`.
- The **active pack id** lives in localStorage (`fq.voice.active`). On boot the
  app loads that pack, turns its blobs into object URLs, and calls
  `setFamilyPack`.
- `src/platform/voicePack.js` owns all of this (record, store, activate,
  export, import) as testable units.

### Recording (adult only)
- `MediaRecorder` (`getUserMedia`), used **only** in the grown-up recording
  flow, **behind the parental gate**. The child-facing app needs no microphone:
  importing and playing a received pack never touches the mic.
- Because we removed the mic for the kids build, recording is gated behind
  `VITE_FAMILY_VOICE` **and** the parental gate. If the store build enables it,
  declare `NSMicrophoneUsageDescription` / `RECORD_AUDIO` with an adult-facing
  description; if not, ship import+play only (still fully useful for the
  receiving side).

### The pack file (`.fidelvoice`)
A single JSON document the recorder shares and the receiver imports:

```json
{ "fmt": "fidelvoice/1", "name": "Grandma", "createdAt": 0,
  "clips": { "letters/ha-1": "data:audio/webm;base64,…", … } }
```

- Base64 data URIs keep it dependency-free (no zip lib) and self-contained.
- 33 short clips at 64 kbps ≈ a few hundred KB → base64 ≈ ~700 KB: fine as a
  WhatsApp/Telegram document.
- Export → `nativeShare({ files: [file] })` (Capacitor / Web Share), else a
  download. Import → a `<input type="file">` "Import a voice" the receiver taps
  after saving the file from their chat.

## UX

**Grown-up "Record a voice" (parental-gated):**
- A grid of the 33 letters + a Name slot + a Greeting slot.
- Tap a slot → record → it plays back → keep or re-record. A progress ring
  ("18 / 33").
- "Test in a game" plays a couple of letters through Anbessa so the recorder
  hears the result.
- "Share this voice" → bundles + hands to the share sheet.

**Anyone "Family voices":**
- "Import a voice" (file picker) → names it → becomes active.
- A "Who's speaking?" chooser: **Grandma / Dad / Default** — switching just
  calls `setFamilyPack`. Multiple packs can be stored; one is active.

## Compliance (kids category)
- Voice is **user-generated content** created by an **adult**, stored
  **on-device**, and shared **only** by that adult's explicit action. Nothing
  is uploaded; there is no account and no server.
- Keep recording behind the parental gate; keep the child app mic-free by
  default (import+play only) so the published kids build can declare **no data
  collection** and, if desired, **no microphone**.

## Test surface
- Pure: pack ↔ file encode/decode (`packToFile` / `fileToPack`) round-trips;
  `resolveSource` prefers the family pack on the logical key and ignores the
  language override for covered keys.
- IndexedDB / MediaRecorder are environment-guarded and stubbed in jsdom, like
  Audio elsewhere.

## Done in v1
- Cross-device codec: recordings are transcoded to **mono 16 kHz WAV**
  (`normalizeClip` / `encodeWav`) so a pack recorded on any device plays on any
  other (a webm/opus clip would not decode on iOS).
- Recording sits behind the shared **`ParentalGate`** (hold + number match).

## Not in v1 (later)
- Cloud packs (upload/download by code) for zero-file-handling transfer.
- Recording the full 231 forms or words.
- A "request a voice" invite (kid's app pings a relative to record).
