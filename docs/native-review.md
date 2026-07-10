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

## Amharic UI strings (460)
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
| 199 | `gpUnlockAll` | Open everything (for testing)… | ሁሉንም ክፈት (ለሙከራ)… |  |
| 200 | `gpUnlockConfirm` | Open every level, island and letter for testing? | ለሙከራ ሁሉም ደረጃዎች፣ ደሴቶች እና ፊደላት ይከፈቱ? |  |
| 201 | `gpUnlockYes` | Yes, open all | አዎ፣ ሁሉንም ክፈት |  |
| 202 | `paySupport` | Support Fidel Quest | ፊደል ኩዌስትን ደግፉ |  |
| 203 | `payTitle` | Keep learning with Fidel Quest | መማሩ ይቀጥል! |  |
| 204 | `payBody` | Your {n}-day free try-out is finished. Buying the app keeps it working for your child - and keeps it growing. | የ{n} ቀን ነፃ ሙከራችሁ አልቋል። መተግበሪያውን መግዛት ለልጅዎ መስራቱን እና ማደጉን ያስቀጥላል። |  |
| 205 | `payLeft` | Free try-out: {n} days left | ነፃ ሙከራ · {n} ቀን ቀርቷል |  |
| 206 | `payEnded` | Your free try-out has ended. | ነፃ ሙከራችሁ አልቋል። |  |
| 207 | `payBuy` | Buy the app | መተግበሪያውን ግዙ |  |
| 208 | `payFamily` | Ask family to gift it | ቤተሰብ በስጦታ እንዲገዛ ጠይቁ |  |
| 209 | `payFamilyHint` | No way to pay where you live? A relative anywhere in the world can gift it - share this with them. | እርስዎ ዘንድ መክፈያ መንገድ ከሌለ በየትም ያለ ዘመድ በስጦታ ሊገዛላችሁ ይችላል - ይህን ያጋሩት። |  |
| 210 | `payShareText` | Our kids are learning the Ethiopian alphabet with Fidel Quest. Could you gift us the app? | ልጆቻችን በፊደል ኩዌስት ፊደል እየተማሩ ነው። እባካችሁ መተግበሪያውን በስጦታ ልትገዙልን ትችላላችሁ? |  |
| 211 | `payFeedback` | Not buying? Tell us honestly why | አልገዙም? ለምን እንደሆነ በግልጽ ንገሩን |  |
| 212 | `payFeedbackHint` | Honest feedback earns {n} more free days. | ግልጽ አስተያየት ተጨማሪ {n} ነፃ ቀናት ያስገኛል። |  |
| 213 | `payFeedbackBody` | What we liked:nnWhat should be better:nnWhy we did not buy it:n | የወደድነው:\n\nመሻሻል ያለበት:\n\nያልገዛንበት ምክንያት:\n |  |
| 214 | `payFeedbackDone` | Thank you! {n} more free days added. | እናመሰግናለን! ተጨማሪ {n} ነፃ ቀናት ተጨምረዋል። |  |
| 215 | `payOwned` | My family already bought it | ቤተሰቤ ገዝቶታል |  |
| 216 | `payThanks` | Thank you for supporting Fidel Quest! | ፊደል ኩዌስትን ስለደገፋችሁ እናመሰግናለን! |  |
| 217 | `gpMoveTitle` | Move to another phone | ወደ ሌላ ስልክ ማዛወር |  |
| 218 | `gpMoveHint` | Save all learning progress as one small file, send it to the new phone (WhatsApp works), then load it there. | ሁሉንም የመማር ሂደት እንደ አንድ ትንሽ ፋይል ያስቀምጡ፣ ወደ አዲሱ ስልክ ይላኩት (ዋትስአፕ ይሰራል)፣ ከዚያ እዚያ ይጫኑት። |  |
| 219 | `gpExport` | Save progress file | የሂደት ፋይል አስቀምጥ |  |
| 220 | `gpImport` | Load progress file | የሂደት ፋይል ጫን |  |
| 221 | `swUpdate` | New version ready - tap to update | አዲስ ስሪት ደርሷል - ለማዘመን ንኩ |  |
| 222 | `skyMap` | Map | ካርታ |  |
| 223 | `skySession` | Session | ክፍለ ጊዜ |  |
| 224 | `skyAllCleared` | All four skylands cleared — Anbessa is a Fidel Champion! | አራቱም ደሴቶች ተጠናቀዋል — አንበሳ የፊደል ሻምፒዮን ነው! |  |
| 225 | `skyReady` | ready for Level {...}: it tests Sessions 1–{...}! | ለደረጃ {n} ተዘጋጅቷል፦ ክፍለ ጊዜ 1–{n}ን ይፈትናል! |  |
| 226 | `skyLearnPrompt` | learn Session {...}'s letters to wake the tree. | ዛፉን ለማንቃት የክፍለ ጊዜ {n} ፊደላትን ይማሩ። |  |
| 227 | `skyLearnBtn` | Learn Session {...} | ክፍለ ጊዜ {n} ተማር |  |
| 228 | `skyPlayBtn` | Play Level {...} | ደረጃ {n} ተጫወት |  |
| 229 | `skyReplay` | Replay: | እንደገና ተጫወት፦ |  |
| 230 | `skyLearnTap` | Tap every fruit to hear its letter — | እያንዳንዱን ፍሬ ንኩና ፊደሉን ያዳምጡ — |  |
| 231 | `skyStartQuest` | Start Level {...} quest | የደረጃ {n} ጉዞ ጀምር |  |
| 232 | `skyListenFirst` | Listen to them all first | መጀመሪያ ሁሉንም ያዳምጡ |  |
| 233 | `skyPluck` | Pluck the fruit that says | የሚለውን ፍሬ ንኩ |  |
| 234 | `skyRight` | Yes! | አዎ! |  |
| 235 | `skyWrong` | Jibby giggles — listen again for | ጅቢ ይስቃል — እንደገና ያዳምጡ |  |
| 236 | `skyStole` | Jibby stole {...} letters! | ጅቢ {n} ፊደላት ሰረቀ! |  |
| 237 | `skyWinBack` | Win back the one that says | የሚለውን መልሰው ያሸንፉ |  |
| 238 | `skyRescued` | Rescued! | ታደገ! |  |
| 239 | `skyHold` | Jibby holds on tight — listen again for | ጅቢ አጥብቆ ይይዛል — እንደገና ያዳምጡ |  |
| 240 | `skyCleared` | Island cleared! | ደሴቱ ተጠናቀቀ! |  |
| 241 | `skyClearedSub` | {...} letters + 3 rescued from Jibby · | {n} ፊደላት + 3 ከጅቢ ታድገዋል · |  |
| 242 | `skyBridge` | the bridge to {...} has grown! | ወደ {place} የሚወስደው ድልድይ አድጓል! |  |
| 243 | `skyAllFree` | every skyland is free! | ሁሉም ደሴት ነፃ ወጥቷል! |  |
| 244 | `runQuit` | Quit run | ሩጫ አቁም |  |
| 245 | `runMoveLeft` | Move left | ወደ ግራ |  |
| 246 | `runMoveRight` | Move right | ወደ ቀኝ |  |
| 247 | `runBossWin` | Anbessa’s letter power wins! | የአንበሳ የፊደል ኃይል አሸነፈ! |  |
| 248 | `runBossAttack` | Jibby the hyena attacks! | ጅቢ ያጠቃል! |  |
| 249 | `runNewBest` | New best! | አዲስ ምርጥ! |  |
| 250 | `runBest` | Best | ምርጥ |  |
| 251 | `fvShort` | Family Voice | የቤተሰብ ድምፅ |  |
| 252 | `fvTitle` | Family Voice | የቤተሰብ ድምፅ |  |
| 253 | `fvSub` | Let Anbessa speak in a loved one’s voice | አንበሳ በሚወዱት ሰው ድምፅ ይናገር |  |
| 254 | `fvWhoSpeaks` | Who’s speaking? | ማን ይናገራል? |  |
| 255 | `fvDefault` | Default | ነባሪ |  |
| 256 | `fvImport` | Import a voice | ድምፅ አስገባ |  |
| 257 | `fvNowSpeaking` | Anbessa now speaks in this voice | አንበሳ አሁን በዚህ ድምፅ ይናገራል |  |
| 258 | `fvDefaultVoice` | Back to the default voice | ወደ ነባሪው ድምፅ ተመልሷል |  |
| 259 | `fvGateIntro` | Recording is for grown-ups — it uses the microphone. | መቅዳት ለወላጆች ነው — ማይክሮፎን ይጠቀማል። |  |
| 260 | `fvImported` | Voice imported! | ድምፅ ገብቷል! |  |
| 261 | `fvImportFail` | That file isn't a Fidel Quest voice. | ይህ ፋይል የፊደል ኵዌስት ድምፅ አይደለም። |  |
| 262 | `fvEmpty` | No family voices yet. Record one, or import a voice a relative sent you. | እስካሁን የቤተሰብ ድምፅ የለም። አንድ ይቅዱ፣ ወይም ዘመድ የላከዎትን ድምፅ ያስገቡ። |  |
| 263 | `fvForGrownups` | For grown-ups | ለወላጆች |  |
| 264 | `fvRecordTitle` | Record your voice | ድምፅዎን ይቅዱ |  |
| 265 | `fvRecordBtn` | Record a new voice | አዲስ ድምፅ ይቅዱ |  |
| 266 | `fvRecordBlurb` | Record the letters in your own voice, then share the file with your child by WhatsApp. A grandparent far away can record for kids here — and the other way around. | ፊደላቱን በራስዎ ድምፅ ይቅዱ፣ ከዚያ ፋይሉን በዋትስአፕ ለልጅዎ ያጋሩ። ሩቅ ያለ አያት ለልጆች እዚህ መቅዳት ይችላል — በተቃራኒውም። |  |
| 267 | `fvRecordHint` | Tap a letter to record it, tap again to stop. Tap ✓ to hear it back. | ለመቅዳት ፊደል ንኩ፣ ለማቆም ደግመው ንኩ። ለማዳመጥ ✓ ንኩ። |  |
| 268 | `fvUseVoice` | Use it here | እዚህ ተጠቀምበት |  |
| 269 | `fvShare` | Share with a child | ለልጅ አጋራ |  |
| 270 | `fvNoMic` | Recording needs a microphone — use a phone or tablet. | መቅዳት ማይክሮፎን ይፈልጋል — ስልክ ወይም ታብሌት ይጠቀሙ። |  |
| 271 | `fvPrivacy` | Voices stay on this device. Nothing is uploaded — a voice only travels in the file you choose to share. | ድምፆች በዚህ መሣሪያ ላይ ይቀራሉ። ምንም አይሰቀልም — ድምፅ የሚጓዘው በሚያጋሩት ፋይል ብቻ ነው። |  |
| 272 | `fvDelete` | Delete voice | ድምፅ ሰርዝ |  |
| 273 | `fvNameLabel` | Voice name | የድምፅ ስም |  |
| 274 | `fvNamePh` | Whose voice? e.g. Grandma | የማን ድምፅ? ለምሳሌ አያት |  |
| 275 | `fvGreetingSlot` | Greeting | ሰላምታ |  |
| 276 | `fvGreetingShort` | Hi! | ሰላም! |  |
| 277 | `nameShort` | My Name | ስሜ |  |
| 278 | `nameTitle` | Write your name | ስምህን ጻፍ |  |
| 279 | `nameSub` | Spell it in Fidel, one sound at a time | በፊደል፣ አንድ ድምፅ በአንዴ ጻፈው |  |
| 280 | `nameHint` | Pick a vowel sound below, then tap letters to spell your name. | ከታች የአናባቢ ድምፅ ምረጥ፣ ከዚያ ፊደላትን ነክተህ ስምህን ጻፍ። |  |
| 281 | `namePlay` | Hear the name | ስሙን ስማ |  |
| 282 | `nameBackspace` | Remove last letter | የመጨረሻውን ፊደል አጥፋ |  |
| 283 | `nameClear` | Clear | አጽዳ |  |
| 284 | `nameVowel` | Vowel sound | የአናባቢ ድምፅ |  |
| 285 | `nameLetters` | Letters | ፊደላት |  |
| 286 | `nameShare` | Share my name | ስሜን አጋራ |  |
| 287 | `namePrivacy` | The card is made on this device. Nothing is shared unless you tap Share. | ካርዱ በዚህ መሣሪያ ላይ ይሠራል። አጋራ ካልነኩ ምንም አይጋራም። |  |
| 288 | `huntShort` | Daily Hunt | የዕለቱ አደን |  |
| 289 | `huntTitle` | Daily Letter Hunt | የዕለቱ የፊደል አደን |  |
| 290 | `huntSub` | Jibby hid the letters! Find them by sound | ጅቢ ፊደላቱን ደብቋል! በድምፅ ፈልጓቸው |  |
| 291 | `huntFind` | Find the letter that says | ይህን የሚለውን ፊደል ፈልግ |  |
| 292 | `huntListen` | Hear the sound again | ድምፁን እንደገና ስማ |  |
| 293 | `huntDoneTitle` | You found them all! | ሁሉንም አገኘህ! |  |
| 294 | `huntTreasure` | Open the treasure | ስጦታውን ክፈት |  |
| 295 | `huntTomorrow` | Come back tomorrow — Jibby will hide new letters! | ነገ ተመለስ — ጅቢ አዲስ ፊደላት ይደብቃል! |  |
| 296 | `huntGo` | (dynamic) | ጅቢ የዛሬን ፊደላት ደብቋል — ፈልጓቸው! |  |
| 297 | `huntDoneChip` | (dynamic) | ለዛሬ ተጠናቋል — ነገ አዲስ አደን! |  |
| 298 | `huntFoundOne` | found | ተገኝቷል |  |
| 299 | `huntHidden` | hiding letter | የተደበቀ ፊደል |  |
| 300 | `pcShort` | Postcard | ፖስትካርድ |  |
| 301 | `pcTitle` | Voice Postcard | የድምፅ ፖስትካርድ |  |
| 302 | `pcSub` | Send your voice to someone you love | ድምፅህን ለምትወደው ሰው ላክ |  |
| 303 | `pcHint` | Say “Selam!”, say your newest letters, or sing — Ayat and Abbat would love to hear you. | «ሰላም!» በል፣ አዲሶቹን ፊደላትህን በል፣ ወይም ዘምር — አያትና አባት ሊሰሙህ ይወዳሉ። |  |
| 304 | `pcRecord` | Record | ቅዳ |  |
| 305 | `pcStop` | Stop | አቁም |  |
| 306 | `pcListen` | Listen | አዳምጥ |  |
| 307 | `pcRedo` | Record again | እንደገና ቅዳ |  |
| 308 | `pcSend` | Send to family | ለቤተሰብ ላክ |  |
| 309 | `pcSendAgain` | Send again | እንደገና ላክ |  |
| 310 | `pcGateIntro` | Sending is for grown-ups — you pick who receives it. | መላክ ለወላጆች ነው — ማን እንደሚቀበል እርስዎ ይምረጡ። |  |
| 311 | `pcShared` | Postcard sent! | ፖስትካርዱ ተልኳል! |  |
| 312 | `pcSaved` | Saved! Share it anywhere. | ተቀምጧል! የትም ያጋሩት። |  |
| 313 | `pcPrivacy` | The recording stays on this device. It only travels when a grown-up sends it. | ቅጂው በዚህ መሣሪያ ላይ ይቀራል። ወላጅ ሲልከው ብቻ ይጓዛል። |  |
| 314 | `celebPostcard` | Send this to family! | ይህን ለጋሼ ላክ! |  |
| 315 | `planTitle` | Today's plan | የዛሬ ዕቅድ |  |
| 316 | `planWarmupStep` | (dynamic) | ማሟሟቂያ፦ ፊደሎችህን ከልስ |  |
| 317 | `planNewStep` | (dynamic) | የዛሬ አዲስ ደረጃ |  |
| 318 | `planNewShort` | New step | አዲስ ደረጃ |  |
| 319 | `planHuntStep` | (dynamic) | የዕለቱ የፊደል አደን |  |
| 320 | `planEta` | On this pace you finish the whole Fidel by {date}! | በዚህ ፍጥነት ሙሉውን ፊደል በ{date} ትጨርሳለህ! |  |
| 321 | `planMake` | Make my learning plan | የመማሪያ ዕቅዴን አዘጋጅ |  |
| 322 | `planSetupTitle` | My learning plan | የመማሪያ ዕቅዴ |  |
| 323 | `planSetupSub` | Pick a pace - the coach guides each day | ፍጥነት ምረጥ — አሰልጣኙ በየቀኑ ይመራሃል |  |
| 324 | `paceChill` | Chill - 1 letter family a week | ዘና — በሳምንት 1 የፊደል ቤተሰብ |  |
| 325 | `paceSteady` | Steady - 2 families a week | መደበኛ — በሳምንት 2 ቤተሰብ |  |
| 326 | `paceZoom` | Zoom - 4 families a week | ፈጣን — በሳምንት 4 ቤተሰብ |  |
| 327 | `planSave` | Start my plan | ዕቅዴን ጀምር |  |
| 328 | `warmTitle` | Warm-up | ማሟሟቂያ |  |
| 329 | `warmNudgeTitle` | Warm up first! | መጀመሪያ ተሟሟቅ! |  |
| 330 | `warmNudgeBody` | A quick review of your letters, then the game! | ፈጣን የፊደል ክለሳ፣ ከዚያ ጨዋታው! |  |
| 331 | `warmStart` | Start warm-up | ማሟሟቂያ ጀምር |  |
| 332 | `warmSkip` | Play anyway | ለማንኛውም ተጫወት |  |
| 333 | `gpPlanTitle` | Learning plan | የመማሪያ ዕቅድ |  |
| 334 | `gpRequireWarmup` | Require warm-up before games | ከጨዋታ በፊት ማሟሟቂያ ግድ ይሁን |  |
| 335 | `gpRequireHint` | When on, the child must finish the day's review before the games open. | ሲበራ ልጁ ጨዋታ ከመጫወቱ በፊት የዕለቱን ክለሳ መጨረስ አለበት። |  |
| 336 | `gpWarmups` | {...} warm-ups done | {n} ማሟሟቂያዎች ተጠናቀዋል |  |
| 337 | `planAssignStep` | (dynamic) | የመምህር ሥራ — {who} |  |
| 338 | `jcTitle` | Join {who}’s class? | የ{who}ን ክፍል መቀላቀል ትፈልጋለህ? |  |
| 339 | `jcBody` | Your app remembers the class on this device only. Nothing about you is sent anywhere. | መተግበሪያው ክፍሉን በዚህ መሣሪያ ላይ ብቻ ያስታውሳል። ስለ አንተ ምንም ወደ የትም አይላክም። |  |
| 340 | `jcJoin` | Join class | ክፍል ተቀላቀል |  |
| 341 | `jcJoined` | You're in {who}'s class! | የ{who} ክፍል ውስጥ ገብተሃል! |  |
| 342 | `jcJoinedBody` | Assignments from your teacher will show up in your daily plan. | የመምህርህ ሥራዎች በዕለታዊ ዕቅድህ ውስጥ ይታያሉ። |  |
| 343 | `jcShareText` | Join my Fidel Quest class: | የFidel Quest ክፍሌን ተቀላቀሉ፦ |  |
| 344 | `asTitle` | Assignment | የቤት ሥራ |  |
| 345 | `asFrom` | {who} sent your class homework! | {who} ለክፍላችሁ የቤት ሥራ ልኳል! |  |
| 346 | `asDetail` | {n} questions · due {date} | {n} ጥያቄዎች · እስከ {date} |  |
| 347 | `asStart` | Start assignment | ሥራውን ጀምር |  |
| 348 | `asLater` | Later | በኋላ |  |
| 349 | `asDoneTitle` | Assignment done! | የቤት ሥራው ተጠናቋል! |  |
| 350 | `asScore` | {score} of {n} on the first try | ከ{n} ውስጥ {score} በመጀመሪያ ሙከራ |  |
| 351 | `asName` | Your name (the teacher sees it) | ስምህ (መምህሩ ያየዋል) |  |
| 352 | `asSend` | Send result to teacher | ውጤቱን ለመምህር ላክ |  |
| 353 | `asShareText` | Fidel Quest homework from your teacher: | ከመምህራችሁ የFidel Quest የቤት ሥራ፦ |  |
| 354 | `asShareBack` | Fidel Quest result for {who}: | የFidel Quest ውጤት ለ{who}፦ |  |
| 355 | `tmTitle` | Teacher tools | የመምህር መሣሪያዎች |  |
| 356 | `tmSub` | Class links, assignments, results - no accounts | የክፍል ማገናኛዎች፣ ሥራዎች፣ ውጤቶች — ያለ መለያ |  |
| 357 | `tmCardBlurb` | (dynamic) | ክፍልን በማገናኛዎች ብቻ ያካሂዱ፦ ተማሪዎችን ይጋብዙ፣ ሥራ ይላኩ፣ ውጤት ይሰብስቡ፣ ፊደላቱንም በቲቪ ላይ ያሳዩ። ያለ መለያ፣ ያለ አገልጋይ። |  |
| 358 | `tmOpen` | (dynamic) | የመምህር መሣሪያዎችን ክፈት |  |
| 359 | `tmCreateTitle` | Start your class | ክፍልዎን ይጀምሩ |  |
| 360 | `tmIntro` | Run a class with links only - no accounts, no server. Students join by opening one link; results come back to you as links. | ክፍልን በማገናኛዎች ብቻ ያካሂዱ — ያለ መለያ፣ ያለ አገልጋይ። ተማሪዎች አንድ ማገናኛ በመክፈት ይቀላቀላሉ፤ ውጤቶች እንደ ማገናኛ ይመለሳሉ። |  |
| 361 | `tmYourName` | Your name (students see it) | ስምዎ (ተማሪዎች ያዩታል) |  |
| 362 | `tmClassCode` | Class code (4-12 letters or digits) | የክፍል ኮድ (4–12 ፊደላት ወይም አኃዞች) |  |
| 363 | `tmCodePh` | e.g. STMARY1 | ለምሳሌ STMARY1 |  |
| 364 | `tmCreate` | Create class | ክፍል ፍጠር |  |
| 365 | `tmInvite` | Invite students | ተማሪዎችን ይጋብዙ |  |
| 366 | `tmInviteHint` | A student opens this link (or scans the code) once - their app joins your class. Works over WhatsApp. | ተማሪው ይህን ማገናኛ አንድ ጊዜ ይከፍታል (ወይም ኮዱን ይቃኛል) — መተግበሪያው ክፍልዎን ይቀላቀላል። በWhatsApp ይሠራል። |  |
| 367 | `tmShareInvite` | Share invite link | የግብዣ ማገናኛ አጋራ |  |
| 368 | `tmNewAssign` | Extra assignment | ተጨማሪ የቤት ሥራ |  |
| 369 | `tmAssignHint` | Every student gets the same questions. When they finish, the app builds a result link they send back to you. | እያንዳንዱ ተማሪ ተመሳሳይ ጥያቄዎችን ያገኛል። ሲጨርሱ መተግበሪያው ወደ እርስዎ የሚልኩት የውጤት ማገናኛ ይሠራል። |  |
| 370 | `tmPickFamilies` | Letter families | የፊደል ቤተሰቦች |  |
| 371 | `tmQuestions` | Questions | ጥያቄዎች |  |
| 372 | `tmDue` | Due date | የመጨረሻ ቀን |  |
| 373 | `tmBuildLink` | Build the link | ማገናኛውን ሥራ |  |
| 374 | `tmMakeLink` | Share assignment link | የሥራ ማገናኛ አጋራ |  |
| 375 | `tmRoster` | Students | ተማሪዎች |  |
| 376 | `tmRosterEmpty` | No results yet. When a student finishes, they send you a result link - open it on this device and it files itself here. | ገና ውጤት የለም። ተማሪ ሲጨርስ የውጤት ማገናኛ ይልክልዎታል — በዚህ መሣሪያ ላይ ይክፈቱት እና እዚህ ይመዘገባል። |  |
| 377 | `tmBest` | best | ምርጥ |  |
| 378 | `tmReceiptFiled` | Result saved: {who} - {score} | ውጤት ተመዝግቧል፦ {who} — {score} |  |
| 379 | `tmReceiptWrongClass` | This result belongs to a class that is not on this device. | ይህ ውጤት በዚህ መሣሪያ ላይ የሌለ ክፍል ነው። |  |
| 380 | `tmRemove` | Remove class and results… | ክፍሉን እና ውጤቶቹን አስወግድ… |  |
| 381 | `tmRemoveConfirm` | Erase this class and all its results from this device? | ይህን ክፍል እና ሁሉንም ውጤቶቹን ከዚህ መሣሪያ መሰረዝ? |  |
| 382 | `tmTv` | TV display | የቲቪ ማሳያ |  |
| 383 | `tmTvHint` | Cast or plug this device into a TV: big letters and sound for the whole class, with the join code in the corner. | ይህን መሣሪያ ወደ ቲቪ ያገናኙ፦ ትልልቅ ፊደላት እና ድምፅ ለመላው ክፍል፣ የመቀላቀያ ኮድ በጥጉ ላይ። |  |
| 384 | `tmTvOpen` | Open TV display | የቲቪ ማሳያ ክፈት |  |
| 385 | `tvExit` | Exit TV display | ከቲቪ ማሳያ ውጣ |  |
| 386 | `tvPrevFamily` | Previous family | የቀደመው ቤተሰብ |  |
| 387 | `tvNextFamily` | Next family | የሚቀጥለው ቤተሰብ |  |
| 388 | `tvPause` | Pause the chant | ዝማሬውን አቁም |  |
| 389 | `tvPlay` | Play the chant | ዝማሬውን ጀምር |  |
| 390 | `tvJoin` | Scan to join the class | ክፍሉን ለመቀላቀል ይቃኙ |  |
| 391 | `tmShort` | Teacher | መምህር |  |
| 392 | `parentsShort` | Parents | ወላጆች |  |
| 393 | `tmLockTitle` | Teacher area | የመምህር ክፍል |  |
| 394 | `tmLockBody` | Enter your class code to open your class. | ክፍልዎን ለመክፈት የክፍልዎን ኮድ ያስገቡ። |  |
| 395 | `tmLockOpen` | Open | ክፈት |  |
| 396 | `tmLockWrong` | That is not the class code. | ይህ የክፍሉ ኮድ አይደለም። |  |
| 397 | `tmPlanTitle` | Term plan | የትምህርት ዘመን ዕቅድ |  |
| 398 | `tmPlanIntro` | Pick how many letter families per week and the whole term lays itself out - every week gets its TV lesson, its homework link, and its turn-in list. | በሳምንት ስንት የፊደል ቤተሰብ እንደሚማሩ ይምረጡ — ሙሉው ዘመን በራሱ ይዘረጋል፤ እያንዳንዱ ሳምንት የቲቪ ትምህርቱን፣ የቤት ሥራ ማገናኛውን እና የርክክብ ዝርዝሩን ያገኛል። |  |
| 399 | `tmPerWeek` | {n} families a week | በሳምንት {n} ቤተሰብ |  |
| 400 | `tmWeek` | Week {n} | ሳምንት {n} |  |
| 401 | `tmThisWeek` | this week | የዚህ ሳምንት |  |
| 402 | `tmDueShort` | due {date} | እስከ {date} |  |
| 403 | `tmTeach` | TV lesson | የቲቪ ትምህርት |  |
| 404 | `tmHomework` | Send homework | የቤት ሥራ ላክ |  |
| 405 | `tmShareAgain` | Share link again | ማገናኛውን እንደገና አጋራ |  |
| 406 | `tmTurnedIn` | {n} of {total} turned in | ከ{total} ውስጥ {n} አስረክበዋል |  |
| 407 | `tmMissing` | missing: {names} | ያላስረከቡ፦ {names} |  |
| 408 | `tmNoneKnown` | Waiting for the first result link | የመጀመሪያውን የውጤት ማገናኛ በመጠበቅ ላይ |  |
| 409 | `tmChangePace` | Change pace | ፍጥነት ቀይር |  |
| 410 | `tmTroubleTitle` | Class trouble letters | የክፍሉ አስቸጋሪ ፊደላት |  |
| 411 | `tmTroubleEmpty` | Nothing yet - missed letters arrive inside result links and gather here. | ገና ምንም የለም — የተሳቱ ፊደላት በውጤት ማገናኛዎች ውስጥ መጥተው እዚህ ይሰበሰባሉ። |  |
| 412 | `tmTroubleWho` | {n} misses · {names} | {n} ስህተት · {names} |  |
| 413 | `tmForms` | Letter forms | የፊደል ቅርጾች |  |
| 414 | `tmOrdersBase` | Base letters | መሠረታዊ ፊደላት |  |
| 415 | `tmOrdersAll` | All 7 forms | ሁሉም 7 ቅርጾች |  |
| 416 | `tmSent` | Sent assignments | የተላኩ ሥራዎች |  |
| 417 | `tmExtra` | Extra | ተጨማሪ |  |
| 418 | `tvChant` | Chant | ዝማሬ |  |
| 419 | `tvQuiz` | Quiz | ጥያቄ |  |
| 420 | `tvPickFamily` | (dynamic) | ወደ ቤተሰብ ዝለል |  |
| 421 | `tvSay` | Who is this? | ይህ ማን ነው? |  |
| 422 | `tvSayAfter` | Say after me | ተከትላችሁ በሉ |  |
| 423 | `tvYourTurn` | Your turn - say it! | ተራችሁ ነው — በሉ! |  |
| 424 | `tvChoose` | Choose letters | ፊደላት ምረጡ |  |
| 425 | `tvDone` | Done | ጨርስ |  |
| 426 | `tvAll` | All | ሁሉም |  |
| 427 | `tvSayAfter` | Say after me | ተከትላችሁ በሉ |  |
| 428 | `tvYourTurn` | Your turn - say it! | ተራችሁ ነው — በሉ! |  |
| 429 | `tvChoose` | Choose letters | ፊደላት ምረጡ |  |
| 430 | `tvDone` | Done | ጨርስ |  |
| 431 | `tvAll` | All | ሁሉም |  |
| 432 | `tvQuizEmpty` | (dynamic) | መጀመሪያ ዘምሩ — ጥያቄው ክፍሉ የዘመራቸውን ፊደላት ብቻ ይጠይቃል። |  |
| 433 | `tvChanted` | (dynamic) | {n} ተዘምረዋል |  |
| 434 | `tmHowTitle` | How it works | እንዴት ይሠራል |  |
| 435 | `tmHow1` | Create your class once - it lives on this phone, no account. | ክፍልዎን አንድ ጊዜ ይፍጠሩ — በዚህ ስልክ ላይ ይኖራል፣ ያለ መለያ። |  |
| 436 | `tmHow2` | Invite students: they open one link or scan the QR code. | ተማሪዎችን ይጋብዙ፦ አንድ ማገናኛ ይከፍታሉ ወይም ኮዱን ይቃኛሉ። |  |
| 437 | `tmHow3` | In class, put the letters on the TV - chant or quiz together. | በክፍል ውስጥ ፊደላቱን በቲቪ ላይ ያሳዩ — አብራችሁ ዘምሩ ወይም ተጠያየቁ። |  |
| 438 | `tmHow4` | Send the week's homework link to the family WhatsApp group. | የሳምንቱን የቤት ሥራ ማገናኛ ለቤተሰብ የWhatsApp ቡድን ይላኩ። |  |
| 439 | `tmHow5` | Results come back as links - open them here and the roster fills itself. | ውጤቶች እንደ ማገናኛ ይመለሳሉ — እዚህ ይክፈቷቸው እና መዝገቡ በራሱ ይሞላል። |  |
| 440 | `calToday` | (dynamic) | ዛሬ |  |
| 441 | `hol_enkutatash` | Enkutatash — Happy New Year! | እንቁጣጣሽ — መልካም አዲስ ዓመት! |  |
| 442 | `hol_meskel` | Meskel — the Finding of the Cross | መስቀል |  |
| 443 | `hol_genna` | Genna — Merry Christmas! | ገና — መልካም በዓል! |  |
| 444 | `hol_timkat` | Timkat — Epiphany! | ጥምቀት! |  |
| 445 | `hol_adwa` | Adwa Victory Day | የዓድዋ ድል በዓል |  |
| 446 | `hol_eritrea` | Eritrean Independence Day | የኤርትራ የነጻነት ቀን |  |
| 447 | `streakDays` | {...}-day streak | {n} ቀን ተከታታይ |  |
| 448 | `remindTitle` | Anbessa misses you! | አንበሳ ናፍቆሃል! |  |
| 449 | `remindBody` | Come learn a letter today. | ዛሬ አንድ ፊደል ና ተማር። |  |
| 450 | `remindTitleLabel` | Daily reminder | ዕለታዊ ማስታወሻ |  |
| 451 | `remindDesc` | A gentle nudge each afternoon to keep the streak going. | ተከታታይነትን ለመጠበቅ በየቀኑ ከሰዓት ትንሽ ማሳሰቢያ። |  |
| 452 | `ccTitle` | Community code | የማህበረሰብ ኮድ |  |
| 453 | `ccThanks` | Thanks — you’re supporting | እናመሰግናለን — እየደገፉ ነው |  |
| 454 | `ccChange` | Change | ቀይር |  |
| 455 | `ccBlurb` | Got a code from a church, school, or community group? Enter it so they get credit. | ከቤተ ክርስቲያን፣ ትምህርት ቤት ወይም ማህበረሰብ ቡድን ኮድ አለዎት? ክሬዲት እንዲያገኙ ያስገቡት። |  |
| 456 | `ccPh` | e.g. DEBRE | ለምሳሌ DEBRE |  |
| 457 | `ccApply` | Apply | ተግብር |  |
| 458 | `slot.hat` | (dynamic) | ኮፍያዎች |  |
| 459 | `slot.scarf` | (dynamic) | ሻርፖች |  |
| 460 | `slot.cape` | (dynamic) | ካባዎች |  |


