# Native-speaker review pack — Amharic & Tigrinya UI text

> Generated from source for a native reviewer. Every child- and
> parent-facing string in the app's Amharic and Tigrinya UI, next to the
> English it translates. Mark the last column OK or write the correction;
> hand the file back and the fixes get applied in one pass.
>
> The letter/word TEACHING data (src/data/fidelGameData.js) is separately
> validated and every letter/word already plays a HUMAN recording - this
> review is about the surrounding UI text only.

## How to review
- Audience: children 3-8 and their parents. Warm, simple, short.
- Placeholders like {n}, {name}, {item}, {who} are filled in at runtime -
  keep them exactly as written, but move them wherever the grammar needs.
- Two spots already suspected as typos (please confirm):
  - Amharic postcard message: "ባህሌናና" (should it be "ባህሌንና"?) and
    "ኣይለየኝ" (Tigrinya-style ኣ in an Amharic sentence - "አይለየኝ"?)
    These live in src/components/VoicePostcard.jsx (RECIPIENT_STRINGS).

## The postcard messages (highest-visibility text - sent to family)
| Language | Message |
|----------|---------|
| Amharic (to ጋሼ) | ጋሼ ባህሌናና ሕብረተሰቤን ለማወቅ ፊደላት እየተማርኩ ነው። ብርታትህ ኣይለየኝ። |
| Tigrinya (to ኣያይ) | ኣያይ ባሕለይን መበቆለይን ንምፍላጥ ትግርኛ ፊደል እምሃር ኣለኹ። መትብባዕኹም ኣይፈለየኒ |

