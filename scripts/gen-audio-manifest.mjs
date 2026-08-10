// Regenerate public/audio/fidel/manifest.json from the files on disk.
// The AudioEngine uses this coverage list to skip network probing for
// clips that do not exist. Run after adding or replacing audio files.
import { readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('../public/audio/fidel/', import.meta.url))
const coverage = []
// letters/ and words/ hold the base (Amharic) clips; letters/ti/ holds the
// Tigrinya-distinct overrides. Recurse one level so the ti/ redirects are
// covered too — an uncovered key is gated straight to the chime.
for (const dir of ['letters', 'letters/ti', 'words', 'prompts', 'stories', 'stories/ti']) {
  let entries
  try {
    entries = readdirSync(base + dir)
  } catch {
    continue // optional subdir (letters/ti may be absent in a base-only build)
  }
  for (const f of entries) {
    if (f.endsWith('.mp3')) coverage.push(`${dir}/${f.slice(0, -4)}`)
  }
}
coverage.sort()
// packId/voice are provenance labels, not behaviour - the engine reads only
// `coverage`. They still said 'am-espeak' / 'espeak' long after SOURCE.txt
// recorded that every letter and first word was re-recorded with a native
// speaker. That is actively misleading rather than merely stale: a reviewer
// reading manifest.json concluded the core educational asset of a
// PRONUNCIATION app was robotic TTS, when 231 human clips ship.
writeFileSync(base + 'manifest.json', JSON.stringify({ packId: 'am', voice: 'human', coverage }, null, 1) + '\n')
console.log(`manifest: ${coverage.length} clips`)