## Tigrinya UI strings (461)
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
| 203 | `gpUnlockAll` | Open everything (for testing)… | ኩሉ ክፈት (ንፈተና)… |  |
| 204 | `gpUnlockConfirm` | Open every level, island and letter for testing? | ንፈተና ኩሉ ደረጃታት፣ ደሴታትን ፊደላትን ክኽፈቱ? |  |
| 205 | `gpUnlockYes` | Yes, open all | እወ፣ ኩሉ ክፈት |  |
| 206 | `paySupport` | Support Fidel Quest | ንፊደል ኩዌስት ደግፉ |  |
| 207 | `payTitle` | Keep learning with Fidel Quest | ትምህርቲ ይቀጽል! |  |
| 208 | `payBody` | Your {n}-day free try-out is finished. Buying the app keeps it working for your child - and keeps it growing. | ናይ {n} መዓልቲ ነጻ ፈተነኹም ወዲኡ። ነቲ መተግበሪ ምግዛእ ንውላድኩም ምስራሑን ምዕባዩን የቐጽሎ። |  |
| 209 | `payLeft` | Free try-out: {n} days left | ነጻ ፈተነ · {n} መዓልቲ ተሪፉ |  |
| 210 | `payEnded` | Your free try-out has ended. | ነጻ ፈተነኹም ወዲኡ። |  |
| 211 | `payBuy` | Buy the app | ነቲ መተግበሪ ግዝኡ |  |
| 212 | `payFamily` | Ask family to gift it | ስድራቤት ብህያብ ክገዝኡ ሕተቱ |  |
| 213 | `payFamilyHint` | No way to pay where you live? A relative anywhere in the world can gift it - share this with them. | ኣብ ቦታኹም መኽፈሊ መንገዲ እንተዘየለ፣ ኣብ ዝኾነ ቦታ ዘሎ ዘመድ ብህያብ ክገዝኣልኩም ይኽእል - ነዚ ኣካፍሉዎ። |  |
| 214 | `payShareText` | Our kids are learning the Ethiopian alphabet with Fidel Quest. Could you gift us the app? | ደቅና ብፊደል ኩዌስት ፊደል ይመሃሩ ኣለዉ። በጃኹም ነቲ መተግበሪ ብህያብ ክትገዝኡልና ትኽእሉ ዶ? |  |
| 215 | `payFeedback` | Not buying? Tell us honestly why | ኣይገዛእኩምን? ስለምንታይ ብቕንዕና ንገሩና |  |
| 216 | `payFeedbackHint` | Honest feedback earns {n} more free days. | ቅኑዕ ርእይቶ ተወሳኺ {n} ነጻ መዓልታት የውህብ። |  |
| 217 | `payFeedbackBody` | What we liked:nnWhat should be better:nnWhy we did not buy it:n | ዝፈተናዮ:\n\nክመሓየሽ ዘለዎ:\n\nዘይገዛእናሉ ምኽንያት:\n |  |
| 218 | `payFeedbackDone` | Thank you! {n} more free days added. | የቐንየልና! ተወሳኺ {n} ነጻ መዓልታት ተወሲኹ። |  |
| 219 | `payOwned` | My family already bought it | ስድራቤተይ ገዚኦሞ |  |
| 220 | `payThanks` | Thank you for supporting Fidel Quest! | ንፊደል ኩዌስት ስለ ዝደገፍኩም የቐንየልና! |  |
| 221 | `gpMoveTitle` | Move to another phone | ናብ ካልእ ስልኪ ምስግጋር |  |
| 222 | `gpMoveHint` | Save all learning progress as one small file, send it to the new phone (WhatsApp works), then load it there. | ኩሉ ናይ ትምህርቲ ኣካይዳ ከም ሓደ ንእሽቶ ፋይል ኣቐምጡ፣ ናብቲ ሓድሽ ስልኪ ስደዱዎ (ዋትስኣፕ ይሰርሕ)፣ ድሕሪኡ ኣብኡ ጽዓኑዎ። |  |
| 223 | `gpExport` | Save progress file | ፋይል ኣካይዳ ኣቐምጥ |  |
| 224 | `gpImport` | Load progress file | ፋይል ኣካይዳ ጽዓን |  |
| 225 | `swUpdate` | New version ready - tap to update | ሓድሽ ስሪት በጺሑ - ንምሕዳስ ጠውቑ |  |
| 226 | `skyMap` | Map | ካርታ |  |
| 227 | `skySession` | Session | ክፍለ ግዜ |  |
| 228 | `skyAllCleared` | All four skylands cleared — Anbessa is a Fidel Champion! | ኩለን ኣርባዕተ ደሴታት ተዛዚመን — ኣንበሳ ሻምፒዮን ፊደል እዩ! |  |
| 229 | `skyReady` | ready for Level {...}: it tests Sessions 1–{...}! | ንደረጃ {n} ድሉው፦ ንክፍለ ግዜ 1–{n} ይፍትን! |  |
| 230 | `skyLearnPrompt` | learn Session {...}'s letters to wake the tree. | ነታ ገረብ ንምንቓሕ ናይ ክፍለ ግዜ {n} ፊደላት ተመሃር። |  |
| 231 | `skyLearnBtn` | Learn Session {...} | ክፍለ ግዜ {n} ተመሃር |  |
| 232 | `skyPlayBtn` | Play Level {...} | ደረጃ {n} ተጻወት |  |
| 233 | `skyReplay` | Replay: | ደጊምካ ተጻወት፦ |  |
| 234 | `skyLearnTap` | Tap every fruit to hear its letter — | ንነፍሲ ወከፍ ፍረ ተንክፍ ፊደሉ ስማዕ — |  |
| 235 | `skyStartQuest` | Start Level {...} quest | ናይ ደረጃ {n} ጉዕዞ ጀምር |  |
| 236 | `skyListenFirst` | Listen to them all first | ኣቐዲምካ ንኹሎም ስማዕ |  |
| 237 | `skyPluck` | Pluck the fruit that says | እትብል ፍረ ቕጠፍ |  |
| 238 | `skyRight` | Yes! | እወ! |  |
| 239 | `skyWrong` | Jibby giggles — listen again for | ጅቢ ይስሕቕ — ደጊምካ ስማዕ |  |
| 240 | `skyStole` | Jibby stole {...} letters! | ጅቢ {n} ፊደላት ሰሪቑ! |  |
| 241 | `skyWinBack` | Win back the one that says | ነታ እትብል መሊስካ ስዓር |  |
| 242 | `skyRescued` | Rescued! | ደሓነ! |  |
| 243 | `skyHold` | Jibby holds on tight — listen again for | ጅቢ ኣትሪሩ ሒዙ — ደጊምካ ስማዕ |  |
| 244 | `skyCleared` | Island cleared! | ደሴት ተዛዚሙ! |  |
| 245 | `skyClearedSub` | {...} letters + 3 rescued from Jibby · | {n} ፊደላት + 3 ካብ ጅቢ ተናጊፎም · |  |
| 246 | `skyBridge` | the bridge to {...} has grown! | ናብ {place} ዝወስድ ድልድል ዓብዩ! |  |
| 247 | `skyAllFree` | every skyland is free! | ኩለን ደሴታት ናጻ ወጺአን! |  |
| 248 | `runQuit` | Quit run | ጉያ ደው ኣብል |  |
| 249 | `runMoveLeft` | Move left | ንጸጋም |  |
| 250 | `runMoveRight` | Move right | ንየማን |  |
| 251 | `runBossWin` | Anbessa’s letter power wins! | ናይ ኣንበሳ ሓይሊ ፊደል ተዓዊቱ! |  |
| 252 | `runBossAttack` | Jibby the hyena attacks! | ጅቢ የጥቅዕ ኣሎ! |  |
| 253 | `runNewBest` | New best! | ሓድሽ ዝበለጸ! |  |
| 254 | `runBest` | Best | ዝበለጸ |  |
| 255 | `fvShort` | Family Voice | ድምጺ ስድራ |  |
| 256 | `fvTitle` | Family Voice | ድምጺ ስድራ |  |
| 257 | `fvSub` | Let Anbessa speak in a loved one’s voice | ኣንበሳ ብድምጺ እትፈትዎ ሰብ ይዛረብ |  |
| 258 | `fvWhoSpeaks` | Who’s speaking? | መን ይዛረብ? |  |
| 259 | `fvDefault` | Default | ንቡር |  |
| 260 | `fvImport` | Import a voice | ድምጺ ኣእቱ |  |
| 261 | `fvNowSpeaking` | Anbessa now speaks in this voice | ኣንበሳ ሕጂ በዚ ድምጺ ይዛረብ |  |
| 262 | `fvDefaultVoice` | Back to the default voice | ናብ ንቡር ድምጺ ተመሊሱ |  |
| 263 | `fvGateIntro` | Recording is for grown-ups — it uses the microphone. | ምቕዳሕ ንወለዲ እዩ — ማይክሮፎን ይጥቀም። |  |
| 264 | `fvImported` | Voice imported! | ድምጺ ኣትዩ! |  |
| 265 | `fvImportFail` | That file isn't a Fidel Quest voice. | እዚ ፋይል ናይ ፊደል ኵዌስት ድምጺ ኣይኮነን። |  |
| 266 | `fvEmpty` | No family voices yet. Record one, or import a voice a relative sent you. | ክሳብ ሕጂ ድምጺ ስድራ የለን። ሓደ ቕዳሕ፣ ወይ ዘመድ ዝሰደደልካ ድምጺ ኣእቱ። |  |
| 267 | `fvForGrownups` | For grown-ups | ንወለዲ |  |
| 268 | `fvRecordTitle` | Record your voice | ድምጽኻ ቅዳሕ |  |
| 269 | `fvRecordBtn` | Record a new voice | ሓድሽ ድምጺ ቅዳሕ |  |
| 270 | `fvRecordBlurb` | Record the letters in your own voice, then share the file with your child by WhatsApp. A grandparent far away can record for kids here — and the other way around. | ነቶም ፊደላት ብድምጽኻ ቅዳሕ፣ ደሓር ነቲ ፋይል ብዋትስኣፕ ንውላድካ ኣካፍል። ርሑቕ ዘሎ ኣቦሓጎ ንቆልዑ ኣብዚ ክቕዳሕ ይኽእል — ብተገላቢጦውን። |  |
| 271 | `fvRecordHint` | Tap a letter to record it, tap again to stop. Tap ✓ to hear it back. | ንምቕዳሕ ፊደል ተንክፍ፣ ንምቁራጽ ከም ብሓድሽ ተንክፍ። ንምስማዕ ✓ ተንክፍ። |  |
| 272 | `fvUseVoice` | Use it here | ኣብዚ ተጠቐመሉ |  |
| 273 | `fvShare` | Share with a child | ንቆልዓ ኣካፍል |  |
| 274 | `fvNoMic` | Recording needs a microphone — use a phone or tablet. | ምቕዳሕ ማይክሮፎን የድሊ — ተሌፎን ወይ ታብለት ተጠቐም። |  |
| 275 | `fvPrivacy` | Voices stay on this device. Nothing is uploaded — a voice only travels in the file you choose to share. | ድምጽታት ኣብዚ መሳርሒ ይተርፉ። ገለ ኣይስቀልን — ድምጺ ዝጓዓዝ በቲ እተካፍሎ ፋይል ጥራይ እዩ። |  |
| 276 | `fvDelete` | Delete voice | ድምጺ ሰርዝ |  |
| 277 | `fvNameLabel` | Voice name | ስም ድምጺ |  |
| 278 | `fvNamePh` | Whose voice? e.g. Grandma | ናይ መን ድምጺ? ንኣብነት ዓባይ |  |
| 279 | `fvGreetingSlot` | Greeting | ሰላምታ |  |
| 280 | `fvGreetingShort` | Hi! | ሰላም! |  |
| 281 | `nameShort` | My Name | ስመይ |  |
| 282 | `nameTitle` | Write your name | ስምካ ጽሓፍ |  |
| 283 | `nameSub` | Spell it in Fidel, one sound at a time | ብፊደል፣ ሓደ ድምጺ ብሓደ ጽሓፎ |  |
| 284 | `nameHint` | Pick a vowel sound below, then tap letters to spell your name. | ካብ ታሕቲ ናይ ኣናባቢ ድምጺ ምረጽ፣ ደሓር ፊደላት ንኪእካ ስምካ ጽሓፍ። |  |
| 285 | `namePlay` | Hear the name | ነቲ ስም ስማዕ |  |
| 286 | `nameBackspace` | Remove last letter | ነቲ ናይ መወዳእታ ፊደል ኣጥፍእ |  |
| 287 | `nameClear` | Clear | ኣጽሪ |  |
| 288 | `nameVowel` | Vowel sound | ናይ ኣናባቢ ድምጺ |  |
| 289 | `nameLetters` | Letters | ፊደላት |  |
| 290 | `nameShare` | Share my name | ስመይ ኣካፍል |  |
| 291 | `namePrivacy` | The card is made on this device. Nothing is shared unless you tap Share. | እቲ ካርድ ኣብዚ መሳርሒ እዩ ዝስራሕ። ኣካፍል እንተዘይነኪእካ ገለ ኣይክፈልን። |  |
| 292 | `huntShort` | Daily Hunt | ናይ ዕለት ኣደና |  |
| 293 | `huntTitle` | Daily Letter Hunt | ናይ ዕለት ኣደና ፊደል |  |
| 294 | `huntSub` | Jibby hid the letters! Find them by sound | ጅቢ ነቶም ፊደላት ሓቢኡዎም! ብድምጺ ርኸብዎም |  |
| 295 | `huntFind` | Find the letter that says | ነዚ ዝብል ፊደል ርኸብ |  |
| 296 | `huntListen` | Hear the sound again | ነቲ ድምጺ ከም ብሓድሽ ስማዕ |  |
| 297 | `huntDoneTitle` | You found them all! | ንኹሎም ረኺብካዮም! |  |
| 298 | `huntTreasure` | Open the treasure | ነቲ ህያብ ክፈት |  |
| 299 | `huntTomorrow` | Come back tomorrow — Jibby will hide new letters! | ጽባሕ ተመለስ — ጅቢ ሓደስቲ ፊደላት ክሓብእ እዩ! |  |
| 300 | `huntGo` | (dynamic) | ጅቢ ናይ ሎሚ ፊደላት ሓቢኡ — ርኸብዎም! |  |
| 301 | `huntDoneChip` | (dynamic) | ንሎሚ ተወዲኡ — ጽባሕ ሓድሽ ኣደና! |  |
| 302 | `huntFoundOne` | found | ተረኺቡ |  |
| 303 | `huntHidden` | hiding letter | ሕቡእ ፊደል |  |
| 304 | `pcShort` | Postcard | ፖስትካርድ |  |
| 305 | `pcTitle` | Voice Postcard | ናይ ድምጺ ፖስትካርድ |  |
| 306 | `pcSub` | Send your voice to someone you love | ድምጽኻ ናብ እትፈትዎ ሰብ ስደድ |  |
| 307 | `pcHint` | Say “Selam!”, say your newest letters, or sing — Ayat and Abbat would love to hear you. | «ሰላም!» በል፣ ሓደስቲ ፊደላትካ በል፣ ወይ ዘምር — ዓባይን ኣቦሓጎን ክሰምዑኻ ይፈትዉ። |  |
| 308 | `pcRecord` | Record | ቅዳሕ |  |
| 309 | `pcStop` | Stop | ደው ኣብል |  |
| 310 | `pcListen` | Listen | ስማዕ |  |
| 311 | `pcRedo` | Record again | ከም ብሓድሽ ቅዳሕ |  |
| 312 | `pcSend` | Send to family | ንስድራ ስደድ |  |
| 313 | `pcSendAgain` | Send again | ከም ብሓድሽ ስደድ |  |
| 314 | `pcGateIntro` | Sending is for grown-ups — you pick who receives it. | ምስዳድ ንወለዲ እዩ — መን ከም ዝቕበል ንስኻ ምረጽ። |  |
| 315 | `pcShared` | Postcard sent! | እቲ ፖስትካርድ ተላኢኹ! |  |
| 316 | `pcSaved` | Saved! Share it anywhere. | ተዓቂቡ! ኣብ ዝኾነ ኣካፍሎ። |  |
| 317 | `pcPrivacy` | The recording stays on this device. It only travels when a grown-up sends it. | እቲ ቅዳሕ ኣብዚ መሳርሒ ይተርፍ። ወላዲ ምስ ዝሰዶ ጥራይ ይጓዓዝ። |  |
| 318 | `celebPostcard` | Send this to family! | ነዚ ንኣያይ ስደዶ! |  |
| 319 | `planTitle` | Today's plan | ናይ ሎሚ መደብ |  |
| 320 | `planWarmupStep` | (dynamic) | ምውዓይ፦ ፊደላትካ ከልስ |  |
| 321 | `planNewStep` | (dynamic) | ናይ ሎሚ ሓድሽ ደረጃ |  |
| 322 | `planNewShort` | New step | ሓድሽ ደረጃ |  |
| 323 | `planHuntStep` | (dynamic) | ናይ ዕለት ኣደና ፊደል |  |
| 324 | `planEta` | On this pace you finish the whole Fidel by {date}! | በዚ ፍጥነት ንኹሉ ፊደል ብ{date} ክትውድኦ ኢኻ! |  |
| 325 | `planMake` | Make my learning plan | መደብ ትምህርተይ ኣዳሉ |  |
| 326 | `planSetupTitle` | My learning plan | መደብ ትምህርተይ |  |
| 327 | `planSetupSub` | Pick a pace - the coach guides each day | ፍጥነት ምረጽ — እቲ ኣሰልጣኒ መዓልታዊ ይመርሓካ |  |
| 328 | `paceChill` | Chill - 1 letter family a week | ህዱእ — ኣብ ሰሙን 1 ስድራ ፊደል |  |
| 329 | `paceSteady` | Steady - 2 families a week | ንቡር — ኣብ ሰሙን 2 ስድራ |  |
| 330 | `paceZoom` | Zoom - 4 families a week | ቅልጡፍ — ኣብ ሰሙን 4 ስድራ |  |
| 331 | `planSave` | Start my plan | መደበይ ጀምር |  |
| 332 | `warmTitle` | Warm-up | ምውዓይ |  |
| 333 | `warmNudgeTitle` | Warm up first! | መጀመርታ ውዓይ! |  |
| 334 | `warmNudgeBody` | A quick review of your letters, then the game! | ቅልጡፍ ክለሳ ፊደላት፣ ደሓር እቲ ጸወታ! |  |
| 335 | `warmStart` | Start warm-up | ምውዓይ ጀምር |  |
| 336 | `warmSkip` | Play anyway | ብዝኾነ ተጻወት |  |
| 337 | `gpPlanTitle` | Learning plan | መደብ ትምህርቲ |  |
| 338 | `gpRequireWarmup` | Require warm-up before games | ቅድሚ ጸወታ ምውዓይ ግዴታ ይኹን |  |
| 339 | `gpRequireHint` | When on, the child must finish the day's review before the games open. | ምስ ዝበርህ እቲ ቆልዓ ቅድሚ ጸወታ ናይ ዕለት ክለሳ ክውድእ ኣለዎ። |  |
| 340 | `gpWarmups` | {...} warm-ups done | {n} ምውዓያት ተወዲኦም |  |
| 341 | `planAssignStep` | (dynamic) | ዕዮ መምህር — {who} |  |
| 342 | `jcTitle` | Join {who}’s class? | ናብ ክፍሊ {who} ክትጽንበር ትደሊ ዶ? |  |
| 343 | `jcBody` | Your app remembers the class on this device only. Nothing about you is sent anywhere. | እቲ መተግበሪ ነቲ ክፍሊ ኣብዚ መሳርሒ ጥራይ ይዝክሮ። ብዛዕባኻ ዋላ ሓንቲ ናብ ዝኾነ ኣይለኣኽን። |  |
| 344 | `jcJoin` | Join class | ክፍሊ ተጸንበር |  |
| 345 | `jcJoined` | You're in {who}'s class! | ኣብ ክፍሊ {who} ኣቲኻ! |  |
| 346 | `jcJoinedBody` | Assignments from your teacher will show up in your daily plan. | ዕዮታት መምህርካ ኣብ ዕለታዊ መደብካ ክርኣዩ እዮም። |  |
| 347 | `jcShareText` | Join my Fidel Quest class: | ናብ ክፍሊ Fidel Quest ናተይ ተጸንበሩ፦ |  |
| 348 | `asTitle` | Assignment | ዕዮ ገዛ |  |
| 349 | `asFrom` | {who} sent your class homework! | {who} ንክፍልኹም ዕዮ ገዛ ሰዲዱ! |  |
| 350 | `asDetail` | {n} questions · due {date} | {n} ሕቶታት · ክሳብ {date} |  |
| 351 | `asStart` | Start assignment | ዕዮ ጀምር |  |
| 352 | `asLater` | Later | ደሓር |  |
| 353 | `asDoneTitle` | Assignment done! | እቲ ዕዮ ተወዲኡ! |  |
| 354 | `asScore` | {score} of {n} on the first try | ካብ {n} {score} ብቐዳማይ ፈተነ |  |
| 355 | `asName` | Your name (the teacher sees it) | ስምካ (እቲ መምህር ይርእዮ) |  |
| 356 | `asSend` | Send result to teacher | ውጽኢት ናብ መምህር ስደድ |  |
| 357 | `asShareText` | Fidel Quest homework from your teacher: | ካብ መምህርኩም ዕዮ ገዛ Fidel Quest፦ |  |
| 358 | `asShareBack` | Fidel Quest result for {who}: | ውጽኢት Fidel Quest ን{who}፦ |  |
| 359 | `tmTitle` | Teacher tools | መሳርሒታት መምህር |  |
| 360 | `tmSub` | Class links, assignments, results - no accounts | መራኸቢታት ክፍሊ፣ ዕዮታት፣ ውጽኢታት — ብዘይ ሕሳብ |  |
| 361 | `tmCardBlurb` | (dynamic) | ክፍሊ ብመራኸቢታት ጥራይ ኣካይድ፦ ተመሃሮ ዓድም፣ ዕዮ ስደድ፣ ውጽኢት ኣክብ፣ ፊደላት ከኣ ኣብ ቲቪ ኣርኢ። ብዘይ ሕሳብ፣ ብዘይ ኣገልጋሊ። |  |
| 362 | `tmOpen` | (dynamic) | መሳርሒታት መምህር ክፈት |  |
| 363 | `tmCreateTitle` | Start your class | ክፍልኻ ጀምር |  |
| 364 | `tmIntro` | Run a class with links only - no accounts, no server. Students join by opening one link; results come back to you as links. | ክፍሊ ብመራኸቢታት ጥራይ ኣካይድ — ብዘይ ሕሳብ፣ ብዘይ ኣገልጋሊ። ተመሃሮ ሓደ መራኸቢ ብምኽፋት ይጽንበሩ፤ ውጽኢታት ከም መራኸቢ ይምለሱ። |  |
| 365 | `tmYourName` | Your name (students see it) | ስምካ (ተመሃሮ ይርእይዎ) |  |
| 366 | `tmClassCode` | Class code (4-12 letters or digits) | ኮድ ክፍሊ (4–12 ፊደላት ወይ ቁጽርታት) |  |
| 367 | `tmCodePh` | e.g. STMARY1 | ንኣብነት STMARY1 |  |
| 368 | `tmCreate` | Create class | ክፍሊ ፍጠር |  |
| 369 | `tmInvite` | Invite students | ተመሃሮ ዓድም |  |
| 370 | `tmInviteHint` | A student opens this link (or scans the code) once - their app joins your class. Works over WhatsApp. | ተመሃራይ ነዚ መራኸቢ ሓደ ግዜ ይኸፍቶ (ወይ ነቲ ኮድ ይስካን) — እቲ መተግበሪ ናብ ክፍልኻ ይጽንበር። ብWhatsApp ይሰርሕ። |  |
| 371 | `tmShareInvite` | Share invite link | መራኸቢ ዕድመ ኣካፍል |  |
| 372 | `tmNewAssign` | Extra assignment | ተወሳኺ ዕዮ ገዛ |  |
| 373 | `tmAssignHint` | Every student gets the same questions. When they finish, the app builds a result link they send back to you. | ነፍሲ ወከፍ ተመሃራይ ሓደ ዓይነት ሕቶታት ይረክብ። ምስ ወድኡ እቲ መተግበሪ ናባኻ ዝልኣኽ መራኸቢ ውጽኢት ይሃንጽ። |  |
| 374 | `tmPickFamilies` | Letter families | ስድራታት ፊደል |  |
| 375 | `tmQuestions` | Questions | ሕቶታት |  |
| 376 | `tmDue` | Due date | ናይ መወዳእታ ዕለት |  |
| 377 | `tmBuildLink` | Build the link | ነቲ መራኸቢ ስራሕ |  |
| 378 | `tmMakeLink` | Share assignment link | መራኸቢ ዕዮ ኣካፍል |  |
| 379 | `tmRoster` | Students | ተመሃሮ |  |
| 380 | `tmRosterEmpty` | No results yet. When a student finishes, they send you a result link - open it on this device and it files itself here. | ገና ውጽኢት የለን። ተመሃራይ ምስ ወድአ መራኸቢ ውጽኢት ይሰደልካ — ኣብዚ መሳርሒ ክፈቶ እሞ ኣብዚ ይምዝገብ። |  |
| 381 | `tmBest` | best | ዝበለጸ |  |
| 382 | `tmReceiptFiled` | Result saved: {who} - {score} | ውጽኢት ተመዝጊቡ፦ {who} — {score} |  |
| 383 | `tmReceiptWrongClass` | This result belongs to a class that is not on this device. | እዚ ውጽኢት ናይ ኣብዚ መሳርሒ ዘየሎ ክፍሊ እዩ። |  |
| 384 | `tmRemove` | Remove class and results… | ክፍልን ውጽኢታቱን ኣወግድ… |  |
| 385 | `tmRemoveConfirm` | Erase this class and all its results from this device? | ነዚ ክፍልን ኩሎም ውጽኢታቱን ካብዚ መሳርሒ ክድምሰሱ ዶ? |  |
| 386 | `tmTv` | TV display | መርኣዪ ቲቪ |  |
| 387 | `tmTvHint` | Cast or plug this device into a TV: big letters and sound for the whole class, with the join code in the corner. | ነዚ መሳርሒ ናብ ቲቪ ኣራኽቦ፦ ዓበይቲ ፊደላትን ድምጽን ንኹሉ ክፍሊ፣ ኮድ ምጽንባር ኣብ ኩርናዕ። |  |
| 388 | `tmTvOpen` | Open TV display | መርኣዪ ቲቪ ክፈት |  |
| 389 | `tvExit` | Exit TV display | ካብ መርኣዪ ቲቪ ውጻእ |  |
| 390 | `tvPrevFamily` | Previous family | ዝሓለፈ ስድራ |  |
| 391 | `tvNextFamily` | Next family | ዝቕጽል ስድራ |  |
| 392 | `tvPause` | Pause the chant | ነቲ ዝማሬ ደው ኣብል |  |
| 393 | `tvPlay` | Play the chant | ነቲ ዝማሬ ጀምር |  |
| 394 | `tvJoin` | Scan to join the class | ናብቲ ክፍሊ ንምጽንባር ስካን ግበር |  |
| 395 | `tmShort` | Teacher | መምህር |  |
| 396 | `parentsShort` | Parents | ወለዲ |  |
| 397 | `tmLockTitle` | Teacher area | ክፍሊ መምህር |  |
| 398 | `tmLockBody` | Enter your class code to open your class. | ክፍልኻ ንምኽፋት ኮድ ክፍልኻ ኣእቱ። |  |
| 399 | `tmLockOpen` | Open | ክፈት |  |
| 400 | `tmLockWrong` | That is not the class code. | እዚ ኮድ ናይቲ ክፍሊ ኣይኮነን። |  |
| 401 | `tmPlanTitle` | Term plan | መደብ ዘመነ ትምህርቲ |  |
| 402 | `tmPlanIntro` | Pick how many letter families per week and the whole term lays itself out - every week gets its TV lesson, its homework link, and its turn-in list. | ኣብ ሰሙን ክንደይ ስድራ ፊደል ከም ዝመሃሩ ምረጽ — ኩሉ ዘመን ባዕሉ ይዝርጋሕ፤ ነፍሲ ወከፍ ሰሙን ትምህርቲ ቲቪኡን መራኸቢ ዕዮ ገዛኡን ዝርዝር ምርካቡን ይረክብ። |  |
| 403 | `tmPerWeek` | {n} families a week | ኣብ ሰሙን {n} ስድራ |  |
| 404 | `tmWeek` | Week {n} | ሰሙን {n} |  |
| 405 | `tmThisWeek` | this week | ናይዚ ሰሙን |  |
| 406 | `tmDueShort` | due {date} | ክሳብ {date} |  |
| 407 | `tmTeach` | TV lesson | ትምህርቲ ቲቪ |  |
| 408 | `tmHomework` | Send homework | ዕዮ ገዛ ስደድ |  |
| 409 | `tmShareAgain` | Share link again | ነቲ መራኸቢ ከም ብሓድሽ ኣካፍል |  |
| 410 | `tmTurnedIn` | {n} of {total} turned in | ካብ {total} {n} ኣረኪቦም |  |
| 411 | `tmMissing` | missing: {names} | ዘየረከቡ፦ {names} |  |
| 412 | `tmNoneKnown` | Waiting for the first result link | ንመጀመርታ መራኸቢ ውጽኢት ኣብ ምጽባይ |  |
| 413 | `tmChangePace` | Change pace | ፍጥነት ቀይር |  |
| 414 | `tmTroubleTitle` | Class trouble letters | ኣጸገምቲ ፊደላት ናይቲ ክፍሊ |  |
| 415 | `tmTroubleEmpty` | Nothing yet - missed letters arrive inside result links and gather here. | ገና ዋላ ሓንቲ የለን — ዝተጋገዩ ፊደላት ኣብ ውሽጢ መራኸቢታት ውጽኢት መጺኦም ኣብዚ ይእከቡ። |  |
| 416 | `tmTroubleWho` | {n} misses · {names} | {n} ጌጋታት · {names} |  |
| 417 | `tmForms` | Letter forms | ቅርጽታት ፊደል |  |
| 418 | `tmOrdersBase` | Base letters | መሰረታውያን ፊደላት |  |
| 419 | `tmOrdersAll` | All 7 forms | ኩሎም 7 ቅርጽታት |  |
| 420 | `tmSent` | Sent assignments | ዝተላእኩ ዕዮታት |  |
| 421 | `tmExtra` | Extra | ተወሳኺ |  |
| 422 | `tvChant` | Chant | ዝማሬ |  |
| 423 | `tvQuiz` | Quiz | ሕቶ |  |
| 424 | `tvPickFamily` | (dynamic) | ናብ ስድራ ዝለል |  |
| 425 | `tvSay` | Who is this? | እዚ መን እዩ? |  |
| 426 | `tvSayAfter` | Say after me | ደድሕረይ በሉ |  |
| 427 | `tvYourTurn` | Your turn - say it! | ተራኹም እዩ — በሉ! |  |
| 428 | `tvChoose` | Choose letters | ፊደላት ምረጹ |  |
| 429 | `tvDone` | Done | ውዳእ |  |
| 430 | `tvAll` | All | ኩሎም |  |
| 431 | `tvSayAfter` | Say after me | ደድሕረይ በሉ |  |
| 432 | `tvYourTurn` | Your turn - say it! | ተራኹም እዩ — በሉ! |  |
| 433 | `tvChoose` | Choose letters | ፊደላት ምረጹ |  |
| 434 | `tvDone` | Done | ውዳእ |  |
| 435 | `tvAll` | All | ኩሎም |  |
| 436 | `tvQuizEmpty` | (dynamic) | መጀመርታ ዘምሩ — እቲ ሕቶ ነቶም ክፍሊ ዝዘመሮም ፊደላት ጥራይ ይሓትት። |  |
| 437 | `tvChanted` | (dynamic) | {n} ተዘሚሮም |  |
| 438 | `tmHowTitle` | How it works | ከመይ ይሰርሕ |  |
| 439 | `tmHow1` | Create your class once - it lives on this phone, no account. | ክፍልኻ ሓደ ግዜ ፍጠር — ኣብዚ ስልኪ ይነብር፣ ብዘይ ሕሳብ። |  |
| 440 | `tmHow2` | Invite students: they open one link or scan the QR code. | ተመሃሮ ዓድም፦ ሓደ መራኸቢ ይኸፍቱ ወይ ነቲ ኮድ ይስካኑ። |  |
| 441 | `tmHow3` | In class, put the letters on the TV - chant or quiz together. | ኣብ ክፍሊ ነቶም ፊደላት ኣብ ቲቪ ኣርኢ — ብሓባር ዘምሩ ወይ ተሓታተቱ። |  |
| 442 | `tmHow4` | Send the week's homework link to the family WhatsApp group. | መራኸቢ ዕዮ ገዛ ናይቲ ሰሙን ናብ ጉጅለ WhatsApp ስድራቤታት ስደድ። |  |
| 443 | `tmHow5` | Results come back as links - open them here and the roster fills itself. | ውጽኢታት ከም መራኸቢ ይምለሱ — ኣብዚ ክፈቶም እሞ እቲ መዝገብ ባዕሉ ይመልእ። |  |
| 444 | `calToday` | (dynamic) | ሎሚ |  |
| 445 | `hol_enkutatash` | Enkutatash — Happy New Year! | እንቋጣጣሽ — ርሑስ ሓድሽ ዓመት! |  |
| 446 | `hol_meskel` | Meskel — the Finding of the Cross | መስቀል |  |
| 447 | `hol_genna` | Genna — Merry Christmas! | ልደት — ርሑስ በዓል! |  |
| 448 | `hol_timkat` | Timkat — Epiphany! | ጥምቀት! |  |
| 449 | `hol_adwa` | Adwa Victory Day | በዓል ዓወት ዓድዋ |  |
| 450 | `hol_eritrea` | Eritrean Independence Day | መዓልቲ ናጽነት ኤርትራ |  |
| 451 | `streakDays` | {...}-day streak | {n} መዓልቲ ተኸታታሊ |  |
| 452 | `remindTitle` | Anbessa misses you! | ኣንበሳ ናፊቑካ! |  |
| 453 | `remindBody` | Come learn a letter today. | ሎሚ ሓደ ፊደል ንዓ ተመሃር። |  |
| 454 | `remindTitleLabel` | Daily reminder | ዕለታዊ መዘኻኸሪ |  |
| 455 | `remindDesc` | A gentle nudge each afternoon to keep the streak going. | ተኸታታልነትካ ንምሕላው መዓልታዊ ድሕሪ ቐትሪ ንእሽቶ መዘኻኸሪ። |  |
| 456 | `ccTitle` | Community code | ኮድ ማሕበረሰብ |  |
| 457 | `ccThanks` | Thanks — you’re supporting | የቐንየልና — ትድግፉ ኣለኹም |  |
| 458 | `ccChange` | Change | ቀይር |  |
| 459 | `ccBlurb` | Got a code from a church, school, or community group? Enter it so they get credit. | ካብ ቤተ ክርስትያን፣ ቤት ትምህርቲ ወይ ጉጅለ ማሕበረሰብ ኮድ ኣለኩም ዶ? ክሬዲት ምእንቲ ክረኽቡ ኣእትውዎ። |  |
| 460 | `ccPh` | e.g. DEBRE | ንኣብነት DEBRE |  |
| 461 | `ccApply` | Apply | ተግብር |  |


## Also worth a skim (older, separate table)
- The Classic game's Amharic/Tigrinya blocks in `src/data/fidelGameData.js`
  (UI_STRINGS.am / UI_STRINGS.ti) predate this pass.

## Audio status (for context - not part of this review)
- All 231 letters + 25 words: HUMAN recordings (no synthesized voice remains).
- Still falling back to the chime: the two words hager (ሀገር) / hamer (ሐመር)
  and the order-8 labialized bonus forms (Classic mode only). Record and drop
  them into public/audio/fidel/words/ and letters/ when convenient.
