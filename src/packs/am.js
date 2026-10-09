/* ============================================================================
   AMHARIC LANGUAGE PACK — sounds, names, twins, words, and audio locations
   for the Ethiopic script. GENERATED from the validated
   src/data/fidelGameData.js — regenerate, never hand-edit Ethiopic strings.
   Shape contract: see validatePack in src/platform/ethiopic.js.
   ========================================================================== */

import { FIDEL_AUDIO_BASE, FIDEL_MANIFEST_URL } from '../platform/publicUrl'

export const AM_PACK = Object.freeze({
  id: 'am',
  label: 'Amharic',
  nativeName: 'አማርኛ',
  // The seven vocalized orders as taught in Ethiopian schools.
  orders: [
    { index: 1, geezName: "Ge'ez", vowel: 'a' },
    { index: 2, geezName: "Ka'ib", vowel: 'u' },
    { index: 3, geezName: 'Sals', vowel: 'ee' },
    { index: 4, geezName: "Rab'", vowel: 'aa' },
    { index: 5, geezName: 'Hams', vowel: 'e' },
    { index: 6, geezName: 'Sadis', vowel: 'ih' },
    { index: 7, geezName: "Sab'", vowel: 'o' },
  ],
  // Families that share a modern Amharic pronunciation; the first id in
  // each group is the canonical one the others are "twins of". ke (ከ, "k") and
  // khe (ኸ, the velar "kh") are NOT twins - they are distinct sounds, matching
  // how the fidel is recited and how the Tigrinya pack already models them.
  twins: [['ha', 'hha', 'kha'], ['se', 'sse'], ['a', 'ae'], ['tse', 'ttse']],
  families: {
    ha: {"name":"Ha","consonant":"h","nickname":"Haleta Ha","word":{"geez":"ሀገር","latin":"hager","meaning":"country","picture":"🗺️"},"words":[{"geez":"ሀገር","latin":"hager","meaning":"country","picture":"🗺️"},{"geez":"ሁለት","latin":"hulet","meaning":"two","picture":"✌️"},{"geez":"ሃሎ","latin":"halo","meaning":"hello","picture":"📞"},{"geez":"ሀረር","latin":"harar","meaning":"Harar","picture":"🏰"}]},
    le: {"name":"Le","consonant":"l","word":{"geez":"ልጅ","latin":"lij","meaning":"child","picture":"👶"},"words":[{"geez":"ልጅ","latin":"lij","meaning":"child","picture":"👶"},{"geez":"ላም","latin":"lam","meaning":"cow","picture":"🐄"},{"geez":"ሎሚ","latin":"lomi","meaning":"lime","picture":"🍋"},{"geez":"ሉል","latin":"lul","meaning":"pearl","picture":"💎"},{"geez":"ሌሊት","latin":"lelit","meaning":"night","picture":"🌙"}]},
    hha: {"name":"Hha","consonant":"h","nickname":"Hameru Hha","word":{"geez":"ሐመር","latin":"hamer","meaning":"ship","picture":"🚢"}},
    me: {"name":"Me","consonant":"m","word":{"geez":"ማር","latin":"mar","meaning":"honey","picture":"🍯"},"words":[{"geez":"ማር","latin":"mar","meaning":"honey","picture":"🍯"},{"geez":"መኪና","latin":"mekina","meaning":"car","picture":"🚗"},{"geez":"ሙዝ","latin":"muz","meaning":"banana","picture":"🍌"},{"geez":"ሜዳ","latin":"meda","meaning":"field","picture":"🏞️"},{"geez":"ምሳ","latin":"misa","meaning":"lunch","picture":"🍽️"},{"geez":"ማማ","latin":"mama","meaning":"mommy","picture":"👩"},{"geez":"ሚስማር","latin":"mismar","meaning":"nail","picture":"📌"},{"geez":"መቀስ","latin":"meqes","meaning":"scissors","picture":"✂️"},{"geez":"መስቀል","latin":"mesqel","meaning":"cross","picture":"✝️"},{"geez":"ሙሽራ","latin":"mushira","meaning":"bride","picture":"👰"}]},
    sse: {"name":"Sse","consonant":"s","nickname":"Nigusu Sse","word":{"geez":"ሠዓሊ","latin":"seali","meaning":"painter","picture":"🎨"},"words":[{"geez":"ሠዓሊ","latin":"seali","meaning":"painter","picture":"🎨"},{"geez":"ሥዕል","latin":"siil","meaning":"drawing","picture":"🖼️"}]},
    re: {"name":"Re","consonant":"r","word":{"geez":"ሩዝ","latin":"ruz","meaning":"rice","picture":"🍚"},"words":[{"geez":"ሩዝ","latin":"ruz","meaning":"rice","picture":"🍚"},{"geez":"ራስ","latin":"ras","meaning":"head","picture":"👤"},{"geez":"ሬዲዮ","latin":"radiyo","meaning":"radio","picture":"📻"}]},
    se: {"name":"Se","consonant":"s","nickname":"Isatu Se","word":{"geez":"ሳር","latin":"sar","meaning":"grass","picture":"🌿"},"words":[{"geez":"ሳር","latin":"sar","meaning":"grass","picture":"🌿"},{"geez":"ሰው","latin":"sew","meaning":"person","picture":"🧍"},{"geez":"ሱሪ","latin":"suri","meaning":"trousers","picture":"👖"},{"geez":"ሲኒ","latin":"sini","meaning":"cup","picture":"☕"},{"geez":"ሰላም","latin":"selam","meaning":"peace / hello","picture":"🕊️"},{"geez":"ሶስት","latin":"sost","meaning":"three","picture":"3️⃣"}]},
    she: {"name":"She","consonant":"sh","word":{"geez":"ሻይ","latin":"shai","meaning":"tea","picture":"🍵"},"words":[{"geez":"ሻይ","latin":"shai","meaning":"tea","picture":"🍵"},{"geez":"ሽንኩርት","latin":"shinkurt","meaning":"onion","picture":"🧅"},{"geez":"ሾርባ","latin":"shorba","meaning":"soup","picture":"🍲"},{"geez":"ሽሮ","latin":"shiro","meaning":"shiro stew","picture":"🥘"},{"geez":"ሻማ","latin":"shama","meaning":"candle","picture":"🕯️"},{"geez":"ሻሽ","latin":"shash","meaning":"headscarf","picture":"🧕"},{"geez":"ሾላ","latin":"shola","meaning":"sycamore fig","picture":"🌳"},{"geez":"ሸማ","latin":"shema","meaning":"shemma cloth","picture":"🧣"}]},
    qe: {"name":"Qe","consonant":"q","word":{"geez":"ቀይ","latin":"qey","meaning":"red","picture":"🔴"},"words":[{"geez":"ቀይ","latin":"qey","meaning":"red","picture":"🔴"},{"geez":"ቁልፍ","latin":"qulf","meaning":"key","picture":"🔑"},{"geez":"ቂጣ","latin":"qita","meaning":"flatbread","picture":"🫓"},{"geez":"ቆሎ","latin":"qolo","meaning":"roasted grain","picture":"🥜"},{"geez":"ቀለም","latin":"qelem","meaning":"color","picture":"🖍️"},{"geez":"ቀሚስ","latin":"qemis","meaning":"dress","picture":"👗"},{"geez":"ቁራ","latin":"qura","meaning":"crow","picture":"🐦"},{"geez":"ቅል","latin":"qil","meaning":"gourd","picture":"🎃"}]},
    be: {"name":"Be","consonant":"b","word":{"geez":"ቤት","latin":"biet","meaning":"house","picture":"🏠"},"words":[{"geez":"ቤት","latin":"biet","meaning":"house","picture":"🏠"},{"geez":"በለስ","latin":"beles","meaning":"fig","picture":"🍈"},{"geez":"ቡና","latin":"buna","meaning":"coffee","picture":"☕"},{"geez":"ብርቱካን","latin":"birtukan","meaning":"orange","picture":"🍊"},{"geez":"ቦርሳ","latin":"borsa","meaning":"school bag","picture":"🎒"},{"geez":"በሬ","latin":"bere","meaning":"ox","picture":"🐂"},{"geez":"ብር","latin":"birr","meaning":"money (birr)","picture":"💵"},{"geez":"በቆሎ","latin":"beqolo","meaning":"corn","picture":"🌽"},{"geez":"ቢራቢሮ","latin":"birabiro","meaning":"butterfly","picture":"🦋"},{"geez":"በሶ","latin":"beso","meaning":"besso","picture":"🥣"},{"geez":"ቢጫ","latin":"bicha","meaning":"yellow","picture":"🟡"}]},
    te: {"name":"Te","consonant":"t","word":{"geez":"ተራራ","latin":"terara","meaning":"mountain","picture":"⛰️"},"words":[{"geez":"ተራራ","latin":"terara","meaning":"mountain","picture":"⛰️"},{"geez":"ቲማቲም","latin":"timatim","meaning":"tomato","picture":"🍅"},{"geez":"ትል","latin":"til","meaning":"worm","picture":"🐛"}]},
    che: {"name":"Che","consonant":"ch","word":{"geez":"ቸኮሌት","latin":"chokolet","meaning":"chocolate","picture":"🍫"},"words":[{"geez":"ቸኮሌት","latin":"chokolet","meaning":"chocolate","picture":"🍫"},{"geez":"ችግኝ","latin":"chiginy","meaning":"seedling","picture":"🌱"}]},
    kha: {"name":"Kha","consonant":"h","nickname":"Bizuhanu Kha"},
    ne: {"name":"Ne","consonant":"n","word":{"geez":"ንብ","latin":"nib","meaning":"bee","picture":"🐝"},"words":[{"geez":"ንብ","latin":"nib","meaning":"bee","picture":"🐝"},{"geez":"ነብር","latin":"nebir","meaning":"leopard","picture":"🐆"},{"geez":"ነጭ","latin":"nech","meaning":"white","picture":"⚪"}]},
    nye: {"name":"Nye","consonant":"ny"},
    a: {"name":"A","consonant":"","nickname":"Alfau A","word":{"geez":"አሳ","latin":"asa","meaning":"fish","picture":"🐟"},"words":[{"geez":"አሳ","latin":"asa","meaning":"fish","picture":"🐟"},{"geez":"አንበሳ","latin":"anbesa","meaning":"lion","picture":"🦁"},{"geez":"ኢትዮጵያ","latin":"ityopya","meaning":"Ethiopia","picture":"🇪🇹"},{"geez":"እንቁላል","latin":"inqulal","meaning":"egg","picture":"🥚"},{"geez":"አራት","latin":"arat","meaning":"four","picture":"4️⃣"},{"geez":"አምስት","latin":"amist","meaning":"five","picture":"5️⃣"},{"geez":"እባብ","latin":"ibab","meaning":"snake","picture":"🐍"}]},
    ke: {"name":"Ke","consonant":"k","word":{"geez":"ኮከብ","latin":"kokeb","meaning":"star","picture":"⭐"},"words":[{"geez":"ኮከብ","latin":"kokeb","meaning":"star","picture":"⭐"},{"geez":"ከረሜላ","latin":"keremela","meaning":"candy","picture":"🍬"},{"geez":"ኩባያ","latin":"kubaya","meaning":"cup","picture":"🥤"},{"geez":"ኬክ","latin":"kek","meaning":"cake","picture":"🍰"},{"geez":"ካሮት","latin":"karot","meaning":"carrot","picture":"🥕"}]},
    khe: {"name":"Khe","consonant":"kh"},
    we: {"name":"We","consonant":"w","word":{"geez":"ውሻ","latin":"wisha","meaning":"dog","picture":"🐕"},"words":[{"geez":"ውሻ","latin":"wisha","meaning":"dog","picture":"🐕"},{"geez":"ወተት","latin":"wetet","meaning":"milk","picture":"🥛"},{"geez":"ወፍ","latin":"wef","meaning":"bird","picture":"🐦"},{"geez":"ወንበር","latin":"wenber","meaning":"chair","picture":"🪑"}]},
    ae: {"name":"Ae","consonant":"","nickname":"Aynu Ae","word":{"geez":"ዓይን","latin":"ayin","meaning":"eye","picture":"👁️"}},
    ze: {"name":"Ze","consonant":"z","word":{"geez":"ዛፍ","latin":"zaf","meaning":"tree","picture":"🌳"},"words":[{"geez":"ዛፍ","latin":"zaf","meaning":"tree","picture":"🌳"},{"geez":"ዘንባባ","latin":"zenbaba","meaning":"palm tree","picture":"🌴"},{"geez":"ዝሆን","latin":"zihon","meaning":"elephant","picture":"🐘"},{"geez":"ዝናብ","latin":"zinab","meaning":"rain","picture":"🌧️"}]},
    zhe: {"name":"Zhe","consonant":"zh","word":{"geez":"ዥዋዥዌ","latin":"zhwazhwe","meaning":"swing","picture":"🛝"}},
    ye: {"name":"Ye","consonant":"y"},
    de: {"name":"De","consonant":"d","word":{"geez":"ድመት","latin":"dimet","meaning":"cat","picture":"🐈"},"words":[{"geez":"ድመት","latin":"dimet","meaning":"cat","picture":"🐈"},{"geez":"ደብተር","latin":"debter","meaning":"notebook","picture":"📓"},{"geez":"ዳቦ","latin":"dabo","meaning":"bread","picture":"🍞"},{"geez":"ዶሮ","latin":"doro","meaning":"chicken","picture":"🐔"},{"geez":"ደመና","latin":"demena","meaning":"cloud","picture":"☁️"}]},
    je: {"name":"Je","consonant":"j","word":{"geez":"ጆሮ","latin":"joro","meaning":"ear","picture":"👂"},"words":[{"geez":"ጆሮ","latin":"joro","meaning":"ear","picture":"👂"},{"geez":"ጀልባ","latin":"jelba","meaning":"boat","picture":"⛵"},{"geez":"ጅብ","latin":"jib","meaning":"hyena","picture":"🐺"}]},
    ge: {"name":"Ge","consonant":"g","word":{"geez":"ግመል","latin":"gimel","meaning":"camel","picture":"🐫"},"words":[{"geez":"ግመል","latin":"gimel","meaning":"camel","picture":"🐫"},{"geez":"ገንዘብ","latin":"genzeb","meaning":"money","picture":"💰"},{"geez":"ጉንዳን","latin":"gundan","meaning":"ant","picture":"🐜"},{"geez":"ጎመን","latin":"gomen","meaning":"kale","picture":"🥬"},{"geez":"ገበያ","latin":"gebeya","meaning":"market","picture":"🛒"}]},
    the: {"name":"The","consonant":"t'","word":{"geez":"ጥርስ","latin":"tirs","meaning":"tooth","picture":"🦷"},"words":[{"geez":"ጥርስ","latin":"tirs","meaning":"tooth","picture":"🦷"},{"geez":"ጤፍ","latin":"tef","meaning":"teff","picture":"🌾"},{"geez":"ጠርሙስ","latin":"termus","meaning":"bottle","picture":"🧴"},{"geez":"ጣት","latin":"tat","meaning":"finger","picture":"☝️"},{"geez":"ጥቁር","latin":"tikur","meaning":"black","picture":"⚫"}]},
    chhe: {"name":"Chhe","consonant":"ch'","word":{"geez":"ጨረቃ","latin":"chereqa","meaning":"moon","picture":"🌙"},"words":[{"geez":"ጨረቃ","latin":"chereqa","meaning":"moon","picture":"🌙"},{"geez":"ጨው","latin":"chew","meaning":"salt","picture":"🧂"},{"geez":"ጫማ","latin":"chama","meaning":"shoe","picture":"👟"}]},
    ppe: {"name":"Ppe","consonant":"p'","word":{"geez":"ጳጉሜ","latin":"pagume","meaning":"Pagume (13th month)","picture":"🗓️"}},
    tse: {"name":"Tse","consonant":"ts'","nickname":"Tselotu Tse","word":{"geez":"ጸሎት","latin":"tselot","meaning":"prayer","picture":"🙏"},"words":[{"geez":"ጸሎት","latin":"tselot","meaning":"prayer","picture":"🙏"},{"geez":"ጽጌረዳ","latin":"tsigereda","meaning":"rose","picture":"🌹"}]},
    ttse: {"name":"Ttse","consonant":"ts'","nickname":"Tsehayu Ttse","word":{"geez":"ፀሐይ","latin":"tsehay","meaning":"sun","picture":"☀️"}},
    fe: {"name":"Fe","consonant":"f","word":{"geez":"ፈረስ","latin":"feres","meaning":"horse","picture":"🐎"},"words":[{"geez":"ፈረስ","latin":"feres","meaning":"horse","picture":"🐎"},{"geez":"ፊደል","latin":"fidel","meaning":"alphabet","picture":"🔤"},{"geez":"ፍየል","latin":"fiyel","meaning":"goat","picture":"🐐"},{"geez":"ፎቶ","latin":"foto","meaning":"photo","picture":"📷"}]},
    pe: {"name":"Pe","consonant":"p","word":{"geez":"ፓፓያ","latin":"papaya","meaning":"papaya","picture":"🥭"},"words":[{"geez":"ፓፓያ","latin":"papaya","meaning":"papaya","picture":"🥭"},{"geez":"ፖሊስ","latin":"polis","meaning":"police","picture":"👮"},{"geez":"ፓስታ","latin":"pasta","meaning":"pasta","picture":"🍝"}]},
  },
  audioBase: FIDEL_AUDIO_BASE,
  manifestUrl: FIDEL_MANIFEST_URL,
  // Amharic voices the 1st (ge'ez) order of the gutturals ha/hha/kha/a/ae like
  // the 4th order (the "-a" vowel): ሀ is said "ha" (like ሃ), አ is said "a".
  // Tigrinya keeps the plain 1st order, so its pack has no such remap.
  audioOverride: { orderRemap: { ids: ['ha', 'hha', 'kha', 'a', 'ae'], from: 1, to: 4 } },
  // Families whose clips are currently the SAME recording (see
  // public/audio/fidel/SOURCE.txt: "khe <- ke"). ኸ is a distinct letter, but
  // until a distinct ኸ is recorded the child cannot tell it from ከ by ear, so
  // listen-and-pick games treat them as same-sound (platform/sameSound.js).
  // Remove the entry once letters/khe-*.mp3 are re-recorded.
  audioAlias: { khe: 'ke' },
})
