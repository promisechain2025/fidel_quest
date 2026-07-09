import { describe, it, expect } from 'vitest'
import { resolveSource } from './audioEngine'
import { packToFileText, fileTextToPack, dataUrlToBlob, voiceSlots, LETTER_SLOT_COUNT, GREETING_KEY, encodeWav } from './voicePack'

describe('voicePack slots', () => {
  it('exposes the 33 base letters plus a greeting', () => {
    const slots = voiceSlots()
    expect(slots).toHaveLength(LETTER_SLOT_COUNT + 1)
    expect(slots[0].key).toBe('letters/ha-1')
    expect(slots.at(-1).key).toBe(GREETING_KEY)
  })
})

describe('family voice takes priority in the audio cascade', () => {
  const familyPack = { 'letters/ha-1': 'blob:family-ha' }
  // Amharic-style override that would remap ha-1 -> ha-4 physically.
  const override = { orderRemap: { ids: ['ha'], from: 1, to: 4 } }

  it('uses the family clip on the LOGICAL key, ignoring the language remap', () => {
    const r = resolveSource('letters/ha-1', { familyPack, override, manifest: new Set(['letters/ha-4']), audioBase: '/a/' })
    expect(r).toEqual({ type: 'memory', src: 'blob:family-ha' })
  })

  it('leaves uncovered keys to the normal cascade', () => {
    const r = resolveSource('letters/le-1', { familyPack, manifest: new Set(['letters/le-1']), audioBase: '/a/' })
    expect(r).toEqual({ type: 'file', src: '/a/letters/le-1.mp3' })
  })
})

describe('.fidelvoice file round-trip', () => {
  it('encodes a pack to a file and back to blobs', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5])
    const pack = { name: 'Grandma', createdAt: 7, clips: { 'letters/ha-1': new Blob([bytes], { type: 'audio/webm' }) } }
    const text = await packToFileText(pack)
    const parsed = JSON.parse(text)
    expect(parsed.fmt).toBe('fidelvoice/1')
    expect(parsed.name).toBe('Grandma')

    const back = fileTextToPack(text)
    expect(back.name).toBe('Grandma')
    expect(back.createdAt).toBe(7)
    expect(back.clips['letters/ha-1']).toBeInstanceOf(Blob)
    expect(back.clips['letters/ha-1'].size).toBe(bytes.length)
  })

  it('rejects a file that is not a fidelvoice', () => {
    expect(() => fileTextToPack(JSON.stringify({ hello: 'world' }))).toThrow()
  })

  it('encodeWav writes a mono 16-bit PCM WAV of the right size', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1])
    const buf = { sampleRate: 16000, getChannelData: () => samples }
    const wav = encodeWav(buf)
    expect(wav.type).toBe('audio/wav')
    expect(wav.size).toBe(44 + samples.length * 2) // 44-byte header + 16-bit samples
  })

  it('dataUrlToBlob decodes a base64 audio data URI', () => {
    const blob = dataUrlToBlob('data:audio/webm;base64,AQIDBAU=') // 1,2,3,4,5
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('audio/webm')
    expect(blob.size).toBe(5)
  })
})
