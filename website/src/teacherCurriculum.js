/* ============================================================================
   TEACHER CURRICULUM - the 17-week plan on /teachers and /teachers/guide
   ----------------------------------------------------------------------------
   Two letter families a week matches Teacher Mode's term plan at "2 families
   a week", so a teacher who picks that pace in the app gets the same weeks
   (TV lesson + homework per week). The prayer track runs alongside: oral
   ጸሎት ዘዘወትር first, then one day of ውዳሴ ማርያም a week read with the marks.
   ========================================================================== */
import { FAMILIES } from './fidelData.js'

const DAYS = ['ዘሰኑይ', 'ዘሠሉስ', 'ዘረቡዕ', 'ዘሐሙስ', 'ዘዓርብ', 'ዘቀዳሚት', 'ዘእሁድ']

function prayerFor(week) {
  if (week <= 4) {
    return [
      'ጸሎት ዘዘወትር: listen and say it together, line by line (no reading yet).',
      'ጸሎት ዘዘወትር: say the first half from memory; meet the marks ተነሽ and ሰያፍ.',
      'ጸሎት ዘዘወትር: say it all together; meet ተጣይ and ወዳቂ.',
      'ጸሎት ዘዘወትር: each student leads one line; meet ተናባቢ (words read joined).',
    ][week - 1]
  }
  if (week <= 11) return `ውዳሴ ማርያም ${DAYS[week - 5]}: teacher reads with marks on, class echoes; then students read a verse each.`
  if (week <= 16) return 'Read ጸሎት ዘዘወትር from the page with marks on, then with marks off. Students name the mark on chosen words.'
  return 'Celebration: each student reads one ውዳሴ ማርያም day aloud for parents.'
}

function readingFor(week) {
  if (week <= 2) return 'Sounds only: say each letter in all 7 forms; find them on the chant board.'
  if (week <= 6) return 'Read 2-letter syllables and the first words built from this week’s letters.'
  if (week <= 12) return 'Read short words and names; Amharic classes can read along in Story Time.'
  return 'Read short sentences and one prayer line a day; students read to each other in breakout rooms.'
}

/** 17 weeks: two families each (the last week is ፐ plus review). */
export const WEEKS = Array.from({ length: Math.ceil(FAMILIES.length / 2) }, (_, i) => {
  const fams = FAMILIES.slice(i * 2, i * 2 + 2)
  return {
    week: i + 1,
    letters: fams.map((f) => f.chars[0]).join(' '),
    rows: fams.map((f) => f.chars).join(' · '),
    words: fams.map((f) => f.word?.geez).filter(Boolean).join(', '),
    reading: readingFor(i + 1),
    prayer: prayerFor(i + 1),
  }
})

/** A 60-minute live video lesson (Zoom or Meet). */
export const LESSON_PLAN = [
  ['5 min', 'Welcome and prayer', 'Open with ጸሎት ዘዘወትር said together. Take attendance from the roster.'],
  ['10 min', 'Review', 'Share your screen with the TV lesson board on last week’s letters in Quiz mode. Students answer by number.'],
  ['15 min', 'New letters', 'TV lesson board on this week’s two families in Chant mode with “Say after me”. Then students write each form on paper and hold it up to the camera.'],
  ['10 min', 'Words and reading', 'Read this week’s words together. Call on students one by one; note who struggles.'],
  ['15 min', 'ጸሎት / ውዳሴ ማርያም', 'Open the prayer book in the app, share your screen, turn the reading marks on, and read with the class (see the week’s prayer line).'],
  ['5 min', 'Homework', 'Tap “Send homework” on this week’s row in Teacher Mode and paste the link in the class WhatsApp/Telegram group. Due before next class.'],
]

/* Amharic name, Tigrinya name. Descriptions are left to the teacher on
   purpose: [CONFIRM] one-line explanations from the owner before adding. */
export const MARKS = [
  ['ተነሽ', 'ተለዓሊ'],
  ['ተጣይ', 'ተዋሓጢ'],
  ['ሰያፍ', 'ሰያፍ'],
  ['ወዳቂ', 'ወዳቂ'],
  ['ተናባቢ', 'ተናባቢ'],
]
