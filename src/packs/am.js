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
    ha: {"name":"Ha","consonant":"h","nickname":"Haleta Ha","word":{"geez":"ሀገር","latin":"hager","meaning":"country","picture":"🗺️"},"words":[{"geez":"ሀገር","latin":"hager","meaning":"country","picture":"🗺️"},{"geez":"ሁለት","latin":"hulet","meaning":"two","picture":"✌️"},{"geez":"ሀሎ","latin":"halo","meaning":"hello","picture":"📞","noAudio":true},{"geez":"ሀረር","latin":"harar","meaning":"Harar","picture":"🏰","noAudio":true}]},
    le: {"name":"Le","consonant":"l","word":{"geez":"ልጅ","latin":"lij","meaning":"child","picture":"👶"},"words":[{"geez":"ልጅ","latin":"lij","meaning":"child","picture":"👶"},{"geez":"ላም","latin":"lam","meaning":"cow","picture":"🐄"},{"geez":"ሎሚ","latin":"lomi","meaning":"lime","picture":"🍋"},{"geez":"ሉል","latin":"lul","meaning":"pearl","picture":"💎","noAudio":true},{"geez":"ሌሊት","latin":"lelit","meaning":"night","picture":"🌙","noAudio":true}]},
    hha: {"name":"Hha","consonant":"h","nickname":"Hameru Hha","word":{"geez":"ሐመር","latin":"hamer","meaning":"ship","picture":"🚢"}},
    me: {"name":"Me","consonant":"m","word":{"geez":"ማር","latin":"mar","meaning":"honey","picture":"🍯"},"words":[{"geez":"ማር","latin":"mar","meaning":"honey","picture":"🍯"},{"geez":"መኪና","latin":"mekina","meaning":"car","picture":"🚗"},{"geez":"ሙዝ","latin":"muz","meaning":"banana","picture":"🍌"},{"geez":"ሜዳ","latin":"meda","meaning":"field","picture":"🏞️"},{"geez":"ምሳ","latin":"misa","meaning":"lunch","picture":"🍽️","noAudio":true},{"geez":"ማማ","latin":"mama","meaning":"mommy","picture":"👩","noAudio":true},{"geez":"ሚስማር","latin":"mismar","meaning":"nail","picture":"🔩","noAudio":true},{"geez":"መቀስ","latin":"meqes","meaning":"scissors","picture":"✂️","noAudio":true},{"geez":"መስቀል","latin":"mesqel","meaning":"cross","picture":"✝️","noAudio":true},{"geez":"ሙሽራ","latin":"mushira","meaning":"bride","picture":"👰","noAudio":true}]},
    sse: {"name":"Sse","consonant":"s","nickname":"Nigusu Sse","word":{"geez":"ሠዓሊ","latin":"seali","meaning":"painter","picture":"🎨"}},
    re: {"name":"Re","consonant":"r","word":{"geez":"ሩዝ","latin":"ruz","meaning":"rice","picture":"🍚"},"words":[{"geez":"ሩዝ","latin":"ruz","meaning":"rice","picture":"🍚"},{"geez":"ራስ","latin":"ras","meaning":"head","picture":"👤"},{"geez":"ሬዲዮ","latin":"radiyo","meaning":"radio","picture":"📻"}]},
    se: {"name":"Se","consonant":"s","nickname":"Isatu Se","word":{"geez":"ሳር","latin":"sar","meaning":"grass","picture":"🌿"},"words":[{"geez":"ሳር","latin":"sar","meaning":"grass","picture":"🌿"},{"geez":"ሰው","latin":"sew","meaning":"person","picture":"🧍"},{"geez":"ሱሪ","latin":"suri","meaning":"trousers","picture":"👖"},{"geez":"ሲኒ","latin":"sini","meaning":"cup","picture":"☕"},{"geez":"ሰላም","latin":"selam","meaning":"peace / hello","picture":"🕊️","noAudio":true},{"geez":"ሶስት","latin":"sost","meaning":"three","picture":"3️⃣","noAudio":true}]},
    she: {"name":"She","consonant":"sh","word":{"geez":"ሻይ","latin":"shai","meaning":"tea","picture":"🍵"},"words":[{"geez":"ሻይ","latin":"shai","meaning":"tea","picture":"🍵"},{"geez":"ሽንኩርት","latin":"shinkurt","meaning":"onion","picture":"🧅"},{"geez":"ሾርባ","latin":"shorba","meaning":"soup","picture":"🍲"},{"geez":"ሽሮ","latin":"shiro","meaning":"shiro stew","picture":"🥘","noAudio":true},{"geez":"ሻማ","latin":"shama","meaning":"candle","picture":"🕯️","noAudio":true},{"geez":"ሻሽ","latin":"shash","meaning":"headscarf","picture":"🧕","noAudio":true},{"geez":"ሾላ","latin":"shola","meaning":"sycamore fig","picture":"🌳","noAudio":true},{"geez":"ሸማ","latin":"shema","meaning":"shemma cloth","picture":"🧣","noAudio":true}]},
    qe: {"name":"Qe","consonant":"q","word":{"geez":"ቀይ","latin":"qey","meaning":"red","picture":"🔴"},"words":[{"geez":"ቀይ","latin":"qey","meaning":"red","picture":"🔴"},{"geez":"ቁልፍ","latin":"qulf","meaning":"key","picture":"🔑"},{"geez":"ቂጣ","latin":"qita","meaning":"flatbread","picture":"🫓"},{"geez":"ቆሎ","latin":"qolo","meaning":"roasted grain","picture":"🥜"},{"geez":"ቀለም","latin":"qelem","meaning":"color","picture":"🖍️","noAudio":true},{"geez":"ቀሚስ","latin":"qemis","meaning":"dress","picture":"👗","noAudio":true},{"geez":"ቁራ","latin":"qura","meaning":"crow","picture":"🐦","noAudio":true},{"geez":"ቅል","latin":"qil","meaning":"gourd","picture":"🎃","noAudio":true}]},
    be: {"name":"Be","consonant":"b","word":{"geez":"ቤት","latin":"biet","meaning":"house","picture":"🏠"},"words":[{"geez":"ቤት","latin":"biet","meaning":"house","picture":"🏠"},{"geez":"በለስ","latin":"beles","meaning":"fig","picture":"🍈"},{"geez":"ቡና","latin":"buna","meaning":"coffee","picture":"☕"},{"geez":"ብርቱካን","latin":"birtukan","meaning":"orange","picture":"🍊"},{"geez":"ቦርሳ","latin":"borsa","meaning":"school bag","picture":"🎒"},{"geez":"በሬ","latin":"bere","meaning":"ox","picture":"🐂","noAudio":true},{"geez":"ብር","latin":"birr","meaning":"money (birr)","picture":"💵","noAudio":true},{"geez":"በቆሎ","latin":"beqolo","meaning":"corn","picture":"🌽","noAudio":true},{"geez":"ቢራቢሮ","latin":"birabiro","meaning":"butterfly","picture":"🦋","noAudio":true},{"geez":"በሶ","latin":"beso","meaning":"besso","picture":"🥣","noAudio":true}]},
    te: {"name":"Te","consonant":"t","word":{"geez":"ተራራ","latin":"terara","meaning":"mountain","picture":"⛰️"},"words":[{"geez":"ተራራ","latin":"terara","meaning":"mountain","picture":"⛰️"},{"geez":"ቲማቲም","latin":"timatim","meaning":"tomato","picture":"🍅"},{"geez":"ትል","latin":"til","meaning":"worm","picture":"🐛"}]},
    che: {"name":"Che","consonant":"ch","word":{"geez":"ቸኮሌት","latin":"chokolet","meaning":"chocolate","picture":"🍫"},"words":[{"geez":"ቸኮሌት","latin":"chokolet","meaning":"chocolate","picture":"🍫"},{"geez":"ችግኝ","latin":"chiginy","meaning":"seedling","picture":"🌱"}]},
    kha: {"name":"Kha","consonant":"h","nickname":"Bizuhanu Kha"},
    ne: {"name":"Ne","consonant":"n","word":{"geez":"ንብ","latin":"nib","meaning":"bee","picture":"🐝"},"words":[{"geez":"ንብ","latin":"nib","meaning":"bee","picture":"🐝"},{"geez":"ነብር","latin":"nebir","meaning":"leopard","picture":"🐆"}]},
    nye: {"name":"Nye","consonant":"ny"},
    a: {"name":"A","consonant":"","nickname":"Alfau A","word":{"geez":"አሳ","latin":"asa","meaning":"fish","picture":"🐟"},"words":[{"geez":"አሳ","latin":"asa","meaning":"fish","picture":"🐟"},{"geez":"አንበሳ","latin":"anbesa","meaning":"lion","picture":"🦁"},{"geez":"ኢትዮጵያ","latin":"ityopya","meaning":"Ethiopia","picture":"🇪🇹"},{"geez":"እንቁላል","latin":"inqulal","meaning":"egg","picture":"🥚"}]},
    ke: {"name":"Ke","consonant":"k","word":{"geez":"ኮከብ","latin":"kokeb","meaning":"star","picture":"⭐"},"words":[{"geez":"ኮከብ","latin":"kokeb","meaning":"star","picture":"⭐"},{"geez":"ከረሜላ","latin":"keremela","meaning":"candy","picture":"🍬"},{"geez":"ኩባያ","latin":"kubaya","meaning":"cup","picture":"🥤"}]},
    khe: {"name":"Khe","consonant":"kh"},
    we: {"name":"We","consonant":"w","word":{"geez":"ውሻ","latin":"wisha","meaning":"dog","picture":"🐕"},"words":[{"geez":"ውሻ","latin":"wisha","meaning":"dog","picture":"🐕"},{"geez":"ወተት","latin":"wetet","meaning":"milk","picture":"🥛"},{"geez":"ወፍ","latin":"wef","meaning":"bird","picture":"🐦"}]},
    ae: {"name":"Ae","consonant":"","nickname":"Aynu Ae","word":{"geez":"ዓይን","latin":"ayin","meaning":"eye","picture":"👁️"}},
    ze: {"name":"Ze","consonant":"z","word":{"geez":"ዛፍ","latin":"zaf","meaning":"tree","picture":"🌳"},"words":[{"geez":"ዛፍ","latin":"zaf","meaning":"tree","picture":"🌳"},{"geez":"ዘንባባ","latin":"zenbaba","meaning":"palm tree","picture":"🌴"},{"geez":"ዝሆን","latin":"zihon","meaning":"elephant","picture":"🐘"}]},
    zhe: {"name":"Zhe","consonant":"zh"},
    ye: {"name":"Ye","consonant":"y"},
    de: {"name":"De","consonant":"d","word":{"geez":"ድመት","latin":"dimet","meaning":"cat","picture":"🐈"},"words":[{"geez":"ድመት","latin":"dimet","meaning":"cat","picture":"🐈"},{"geez":"ደብተር","latin":"debter","meaning":"notebook","picture":"📓"},{"geez":"ዳቦ","latin":"dabo","meaning":"bread","picture":"🍞"},{"geez":"ዶሮ","latin":"doro","meaning":"chicken","picture":"🐔"}]},
    je: {"name":"Je","consonant":"j","word":{"geez":"ጆሮ","latin":"joro","meaning":"ear","picture":"👂"},"words":[{"geez":"ጆሮ","latin":"joro","meaning":"ear","picture":"👂"},{"geez":"ጀልባ","latin":"jelba","meaning":"boat","picture":"⛵"}]},
    ge: {"name":"Ge","consonant":"g","word":{"geez":"ግመል","latin":"gimel","meaning":"camel","picture":"🐫"},"words":[{"geez":"ግመል","latin":"gimel","meaning":"camel","picture":"🐫"},{"geez":"ገንዘብ","latin":"genzeb","meaning":"money","picture":"💰"},{"geez":"ጉንዳን","latin":"gundan","meaning":"ant","picture":"🐜"}]},
    the: {"name":"The","consonant":"t'","word":{"geez":"ጥርስ","latin":"tirs","meaning":"tooth","picture":"🦷"},"words":[{"geez":"ጥርስ","latin":"tirs","meaning":"tooth","picture":"🦷"},{"geez":"ጤፍ","latin":"tef","meaning":"teff","picture":"🌾"},{"geez":"ጠርሙስ","latin":"termus","meaning":"bottle","picture":"🧴"}]},
    chhe: {"name":"Chhe","consonant":"ch'","word":{"geez":"ጨረቃ","latin":"chereqa","meaning":"moon","picture":"🌙"},"words":[{"geez":"ጨረቃ","latin":"chereqa","meaning":"moon","picture":"🌙"},{"geez":"ጨው","latin":"chew","meaning":"salt","picture":"🧂"}]},
    ppe: {"name":"Ppe","consonant":"p'"},
    tse: {"name":"Tse","consonant":"ts'","nickname":"Tselotu Tse","word":{"geez":"ጸሎት","latin":"tselot","meaning":"prayer","picture":"🙏"}},
    ttse: {"name":"Ttse","consonant":"ts'","nickname":"Tsehayu Ttse","word":{"geez":"ፀሐይ","latin":"tsehay","meaning":"sun","picture":"☀️"}},
    fe: {"name":"Fe","consonant":"f","word":{"geez":"ፈረስ","latin":"feres","meaning":"horse","picture":"🐎"},"words":[{"geez":"ፈረስ","latin":"feres","meaning":"horse","picture":"🐎"},{"geez":"ፊደል","latin":"fidel","meaning":"alphabet","picture":"🔤"},{"geez":"ፍየል","latin":"fiyel","meaning":"goat","picture":"🐐"},{"geez":"ፎቶ","latin":"foto","meaning":"photo","picture":"📷"}]},
    pe: {"name":"Pe","consonant":"p","word":{"geez":"ፓፓያ","latin":"papaya","meaning":"papaya","picture":"🥭"},"words":[{"geez":"ፓፓያ","latin":"papaya","meaning":"papaya","picture":"🥭"},{"geez":"ፖሊስ","latin":"polis","meaning":"police","picture":"👮"}]},
  },
  audioBase: '/audio/fidel/',
  manifestUrl: '/audio/fidel/manifest.json',
  // Amharic voices the 1st (ge'ez) order of the gutturals ha/hha/kha/a/ae like
  // the 4th order (the "-a" vowel): ሀ is said "ha" (like ሃ), አ is said "a".
  // Tigrinya keeps the plain 1st order, so its pack has no such remap.
  audioOverride: { orderRemap: { ids: ['ha', 'hha', 'kha', 'a', 'ae'], from: 1, to: 4 } },
})
