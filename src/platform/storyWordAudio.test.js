import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

const WORDS_DIR = path.resolve(__dirname, '../../public/audio/fidel/words')
const hasClip = (latin) => fs.existsSync(path.join(WORDS_DIR, `${latin}.mp3`))

async function load(pack) {
  localStorage.setItem('fq.pack', pack)
  vi.resetModules()
  return import('./stories.js')
}

describe('story Read-to-me word clips (ti pack)', () => {
  beforeEach(() => localStorage.clear())

  it('finds clips for headline family words and identical cross-pack words', async () => {
    const S = await load('ti')
    expect(S.wordAudioFor('ወርሒ')?.latin).toBe('werhi')
    expect(S.wordAudioFor('ጤል')?.latin).toBe('tiel')
    expect(S.wordAudioFor('ዝናብ')?.latin).toBe('zinab')
    expect(S.wordAudioFor('ሻሂ')?.latin).toBeTruthy()
  })

  it('every resolved story word points at a clip that exists', async () => {
    const S = await load('ti')
    for (const s of S.storyLibrary([], S.STORIES, 'ti')) {
      if (S.isBibleStory(s)) continue
      for (const p of s.pages) for (const w of S.storyWords(p.g)) {
        const a = S.wordAudioFor(w)
        if (a && !a.noAudio) expect(hasClip(a.latin), `${s.id}: ${w} -> ${a.latin}`).toBe(true)
      }
    }
  })

  it('does not fold variant spellings (ኣሎ has no recording yet, so it is spelled)', async () => {
    const S = await load('ti')
    expect(S.wordAudioFor('ኣሎ')).toBeNull()
    expect(S.wordAudioFor('ኣብ')).toBeNull()
  })
})
