# Language audit (Amharic vs Tigrinya)

Root cause: `brickWordsCore.BRICK_WORDS` was a fixed Amharic list (words and `words/<latin>` audio keys), independent of `fq.pack`. Under Tigrinya, Word Bricks showed and spoke Amharic words (23 of its 28 words are not Tigrinya words).

Fix: `brickWordsFor(packId)`. Am keeps the 28 curated words (`brickWordsAm.js`). Ti uses only Ti-pack words that have a brick picture and a recording (52 words); words without a Ti entry or picture are hidden for Ti. No audio was created or changed.

| Screen | Am OK? | Ti OK? | Issue | File |
|---|---|---|---|---|
| Word Bricks | yes | was NO, fixed | fixed Amharic list | brickWordsCore.js |
| Stack the Tower | yes | yes | letters only | - |
| Block Church | yes | yes | pack-derived | - |
| Echo Match | yes | yes | pack-derived | - |
| Kebero Beats | yes | yes | pack-derived | - |
| Letter Catch | yes | yes | letters only | - |
| Vowel Train | yes | yes | pack-derived | - |
| Word Market | yes | yes | pack-derived | - |
| Word Match / First Words | yes | yes | pack-derived | - |
| Word Build / Workshop | yes | yes | pack-derived | - |
| Find the letter | yes | yes | letters only | - |
| Explorer | yes | yes | pack-derived | - |
| Letter Runner | yes | yes | letters only | - |
| Fidel Master | yes | yes | pack-derived | - |
| Story / School Path | yes | yes | School Path is Ti-only by design | - |
| TV Class | yes | yes | pack-derived | - |
| Twins / Bingo / Traffic / Daily Hunt / Closet | yes | yes | letters only | - |
| My Name / Postcard | yes | yes | pack-aware | - |
| Prayer Book | yes | yes | shared Ge'ez | - |
| Practice ring | was Amharic aria-label | was Amharic aria-label | hard-coded `ዛሬ`, fixed to `min/goal` | PracticeRing.jsx |
| Ethiopian calendar months (grown-up / teacher screens) | yes | Am spellings | NOT fixed, flagged | platform/ethioCalendar.js |
