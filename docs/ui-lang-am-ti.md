# Amharic / Tigrinya app text (Oct 2026)

Decision: UI text follows the selected language. `am` and `ti` are now full
app-text languages for every kid screen (`src/platform/langpackAm.js`,
`langpackTi.js`). Adult screens (Grown-Ups, teacher, paywall, gate, reports)
still fall back to English. Choosing English keeps everything English.
Place names (chapter bands, Runner and Skylands signs) are shown in Ge'ez script under am/ti.

Guard: `src/platform/uiLangGeez.test.js` scans the non-adult sources for
`t('key', …)`. It fails when am or ti is missing a key, when a value is Latin text copied over, or when a value
uses a `{placeholder}` the caller does not pass.

Tigrinya follows Eritrean usage. Every second-person form is masculine (am -ህ/አንተ, ti -ካ/ኢኻ).

## Needs native-speaker review
- hol_enkutatash (ti): uses the greeting form
- trStandings / trOfficers: the "traffic officer" wording
- kpGradeKG
- echoShort / echoTitle
- beatsTitle (ti ምቅልቃል ከበሮ)
- muncherWins
- fixReadyBody: the "show who is the boss" idiom
- twinsShort
- kpAvZebra (ti ኣድጊ በረኻ)
- stoneTeach
- trTagline
- steerInto: sentence fragment
- whichLetter / saysWord / huntFind: fragments that join up with the letter audio
- runDestroyedBody: drops the place name
- storyDraftNote / storyDraftNoteTi
- ti paceSteady / paceZoom
- lcShoot / catchWin: the shoot / aim wording
- installIosHint: keeps the English iOS menu label "Add to Home Screen"
- schoolPath / schoolPathUnit: "ክፍል/ክፍሊ" means unit here, but it can also read as "class/grade"
- Vowel Skies: am የአናባቢ ሰማያት, ti ሰማያት ኣናባቢ
- Name spellings: Jibby is ጅቢ (am) and ዝብኢ (ti), Anbessa is ኣንበሳ (ti)
- Gender: all forms are masculine. Should there be neutral or feminine variants?
