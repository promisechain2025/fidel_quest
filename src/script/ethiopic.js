/* ============================================================================
   ETHIOPIC SCRIPT TABLE — language-invariant layer of the Ethiopic Engine.
   Glyphs only: which characters exist and how they group into families and
   orders. Everything language-specific (sounds, names, twins, words, UI
   copy) lives in a language pack (src/packs/*). GENERATED from the
   validated src/data/fidelGameData.js — regenerate, never hand-edit.
   Families used by only SOME languages carry `only: [packId, ...]` (e.g.
   qhe/ቐ exists in Tigrinya but not Amharic); the engine filters them per
   pack, and the codepoints are locked down by the script-table tests.
   ========================================================================== */

export const ETHIOPIC_SCRIPT = Object.freeze({
  id: 'ethi',
  orderCount: 7,
  families: Object.freeze([
    {"id":"ha","chars":"ሀሁሂሃሄህሆ"},
    {"id":"le","chars":"ለሉሊላሌልሎ","labial":"ሏ"},
    {"id":"hha","chars":"ሐሑሒሓሔሕሖ"},
    {"id":"me","chars":"መሙሚማሜምሞ","labial":"ሟ"},
    {"id":"sse","chars":"ሠሡሢሣሤሥሦ"},
    {"id":"re","chars":"ረሩሪራሬርሮ","labial":"ሯ"},
    {"id":"se","chars":"ሰሱሲሳሴስሶ","labial":"ሷ"},
    {"id":"she","chars":"ሸሹሺሻሼሽሾ","labial":"ሿ"},
    {"id":"qe","chars":"ቀቁቂቃቄቅቆ","labial":"ቋ"},
    {"id":"qhe","chars":"ቐቑቒቓቔቕቖ","labial":"ቘ","only":["ti"]},
    {"id":"be","chars":"በቡቢባቤብቦ","labial":"ቧ"},
    {"id":"te","chars":"ተቱቲታቴትቶ","labial":"ቷ"},
    {"id":"che","chars":"ቸቹቺቻቼችቾ","labial":"ቿ"},
    {"id":"kha","chars":"ኀኁኂኃኄኅኆ","labial":"ኋ"},
    {"id":"ne","chars":"ነኑኒናኔንኖ","labial":"ኗ"},
    {"id":"nye","chars":"ኘኙኚኛኜኝኞ","labial":"ኟ"},
    {"id":"a","chars":"አኡኢኣኤእኦ"},
    {"id":"ke","chars":"ከኩኪካኬክኮ","labial":"ኳ"},
    {"id":"khe","chars":"ኸኹኺኻኼኽኾ"},
    {"id":"we","chars":"ወዉዊዋዌውዎ"},
    {"id":"ae","chars":"ዐዑዒዓዔዕዖ"},
    {"id":"ze","chars":"ዘዙዚዛዜዝዞ","labial":"ዟ"},
    {"id":"zhe","chars":"ዠዡዢዣዤዥዦ"},
    {"id":"ye","chars":"የዩዪያዬይዮ"},
    {"id":"de","chars":"ደዱዲዳዴድዶ","labial":"ዷ"},
    {"id":"je","chars":"ጀጁጂጃጄጅጆ","labial":"ጇ"},
    {"id":"ge","chars":"ገጉጊጋጌግጎ","labial":"ጓ"},
    {"id":"the","chars":"ጠጡጢጣጤጥጦ","labial":"ጧ"},
    {"id":"chhe","chars":"ጨጩጪጫጬጭጮ","labial":"ጯ"},
    {"id":"ppe","chars":"ጰጱጲጳጴጵጶ"},
    {"id":"tse","chars":"ጸጹጺጻጼጽጾ","labial":"ጿ"},
    {"id":"ttse","chars":"ፀፁፂፃፄፅፆ"},
    {"id":"fe","chars":"ፈፉፊፋፌፍፎ","labial":"ፏ"},
    {"id":"pe","chars":"ፐፑፒፓፔፕፖ"},
  ]),
})