## Amharic UI strings (312)
| # | Key | English (source) | Translation | OK? / Correction |
|---|-----|------------------|-------------|------------------|
| 1 | `tagline` | (dynamic) | ከአንበሳ ግልገል ጋር ፊደል ይማሩ |  |
| 2 | `champion` | Fidel Champion - every star earned! | የፊደል ጀግና — ሁሉም ኮከቦች ተገኝተዋል! |  |
| 3 | `level` | Level | ደረጃ |  |
| 4 | `playLevel` | (dynamic) | መጫወት |  |
| 5 | `lockHint` | (dynamic) | ለመክፈት በደረጃ {n} ኮከብ ያግኙ |  |
| 6 | `practiceTitle` | (dynamic) | የኮከብ ልምምድ |  |
| 7 | `practiceSub` | (dynamic) | {n} የሚያስቸግሩ ፊደላት ለማጠንከር |  |
| 8 | `runnerTitle` | (dynamic) | የፊደል ሩጫ |  |
| 9 | `runnerSub` | (dynamic) | በኢትዮጵያና በኤርትራ ውስጥ ሩጡ — አንበሳን ይመግቡ! |  |
| 10 | `skylandsTitle` | Fidel Skylands | የፊደል ደሴቶች |  |
| 11 | `skylandsSub` | (dynamic) | የ3D ደሴት ጀብዱ — ዛፉን አሳድጉ፣ ጅቢን አሸንፉ |  |
| 12 | `classicTitle` | (dynamic) | የቀድሞው ጨዋታ |  |
| 13 | `classicSub` | (dynamic) | ቅደም ተከተል ዘምሩ፣ ፊደል ይሳሉ፣ ቃላት ይማሩ |  |
| 14 | `explorerTitle` | (dynamic) | የፊደል አሳሽ |  |
| 15 | `explorerSub` | (dynamic) | 231 ፊደላትን ንኩና ያዳምጡ |  |
| 16 | `grownups` | (dynamic) | ለወላጆች: ሂደት እና ምክሮች |  |
| 17 | `whichLetter` | Which letter says | የትኛው ፊደል |  |
| 18 | `says` | (dynamic) | ይላል? |  |
| 19 | `listen` | Listen… | ያዳምጡ… |  |
| 20 | `nice` | Nice! | ጎበዝ! |  |
| 21 | `amazing` | Amazing! {...} in a row! | ድንቅ! {n} በተከታታይ! |  |
| 22 | `notQuite` | Not quite! | አይደለም! |  |
| 23 | `saysWord` | says | ይላል |  |
| 24 | `tryAgain` |  — listen and try again | — ያዳምጡና እንደገና ይሞክሩ |  |
| 25 | `continue` | Continue | ቀጥል |  |
| 26 | `gotIt` | Got it | ገባኝ |  |
| 27 | `yourTurn` | Your turn! | ተራዎ ነው! |  |
| 28 | `levelComplete` | Level complete! | ደረጃ ተጠናቀቀ! |  |
| 29 | `practiceComplete` | Practice complete! | ልምምድ ተጠናቀቀ! |  |
| 30 | `practicePraise` | Those tricky letters are getting stronger. Kokeb is proud of you! | የሚያስቸግሩ ፊደላት እየጠነከሩ ነው። ኮከብ በእናንተ ኮርታለች! |  |
| 31 | `firstTry` | First-try | በመጀመሪያ ሙከራ |  |
| 32 | `bestStreak` | Best streak | ምርጥ ተከታታይ |  |
| 33 | `playAgain` | Play again | እንደገና ተጫወት |  |
| 34 | `steerInto` | Steer Anbessa into | አንበሳን ወደዚህ ድምፅ ይንዱ |  |
| 35 | `munched` | Munched! | ተበላ! |  |
| 36 | `runAgain` | Run again | እንደገና ሩጥ |  |
| 37 | `home` | Home | መነሻ |  |
| 38 | `level-1.title` | (dynamic) | መጀመሪያ ፊደላት |  |
| 39 | `level-2.title` | (dynamic) | ተጨማሪ ፊደላት |  |
| 40 | `level-3.title` | (dynamic) | ደግሞ ተጨማሪ ፊደላት |  |
| 41 | `level-4.title` | (dynamic) | የመጨረሻ ፊደላት |  |
| 42 | `level-5.title` | (dynamic) | የአናባቢ አስማት |  |
| 43 | `level-6.title` | (dynamic) | ተጨማሪ የአናባቢ አስማት |  |
| 44 | `level-7.title` | (dynamic) | ጥልቅ አናባቢዎች |  |
| 45 | `level-8.title` | (dynamic) | የአናባቢ ጌታ |  |
| 46 | `learnTitle` | Letter Steps | የፊደል ደረጃዎች |  |
| 47 | `learnSub` | Learn every letter, one step at a time | እያንዳንዱን ፊደል ደረጃ በደረጃ ይማሩ |  |
| 48 | `learnFirst` | (dynamic) | መጀመሪያ በፊደል ደረጃዎች እነዚህን ፊደላት ይማሩ |  |
| 49 | `meetHint` | (dynamic) | ፊደሉን ንኩና ያዳምጡ |  |
| 50 | `popHint` | Pop the bubble! | አረፋውን ያፈንዱ! |  |
| 51 | `starHint` | Slide star to star and draw the constellation | ከኮከብ ወደ ኮከብ ያንሸራትቱ |  |
| 52 | `feedHint` | Drag the letter Kokeb says to Anbessa | ኮከብ የምትለውን ብስኩት ለአንበሳ ይመግቡ |  |
| 53 | `catchHint` | Feed Anbessa before Jibby grabs it! | ጅቢ ብስኩቶቹን ይፈልጋል! የሚሰሙትን ይያዙ |  |
| 54 | `slideHint` | (dynamic) | ጣትዎን በፊደላቱ ላይ ያንሸራትቱ |  |
| 55 | `echoHint` | (dynamic) | ኮከብ ትላለች... ያንን ፊደል ይንኩ! |  |
| 56 | `shuffleHint` | (dynamic) | ተቀላቅሏል! የሚሰሙትን ፊደል ያግኙ |  |
| 57 | `familyDone` | Family mastered! | ቤተሰቡ ተማረ! |  |
| 58 | `traceHint` | Hear it, then trace it with your finger | ያዳምጡ፣ ከዚያ ፊደሉን በጣትዎ ይሳሉ |  |
| 59 | `hearIt` | Hear it again | እንደገና ያዳምጡ |  |
| 60 | `traceClear` | Clear | አጥፋ |  |
| 61 | `traceCheck` | Check | ፈትሽ |  |
| 62 | `mixDone` | Great mixing! | ጎበዝ ቅልቅል! |  |
| 63 | `wordsTitle` | First Words | መጀመሪያ ቃላት |  |
| 64 | `wordsSub` | (dynamic) | ቃሉን ያዳምጡ፣ ሥዕሉን ይንኩ |  |
| 65 | `whichStart` | Which letter does it start with? | በየትኛው ፊደል ይጀምራል? |  |
| 66 | `start` | Start | ጀምር |  |
| 67 | `backpack` | Backpack | ቦርሳ |  |
| 68 | `langLearn` | Learning | የሚማሩት ቋንቋ |  |
| 69 | `langText` | App text | የመተግበሪያ ጽሑፍ |  |
| 70 | `teeTitle` | Anbessa Tee Shop | የአንበሳ ሸሚዝ ሱቅ |  |
| 71 | `teeSub` | (dynamic) | የፊደል ሸሚዞችን ያግኙ እና ይልበሱ |  |
| 72 | `teeIntro` | Earn a new shirt design every chapter — Anbessa wears your alphabet! Save the picture or ask a grown-up to order a real shirt. | በያንዳንዱ ምዕራፍ አዲስ የሸሚዝ ንድፍ ያግኙ — አንበሳ ፊደልዎን ይለብሳል! ሥዕሉን ያስቀምጡ ወይም ትልቅ ሰው እውነተኛ ሸሚዝ እንዲያዝ ይጠይቁ። |  |
| 73 | `teeUnlocked` | Unlocked! | ተከፍቷል! |  |
| 74 | `teeLockedAt` | Learn {...} letters | {n} ፊደላት ይማሩ |  |
| 75 | `teeNext` | Learn {...} more families to unlock the next shirt! | ቀጣዩን ሸሚዝ ለመክፈት {n} ተጨማሪ ቤተሰቦችን ይማሩ! |  |
| 76 | `teeOrder` | Order a real shirt | እውነተኛ ሸሚዝ ያዝዙ |  |
| 77 | `teeSave` | Save the design | ንድፉን ያስቀምጡ |  |
| 78 | `teeSaved` | Design saved! Print it anywhere. | ንድፉ ተቀምጧል! የትም ያትሙት። |  |
| 79 | `teeOrdered` | Opening the shop for a grown-up... | ሱቁ እየተከፈተ ነው — ትልቅ ሰው ይጠይቁ... |  |
| 80 | `teeGrownup` | Ordering opens a shop — ask a grown-up. | ማዘዝ ሱቅ ይከፍታል — ትልቅ ሰው ይጠይቁ። |  |
| 81 | `teeSaveHint` | Save the picture and print it on any shirt. | ሥዕሉን አስቀምጠው በማንኛውም ሸሚዝ ላይ ያትሙት። |  |
| 82 | `masterTitle` | Fidel Master | የፊደል ሊቅ |  |
| 83 | `masterCta` | (dynamic) | የፊደል ሊቅ፦ ሁሉንም ፊደል ስሙ፣ ዘምሩ፣ ተናገሩ |  |
| 84 | `masterLetters` | letters | ፊደላት |  |
| 85 | `masterChart` | (dynamic) | ገበታ |  |
| 86 | `masterAuto` | (dynamic) | በራሱ ድምፅ |  |
| 87 | `masterSay` | (dynamic) | ተናገሩት |  |
| 88 | `masterMixDrill` | (dynamic) | ሁሉንም ቀላቅለህ በራሱ አጫውት |  |
| 89 | `masterMixed` | Mixed | የተቀላቀለ |  |
| 90 | `masterInOrder` | In order | በቅደም ተከተል |  |
| 91 | `masterReshuffle` | Reshuffle | እንደገና ቀላቅል |  |
| 92 | `masterPause` | Pause | አቁም |  |
| 93 | `masterPlay` | Play | አጫውት |  |
| 94 | `speed_slow` | (dynamic) | ቀስ |  |
| 95 | `speed_normal` | (dynamic) | መካከለኛ |  |
| 96 | `speed_fast` | (dynamic) | ፈጣን |  |
| 97 | `sayGreat` | (dynamic) | በጣም ጎበዝ! ⭐ |  |
| 98 | `sayGood` | (dynamic) | ጥሩ ሙከራ! |  |
| 99 | `sayAgain` | (dynamic) | አብረን እንደገና እንበለው |  |
| 100 | `sayNoMic` | (dynamic) | ማይክ የለም — ጮክ ብለህ በለው፣ ከዚያ ቀጣይ ንካ! |  |
| 101 | `sayISaidIt` | (dynamic) | ተናግሬዋለሁ! |  |
| 102 | `sayListening` | (dynamic) | እያዳመጥኩ ነው... |  |
| 103 | `saySayIt` | (dynamic) | ተናገሩት |  |
| 104 | `sayScore` | (dynamic) | ውጤት |  |
| 105 | `masterAll` | (dynamic) | ሁሉም |  |
| 106 | `masterAbugida` | Abugida | አቡጊዳ |  |
| 107 | `masterPlayAbugida` | Play the whole Abugida | ሙሉ አቡጊዳ አጫውት |  |
| 108 | `sayWithMe` | Say with me | አብረን እንበል |  |
| 109 | `nextVowel` | Then next vowel | ቀጥሎ ቀጣዩ አናባቢ |  |
| 110 | `yourTurn` | Your turn! | አሁን አንተ በለው! |  |
| 111 | `grownupsSub` | Progress, trouble letters, and practice tips | ሂደትና አስቸጋሪ ፊደላትን ይመልከቱ |  |
| 112 | `closetTitle` | Anbessa's Closet | የአንበሳ ቁም ሳጥን |  |
| 113 | `closetSub` | (dynamic) | አንበሳን ያልብሱ፣ ያጋሩ! |  |
| 114 | `openCloset` | Open Anbessa's Closet | የአንበሳ ቁም ሳጥን ይክፈቱ |  |
| 115 | `shareAnbessa` | Share Anbessa | አንበሳን ያጋሩ |  |
| 116 | `shareShowOff` | Show everyone! | ለሁሉም አሳዩ! |  |
| 117 | `lettersLearned` | {...} / 231 letters learned | {n} / 231 ፊደላት ተማሩ |  |
| 118 | `closetEmpty` | Finish lessons to earn hats, scarves and capes for Anbessa! | ኮፍያ፣ ሻርፕና ካባ ለአንበሳ ለማግኘት ትምህርቶችን ይጨርሱ! |  |
| 119 | `shareSaved` | Saved! Share it anywhere. | ተቀምጧል! የትም ያጋሩት። |  |
| 120 | `shareThanks` | Thanks for sharing! | ስላጋሩ እናመሰግናለን! |  |
| 121 | `chapterDone` | Chapter {...} complete! | ምዕራፍ {n} ተጠናቀቀ! |  |
| 122 | `earnedItem` | Anbessa earned the {...}! | አንበሳ {item} አገኘ! |  |
| 123 | `shareMilestone` | {...} learned {...} letters! | {name} {n} ፊደላት ተማረ! |  |
| 124 | `keepGoing` | Keep going | ቀጥል |  |
| 125 | `installTitle` | Add Anbessa to your home screen | አንበሳን ወደ መነሻ ማያ ገጽዎ ያክሉ |  |
| 126 | `installCta` | Add | ጨምር |  |
| 127 | `installHow` | How? | እንዴት? |  |
| 128 | `dismiss` | Not now | አሁን አይደለም |  |
| 129 | `dailyGift` | Open Anbessa's gift | የአንበሳን ስጦታ ይክፈቱ |  |
| 130 | `giftTitle` | A gift from Anbessa! | ከአንበሳ ስጦታ! |  |
| 131 | `giftGot` | A new {...}! | አዲስ {item}! |  |
| 132 | `giftAllDone` | You've collected everything - so happy you came back! | ሁሉንም ሰብስበዋል - ስለተመለሱ በጣም ደስ ብሎታል! |  |
| 133 | `closetShort` | Closet | ቁም ሳጥን |  |
| 134 | `teeShort` | Tee Shop | ሸሚዝ ሱቅ |  |
| 135 | `wordsShort` | First Words | ቃላት |  |
| 136 | `explorerShort` | Explorer | አሳሽ |  |
| 137 | `classicShort` | Classic | ቀድሞ |  |
| 138 | `practiceShort` | Practice | ልምምድ |  |
| 139 | `familyShort` | Family | ቤተሰብ |  |
| 140 | `grownupsShort` | Grown-ups | ለወላጆች |  |
| 141 | `reviewShort` | Review | ግምገማ |  |
| 142 | `giftShort` | Gift | ስጦታ |  |
| 143 | `myStep` | My step | የኔ ደረጃ |  |
| 144 | `jumpToStep` | Go to my next step | ወደ ቀጣይ ደረጃዬ ሂድ |  |
| 145 | `goHome` | Home | መነሻ |  |
| 146 | `newReward` | New! | አዲስ! |  |
| 147 | `playAll` | Play all | ሁሉንም አጫውት |  |
| 148 | `stop` | Stop | አቁም |  |
| 149 | `back` | Back | ተመለስ |  |
| 150 | `pace_slow` | (dynamic) | ቀስ ብሎ |  |
| 151 | `pace_normal` | (dynamic) | መደበኛ |  |
| 152 | `pace_fast` | (dynamic) | ፈጣን |  |
| 153 | `you` | You | አንተ |  |
| 154 | `aFriend` | A friend | ጓደኛ |  |
| 155 | `linkCopied` | Link copied! | ማገናኛው ተቀድቷል! |  |
| 156 | `challengeTitle` | A challenge! | ፉክክር! |  |
| 157 | `challengeFrom` | {...} challenges you! | {who} ይገዳደርሃል! |  |
| 158 | `challengeScored` | {...} scored {...}% on {...}. Can you beat it? | {who} በ{level} {score}% አስመዘገበ። ልትበልጠው ትችላለህ? |  |
| 159 | `challengeStart` | Take the challenge | ፉክክሩን ተቀበል |  |
| 160 | `challengeFriend` | Challenge a friend | ጓደኛ ተገዳደር |  |
| 161 | `challengeBack` | Challenge back | መልሰህ ተገዳደር |  |
| 162 | `challengeWin` | You win! | አሸነፍክ! |  |
| 163 | `challengeLose` | So close! | ተቃርበሃል! |  |
| 164 | `challengeTie` | It's a tie! | አቻ ነው! |  |
| 165 | `challengeGone` | This challenge is not available. | ይህ ፉክክር አይገኝም። |  |
| 166 | `challengeShareText` | Beat my Fidel Quest score! Can you? | የፊደል ኵዌስት ውጤቴን ብለጥ! ትችላለህ? |  |
| 167 | `scopeLearned` | My letters | የኔ ፊደላት |  |
| 168 | `scopeAll` | All letters | ሁሉም ፊደላት |  |
| 169 | `scopeLabel` | Which letters | የትኞቹ ፊደላት |  |
| 170 | `exploreHeader` | Letter Explorer | የፊደል አሳሽ |  |
| 171 | `exploreHeaderSub` | Pick a vowel, then tap any family to hear it | አናባቢ ይምረጡ፣ ከዚያ ማንኛውንም ቤተሰብ ንኩ ለማዳመጥ |  |
| 172 | `exploreFamilyTitle` | The {...} family | የ{name} ቤተሰብ |  |
| 173 | `exploreFamilySub` | Seven forms, one letter — tap to hear each | ሰባት ቅርጾች፣ አንድ ፊደል — እያንዳንዱን ንኩ ለማዳመጥ |  |
| 174 | `gpIntro` | This area is for grown-ups: progress details and practice tips. | ይህ ክፍል ለወላጆች ነው፦ የሂደት ዝርዝሮች እና የልምምድ ምክሮች። |  |
| 175 | `gpHold` | Hold me | ያዙኝ |  |
| 176 | `gpHoldHint` | Press and hold for two seconds | ለሁለት ሰከንድ ተጭነው ይያዙ |  |
| 177 | `gpTapNumber` | Tap the number {...} | {word} የሚለውን ቁጥር ንኩ |  |
| 178 | `gpNum35` | (dynamic) | ሠላሳ አምስት |  |
| 179 | `gpNum28` | (dynamic) | ሃያ ስምንት |  |
| 180 | `gpNum41` | (dynamic) | አርባ አንድ |  |
| 181 | `gpPlayerName` | Player name | የተጫዋች ስም |  |
| 182 | `gpPlayerNameHint` | Shown on challenges you send to friends. Optional — leave it blank to stay "A friend". It never leaves this device except inside a challenge link you choose to share. | ለጓደኞች በሚልኩት ፉክክር ላይ ይታያል። አማራጭ — ባዶ ቢተዉት «ጓደኛ» ይሆናል። ከሚያጋሩት የፉክክር ማገናኛ ውጭ ከዚህ መሣሪያ አይወጣም። |  |
| 183 | `gpPlayerNamePh` | e.g. Selam | ለምሳሌ ሰላም |  |
| 184 | `gpLessonStars` | Lesson stars | የትምህርት ኮከቦች |  |
| 185 | `gpRunnerBest` | Runner best | የሩጫ ምርጥ |  |
| 186 | `gpAccuracy` | Accuracy | ትክክለኛነት |  |
| 187 | `gpMastery` | Letter mastery · {...} answers recorded | የፊደል ብቃት · {n} መልሶች ተመዝግበዋል |  |
| 188 | `gpMasteryLegend` | Green: solid · Yellow: getting there · Red: needs help · Grey: not practiced yet. Quizzes currently practice the first-order letters. | አረንጓዴ፦ ጠንካራ · ቢጫ፦ እየሆነ · ቀይ፦ እርዳታ ይፈልጋል · ግራጫ፦ ገና አልተለማመደም። ጥያቄዎቹ አሁን የመጀመሪያ ደረጃ ፊደላትን ይለማመዳሉ። |  |
| 189 | `gpTrouble` | Trouble letters | የሚያስቸግሩ ፊደላት |  |
| 190 | `gpTroubleFew` | Not enough play yet — check back after a few games. | ገና በቂ ጨዋታ የለም — ከጥቂት ጨዋታዎች በኋላ ይመለሱ። |  |
| 191 | `gpTroubleNone` | No trouble letters right now. Nice work! | አሁን የሚያስቸግር ፊደል የለም። ጎበዝ! |  |
| 192 | `gpCorrect` | correct | ትክክል |  |
| 193 | `gpOpenExplorer` | Open in Explorer | በአሳሽ ክፈት |  |
| 194 | `gpReplayLevel` | Replay Level {...} | ደረጃ {n} እንደገና |  |
| 195 | `gpReset` | Reset all progress… | ሁሉንም ሂደት አጥፋ… |  |
| 196 | `gpResetConfirm` | Erase stars, bests, islands, and learning history? | ኮከቦችን፣ ምርጦችን፣ ደሴቶችን እና የመማር ታሪክን ማጥፋት? |  |
| 197 | `gpResetYes` | Yes, erase | አዎ፣ አጥፋ |  |
| 198 | `gpResetNo` | Keep it | ተወው |  |
| 199 | `skyMap` | Map | ካርታ |  |
| 200 | `skySession` | Session | ክፍለ ጊዜ |  |
| 201 | `skyAllCleared` | All four skylands cleared — Anbessa is a Fidel Champion! | አራቱም ደሴቶች ተጠናቀዋል — አንበሳ የፊደል ሻምፒዮን ነው! |  |
| 202 | `skyReady` | ready for Level {...}: it tests Sessions 1–{...}! | ለደረጃ {n} ተዘጋጅቷል፦ ክፍለ ጊዜ 1–{n}ን ይፈትናል! |  |
| 203 | `skyLearnPrompt` | learn Session {...}'s letters to wake the tree. | ዛፉን ለማንቃት የክፍለ ጊዜ {n} ፊደላትን ይማሩ። |  |
| 204 | `skyLearnBtn` | Learn Session {...} | ክፍለ ጊዜ {n} ተማር |  |
| 205 | `skyPlayBtn` | Play Level {...} | ደረጃ {n} ተጫወት |  |
| 206 | `skyReplay` | Replay: | እንደገና ተጫወት፦ |  |
| 207 | `skyLearnTap` | Tap every fruit to hear its letter — | እያንዳንዱን ፍሬ ንኩና ፊደሉን ያዳምጡ — |  |
| 208 | `skyStartQuest` | Start Level {...} quest | የደረጃ {n} ጉዞ ጀምር |  |
| 209 | `skyListenFirst` | Listen to them all first | መጀመሪያ ሁሉንም ያዳምጡ |  |
| 210 | `skyPluck` | Pluck the fruit that says | የሚለውን ፍሬ ንኩ |  |
| 211 | `skyRight` | Yes! | አዎ! |  |
| 212 | `skyWrong` | Jibby giggles — listen again for | ጅቢ ይስቃል — እንደገና ያዳምጡ |  |
| 213 | `skyStole` | Jibby stole {...} letters! | ጅቢ {n} ፊደላት ሰረቀ! |  |
| 214 | `skyWinBack` | Win back the one that says | የሚለውን መልሰው ያሸንፉ |  |
| 215 | `skyRescued` | Rescued! | ታደገ! |  |
| 216 | `skyHold` | Jibby holds on tight — listen again for | ጅቢ አጥብቆ ይይዛል — እንደገና ያዳምጡ |  |
| 217 | `skyCleared` | Island cleared! | ደሴቱ ተጠናቀቀ! |  |
| 218 | `skyClearedSub` | {...} letters + 3 rescued from Jibby · | {n} ፊደላት + 3 ከጅቢ ታድገዋል · |  |
| 219 | `skyBridge` | the bridge to {...} has grown! | ወደ {place} የሚወስደው ድልድይ አድጓል! |  |
| 220 | `skyAllFree` | every skyland is free! | ሁሉም ደሴት ነፃ ወጥቷል! |  |
| 221 | `runQuit` | Quit run | ሩጫ አቁም |  |
| 222 | `runMoveLeft` | Move left | ወደ ግራ |  |
| 223 | `runMoveRight` | Move right | ወደ ቀኝ |  |
| 224 | `runBossWin` | Anbessa’s letter power wins! | የአንበሳ የፊደል ኃይል አሸነፈ! |  |
| 225 | `runBossAttack` | Jibby the hyena attacks! | ጅቢ ያጠቃል! |  |
| 226 | `runNewBest` | New best! | አዲስ ምርጥ! |  |
| 227 | `runBest` | Best | ምርጥ |  |
| 228 | `fvShort` | Family Voice | የቤተሰብ ድምፅ |  |
| 229 | `fvTitle` | Family Voice | የቤተሰብ ድምፅ |  |
| 230 | `fvSub` | Let Anbessa speak in a loved one’s voice | አንበሳ በሚወዱት ሰው ድምፅ ይናገር |  |
| 231 | `fvWhoSpeaks` | Who’s speaking? | ማን ይናገራል? |  |
| 232 | `fvDefault` | Default | ነባሪ |  |
| 233 | `fvImport` | Import a voice | ድምፅ አስገባ |  |
| 234 | `fvNowSpeaking` | Anbessa now speaks in this voice | አንበሳ አሁን በዚህ ድምፅ ይናገራል |  |
| 235 | `fvDefaultVoice` | Back to the default voice | ወደ ነባሪው ድምፅ ተመልሷል |  |
| 236 | `fvGateIntro` | Recording is for grown-ups — it uses the microphone. | መቅዳት ለወላጆች ነው — ማይክሮፎን ይጠቀማል። |  |
| 237 | `fvImported` | Voice imported! | ድምፅ ገብቷል! |  |
| 238 | `fvImportFail` | That file isn't a Fidel Quest voice. | ይህ ፋይል የፊደል ኵዌስት ድምፅ አይደለም። |  |
| 239 | `fvEmpty` | No family voices yet. Record one, or import a voice a relative sent you. | እስካሁን የቤተሰብ ድምፅ የለም። አንድ ይቅዱ፣ ወይም ዘመድ የላከዎትን ድምፅ ያስገቡ። |  |
| 240 | `fvForGrownups` | For grown-ups | ለወላጆች |  |
| 241 | `fvRecordTitle` | Record your voice | ድምፅዎን ይቅዱ |  |
| 242 | `fvRecordBtn` | Record a new voice | አዲስ ድምፅ ይቅዱ |  |
| 243 | `fvRecordBlurb` | Record the letters in your own voice, then share the file with your child by WhatsApp. A grandparent far away can record for kids here — and the other way around. | ፊደላቱን በራስዎ ድምፅ ይቅዱ፣ ከዚያ ፋይሉን በዋትስአፕ ለልጅዎ ያጋሩ። ሩቅ ያለ አያት ለልጆች እዚህ መቅዳት ይችላል — በተቃራኒውም። |  |
| 244 | `fvRecordHint` | Tap a letter to record it, tap again to stop. Tap ✓ to hear it back. | ለመቅዳት ፊደል ንኩ፣ ለማቆም ደግመው ንኩ። ለማዳመጥ ✓ ንኩ። |  |
| 245 | `fvUseVoice` | Use it here | እዚህ ተጠቀምበት |  |
| 246 | `fvShare` | Share with a child | ለልጅ አጋራ |  |
| 247 | `fvNoMic` | Recording needs a microphone — use a phone or tablet. | መቅዳት ማይክሮፎን ይፈልጋል — ስልክ ወይም ታብሌት ይጠቀሙ። |  |
| 248 | `fvPrivacy` | Voices stay on this device. Nothing is uploaded — a voice only travels in the file you choose to share. | ድምፆች በዚህ መሣሪያ ላይ ይቀራሉ። ምንም አይሰቀልም — ድምፅ የሚጓዘው በሚያጋሩት ፋይል ብቻ ነው። |  |
| 249 | `fvDelete` | Delete voice | ድምፅ ሰርዝ |  |
| 250 | `fvNameLabel` | Voice name | የድምፅ ስም |  |
| 251 | `fvNamePh` | Whose voice? e.g. Grandma | የማን ድምፅ? ለምሳሌ አያት |  |
| 252 | `fvGreetingSlot` | Greeting | ሰላምታ |  |
| 253 | `fvGreetingShort` | Hi! | ሰላም! |  |
| 254 | `nameShort` | My Name | ስሜ |  |
| 255 | `nameTitle` | Write your name | ስምህን ጻፍ |  |
| 256 | `nameSub` | Spell it in Fidel, one sound at a time | በፊደል፣ አንድ ድምፅ በአንዴ ጻፈው |  |
| 257 | `nameHint` | Pick a vowel sound below, then tap letters to spell your name. | ከታች የአናባቢ ድምፅ ምረጥ፣ ከዚያ ፊደላትን ነክተህ ስምህን ጻፍ። |  |
| 258 | `namePlay` | Hear the name | ስሙን ስማ |  |
| 259 | `nameBackspace` | Remove last letter | የመጨረሻውን ፊደል አጥፋ |  |
| 260 | `nameClear` | Clear | አጽዳ |  |
| 261 | `nameVowel` | Vowel sound | የአናባቢ ድምፅ |  |
| 262 | `nameLetters` | Letters | ፊደላት |  |
| 263 | `nameShare` | Share my name | ስሜን አጋራ |  |
| 264 | `namePrivacy` | The card is made on this device. Nothing is shared unless you tap Share. | ካርዱ በዚህ መሣሪያ ላይ ይሠራል። አጋራ ካልነኩ ምንም አይጋራም። |  |
| 265 | `huntShort` | Daily Hunt | የዕለቱ አደን |  |
| 266 | `huntTitle` | Daily Letter Hunt | የዕለቱ የፊደል አደን |  |
| 267 | `huntSub` | Jibby hid the letters! Find them by sound | ጅቢ ፊደላቱን ደብቋል! በድምፅ ፈልጓቸው |  |
| 268 | `huntFind` | Find the letter that says | ይህን የሚለውን ፊደል ፈልግ |  |
| 269 | `huntListen` | Hear the sound again | ድምፁን እንደገና ስማ |  |
| 270 | `huntDoneTitle` | You found them all! | ሁሉንም አገኘህ! |  |
| 271 | `huntTreasure` | Open the treasure | ስጦታውን ክፈት |  |
| 272 | `huntTomorrow` | Come back tomorrow — Jibby will hide new letters! | ነገ ተመለስ — ጅቢ አዲስ ፊደላት ይደብቃል! |  |
| 273 | `huntGo` | Jibby hid today’s letters — find them! | ጅቢ የዛሬን ፊደላት ደብቋል — ፈልጓቸው! |  |
| 274 | `huntDoneChip` | Done today — new hunt tomorrow! | ለዛሬ ተጠናቋል — ነገ አዲስ አደን! |  |
| 275 | `huntFoundOne` | found | ተገኝቷል |  |
| 276 | `huntHidden` | hiding letter | የተደበቀ ፊደል |  |
| 277 | `pcShort` | Postcard | ፖስትካርድ |  |
| 278 | `pcTitle` | Voice Postcard | የድምፅ ፖስትካርድ |  |
| 279 | `pcSub` | Send your voice to someone you love | ድምፅህን ለምትወደው ሰው ላክ |  |
| 280 | `pcHint` | Say “Selam!”, say your newest letters, or sing — Ayat and Abbat would love to hear you. | «ሰላም!» በል፣ አዲሶቹን ፊደላትህን በል፣ ወይም ዘምር — አያትና አባት ሊሰሙህ ይወዳሉ። |  |
| 281 | `pcRecord` | Record | ቅዳ |  |
| 282 | `pcStop` | Stop | አቁም |  |
| 283 | `pcListen` | Listen | አዳምጥ |  |
| 284 | `pcRedo` | Record again | እንደገና ቅዳ |  |
| 285 | `pcSend` | Send to family | ለቤተሰብ ላክ |  |
| 286 | `pcSendAgain` | Send again | እንደገና ላክ |  |
| 287 | `pcGateIntro` | Sending is for grown-ups — you pick who receives it. | መላክ ለወላጆች ነው — ማን እንደሚቀበል እርስዎ ይምረጡ። |  |
| 288 | `pcShared` | Postcard sent! | ፖስትካርዱ ተልኳል! |  |
| 289 | `pcSaved` | Saved! Share it anywhere. | ተቀምጧል! የትም ያጋሩት። |  |
| 290 | `pcPrivacy` | The recording stays on this device. It only travels when a grown-up sends it. | ቅጂው በዚህ መሣሪያ ላይ ይቀራል። ወላጅ ሲልከው ብቻ ይጓዛል። |  |
| 291 | `celebPostcard` | Send this to family! | ይህን ለጋሼ ላክ! |  |
| 292 | `calToday` | Today | ዛሬ |  |
| 293 | `hol_enkutatash` | Enkutatash — Happy New Year! | እንቁጣጣሽ — መልካም አዲስ ዓመት! |  |
| 294 | `hol_meskel` | Meskel — the Finding of the Cross | መስቀል |  |
| 295 | `hol_genna` | Genna — Merry Christmas! | ገና — መልካም በዓል! |  |
| 296 | `hol_timkat` | Timkat — Epiphany! | ጥምቀት! |  |
| 297 | `hol_adwa` | Adwa Victory Day | የዓድዋ ድል በዓል |  |
| 298 | `hol_eritrea` | Eritrean Independence Day | የኤርትራ የነጻነት ቀን |  |
| 299 | `streakDays` | {...}-day streak | {n} ቀን ተከታታይ |  |
| 300 | `remindTitle` | Anbessa misses you! | አንበሳ ናፍቆሃል! |  |
| 301 | `remindBody` | Come learn a letter today. | ዛሬ አንድ ፊደል ና ተማር። |  |
| 302 | `remindTitleLabel` | Daily reminder | ዕለታዊ ማስታወሻ |  |
| 303 | `remindDesc` | A gentle nudge each afternoon to keep the streak going. | ተከታታይነትን ለመጠበቅ በየቀኑ ከሰዓት ትንሽ ማሳሰቢያ። |  |
| 304 | `ccTitle` | Community code | የማህበረሰብ ኮድ |  |
| 305 | `ccThanks` | Thanks — you’re supporting | እናመሰግናለን — እየደገፉ ነው |  |
| 306 | `ccChange` | Change | ቀይር |  |
| 307 | `ccBlurb` | Got a code from a church, school, or community group? Enter it so they get credit. | ከቤተ ክርስቲያን፣ ትምህርት ቤት ወይም ማህበረሰብ ቡድን ኮድ አለዎት? ክሬዲት እንዲያገኙ ያስገቡት። |  |
| 308 | `ccPh` | e.g. DEBRE | ለምሳሌ DEBRE |  |
| 309 | `ccApply` | Apply | ተግብር |  |
| 310 | `slot.hat` | (dynamic) | ኮፍያዎች |  |
| 311 | `slot.scarf` | (dynamic) | ሻርፖች |  |
| 312 | `slot.cape` | (dynamic) | ካባዎች |  |


