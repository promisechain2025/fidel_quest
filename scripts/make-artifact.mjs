// Turn dist-artifact/index.html into an artifact-ready fragment:
// strip the document wrapper, then embed every letter clip as a data URI on
// window.FIDEL_AUDIO so the offline artifact speaks (the AudioEngine's
// memory-pack source). Output: dist-artifact/fragment.html.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const html = readFileSync(root + 'dist-artifact/index.html', 'utf8')
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0])
const scripts = [...html.matchAll(/<script type="module"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0])
if (!styles.length || !scripts.length) throw new Error('extraction failed')

// Embed every clip the memory pack may resolve: the base letters, the
// Tigrinya-distinct overrides under letters/ti/, and the words. Keys mirror the
// AudioEngine's effective keys (letters/ha-1, letters/ti/ae-1, words/feres).
const audioRoot = root + 'public/audio/fidel/'
const map = {}
for (const rel of ['letters', 'letters/ti', 'words']) {
  let files
  try {
    files = readdirSync(audioRoot + rel)
  } catch {
    continue // optional subdir
  }
  for (const f of files) {
    if (!f.endsWith('.mp3')) continue
    map[rel + '/' + f.slice(0, -4)] = 'data:audio/mpeg;base64,' + readFileSync(audioRoot + rel + '/' + f).toString('base64')
  }
}

const fragment =
  '<title>eGeez</title>\n' +
  styles.join('\n') +
  '\n<div id="root"></div>\n' +
  '<script>window.FIDEL_AUDIO=' + JSON.stringify(map) + '</script>\n' +
  scripts.join('\n') + '\n'
writeFileSync(root + 'dist-artifact/fragment.html', fragment)
console.log(`fragment: ${(fragment.length / 1048576).toFixed(1)} MB, ${Object.keys(map).length} clips embedded`)
