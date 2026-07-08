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
    ha: {"name":"Ha","consonant":"h","nickname":"Haleta Ha","word":{"geez":"ሀገር","latin":"hager","meaning":"country","picture":"🗺️","noAudio":true}},
    le: {"name":"Le","consonant":"l","word":{"geez":"ልጅ","latin":"lij","meaning":"child","picture":"👶"}},
    hha: {"name":"Hha","consonant":"h","nickname":"Hameru Hha","word":{"geez":"ሐመር","latin":"hamer","meaning":"ship","picture":"🚢","noAudio":true}},
    me: {"name":"Me","consonant":"m","word":{"geez":"ማር","latin":"mar","meaning":"honey","picture":"🍯"}},
    sse: {"name":"Sse","consonant":"s","nickname":"Nigusu Sse","word":{"geez":"ሠዓሊ","latin":"seali","meaning":"painter","picture":"🎨"}},
    re: {"name":"Re","consonant":"r","word":{"geez":"ሩዝ","latin":"ruz","meaning":"rice","picture":"🍚"}},
    se: {"name":"Se","consonant":"s","nickname":"Isatu Se","word":{"geez":"ሳር","latin":"sar","meaning":"grass","picture":"🌿"}},
    she: {"name":"She","consonant":"sh","word":{"geez":"ሻይ","latin":"shai","meaning":"tea","picture":"🍵"}},
    qe: {"name":"Qe","consonant":"q","word":{"geez":"ቀይ","latin":"qey","meaning":"red","picture":"🔴"}},
    be: {"name":"Be","consonant":"b","word":{"geez":"ቤት","latin":"biet","meaning":"house","picture":"🏠"}},
    te: {"name":"Te","consonant":"t","word":{"geez":"ተራራ","latin":"terara","meaning":"mountain","picture":"⛰️"}},
    che: {"name":"Che","consonant":"ch","word":{"geez":"ቸኮሌት","latin":"chokolet","meaning":"chocolate","picture":"🍫"}},
    kha: {"name":"Kha","consonant":"h","nickname":"Bizuhanu Kha"},
    ne: {"name":"Ne","consonant":"n","word":{"geez":"ንብ","latin":"nib","meaning":"bee","picture":"🐝"}},
    nye: {"name":"Nye","consonant":"ny"},
    a: {"name":"A","consonant":"","nickname":"Alfau A","word":{"geez":"አሳ","latin":"asa","meaning":"fish","picture":"🐟"}},
    ke: {"name":"Ke","consonant":"k","word":{"geez":"ኮከብ","latin":"kokeb","meaning":"star","picture":"⭐"}},
    khe: {"name":"Khe","consonant":"kh"},
    we: {"name":"We","consonant":"w","word":{"geez":"ውሻ","latin":"wisha","meaning":"dog","picture":"🐕"}},
    ae: {"name":"Ae","consonant":"","nickname":"Aynu Ae","word":{"geez":"ዓይን","latin":"ayin","meaning":"eye","picture":"👁️"}},
    ze: {"name":"Ze","consonant":"z","word":{"geez":"ዛፍ","latin":"zaf","meaning":"tree","picture":"🌳"}},
    zhe: {"name":"Zhe","consonant":"zh"},
    ye: {"name":"Ye","consonant":"y"},
    de: {"name":"De","consonant":"d","word":{"geez":"ድመት","latin":"dimet","meaning":"cat","picture":"🐈"}},
    je: {"name":"Je","consonant":"j","word":{"geez":"ጆሮ","latin":"joro","meaning":"ear","picture":"👂"}},
    ge: {"name":"Ge","consonant":"g","word":{"geez":"ግመል","latin":"gimel","meaning":"camel","picture":"🐫"}},
    the: {"name":"The","consonant":"t'","word":{"geez":"ጥርስ","latin":"tirs","meaning":"tooth","picture":"🦷"}},
    chhe: {"name":"Chhe","consonant":"ch'","word":{"geez":"ጨረቃ","latin":"chereqa","meaning":"moon","picture":"🌙"}},
    ppe: {"name":"Ppe","consonant":"p'"},
    tse: {"name":"Tse","consonant":"ts'","nickname":"Tselotu Tse","word":{"geez":"ጸሎት","latin":"tselot","meaning":"prayer","picture":"🙏"}},
    ttse: {"name":"Ttse","consonant":"ts'","nickname":"Tsehayu Ttse","word":{"geez":"ፀሐይ","latin":"tsehay","meaning":"sun","picture":"☀️"}},
    fe: {"name":"Fe","consonant":"f","word":{"geez":"ፈረስ","latin":"feres","meaning":"horse","picture":"🐎"}},
    pe: {"name":"Pe","consonant":"p","word":{"geez":"ፓፓያ","latin":"papaya","meaning":"papaya","picture":"🥭"}},
  },
  audioBase: '/audio/fidel/',
  manifestUrl: '/audio/fidel/manifest.json',
  // Amharic voices the 1st (ge'ez) order of the gutturals ha/hha/kha/a/ae like
  // the 4th order (the "-a" vowel): ሀ is said "ha" (like ሃ), አ is said "a".
  // Tigrinya keeps the plain 1st order, so its pack has no such remap.
  audioOverride: { orderRemap: { ids: ['ha', 'hha', 'kha', 'a', 'ae'], from: 1, to: 4 } },
})
