/* ============================================================================
   UI LANGUAGE — platform layer
   ----------------------------------------------------------------------------
   Bilingual UI strings for the child-facing core (home, lessons, feedback,
   celebrations, runner HUD). English is the key's fallback; Amharic
   translations are best-effort and FLAGGED FOR NATIVE-SPEAKER REVIEW (same
   caveat as the Classic game's UI_STRINGS, several of which are reused
   here). Language choice persists and applies on reload, like packs.
   Coverage note: Skylands HUD and the Grown-Ups dashboard remain English
   for now — extend STRINGS.am before flipping them.
   ========================================================================== */

const LANG_KEY = 'fq.lang'

const STRINGS = {
  en: {},
  am: {
    tagline: 'ከአንበሳ ግልገል ጋር ፊደል ይማሩ',
    champion: 'የፊደል ጀግና — ሁሉም ኮከቦች ተገኝተዋል!',
    level: 'ደረጃ',
    playLevel: 'መጫወት',
    lockHint: 'ለመክፈት በደረጃ {n} ኮከብ ያግኙ',
    practiceTitle: 'የኮከብ ልምምድ',
    practiceSub: '{n} የሚያስቸግሩ ፊደላት ለማጠንከር',
    runnerTitle: 'የፊደል ሩጫ',
    runnerSub: 'በኢትዮጵያና በኤርትራ ውስጥ ሩጡ — አንበሳን ይመግቡ!',
    skylandsTitle: 'የፊደል ደሴቶች',
    skylandsSub: 'የ3D ደሴት ጀብዱ — ዛፉን አሳድጉ፣ ጅቢን አሸንፉ',
    classicTitle: 'የቀድሞው ጨዋታ',
    classicSub: 'ቅደም ተከተል ዘምሩ፣ ፊደል ይሳሉ፣ ቃላት ይማሩ',
    explorerTitle: 'የፊደል አሳሽ',
    explorerSub: '231 ፊደላትን ንኩና ያዳምጡ',
    grownups: 'ለወላጆች: ሂደት እና ምክሮች',
    whichLetter: 'የትኛው ፊደል',
    says: 'ይላል?',
    listen: 'ያዳምጡ…',
    nice: 'ጎበዝ!',
    amazing: 'ድንቅ! {n} በተከታታይ!',
    notQuite: 'አይደለም!',
    saysWord: 'ይላል',
    tryAgain: '— ያዳምጡና እንደገና ይሞክሩ',
    continue: 'ቀጥል',
    gotIt: 'ገባኝ',
    yourTurn: 'ተራዎ ነው!',
    levelComplete: 'ደረጃ ተጠናቀቀ!',
    practiceComplete: 'ልምምድ ተጠናቀቀ!',
    practicePraise: 'የሚያስቸግሩ ፊደላት እየጠነከሩ ነው። ኮከብ በእናንተ ኮርታለች!',
    firstTry: 'በመጀመሪያ ሙከራ',
    bestStreak: 'ምርጥ ተከታታይ',
    playAgain: 'እንደገና ተጫወት',
    steerInto: 'አንበሳን ወደዚህ ድምፅ ይንዱ',
    munched: 'ተበላ!',
    runAgain: 'እንደገና ሩጥ',
    home: 'መነሻ',
    'level-1.title': 'መጀመሪያ ፊደላት',
    'level-2.title': 'ተጨማሪ ፊደላት',
    'level-3.title': 'ደግሞ ተጨማሪ ፊደላት',
    'level-4.title': 'የመጨረሻ ፊደላት',
    'level-5.title': 'የአናባቢ አስማት',
    'level-6.title': 'ተጨማሪ የአናባቢ አስማት',
    'level-7.title': 'ጥልቅ አናባቢዎች',
    'level-8.title': 'የአናባቢ ጌታ',
    learnTitle: 'የፊደል ደረጃዎች',
    learnSub: 'እያንዳንዱን ፊደል ደረጃ በደረጃ ይማሩ',
    learnFirst: 'መጀመሪያ በፊደል ደረጃዎች እነዚህን ፊደላት ይማሩ',
    meetHint: 'ፊደሉን ንኩና ያዳምጡ',
    popHint: 'አረፋውን ያፈንዱ!',
    starHint: 'ከኮከብ ወደ ኮከብ ያንሸራትቱ',
    feedHint: 'ኮከብ የምትለውን ብስኩት ለአንበሳ ይመግቡ',
    catchHint: 'ጅቢ ብስኩቶቹን ይፈልጋል! የሚሰሙትን ይያዙ',
    slideHint: 'ጣትዎን በፊደላቱ ላይ ያንሸራትቱ',
    echoHint: 'ኮከብ ትላለች... ያንን ፊደል ይንኩ!',
    shuffleHint: 'ተቀላቅሏል! የሚሰሙትን ፊደል ያግኙ',
    familyDone: 'ቤተሰቡ ተማረ!',
    traceHint: 'ያዳምጡ፣ ከዚያ ፊደሉን በጣትዎ ይሳሉ',
    hearIt: 'እንደገና ያዳምጡ',
    traceClear: 'አጥፋ',
    traceCheck: 'ፈትሽ',
    mixDone: 'ጎበዝ ቅልቅል!',
    wordsTitle: 'መጀመሪያ ቃላት',
    wordsSub: 'ቃሉን ያዳምጡ፣ ሥዕሉን ይንኩ',
    whichStart: 'በየትኛው ፊደል ይጀምራል?',
    start: 'ጀምር',
    backpack: 'ቦርሳ',
    langLearn: 'የሚማሩት ቋንቋ',
    langText: 'የመተግበሪያ ጽሑፍ',
    teeTitle: 'የአንበሳ ሸሚዝ ሱቅ',
    teeSub: 'የፊደል ሸሚዞችን ያግኙ እና ይልበሱ',
    teeIntro: 'በያንዳንዱ ምዕራፍ አዲስ የሸሚዝ ንድፍ ያግኙ — አንበሳ ፊደልዎን ይለብሳል! ሥዕሉን ያስቀምጡ ወይም ትልቅ ሰው እውነተኛ ሸሚዝ እንዲያዝ ይጠይቁ።',
    teeUnlocked: 'ተከፍቷል!',
    teeLockedAt: '{n} ፊደላት ይማሩ',
    teeNext: 'ቀጣዩን ሸሚዝ ለመክፈት {n} ተጨማሪ ቤተሰቦችን ይማሩ!',
    teeOrder: 'እውነተኛ ሸሚዝ ያዝዙ',
    teeSave: 'ንድፉን ያስቀምጡ',
    teeSaved: 'ንድፉ ተቀምጧል! የትም ያትሙት።',
    teeOrdered: 'ሱቁ እየተከፈተ ነው — ትልቅ ሰው ይጠይቁ...',
    teeGrownup: 'ማዘዝ ሱቅ ይከፍታል — ትልቅ ሰው ይጠይቁ።',
    teeSaveHint: 'ሥዕሉን አስቀምጠው በማንኛውም ሸሚዝ ላይ ያትሙት።',
    grownupsSub: 'ሂደትና አስቸጋሪ ፊደላትን ይመልከቱ',
    closetTitle: 'የአንበሳ ቁም ሳጥን',
    closetSub: 'አንበሳን ያልብሱ፣ ያጋሩ!',
    openCloset: 'የአንበሳ ቁም ሳጥን ይክፈቱ',
    shareAnbessa: 'አንበሳን ያጋሩ',
    shareShowOff: 'ለሁሉም አሳዩ!',
    lettersLearned: '{n} / 231 ፊደላት ተማሩ',
    closetEmpty: 'ኮፍያ፣ ሻርፕና ካባ ለአንበሳ ለማግኘት ትምህርቶችን ይጨርሱ!',
    shareSaved: 'ተቀምጧል! የትም ያጋሩት።',
    shareThanks: 'ስላጋሩ እናመሰግናለን!',
    chapterDone: 'ምዕራፍ {n} ተጠናቀቀ!',
    earnedItem: 'አንበሳ {item} አገኘ!',
    keepGoing: 'ቀጥል',
    installTitle: 'አንበሳን ወደ መነሻ ማያ ገጽዎ ያክሉ',
    installCta: 'ጨምር',
    installHow: 'እንዴት?',
    installIosHint: "የማጋሪያ ቁልፍን ይንኩ፣ ከዚያ 'ወደ መነሻ ማያ ማከል' ይምረጡ",
    dismiss: 'አሁን አይደለም',
    dailyGift: 'የአንበሳን ስጦታ ይክፈቱ',
    giftTitle: 'ከአንበሳ ስጦታ!',
    giftGot: 'አዲስ {item}!',
    giftAllDone: 'ሁሉንም ሰብስበዋል - ስለተመለሱ በጣም ደስ ብሎታል!',
    'slot.hat': 'ኮፍያዎች',
    'slot.scarf': 'ሻርፖች',
    'slot.cape': 'ካባዎች',
  },
}

export function getLang() {
  try {
    const l = localStorage.getItem(LANG_KEY)
    return l === 'am' ? 'am' : 'en'
  } catch {
    return 'en'
  }
}

/** Persist and apply on next load (data is module-level by design). */
export function setLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang === 'am' ? 'am' : 'en')
  } catch {
    /* session-only */
  }
}

const ACTIVE = getLang()

/** Translate a key; `fallback` is the English inline text; {n} interpolates. */
export function t(key, fallback, vars) {
  let out = (ACTIVE !== 'en' && STRINGS[ACTIVE]?.[key]) || fallback || key
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v))
  return out
}
