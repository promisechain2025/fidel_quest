# School Path (Grade 1 Alphabet)

Tigrinya learners follow a **School Path**: the teaching order of the Eritrean
Ministry of Education Mother Tongue Grade 1 alphabet, played on the existing
Journey. Letter Steps, unit quizzes, and the four arcade gateways stay one
spine. Play (Runner, Catch, and the other practice games) stays available.

## What is encoded

`src/data/schoolPathGr1.json` is original eGeez content. Each unit names the
families introduced together, plus a picture word and a few blend words in
eGeez's own spelling. The file records pedagogy shapes only: original words,
no textbook pages, and no SIL artwork. It does not follow MoE page order.

The Drive folder the order was read from is noted on the JSON `source` field.
Do not ship those PDFs in the app.

The MoE Alphabet book opens on በ, ሰ, and ሸ. School Path keeps ሀ and ለ as the
free taste. That choice is intentional. Do not describe the unit list as
MoE page order.

Meet words are an original diaspora and kids-book rewrite —
cute animals, bright food, a cozy jebena, the sun, friendly pets — and each
`pictureHint` is a soft highland art brief. They are not copies of textbook
pages, and the app does not ship MoE or SIL art. A Meet word's first fidel
is the family it introduces. Every family in a unit has one Meet word,
including the rare letters (painter, power, meow, swing, Pagume, cup).
Those six do not have a gouache painting yet, so the Meet card stays a
letter bubble until the art pass. Blends stay hidden until every family in
the word is learned.

Each unit also carries:

- one or two `blendWords` with `"kind": "action"` — high-frequency diaspora
  verbs (gave, ate, drank, slept, ran), original spellings, not MoE
  Name+Verb lists
- one or two `echoLines` — short original lines (family, action, food, or
  home) with an English gloss
- `midLetterTargets` where a natural word hides the new fidel in the middle
  or at the end

Word Build and Find-the-fidel play those lists. Echo lines stay data only.
There is no Echo screen in this pass.

On that first Meet card the picture-word painting (`public/art/meet`,
original gouache) is the background, and the fidel stays a large centered
bubble. Each painting puts the animal or object in the side third, with
soft sky or meadow in the center so the face and body stay clear of that
bubble. The Ge'ez word and English gloss stay under the
card. The other six vowels in the family use the plain sky. Amharic Meet is
unchanged.

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

1. A LEARN node per family (Letter Steps: Meet, Trace, vowel family).
2. A MIX node after each family except the unit's first, over the families
   met so far in that unit.
3. A Word Build node. It uses blend words that become readable here (every
   family in the word is learned, and this unit teaches at least one of
   them). The unit's own words come first, action verbs before the rest,
   and the step stops at four words so it does not sit in front of the quiz
   like a wall. A word is scheduled once.
4. A Find-the-fidel node. The child taps the authored fidel in the middle
   or at the end of the word. ፀ (`ttse`) and ፐ (`pe`) have no natural
   mid-word target, so those families are skipped. The unit still plays
   any other target it has (unit 12 still asks for ፍ in ኣፍ).
5. A QUIZ boss whose questions use only that unit's families. A two-family
   unit still runs eight questions; the option count drops to the number of
   distinct sounds so the question stays answerable.

Units sit three to a chapter, so the path still has four arcade gateways and
four review nodes. A vowel lap (four quizzes) covers each chapter's families.
Letter Steps Meet shows the unit picture word on the base letter when the
unit names one, and the pack's own word otherwise.

The home header and the path show a small English label, `School Path · Unit
N`. Menus stay eGeez / Jibby. Learning words stay Tigrinya. Chrome page
translate is blocked for the whole app so those letters are not rewritten
(see the README).

`FREE_FAMILIES` is still `ha` and `le` (unit 1).

## Story Path (P2)

`src/data/schoolPathGr1Stories.json` is ten original diaspora stories.
They borrow Reading Book shapes only: a room-to-room refrain, a walk that
recycles Meet animals, coffee with grandma, a baby who will not sleep, the
sun through the week, a market count-and-buy, a rain-day weather change,
helping at home, stops on a bajaj ride, and a moon-and-stars close. Titles
and sentences are eGeez's own. They do not copy MoE titles or pages.

Each story names `unlockAfterUnitId`. It opens in Story Time once every
family through that unit is learned. Tigrinya Story Time shows these ten
books. The biblical Story Time tracks stay on the Amharic pack and are not
rewritten. A story node sits on each School Path chapter, the same way
Amharic already does. Each page paints a Meet-style scene from
`public/art/stories`. Biblical pages keep the code-drawn StoryScene stamps.
Family Voice clips for these lines are not recorded yet.

## Bible Stories (separate shelf)

Tigrinya Story Time also has a Bible shelf, `መጽሓፍ ቅዱስ`, under the Story
Path list. It is not part of the ten Story Path books and it does not
rewrite the Amharic biblical tracks.

The first book is `ኣብ መጀመርታ` / In the Beginning, a kid paraphrase of
Genesis 1-2. Each line names the weekday: Sunday light, Monday sky,
Tuesday land and sea, Tuesday grass and trees, Wednesday sun and moon,
Thursday birds and fish, Friday a man and a woman, Saturday rest.
Tuesday is one creation day, so it has two pages. Saturday is the
seventh-day rest. Lines are original. God's name follows ትመ15,
`እግዚኣብሄር`. The book is a free taste: `free: true`, so it opens before
any School Path unit is finished. God is not drawn; each painting shows
what that page's line names.

The second book is `መርከብ ኖህ` / Noah's Ark, a connected kid paraphrase
of Genesis 6-9. People were doing evil. Noah was righteous and obeyed.
God commanded him to build a big ark because water was coming. His family
built it and went in. The animals went in two by two. God shut the
door and the rain came. The water covered the land, and the ark was
safe. Noah sent the raven, then the dove came back with an olive leaf.
They went out onto dry land, and God set a rainbow as his promise.
ትመ15 spells Noah `ኖህ`, the ark `መርከብ`, righteous `ፃድቕ`, and the
promise `ኪዳን`. The raven is `ሳዅ`. The book is not
free. It uses the ordinary band-1 progress gate and does not change the
Creation unlock or the School Path unlocks.

## P1 follow-ups

- Twin drills inside a unit (vowel-family and look-alike pairs).
- Echo player for `echoLines`. Word Build and Find-the-fidel already read
  `blendWords` and `midLetterTargets`.
- Gouache Meet paintings for sse, kha, nye, zhe, ppe, and ttse.
- Soft-fail feedback that never blocks a child mid-task.
- Legacy chapter-quiz stars (`quiz:1` … `quiz:4`) do not map onto the new
  unit quizzes. Letter Steps mastery (`learn:<familyId>`) still migrates.
- Family Voice for the new Meet words, echo lines, and Story Path pages.
- Grade 2 and later harvests stay future work.
