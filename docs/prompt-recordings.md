# Voiced prompt recordings

Short spoken instructions so a pre-reader can hear what to do. The app is
already wired: each clip lights up the moment its file exists; missing
clips are silent (never blocking). Spoken once per session per screen.

**Size rule:** export MONO mp3 at 32 kbps, 44.1 kHz. Each clip is 2-4
seconds ≈ 10-16 KB; the whole set adds ~100 KB to the app.

**Where to drop them:** `public/audio/fidel/prompts/<key>.mp3`
(same convention as the letter clips; Tigrinya pack can override later
under its audio base).

| File | Say (warm, slow, to a 4-year-old) |
|---|---|
| prompts/whichLetter.mp3 | Which letter makes this sound? |
| prompts/buildWord.mp3 | Tap the letters in order to build the word. |
| prompts/tapPicture.mp3 | Listen to the word, then tap its picture. |
| prompts/whichGlyph.mp3 | Which letter writes this word? |
| prompts/tapWords.mp3 | Tap any word to hear it. Tap the speaker to hear the page. |
| prompts/traceLetter.mp3 | Listen, then trace the letter with your finger. |
| prompts/warmupStart.mp3 | Let us warm up with the letters you know! |
| prompts/placementStart.mp3 | Show me the letters you already know! |

English first (the app-text language most families use); other UI
languages can follow the same filenames under per-language folders later.
