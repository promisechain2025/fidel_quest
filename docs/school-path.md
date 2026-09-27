# School Path (Grade 1 Alphabet)

Tigrinya learners follow a **School Path**: the teaching order of the Eritrean
Ministry of Education Mother Tongue Grade 1 alphabet, played on the existing
Journey. Letter Steps, unit quizzes, and the four arcade gateways stay one
spine. Play (Runner, Catch, and the other practice games) stays available.

## What is encoded

`src/data/schoolPathGr1.json` is original eGeez content. Each unit names the
families introduced together, plus a picture word and a few blend words in
eGeez's own spelling. The file records pedagogy order only: original words,
no textbook pages, and no SIL artwork.

The Drive folder the order was read from is noted on the JSON `source` field.
Do not ship those PDFs in the app.

## How it turns on

School Path is on whenever the active language pack is Tigrinya (`ti`). That
is also the first-visit default, unless the device language is Amharic.
Amharic keeps today's chapters of eight families.

Pack choice is `fq.pack`. Switching packs reloads the app, and
`buildJourney()` rebuilds the spine. There is no second progress record:
completion is still `fq.journey.v1`, and `learnedFamilyIds` is still the set
Runner, Catch, and the other games draw from.

## How units map onto journey nodes

Twelve units, every Tigrinya family once, in unit order:

1. A LEARN node per family (Letter Steps).
2. A MIX node after each family except the unit's first, over the families
   met so far in that unit.
3. A QUIZ boss whose questions use only that unit's families. A two-family
   unit still runs eight questions; the option count drops to the number of
   distinct sounds so the question stays answerable.

Units sit three to a chapter, so the path still has four arcade gateways and
four review nodes. A vowel lap (four quizzes) covers each chapter's families.
Letter Steps Meet shows the unit picture word on the base letter when the
unit names one, and the pack's own word otherwise.

The home header and the path show a small English label, `School Path · Unit
N`. Menus stay eGeez / Jibby. Learning words stay Tigrinya.

`FREE_FAMILIES` is still `ha` and `le` (unit 1).

## P1 follow-ups

- Twin drills inside a unit (vowel-family and look-alike pairs).
- Word Build from each unit's `blendWords`. `blendWordsForLearned` already
  hides a blend until every family it needs is unlocked.
- Soft-fail feedback that never blocks a child mid-task.
- Legacy chapter-quiz stars (`quiz:1` … `quiz:4`) do not map onto the new
  unit quizzes. Letter Steps mastery (`learn:<familyId>`) still migrates.