## Tigrinya UI strings (313)
| # | Key | English (source) | Translation | OK? / Correction |
|---|-----|------------------|-------------|------------------|
| 1 | `tagline` | (dynamic) | ምስ ኣንበሳ ጭሩ ፊደል ተመሃር |  |
| 2 | `champion` | Fidel Champion - every star earned! | ጅግና ፊደል — ኩሎም ከዋኽብቲ ተረኺቦም! |  |
| 3 | `level` | Level | ደረጃ |  |
| 4 | `playLevel` | (dynamic) | ተጻወት |  |
| 5 | `lockHint` | (dynamic) | ንምኽፋት ኣብ ደረጃ {n} ኮኸብ ርኸብ |  |
| 6 | `practiceTitle` | (dynamic) | ልምምድ ኮኸብ |  |
| 7 | `practiceSub` | (dynamic) | {n} ዜጸግሙ ፊደላት ንምጥንኻር |  |
| 8 | `runnerTitle` | (dynamic) | ጉያ ፊደል |  |
| 9 | `runnerSub` | (dynamic) | ኣብ ኢትዮጵያን ኤርትራን ጉየዩ — ንኣንበሳ ኣብልዑ! |  |
| 10 | `skylandsTitle` | Fidel Skylands | ደሴታት ፊደል |  |
| 11 | `skylandsSub` | (dynamic) | ናይ 3D ደሴት ጃብዱ — ገረብ ኣዕብዩ፣ ንጅቢ ስዓሩ |  |
| 12 | `classicTitle` | (dynamic) | ናይ ቀደም ጸወታ |  |
| 13 | `classicSub` | (dynamic) | ስርዓት ዘምሩ፣ ፊደል ስኣሉ፣ ቃላት ተመሃሩ |  |
| 14 | `explorerTitle` | (dynamic) | መርማሪ ፊደል |  |
| 15 | `explorerSub` | (dynamic) | 231 ፊደላት ተንክፉ ስምዑ |  |
| 16 | `grownups` | (dynamic) | ንወለዲ፡ ኣካይዳን ምኽርን |  |
| 17 | `whichLetter` | Which letter says | ኣየናይ ፊደል |  |
| 18 | `says` | (dynamic) | ይብል? |  |
| 19 | `listen` | Listen… | ስምዑ… |  |
| 20 | `nice` | Nice! | ጽቡቕ! |  |
| 21 | `amazing` | Amazing! {...} in a row! | ግሩም! {n} ተኸታታሊ! |  |
| 22 | `notQuite` | Not quite! | ኣይኮነን! |  |
| 23 | `saysWord` | says | ይብል |  |
| 24 | `tryAgain` |  — listen and try again | — ስምዑ እሞ ደጊምኩም ፈትኑ |  |
| 25 | `continue` | Continue | ቀጽል |  |
| 26 | `gotIt` | Got it | ተረዲኡኒ |  |
| 27 | `yourTurn` | Your turn! | ተራኻ እዩ! |  |
| 28 | `levelComplete` | Level complete! | ደረጃ ተወዲኡ! |  |
| 29 | `practiceComplete` | Practice complete! | ልምምድ ተወዲኡ! |  |
| 30 | `practicePraise` | Those tricky letters are getting stronger. Kokeb is proud of you! | ዜጸግሙ ፊደላት እናበርትዑ እዮም። ኮኸብ ብኣኻትኩም ሓቢና! |  |
| 31 | `firstTry` | First-try | ብቐዳማይ ፈተነ |  |
| 32 | `bestStreak` | Best streak | ዝበለጸ ተኸታታሊ |  |
| 33 | `playAgain` | Play again | ደጊምካ ተጻወት |  |
| 34 | `steerInto` | Steer Anbessa into | ንኣንበሳ ናብዚ ድምጺ ምርሕ |  |
| 35 | `munched` | Munched! | ተበሊዑ! |  |
| 36 | `runAgain` | Run again | ደጊምካ ጉየ |  |
| 37 | `home` | Home | መበገሲ |  |
| 38 | `level-1.title` | (dynamic) | ቀዳሞት ፊደላት |  |
| 39 | `level-2.title` | (dynamic) | ተወሰኽቲ ፊደላት |  |
| 40 | `level-3.title` | (dynamic) | ካልኦት ተወሰኽቲ ፊደላት |  |
| 41 | `level-4.title` | (dynamic) | ናይ መወዳእታ ፊደላት |  |
| 42 | `level-5.title` | (dynamic) | ጥበብ ድምጺ |  |
| 43 | `level-6.title` | (dynamic) | ተወሳኺ ጥበብ ድምጺ |  |
| 44 | `level-7.title` | (dynamic) | ዓሚቚ ድምጻውያን |  |
| 45 | `level-8.title` | (dynamic) | ጐይታ ድምጺ |  |
| 46 | `learnTitle` | Letter Steps | ደረጃታት ፊደል |  |
| 47 | `learnSub` | Learn every letter, one step at a time | ንነፍሲ ወከፍ ፊደል ደረጃ ብደረጃ ተመሃር |  |
| 48 | `learnFirst` | (dynamic) | ኣቐዲምካ በዞም ደረጃታት እዞም ፊደላት ተመሃር |  |
| 49 | `meetHint` | (dynamic) | ንፊደል ተንክፍ ስማዕ |  |
| 50 | `popHint` | Pop the bubble! | ንዓረፋ ኣፍንጅር! |  |
| 51 | `starHint` | Slide star to star and draw the constellation | ካብ ኮኸብ ናብ ኮኸብ ኣንሸራትት |  |
| 52 | `feedHint` | Drag the letter Kokeb says to Anbessa | ኮኸብ ትብሎ ብስኩት ንኣንበሳ ኣብልዕ |  |
| 53 | `catchHint` | Feed Anbessa before Jibby grabs it! | ጅቢ ንብስኩት ይደሊ! ትሰምዖ ሓዝ |  |
| 54 | `slideHint` | (dynamic) | ኣጻብዕትኻ ኣብ ፊደላት ኣንሸራትት |  |
| 55 | `echoHint` | (dynamic) | ኮኸብ ትብል... ነቲ ፊደል ተንክፍ! |  |
| 56 | `shuffleHint` | (dynamic) | ተሓዋዊሱ! ትሰምዖ ፊደል ርኸብ |  |
| 57 | `familyDone` | Family mastered! | ስድራ ተማሂሩ! |  |
| 58 | `traceHint` | Hear it, then trace it with your finger | ስማዕ፣ ደሓር ንፊደል ብኣጻብዕትኻ ስኣል |  |
| 59 | `hearIt` | Hear it again | ደጊምካ ስማዕ |  |
| 60 | `traceClear` | Clear | ደምስስ |  |
| 61 | `traceCheck` | Check | ፈትሽ |  |
| 62 | `mixDone` | Great mixing! | ጽቡቕ ሕውስዋስ! |  |
| 63 | `wordsTitle` | First Words | ቀዳሞት ቃላት |  |
| 64 | `wordsSub` | (dynamic) | ንቃል ስማዕ፣ ንስእሉ ተንክፍ |  |
| 65 | `whichStart` | Which letter does it start with? | በየናይ ፊደል ይጅምር? |  |
| 66 | `start` | Start | ጀምር |  |
| 67 | `backpack` | Backpack | ቦርሳ |  |
| 68 | `langLearn` | Learning | እትመሃሮ ቋንቋ |  |
| 69 | `langText` | App text | ናይ ኣፕ ጽሑፍ |  |
| 70 | `teeTitle` | Anbessa Tee Shop | ናይ ኣንበሳ ማልያ ድኳን |  |
| 71 | `teeSub` | (dynamic) | ናይ ፊደል ማልያታት ርኸብን ተኸደንን |  |
| 72 | `teeIntro` | Earn a new shirt design every chapter — Anbessa wears your alphabet! Save the picture or ask a grown-up to order a real shirt. | ኣብ ነፍሲ ወከፍ ምዕራፍ ሓድሽ ናይ ማልያ ንድፊ ርኸብ — ኣንበሳ ንፊደልካ ይኽደኖ! ስእሊ ኣቐምጥ ወይ ንዓቢ ሰብ ናይ ሓቂ ማልያ ክእዝዝ ሕተት። |  |
| 73 | `teeUnlocked` | Unlocked! | ተኸፊቱ! |  |
| 74 | `teeLockedAt` | Learn {...} letters | {n} ፊደላት ተመሃር |  |
| 75 | `teeNext` | Learn {...} more families to unlock the next shirt! | ንዝቕጽል ማልያ ንምኽፋት {n} ተወሰኽቲ ስድራታት ተመሃር! |  |
| 76 | `teeOrder` | Order a real shirt | ናይ ሓቂ ማልያ ኣዘዝ |  |
| 77 | `teeSave` | Save the design | ንድፊ ኣቐምጥ |  |
| 78 | `teeSaved` | Design saved! Print it anywhere. | ንድፊ ተቐሚጡ! ኣብ ዝኾነ ቦታ ሕተሞ። |  |
| 79 | `teeOrdered` | Opening the shop for a grown-up... | ድኳን ይኽፈት ኣሎ — ንዓቢ ሰብ ሕተት... |  |
| 80 | `teeGrownup` | Ordering opens a shop — ask a grown-up. | ምእዛዝ ድኳን ይኸፍት — ንዓቢ ሰብ ሕተት። |  |
| 81 | `teeSaveHint` | Save the picture and print it on any shirt. | ስእሊ ኣቐሚጥካ ኣብ ዝኾነ ማልያ ሕተሞ። |  |
| 82 | `masterTitle` | Fidel Master | ክኢላ ፊደል |  |
| 83 | `masterCta` | (dynamic) | ክኢላ ፊደል፦ ኩሎም ፊደላት ስመዩ፣ ዘምሩ፣ ተዛረቡ |  |
| 84 | `masterLetters` | letters | ፊደላት |  |
| 85 | `masterChart` | (dynamic) | ሰሌዳ |  |
| 86 | `masterAuto` | (dynamic) | ኣውቶ ድምጺ |  |
| 87 | `masterSay` | (dynamic) | በሎ |  |
| 88 | `masterMixDrill` | (dynamic) | ኩሎም ሓዋዊስካ ባዕሉ ኣጻውት |  |
| 89 | `masterMixed` | Mixed | ዝተሓዋወሰ |  |
| 90 | `masterInOrder` | In order | ብቕደም ተኸተል |  |
| 91 | `masterReshuffle` | Reshuffle | ደጊምካ ሓውስ |  |
| 92 | `masterPause` | Pause | ደው ኣብል |  |
| 93 | `masterPlay` | Play | ኣጻውት |  |
| 94 | `speed_slow` | (dynamic) | ቀስ |  |
| 95 | `speed_normal` | (dynamic) | ማእከላይ |  |
| 96 | `speed_fast` | (dynamic) | ቅልጡፍ |  |
| 97 | `sayGreat` | (dynamic) | ኣዝዩ ጽቡቕ! ⭐ |  |
| 98 | `sayGood` | (dynamic) | ጽቡቕ ፈተነ! |  |
| 99 | `sayAgain` | (dynamic) | ሓቢርና ደጊምና ንበሎ |  |
| 100 | `sayNoMic` | (dynamic) | ማይክ የለን — ዓው ኢልካ በሎ፣ ደሓር ንዝቕጽል ተንክፍ! |  |
| 101 | `sayISaidIt` | (dynamic) | ተዛሪበዮ! |  |
| 102 | `sayListening` | (dynamic) | እሰምዕ ኣለኹ... |  |
| 103 | `saySayIt` | (dynamic) | በሎ |  |
| 104 | `sayScore` | (dynamic) | ነጥቢ |  |
| 105 | `masterAll` | (dynamic) | ኩሎም |  |
| 106 | `masterAbugida` | Abugida | ኣቡጊዳ |  |
| 107 | `masterPlayAbugida` | Play the whole Abugida | ምሉእ ኣቡጊዳ ኣጻውት |  |
| 108 | `sayWithMe` | Say with me | ምሳይ በል |  |
| 109 | `nextVowel` | Then next vowel | ቀጺሉ ዝስዕብ ድምጺ |  |
| 110 | `grownupsSub` | Progress, trouble letters, and practice tips | ኣካይዳን ዜጸግሙ ፊደላትን ርአ |  |
| 111 | `closetTitle` | Anbessa's Closet | ናይ ኣንበሳ ከብሒ |  |
| 112 | `closetSub` | (dynamic) | ንኣንበሳ ከድኖ፣ ኣካፍል! |  |
| 113 | `openCloset` | Open Anbessa's Closet | ናይ ኣንበሳ ከብሒ ክፈት |  |
| 114 | `shareAnbessa` | Share Anbessa | ንኣንበሳ ኣካፍል |  |
| 115 | `shareShowOff` | Show everyone! | ንኹሉ ኣርኢ! |  |
| 116 | `lettersLearned` | {...} / 231 letters learned | {n} / 231 ፊደላት ተማሂሮም |  |
| 117 | `closetEmpty` | Finish lessons to earn hats, scarves and capes for Anbessa! | ንኣንበሳ ባርኔጣ፣ ሻርባን ካባን ንምርካብ ትምህርትታት ወድእ! |  |
| 118 | `shareSaved` | Saved! Share it anywhere. | ተቐሚጡ! ኣብ ዝኾነ ቦታ ኣካፍሎ። |  |
| 119 | `shareThanks` | Thanks for sharing! | ስለ ዘካፈልካ የቐንየልና! |  |
| 120 | `chapterDone` | Chapter {...} complete! | ምዕራፍ {n} ተወዲኡ! |  |
| 121 | `earnedItem` | Anbessa earned the {...}! | ኣንበሳ {item} ረኺቡ! |  |
| 122 | `shareMilestone` | {...} learned {...} letters! | {name} {n} ፊደላት ተማሂሩ! |  |
| 123 | `keepGoing` | Keep going | ቀጽል |  |
| 124 | `installTitle` | Add Anbessa to your home screen | ንኣንበሳ ናብ መበገሲ ስክሪንካ ወስኽ |  |
| 125 | `installCta` | Add | ወስኽ |  |
| 126 | `installHow` | How? | ብኸመይ? |  |
| 127 | `installIosHint` | Tap the Share button, then 'Add to Home Screen' | ናይ ምክፍፋል ቁልፊ ተንክፍ፣ ደሓር "ናብ መበገሲ ስክሪን ወስኽ" ምረጽ |  |
| 128 | `dismiss` | Not now | ሕጂ ኣይኮነን |  |
| 129 | `dailyGift` | Open Anbessa's gift | ናይ ኣንበሳ ህያብ ክፈት |  |
| 130 | `giftTitle` | A gift from Anbessa! | ካብ ኣንበሳ ህያብ! |  |
| 131 | `giftGot` | A new {...}! | ሓድሽ {item}! |  |
| 132 | `giftAllDone` | You've collected everything - so happy you came back! | ኩሉ ኣኪብካ - ስለ ዝተመለስካ ኣዝዩ ተሓጒሱ! |  |
| 133 | `slot.hat` | (dynamic) | ባርኔጣታት |  |
| 134 | `slot.scarf` | (dynamic) | ሻርባታት |  |
| 135 | `slot.cape` | (dynamic) | ካባታት |  |
| 136 | `closetShort` | Closet | ከብሒ |  |
| 137 | `teeShort` | Tee Shop | ማልያ ድኳን |  |
| 138 | `wordsShort` | First Words | ቃላት |  |
| 139 | `explorerShort` | Explorer | መርማሪ |  |
| 140 | `classicShort` | Classic | ቀደም |  |
| 141 | `practiceShort` | Practice | ልምምድ |  |
| 142 | `familyShort` | Family | ስድራ |  |
| 143 | `grownupsShort` | Grown-ups | ንወለዲ |  |
| 144 | `reviewShort` | Review | ገምጋም |  |
| 145 | `giftShort` | Gift | ህያብ |  |
| 146 | `myStep` | My step | ናተይ ደረጃ |  |
| 147 | `jumpToStep` | Go to my next step | ናብ ዝቕጽል ደረጃይ ኺድ |  |
| 148 | `goHome` | Home | መበገሲ |  |
| 149 | `newReward` | New! | ሓድሽ! |  |
| 150 | `playAll` | Play all | ኩሉ ኣጻውት |  |
| 151 | `stop` | Stop | ደው ኣብል |  |
| 152 | `back` | Back | ተመለስ |  |
| 153 | `pace_slow` | (dynamic) | ቀስ ኢሉ |  |
| 154 | `pace_normal` | (dynamic) | ንቡር |  |
| 155 | `pace_fast` | (dynamic) | ቅልጡፍ |  |
| 156 | `you` | You | ንስኻ |  |
| 157 | `aFriend` | A friend | ዓርኪ |  |
| 158 | `linkCopied` | Link copied! | መላግቦ ተቐዲሑ! |  |
| 159 | `challengeTitle` | A challenge! | ብድሆ! |  |
| 160 | `challengeFrom` | {...} challenges you! | {who} ይብድሃካ ኣሎ! |  |
| 161 | `challengeScored` | {...} scored {...}% on {...}. Can you beat it? | {who} ኣብ {level} {score}% ኣመዝጊቡ። ክትበልጾ ትኽእል ዶ? |  |
| 162 | `challengeStart` | Take the challenge | ብድሆ ተቐበል |  |
| 163 | `challengeFriend` | Challenge a friend | ዓርኪ ብድሃ |  |
| 164 | `challengeBack` | Challenge back | ተመሊስካ ብድሃ |  |
| 165 | `challengeWin` | You win! | ተዓዊትካ! |  |
| 166 | `challengeLose` | So close! | ተቐሪብካ! |  |
| 167 | `challengeTie` | It's a tie! | ማዕረ ኮይኑ! |  |
| 168 | `challengeGone` | This challenge is not available. | እዚ ብድሆ ኣይርከብን። |  |
| 169 | `challengeShareText` | Beat my Fidel Quest score! Can you? | ናይ ፊደል ኵዌስት ነጥበይ ብለጾ! ትኽእል ዶ? |  |
| 170 | `scopeLearned` | My letters | ናተይ ፊደላት |  |
| 171 | `scopeAll` | All letters | ኩሎም ፊደላት |  |
| 172 | `scopeLabel` | Which letters | ኣየኖት ፊደላት |  |
| 173 | `exploreHeader` | Letter Explorer | መርማሪ ፊደል |  |
| 174 | `exploreHeaderSub` | Pick a vowel, then tap any family to hear it | ድምጺ ምረጽ፣ ደሓር ዝኾነ ስድራ ተንክፍ ንምስማዕ |  |
| 175 | `exploreFamilyTitle` | The {...} family | ስድራ {name} |  |
| 176 | `exploreFamilySub` | Seven forms, one letter — tap to hear each | ሸውዓተ ቅርጺ፣ ሓደ ፊደል — ንነፍሲ ወከፍ ተንክፍ ንምስማዕ |  |
| 177 | `grownupsSub` | Progress, trouble letters, and practice tips | ኣካይዳ፣ ዜጸግሙ ፊደላትን ምኽርታት ልምምድን |  |
| 178 | `gpIntro` | This area is for grown-ups: progress details and practice tips. | እዚ ክፍሊ ንወለዲ እዩ፦ ዝርዝር ኣካይዳን ምኽርታት ልምምድን። |  |
| 179 | `gpHold` | Hold me | ሓዘኒ |  |
| 180 | `gpHoldHint` | Press and hold for two seconds | ንኽልተ ካልኢት ጠዊቕካ ሓዝ |  |
| 181 | `gpTapNumber` | Tap the number {...} | ነቲ {word} ዝብል ቁጽሪ ተንክፍ |  |
| 182 | `gpNum35` | (dynamic) | ሰላሳን ሓሙሽተን |  |
| 183 | `gpNum28` | (dynamic) | ዕስራን ሸሞንተን |  |
| 184 | `gpNum41` | (dynamic) | ኣርብዓን ሓደን |  |
| 185 | `gpPlayerName` | Player name | ስም ተጻዋታይ |  |
| 186 | `gpPlayerNameHint` | Shown on challenges you send to friends. Optional — leave it blank to stay "A friend". It never leaves this device except inside a challenge link you choose to share. | ኣብቲ ንኣዕሩኽ እትሰዶ ብድሆ ይረአ። ኣማራጺ — ባዶ እንተ ገዲፍካዮ «ዓርኪ» ይኸውን። ካብቲ እትዕድሎ መላግቦ ብድሆ ወጻኢ ካብዚ መሳርሒ ኣይወጽእን። |  |
| 187 | `gpPlayerNamePh` | e.g. Selam | ንኣብነት ሰላም |  |
| 188 | `gpLessonStars` | Lesson stars | ከዋኽብቲ ትምህርቲ |  |
| 189 | `gpRunnerBest` | Runner best | ዝበለጸ ጉያ |  |
| 190 | `gpAccuracy` | Accuracy | ትኽክለኛነት |  |
| 191 | `gpMastery` | Letter mastery · {...} answers recorded | ብቕዓት ፊደል · {n} መልስታት ተመዝጊቦም |  |
| 192 | `gpMasteryLegend` | Green: solid · Yellow: getting there · Red: needs help · Grey: not practiced yet. Quizzes currently practice the first-order letters. | ቀጠልያ፦ ጽኑዕ · ብጫ፦ እናኸደ · ቀይሕ፦ ሓገዝ የድሊ · ሓሙኹሽታይ፦ ገና ኣይተለማመደን። እቶም ሕቶታት ሕጂ ናይ ቀዳማይ ደረጃ ፊደላት ይለማመዱ። |  |
| 193 | `gpTrouble` | Trouble letters | ዜጸግሙ ፊደላት |  |
| 194 | `gpTroubleFew` | Not enough play yet — check back after a few games. | ገና እኹል ጸወታ የለን — ድሕሪ ቁሩብ ጸወታታት ተመለስ። |  |
| 195 | `gpTroubleNone` | No trouble letters right now. Nice work! | ሕጂ ዜጸግም ፊደል የለን። ጽቡቕ! |  |
| 196 | `gpCorrect` | correct | ቅኑዕ |  |
| 197 | `gpOpenExplorer` | Open in Explorer | ብመርማሪ ክፈት |  |
| 198 | `gpReplayLevel` | Replay Level {...} | ደረጃ {n} ደጊምካ |  |
| 199 | `gpReset` | Reset all progress… | ኩሉ ኣካይዳ ደምስስ… |  |
| 200 | `gpResetConfirm` | Erase stars, bests, islands, and learning history? | ከዋኽብቲ፣ ዝበለጹ፣ ደሴታትን ታሪኽ ትምህርትን ክድምሰስ? |  |
| 201 | `gpResetYes` | Yes, erase | እወ፣ ደምስስ |  |
| 202 | `gpResetNo` | Keep it | ግደፎ |  |
| 203 | `skyMap` | Map | ካርታ |  |
| 204 | `skySession` | Session | ክፍለ ግዜ |  |
| 205 | `skyAllCleared` | All four skylands cleared — Anbessa is a Fidel Champion! | ኩለን ኣርባዕተ ደሴታት ተዛዚመን — ኣንበሳ ሻምፒዮን ፊደል እዩ! |  |
| 206 | `skyReady` | ready for Level {...}: it tests Sessions 1–{...}! | ንደረጃ {n} ድሉው፦ ንክፍለ ግዜ 1–{n} ይፍትን! |  |
| 207 | `skyLearnPrompt` | learn Session {...}'s letters to wake the tree. | ነታ ገረብ ንምንቓሕ ናይ ክፍለ ግዜ {n} ፊደላት ተመሃር። |  |
| 208 | `skyLearnBtn` | Learn Session {...} | ክፍለ ግዜ {n} ተመሃር |  |
| 209 | `skyPlayBtn` | Play Level {...} | ደረጃ {n} ተጻወት |  |
| 210 | `skyReplay` | Replay: | ደጊምካ ተጻወት፦ |  |
| 211 | `skyLearnTap` | Tap every fruit to hear its letter — | ንነፍሲ ወከፍ ፍረ ተንክፍ ፊደሉ ስማዕ — |  |
| 212 | `skyStartQuest` | Start Level {...} quest | ናይ ደረጃ {n} ጉዕዞ ጀምር |  |
| 213 | `skyListenFirst` | Listen to them all first | ኣቐዲምካ ንኹሎም ስማዕ |  |
| 214 | `skyPluck` | Pluck the fruit that says | እትብል ፍረ ቕጠፍ |  |
| 215 | `skyRight` | Yes! | እወ! |  |
| 216 | `skyWrong` | Jibby giggles — listen again for | ጅቢ ይስሕቕ — ደጊምካ ስማዕ |  |
| 217 | `skyStole` | Jibby stole {...} letters! | ጅቢ {n} ፊደላት ሰሪቑ! |  |
| 218 | `skyWinBack` | Win back the one that says | ነታ እትብል መሊስካ ስዓር |  |
| 219 | `skyRescued` | Rescued! | ደሓነ! |  |
| 220 | `skyHold` | Jibby holds on tight — listen again for | ጅቢ ኣትሪሩ ሒዙ — ደጊምካ ስማዕ |  |
| 221 | `skyCleared` | Island cleared! | ደሴት ተዛዚሙ! |  |
| 222 | `skyClearedSub` | {...} letters + 3 rescued from Jibby · | {n} ፊደላት + 3 ካብ ጅቢ ተናጊፎም · |  |
| 223 | `skyBridge` | the bridge to {...} has grown! | ናብ {place} ዝወስድ ድልድል ዓብዩ! |  |
| 224 | `skyAllFree` | every skyland is free! | ኩለን ደሴታት ናጻ ወጺአን! |  |
| 225 | `runQuit` | Quit run | ጉያ ደው ኣብል |  |
| 226 | `runMoveLeft` | Move left | ንጸጋም |  |
| 227 | `runMoveRight` | Move right | ንየማን |  |
| 228 | `runBossWin` | Anbessa’s letter power wins! | ናይ ኣንበሳ ሓይሊ ፊደል ተዓዊቱ! |  |
| 229 | `runBossAttack` | Jibby the hyena attacks! | ጅቢ የጥቅዕ ኣሎ! |  |
| 230 | `runNewBest` | New best! | ሓድሽ ዝበለጸ! |  |
| 231 | `runBest` | Best | ዝበለጸ |  |
| 232 | `fvShort` | Family Voice | ድምጺ ስድራ |  |
| 233 | `fvTitle` | Family Voice | ድምጺ ስድራ |  |
| 234 | `fvSub` | Let Anbessa speak in a loved one’s voice | ኣንበሳ ብድምጺ እትፈትዎ ሰብ ይዛረብ |  |
| 235 | `fvWhoSpeaks` | Who’s speaking? | መን ይዛረብ? |  |
| 236 | `fvDefault` | Default | ንቡር |  |
| 237 | `fvImport` | Import a voice | ድምጺ ኣእቱ |  |
| 238 | `fvNowSpeaking` | Anbessa now speaks in this voice | ኣንበሳ ሕጂ በዚ ድምጺ ይዛረብ |  |
| 239 | `fvDefaultVoice` | Back to the default voice | ናብ ንቡር ድምጺ ተመሊሱ |  |
| 240 | `fvGateIntro` | Recording is for grown-ups — it uses the microphone. | ምቕዳሕ ንወለዲ እዩ — ማይክሮፎን ይጥቀም። |  |
| 241 | `fvImported` | Voice imported! | ድምጺ ኣትዩ! |  |
| 242 | `fvImportFail` | That file isn't a Fidel Quest voice. | እዚ ፋይል ናይ ፊደል ኵዌስት ድምጺ ኣይኮነን። |  |
| 243 | `fvEmpty` | No family voices yet. Record one, or import a voice a relative sent you. | ክሳብ ሕጂ ድምጺ ስድራ የለን። ሓደ ቕዳሕ፣ ወይ ዘመድ ዝሰደደልካ ድምጺ ኣእቱ። |  |
| 244 | `fvForGrownups` | For grown-ups | ንወለዲ |  |
| 245 | `fvRecordTitle` | Record your voice | ድምጽኻ ቅዳሕ |  |
| 246 | `fvRecordBtn` | Record a new voice | ሓድሽ ድምጺ ቅዳሕ |  |
| 247 | `fvRecordBlurb` | Record the letters in your own voice, then share the file with your child by WhatsApp. A grandparent far away can record for kids here — and the other way around. | ነቶም ፊደላት ብድምጽኻ ቅዳሕ፣ ደሓር ነቲ ፋይል ብዋትስኣፕ ንውላድካ ኣካፍል። ርሑቕ ዘሎ ኣቦሓጎ ንቆልዑ ኣብዚ ክቕዳሕ ይኽእል — ብተገላቢጦውን። |  |
| 248 | `fvRecordHint` | Tap a letter to record it, tap again to stop. Tap ✓ to hear it back. | ንምቕዳሕ ፊደል ተንክፍ፣ ንምቁራጽ ከም ብሓድሽ ተንክፍ። ንምስማዕ ✓ ተንክፍ። |  |
| 249 | `fvUseVoice` | Use it here | ኣብዚ ተጠቐመሉ |  |
| 250 | `fvShare` | Share with a child | ንቆልዓ ኣካፍል |  |
| 251 | `fvNoMic` | Recording needs a microphone — use a phone or tablet. | ምቕዳሕ ማይክሮፎን የድሊ — ተሌፎን ወይ ታብለት ተጠቐም። |  |
| 252 | `fvPrivacy` | Voices stay on this device. Nothing is uploaded — a voice only travels in the file you choose to share. | ድምጽታት ኣብዚ መሳርሒ ይተርፉ። ገለ ኣይስቀልን — ድምጺ ዝጓዓዝ በቲ እተካፍሎ ፋይል ጥራይ እዩ። |  |
| 253 | `fvDelete` | Delete voice | ድምጺ ሰርዝ |  |
| 254 | `fvNameLabel` | Voice name | ስም ድምጺ |  |
| 255 | `fvNamePh` | Whose voice? e.g. Grandma | ናይ መን ድምጺ? ንኣብነት ዓባይ |  |
| 256 | `fvGreetingSlot` | Greeting | ሰላምታ |  |
| 257 | `fvGreetingShort` | Hi! | ሰላም! |  |
| 258 | `nameShort` | My Name | ስመይ |  |
| 259 | `nameTitle` | Write your name | ስምካ ጽሓፍ |  |
| 260 | `nameSub` | Spell it in Fidel, one sound at a time | ብፊደል፣ ሓደ ድምጺ ብሓደ ጽሓፎ |  |
| 261 | `nameHint` | Pick a vowel sound below, then tap letters to spell your name. | ካብ ታሕቲ ናይ ኣናባቢ ድምጺ ምረጽ፣ ደሓር ፊደላት ንኪእካ ስምካ ጽሓፍ። |  |
| 262 | `namePlay` | Hear the name | ነቲ ስም ስማዕ |  |
| 263 | `nameBackspace` | Remove last letter | ነቲ ናይ መወዳእታ ፊደል ኣጥፍእ |  |
| 264 | `nameClear` | Clear | ኣጽሪ |  |
| 265 | `nameVowel` | Vowel sound | ናይ ኣናባቢ ድምጺ |  |
| 266 | `nameLetters` | Letters | ፊደላት |  |
| 267 | `nameShare` | Share my name | ስመይ ኣካፍል |  |
| 268 | `namePrivacy` | The card is made on this device. Nothing is shared unless you tap Share. | እቲ ካርድ ኣብዚ መሳርሒ እዩ ዝስራሕ። ኣካፍል እንተዘይነኪእካ ገለ ኣይክፈልን። |  |
| 269 | `huntShort` | Daily Hunt | ናይ ዕለት ኣደና |  |
| 270 | `huntTitle` | Daily Letter Hunt | ናይ ዕለት ኣደና ፊደል |  |
| 271 | `huntSub` | Jibby hid the letters! Find them by sound | ጅቢ ነቶም ፊደላት ሓቢኡዎም! ብድምጺ ርኸብዎም |  |
| 272 | `huntFind` | Find the letter that says | ነዚ ዝብል ፊደል ርኸብ |  |
| 273 | `huntListen` | Hear the sound again | ነቲ ድምጺ ከም ብሓድሽ ስማዕ |  |
| 274 | `huntDoneTitle` | You found them all! | ንኹሎም ረኺብካዮም! |  |
| 275 | `huntTreasure` | Open the treasure | ነቲ ህያብ ክፈት |  |
| 276 | `huntTomorrow` | Come back tomorrow — Jibby will hide new letters! | ጽባሕ ተመለስ — ጅቢ ሓደስቲ ፊደላት ክሓብእ እዩ! |  |
| 277 | `huntGo` | Jibby hid today’s letters — find them! | ጅቢ ናይ ሎሚ ፊደላት ሓቢኡ — ርኸብዎም! |  |
| 278 | `huntDoneChip` | Done today — new hunt tomorrow! | ንሎሚ ተወዲኡ — ጽባሕ ሓድሽ ኣደና! |  |
| 279 | `huntFoundOne` | found | ተረኺቡ |  |
| 280 | `huntHidden` | hiding letter | ሕቡእ ፊደል |  |
| 281 | `pcShort` | Postcard | ፖስትካርድ |  |
| 282 | `pcTitle` | Voice Postcard | ናይ ድምጺ ፖስትካርድ |  |
| 283 | `pcSub` | Send your voice to someone you love | ድምጽኻ ናብ እትፈትዎ ሰብ ስደድ |  |
| 284 | `pcHint` | Say “Selam!”, say your newest letters, or sing — Ayat and Abbat would love to hear you. | «ሰላም!» በል፣ ሓደስቲ ፊደላትካ በል፣ ወይ ዘምር — ዓባይን ኣቦሓጎን ክሰምዑኻ ይፈትዉ። |  |
| 285 | `pcRecord` | Record | ቅዳሕ |  |
| 286 | `pcStop` | Stop | ደው ኣብል |  |
| 287 | `pcListen` | Listen | ስማዕ |  |
| 288 | `pcRedo` | Record again | ከም ብሓድሽ ቅዳሕ |  |
| 289 | `pcSend` | Send to family | ንስድራ ስደድ |  |
| 290 | `pcSendAgain` | Send again | ከም ብሓድሽ ስደድ |  |
| 291 | `pcGateIntro` | Sending is for grown-ups — you pick who receives it. | ምስዳድ ንወለዲ እዩ — መን ከም ዝቕበል ንስኻ ምረጽ። |  |
| 292 | `pcShared` | Postcard sent! | እቲ ፖስትካርድ ተላኢኹ! |  |
| 293 | `pcSaved` | Saved! Share it anywhere. | ተዓቂቡ! ኣብ ዝኾነ ኣካፍሎ። |  |
| 294 | `pcPrivacy` | The recording stays on this device. It only travels when a grown-up sends it. | እቲ ቅዳሕ ኣብዚ መሳርሒ ይተርፍ። ወላዲ ምስ ዝሰዶ ጥራይ ይጓዓዝ። |  |
| 295 | `celebPostcard` | Send this to family! | ነዚ ንኣያይ ስደዶ! |  |
| 296 | `calToday` | Today | ሎሚ |  |
| 297 | `hol_enkutatash` | Enkutatash — Happy New Year! | እንቋጣጣሽ — ርሑስ ሓድሽ ዓመት! |  |
| 298 | `hol_meskel` | Meskel — the Finding of the Cross | መስቀል |  |
| 299 | `hol_genna` | Genna — Merry Christmas! | ልደት — ርሑስ በዓል! |  |
| 300 | `hol_timkat` | Timkat — Epiphany! | ጥምቀት! |  |
| 301 | `hol_adwa` | Adwa Victory Day | በዓል ዓወት ዓድዋ |  |
| 302 | `hol_eritrea` | Eritrean Independence Day | መዓልቲ ናጽነት ኤርትራ |  |
| 303 | `streakDays` | {...}-day streak | {n} መዓልቲ ተኸታታሊ |  |
| 304 | `remindTitle` | Anbessa misses you! | ኣንበሳ ናፊቑካ! |  |
| 305 | `remindBody` | Come learn a letter today. | ሎሚ ሓደ ፊደል ንዓ ተመሃር። |  |
| 306 | `remindTitleLabel` | Daily reminder | ዕለታዊ መዘኻኸሪ |  |
| 307 | `remindDesc` | A gentle nudge each afternoon to keep the streak going. | ተኸታታልነትካ ንምሕላው መዓልታዊ ድሕሪ ቐትሪ ንእሽቶ መዘኻኸሪ። |  |
| 308 | `ccTitle` | Community code | ኮድ ማሕበረሰብ |  |
| 309 | `ccThanks` | Thanks — you’re supporting | የቐንየልና — ትድግፉ ኣለኹም |  |
| 310 | `ccChange` | Change | ቀይር |  |
| 311 | `ccBlurb` | Got a code from a church, school, or community group? Enter it so they get credit. | ካብ ቤተ ክርስትያን፣ ቤት ትምህርቲ ወይ ጉጅለ ማሕበረሰብ ኮድ ኣለኩም ዶ? ክሬዲት ምእንቲ ክረኽቡ ኣእትውዎ። |  |
| 312 | `ccPh` | e.g. DEBRE | ንኣብነት DEBRE |  |
| 313 | `ccApply` | Apply | ተግብር |  |


## Also worth a skim (older, separate table)
- The Classic game's Amharic/Tigrinya blocks in `src/data/fidelGameData.js`
  (UI_STRINGS.am / UI_STRINGS.ti) predate this pass.

## Audio status (for context - not part of this review)
- All 231 letters + 25 words: HUMAN recordings (no synthesized voice remains).
- Still falling back to the chime: the two words hager (ሀገር) / hamer (ሐመር)
  and the order-8 labialized bonus forms (Classic mode only). Record and drop
  them into public/audio/fidel/words/ and letters/ when convenient.
