/* ============================================================================
   AMHARIC LANGUAGE PACK — sounds, names, twins, words, and audio locations
   for the Ethiopic script. GENERATED from the validated
   src/data/fidelGameData.js — regenerate, never hand-edit Ethiopic strings.
   Shape contract: see validatePack in src/platform/ethiopic.js.
   ========================================================================== */

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
    ha: {"name":"Ha","consonant":"h","nickname":"Haleta Ha","word":{"geez":"ሀገር","latin":"hager","meaning":"country","picture":"🗺️","noAudio":true},"words":[{"geez":"ሀገር","latin":"hager","meaning":"country","picture":"🗺️","noAudio":true},{"geez":"ሁለት","latin":"hulet","meaning":"two","picture":"✌️","noAudio":true}]},
    le: {"name":"Le","consonant":"l","word":{"geez":"ልጅ","latin":"lij","meaning":"child","picture":"👶"},"words":[{"geez":"ልጅ","latin":"lij","meaning":"child","picture":"👶"},{"geez":"ላም","latin":"lam","meaning":"cow","picture":"🐄","noAudio":true},{"geez":"ሎሚ","latin":"lomi","meaning":"lime","picture":"🍋","noAudio":true}]},
    hha: {"name":"Hha","consonant":"h","nickname":"Hameru Hha","word":{"geez":"ሐመር","latin":"hamer","meaning":"ship","picture":"🚢","noAudio":true}},
    me: {"name":"Me","consonant":"m","word":{"geez":"ማር","latin":"mar","meaning":"honey","picture":"🍯"},"words":[{"geez":"ማር","latin":"mar","meaning":"honey","picture":"🍯"},{"geez":"መኪና","latin":"mekina","meaning":"car","picture":"🚗","noAudio":true},{"geez":"ሙዝ","latin":"muz","meaning":"banana","picture":"🍌","noAudio":true},{"geez":"ሜዳ","latin":"meda","meaning":"field","picture":"🏞️","noAudio":true}]},
    sse: {"name":"Sse","consonant":"s","nickname":"Nigusu Sse","word":{"geez":"ሠዓሊ","latin":"seali","meaning":"painter","picture":"🎨"}},
    re: {"name":"Re","consonant":"r","word":{"geez":"ሩዝ","latin":"ruz","meaning":"rice","picture":"🍚"},"words":[{"geez":"ሩዝ","latin":"ruz","meaning":"rice","picture":"🍚"},{"geez":"ራስ","latin":"ras","meaning":"head","picture":"👤","noAudio":true},{"geez":"ሬዲዮ","latin":"radiyo","meaning":"radio","picture":"📻","noAudio":true}]},
    se: {"name":"Se","consonant":"s","nickname":"Isatu Se","word":{"geez":"ሳር","latin":"sar","meaning":"grass","picture":"🌿"},"words":[{"geez":"ሳር","latin":"sar","meaning":"grass","picture":"🌿"},{"geez":"ሰው","latin":"sew","meaning":"person","picture":"🧍","noAudio":true},{"geez":"ሱሪ","latin":"suri","meaning":"trousers","picture":"👖","noAudio":true},{"geez":"ሲኒ","latin":"sini","meaning":"cup","picture":"☕","noAudio":true}]},
    she: {"name":"She","consonant":"sh","word":{"geez":"ሻይ","latin":"shai","meaning":"tea","picture":"🍵"},"words":[{"geez":"ሻይ","latin":"shai","meaning":"tea","picture":"🍵"},{"geez":"ሽንኩርት","latin":"shinkurt","meaning":"onion","picture":"🧅","noAudio":true},{"geez":"ሾርባ","latin":"shorba","meaning":"soup","picture":"🍲","noAudio":true}]},
    qe: {"name":"Qe","consonant":"q","word":{"geez":"ቀይ","latin":"qey","meaning":"red","picture":"🔴"},"words":[{"geez":"ቀይ","latin":"qey","meaning":"red","picture":"🔴"},{"geez":"ቁልፍ","latin":"qulf","meaning":"key","picture":"🔑","noAudio":true},{"geez":"ቂጣ","latin":"qita","meaning":"flatbread","picture":"🫓","noAudio":true},{"geez":"ቆሎ","latin":"qolo","meaning":"roasted grain","picture":"🥜","noAudio":true}]},
    be: {"name":"Be","consonant":"b","word":{"geez":"ቤት","latin":"biet","meaning":"house","picture":"🏠"},"words":[{"geez":"ቤት","latin":"biet","meaning":"house","picture":"🏠"},{"geez":"በለስ","latin":"beles","meaning":"fig","picture":"🍈","noAudio":true},{"geez":"ቡና","latin":"buna","meaning":"coffee","picture":"☕","noAudio":true},{"geez":"ብርቱካን","latin":"birtukan","meaning":"orange","picture":"🍊","noAudio":true},{"geez":"ቦርሳ","latin":"borsa","meaning":"school bag","picture":"🎒","noAudio":true}]},
    te: {"name":"Te","consonant":"t","word":{"geez":"ተራራ","latin":"terara","meaning":"mountain","picture":"⛰️"},"words":[{"geez":"ተራራ","latin":"terara","meaning":"mountain","picture":"⛰️"},{"geez":"ቲማቲም","latin":"timatim","meaning":"tomato","picture":"🍅","noAudio":true},{"geez":"ትል","latin":"til","meaning":"worm","picture":"🐛","noAudio":true}]},
    che: {"name":"Che","consonant":"ch","word":{"geez":"ቸኮሌት","latin":"chokolet","meaning":"chocolate","picture":"🍫"},"words":[{"geez":"ቸኮሌት","latin":"chokolet","meaning":"chocolate","picture":"🍫"},{"geez":"ችግኝ","latin":"chiginy","meaning":"seedling","picture":"🌱","noAudio":true}]},
    kha: {"name":"Kha","consonant":"h","nickname":"Bizuhanu Kha"},
    ne: {"name":"Ne","consonant":"n","word":{"geez":"ንብ","latin":"nib","meaning":"bee","picture":"🐝"},"words":[{"geez":"ንብ","latin":"nib","meaning":"bee","picture":"🐝"},{"geez":"ነብር","latin":"nebir","meaning":"leopard","picture":"🐆","noAudio":true}]},
    nye: {"name":"Nye","consonant":"ny"},
    a: {"name":"A","consonant":"","nickname":"Alfau A","word":{"geez":"አሳ","latin":"asa","meaning":"fish","picture":"🐟"},"words":[{"geez":"አሳ","latin":"asa","meaning":"fish","picture":"🐟"},{"geez":"አንበሳ","latin":"anbesa","meaning":"lion","picture":"🦁","noAudio":true},{"geez":"ኢትዮጵያ","latin":"ityopya","meaning":"Ethiopia","picture":"🇪🇹","noAudio":true},{"geez":"እንቁላል","latin":"inqulal","meaning":"egg","picture":"🥚","noAudio":true}]},
    ke: {"name":"Ke","consonant":"k","word":{"geez":"ኮከብ","latin":"kokeb","meaning":"star","picture":"⭐"},"words":[{"geez":"ኮከብ","latin":"kokeb","meaning":"star","picture":"⭐"},{"geez":"ከረሜላ","latin":"keremela","meaning":"candy","picture":"🍬","noAudio":true},{"geez":"ኩባያ","latin":"kubaya","meaning":"cup","picture":"🥤","noAudio":true}]},
    khe: {"name":"Khe","consonant":"kh"},
    we: {"name":"We","consonant":"w","word":{"geez":"ውሻ","latin":"wisha","meaning":"dog","picture":"🐕"},"words":[{"geez":"ውሻ","latin":"wisha","meaning":"dog","picture":"🐕"},{"geez":"ወተት","latin":"wetet","meaning":"milk","picture":"🥛","noAudio":true},{"geez":"ወፍ","latin":"wef","meaning":"bird","picture":"🐦","noAudio":true}]},
    ae: {"name":"Ae","consonant":"","nickname":"Aynu Ae","word":{"geez":"ዓይን","latin":"ayin","meaning":"eye","picture":"👁️"}},
    ze: {"name":"Ze","consonant":"z","word":{"geez":"ዛፍ","latin":"zaf","meaning":"tree","picture":"🌳"},"words":[{"geez":"ዛፍ","latin":"zaf","meaning":"tree","picture":"🌳"},{"geez":"ዘንባባ","latin":"zenbaba","meaning":"palm tree","picture":"🌴","noAudio":true},{"geez":"ዝሆን","latin":"zihon","meaning":"elephant","picture":"🐘","noAudio":true}]},
    zhe: {"name":"Zhe","consonant":"zh"},
    ye: {"name":"Ye","consonant":"y"},
    de: {"name":"De","consonant":"d","word":{"geez":"ድመት","latin":"dimet","meaning":"cat","picture":"🐈"},"words":[{"geez":"ድመት","latin":"dimet","meaning":"cat","picture":"🐈"},{"geez":"ደብተር","latin":"debter","meaning":"notebook","picture":"📓","noAudio":true},{"geez":"ዳቦ","latin":"dabo","meaning":"bread","picture":"🍞","noAudio":true},{"geez":"ዶሮ","latin":"doro","meaning":"chicken","picture":"🐔","noAudio":true}]},
    je: {"name":"Je","consonant":"j","word":{"geez":"ጆሮ","latin":"joro","meaning":"ear","picture":"👂"},"words":[{"geez":"ጆሮ","latin":"joro","meaning":"ear","picture":"👂"},{"geez":"ጀልባ","latin":"jelba","meaning":"boat","picture":"⛵","noAudio":true}]},
    ge: {"name":"Ge","consonant":"g","word":{"geez":"ግመል","latin":"gimel","meaning":"camel","picture":"🐫"},"words":[{"geez":"ግመል","latin":"gimel","meaning":"camel","picture":"🐫"},{"geez":"ገንዘብ","latin":"genzeb","meaning":"money","picture":"💰","noAudio":true},{"geez":"ጉንዳን","latin":"gundan","meaning":"ant","picture":"🐜","noAudio":true}]},
    the: {"name":"The","consonant":"t'","word":{"geez":"ጥርስ","latin":"tirs","meaning":"tooth","picture":"🦷"},"words":[{"geez":"ጥርስ","latin":"tirs","meaning":"tooth","picture":"🦷"},{"geez":"ጤፍ","latin":"tef","meaning":"teff","picture":"🌾","noAudio":true},{"geez":"ጠርሙስ","latin":"termus","meaning":"bottle","picture":"🧴","noAudio":true}]},
    chhe: {"name":"Chhe","consonant":"ch'","word":{"geez":"ጨረቃ","latin":"chereqa","meaning":"moon","picture":"🌙"},"words":[{"geez":"ጨረቃ","latin":"chereqa","meaning":"moon","picture":"🌙"},{"geez":"ጨው","latin":"chew","meaning":"salt","picture":"🧂","noAudio":true}]},
    ppe: {"name":"Ppe","consonant":"p'"},
    tse: {"name":"Tse","consonant":"ts'","nickname":"Tselotu Tse","word":{"geez":"ጸሎት","latin":"tselot","meaning":"prayer","picture":"🙏"}},
    ttse: {"name":"Ttse","consonant":"ts'","nickname":"Tsehayu Ttse","word":{"geez":"ፀሐይ","latin":"tsehay","meaning":"sun","picture":"☀️"}},
    fe: {"name":"Fe","consonant":"f","word":{"geez":"ፈረስ","latin":"feres","meaning":"horse","picture":"🐎"},"words":[{"geez":"ፈረስ","latin":"feres","meaning":"horse","picture":"🐎"},{"geez":"ፊደል","latin":"fidel","meaning":"alphabet","picture":"🔤","noAudio":true},{"geez":"ፍየል","latin":"fiyel","meaning":"goat","picture":"🐐","noAudio":true},{"geez":"ፎቶ","latin":"foto","meaning":"photo","picture":"📷","noAudio":true}]},
    pe: {"name":"Pe","consonant":"p","word":{"geez":"ፓፓያ","latin":"papaya","meaning":"papaya","picture":"🥭"},"words":[{"geez":"ፓፓያ","latin":"papaya","meaning":"papaya","picture":"🥭"},{"geez":"ፖሊስ","latin":"polis","meaning":"police","picture":"👮","noAudio":true}]},
  },
  audioBase: '/audio/fidel/',
  manifestUrl: '/audio/fidel/manifest.json',
  // Amharic voices the 1st (ge'ez) order of the gutturals ha/hha/kha/a/ae like
  // the 4th order (the "-a" vowel): ሀ is said "ha" (like ሃ), አ is said "a".
  // Tigrinya keeps the plain 1st order, so its pack has no such remap.
  audioOverride: { orderRemap: { ids: ['ha', 'hha', 'kha', 'a', 'ae'], from: 1, to: 4 } },
})
