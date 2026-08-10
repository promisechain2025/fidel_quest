/* ============================================================================
   GUIDES — the content someone finds before they know we exist
   ----------------------------------------------------------------------------
   The site answers "why eGeez" well and "how do I teach my child the fidel"
   not at all, so a parent searching that question finds nothing of ours.
   These are written to be useful even to someone who never installs the app;
   the app is mentioned where it is genuinely the answer and nowhere else.

   Prose lives here as data so every guide gets the same layout, the same
   heading structure, and a routeMeta entry that cannot drift from the page.
   Descriptions must be 50-160 characters - scripts/prerender.mjs fails the
   build otherwise.

   Anything factual here must be checkable against the app or against the
   script itself. No invented research, no numbers we cannot source.
   ========================================================================== */

export const GUIDES = [
  {
    slug: 'teach-amharic-at-home',
    title: 'How to teach your child Amharic at home',
    metaTitle: 'How to teach your child Amharic at home - eGeez',
    metaDescription: 'A practical week-by-week way to teach a child the Amharic fidel at home, even if you cannot read it yourself. What to do, and what to skip.',
    lede: 'You do not need a teaching degree, a curriculum, or an hour a day. You need ten minutes, an order to do things in, and a way to stop the guilt when a week goes badly.',
    sections: [
      {
        h: 'Start with the letters, not with conversation',
        p: [
          'The instinct is to start by speaking - naming objects, asking questions in Amharic, hoping it soaks in. For a child growing up outside Ethiopia it usually stalls, because the language has no other place to live. School is in another language, friends are in another language, and the child has no way to practise without you in the room.',
          'Letters are different. A letter is a small, finishable thing. A child can learn ሀ today and still know it next week without anyone to talk to. And once letters turn into words, the child can meet the language on a page, alone, at their own pace - which is the only way a language survives outside the house.',
        ],
      },
      {
        h: 'Ten minutes a day beats an hour on Sunday',
        p: [
          'Weekly hour-long sessions feel productive and teach very little. Everything learned on Sunday is gone by Wednesday, so most of the next Sunday goes on recovering it. Short daily contact is what moves letters into long-term memory, because each small session catches the letters just as they start to fade.',
          'Ten minutes is also short enough to survive a bad day. A routine that only works when everyone is cheerful is not a routine.',
        ],
      },
      {
        h: 'Listening comes before reading',
        p: [
          'The fidel is a sound system before it is a set of shapes. A child who can hear the difference between "ha" and "hu" will learn the two shapes almost by accident. A child who is shown the shapes first has to memorise 231 pictures, which is miserable and slow.',
          'So the order that works is: hear the sound, find the letter that makes it, then write it. Not the other way round.',
        ],
      },
      {
        h: 'What a week actually looks like',
        p: [
          'Two new letter families a week is a comfortable pace - that is roughly four months to the whole Amharic fidel, and it leaves room for weeks where nothing happens. One family a week is a gentle school year. Four a week is about two months and is more than most children want.',
          'Inside the week: most days are ten minutes of new letters plus a quick review of the ones going soft. One day a week, sit next to them and read something together - a word, then a sentence. That is the day they find out what the letters are for.',
        ],
      },
      {
        h: 'If you cannot read the fidel yourself',
        p: [
          'This is the most common reason parents give up before starting, and it is the least good one. You do not need to be the source of the sounds - you need to be the person who shows up. Anything that speaks the letters aloud does the teaching; your job is the ten minutes, the interest, and the "show me what you learned today".',
          'A fair number of parents end up learning the letters alongside their child, which is a better outcome than either of you doing it alone.',
        ],
      },
      {
        h: 'Four mistakes worth avoiding',
        list: [
          'Correcting every error. A child sounding out a word wrong and fixing it themselves learns more than one who is corrected on the second syllable.',
          'Racing ahead when it is going well. The week after a great week is when the earlier letters quietly disappear. Review is what makes the good week count.',
          'Starting with the tricky look-alikes. Amharic has several letters that sound alike - ሀ, ሐ and ኀ among them. Meeting them close together makes both harder; spread them out and let each one settle first.',
          'Making it a test. The moment the ten minutes feels like an exam, the child starts avoiding it, and you lose the routine that everything else depends on.',
        ],
      },
      {
        h: 'Where this app fits',
        p: [
          'eGeez is built around exactly this shape: one path with a single next step, ten minutes a day, every letter voiced so the child never waits for an adult to sound it out, and a daily warm-up that reviews whatever is fading rather than whatever comes next. A grown-ups corner tells you in plain English what was learned and what needs another look.',
          'It works offline, takes no account, and the first two letter families are free forever - enough to see whether the routine sticks in your house before deciding anything.',
        ],
      },
    ],
  },

  {
    slug: 'the-fidel-explained',
    title: 'The fidel explained: how 33 letters become 231',
    metaTitle: 'The fidel explained - how the Ge’ez script works - eGeez',
    metaDescription: 'The Ge’ez script is a syllabary, not an alphabet. What the seven vowel orders are, how to read a row, and which letters trip everyone up.',
    lede: 'Amharic and Tigrinya are written in the fidel - the Ge’ez script, said "GUH-ez". It is not an alphabet, and understanding the difference makes the whole thing much smaller than it looks.',
    sections: [
      {
        h: 'A syllabary, not an alphabet',
        p: [
          'In English a letter is a sound you combine with others: "b" plus "a" makes "ba". In the fidel, one character already is "ba". Consonant and vowel arrive together in a single shape, which is what makes it a syllabary.',
          'So there is no spelling out letter by letter the way an English-speaking child does. A child reads ba-na-na as three characters, not six.',
        ],
      },
      {
        h: 'Seven forms of every letter',
        p: [
          'Each consonant comes in seven forms, one per vowel, and they are called orders. The shapes are not random: the base form is modified in a fairly regular way to mark each vowel - a stroke added, a leg lengthened, a loop closed.',
          'That regularity is the good news. A child who learns what the fourth order does to a letter can often guess the fourth order of a letter they have never seen. The script rewards pattern-spotting rather than memorisation.',
        ],
      },
      {
        h: 'Where 231 comes from',
        p: [
          'Amharic uses 33 consonant families. Thirty-three families times seven vowel orders is 231 characters - the number that frightens people off.',
          'It should not. Nobody learns 231 unrelated things; they learn 33 families and 7 patterns. Tigrinya uses the same script with one extra family, ቐ, which is 34 families and 238 characters.',
        ],
      },
      {
        h: 'How to read a row',
        p: [
          'A fidel chart is laid out as a grid: one family per row, the seven orders across. Read a row left to right and you hear the same consonant with each vowel in turn - ha, hu, hi, ha, he, h, ho.',
          'Reading rows aloud is the single most useful drill in the whole script, because it teaches the pattern rather than the individual characters.',
        ],
        cta: { to: '/alphabet', label: 'See the full chart' },
      },
      {
        h: 'The letters that trip everyone up',
        p: [
          'Some letters sound alike in modern Amharic even though they are written differently and come from different origins - ሀ, ሐ and ኀ are the famous set, and there are others. Adults find them a spelling problem. Children find them confusing for a different reason: nothing in the sound tells them which one to pick.',
          'The practical answer is not to drill them together. Let each one settle in its own words first, so the child has a memory of where it belongs rather than a rule to apply.',
        ],
      },
      {
        h: 'The numbers are their own system',
        p: [
          'Ge’ez numerals are a separate set of characters with lines above and below - ፩ ፪ ፫ - and they still turn up on signs, in dates and in church texts. They are worth meeting eventually, but they are not part of learning to read, and mixing them into early lessons only adds load.',
        ],
      },
    ],
  },

  {
    slug: 'raising-a-fidel-reader-in-the-diaspora',
    title: 'Raising a fidel reader far from home',
    metaTitle: 'Raising a fidel reader in the diaspora - eGeez',
    metaDescription: 'Why children raised abroad understand Amharic but will not speak it, what actually helps, and how to keep the script alive without a fight.',
    lede: 'Almost every diaspora family arrives at the same place: the child understands more than they let on, answers in English, and cannot read a word. None of that is a failure of effort.',
    sections: [
      {
        h: 'Why understanding stops short of speaking',
        p: [
          'Children are ruthless about effort. If every question you ask in Amharic can be answered in English and still gets a reply, answering in English is simply cheaper, and that is what any sensible person does.',
          'This is why passive understanding is so common and so stable: the child has learned the language well enough to get by without ever having to produce it. Nothing is broken. The incentive is just pointing the wrong way.',
        ],
      },
      {
        h: 'Reading changes the incentive',
        p: [
          'A page does not accept English. If a child wants to know what a sign, a caption or a story says, the only way through is the script itself - and unlike conversation, reading can be done alone, without an adult supplying every prompt.',
          'That is why teaching the fidel is often the highest-leverage thing a diaspora family can do, even though speaking feels more urgent. It gives the language a place to live that does not depend on you being in the room.',
        ],
      },
      {
        h: 'What tends to help',
        list: [
          'One reliable ten minutes, at the same point in the day. Predictability beats intensity.',
          'A reason outside the house: a grandparent who reads a message the child wrote, a cousin to send a name to, a sign to decode on a trip.',
          'Letting the child be the expert. A child who teaches you a letter they learned that day remembers it far better than one who was tested on it.',
          'Keeping the script and the speaking separate. Progress in reading is visible and countable, which keeps morale up on the weeks when speaking goes nowhere.',
        ],
      },
      {
        h: 'What tends not to help',
        list: [
          'Guilt, on either side. A child who senses that a language is a duty will treat it as one for a long time.',
          'Waiting for the right moment - a trip home, a longer holiday, an older age. The routine is the thing, and it can start on any ordinary Tuesday.',
          'Insisting on speaking Amharic during the reading time. It turns ten easy minutes into a test of two skills at once.',
        ],
      },
      {
        h: 'A realistic picture of a year',
        p: [
          'At two letter families a week - a pace that survives holidays and bad weeks - a child gets through the Amharic fidel in about four months, and spends the rest of the year turning letters into words and words into short passages.',
          'That is not fluency, and it is not meant to be. It is a child who can pick up something written in Amharic and get somewhere with it on their own. Everything else gets easier after that.',
        ],
      },
    ],
  },
  {
    slug: 'amharic-alphabet-for-kids',
    title: 'The Amharic alphabet for kids: where to start',
    metaTitle: 'The Amharic alphabet for kids - where to start - eGeez',
    metaDescription: 'Which fidel letters to teach a child first, why whole families beat single letters, and what it means to actually know a letter.',
    lede: 'The question is never "which 231 characters" - it is "which handful first, and in what shape". Get the first fortnight right and the rest follows on its own.',
    sections: [
      {
        h: 'Teach a family, not a letter',
        p: [
          'The temptation is to teach the 33 base letters first and come back for the vowels later. It looks faster and it is a trap. The base forms alone spell almost nothing, so the child does weeks of work before a single word appears.',
          'Take one family at a time instead - ha, hu, hi, ha, he, h, ho - all seven forms together. It is more to hold in one week, but the child can read real words almost immediately, and the vowel pattern they learn on the first family transfers to every family after it.',
        ],
      },
      {
        h: 'Start in the traditional order',
        p: [
          'ሀ ለ ሐ መ ሠ ረ ሰ - the order every chart, classroom and relative already uses. There are cleverer orders you could build from letter frequency, and they cost more than they are worth: a child who learns an invented order cannot follow a wall chart, a schoolbook, or a grandparent reciting.',
          'The familiar order also means anyone in the family can help without being taught your system first.',
        ],
      },
      {
        h: 'When a child is ready',
        p: [
          'Roughly three to nine. Under three, tracing and fine motor control get in the way of the letters. Over nine, children can move faster but often want a reason - which usually means reading something they chose themselves rather than working through a chart.',
          'Readiness is not really about age: it is whether the child can sit for five to ten minutes and enjoy a small win. That is the whole requirement.',
        ],
      },
      {
        h: 'What "knowing a letter" means',
        p: [
          'There are three different things people mean, and they arrive in this order: recognising the shape when they see it, producing the sound when asked, and writing it from memory. Recognition comes quickly, recall takes longer, and writing takes longest.',
          'It is worth being explicit about which one you are asking for. A child who can point to ሀ on a chart but cannot write it has not failed - they are exactly where they should be after a week.',
        ],
        cta: { to: '/alphabet', label: 'See the full chart' },
      },
      {
        h: 'The two things that stall a start',
        list: [
          'Look-alike letters too close together. Amharic has several that sound identical - ሀ, ሐ, ኀ. Meeting them in the same fortnight makes both harder to place. Let each settle in its own words first.',
          'No review. Letters learned in week one quietly leave in week three unless something brings them back. A few minutes of revisiting old letters matters more than adding new ones.',
        ],
      },
    ],
  },

  {
    slug: 'geez-amharic-and-tigrinya',
    title: 'Ge\u2019ez, Amharic and Tigrinya: what is the difference?',
    metaTitle: 'Ge\u2019ez vs Amharic vs Tigrinya - the difference - eGeez',
    metaDescription: 'Ge\u2019ez is a script and an ancient language; Amharic and Tigrinya are separate modern languages that share it. What that means for teaching.',
    lede: 'The three names get used interchangeably and they are not interchangeable. Sorting them out takes two minutes and saves a lot of confusion later.',
    sections: [
      {
        h: 'Ge\u2019ez is two things',
        p: [
          'Ge\u2019ez is an ancient language of the Horn of Africa, still used liturgically in the Ethiopian and Eritrean Orthodox churches. Almost nobody speaks it conversationally today.',
          'It is also the name of the writing system that language produced - the script Amharic and Tigrinya are both written in. When someone says "the Ge\u2019ez script" or "the fidel", they mean the letters, not the ancient language.',
        ],
      },
      {
        h: 'Amharic and Tigrinya are different languages',
        p: [
          'They are related, and they share the script, but they are not dialects of each other and a speaker of one does not simply understand the other. Vocabulary, grammar and pronunciation all differ.',
          'The practical consequence: a child learning to read Tigrinya and a child learning to read Amharic learn nearly the same letters and almost none of the same words.',
        ],
      },
      {
        h: 'The letters they share, and the one they do not',
        p: [
          'Amharic uses 33 consonant families, each in seven vowel orders - 231 characters. Tigrinya uses the same system plus one more family, ቐ, giving 34 families and 238 characters.',
          'This is why script foundations transfer so well between the two: a child who can read the fidel for one language can already decode most of the other, even without understanding it.',
        ],
        cta: { to: '/guides/the-fidel-explained', label: 'How the script works' },
      },
      {
        h: 'Which one should we teach?',
        p: [
          'The one spoken in your family. There is no neutral or foundational choice between them - Ge\u2019ez is not a "beginner version" of either, and starting there would be like teaching a child Latin before Italian.',
          'If your household uses both, start with the one the child hears most. The script carries over, so the second language costs far less than the first.',
        ],
      },
    ],
  },

  {
    slug: 'teaching-tigrinya-to-children',
    title: 'Teaching Tigrinya to children',
    metaTitle: 'Teaching Tigrinya to children - a starting point - eGeez',
    metaDescription: 'How to start a child on Tigrinya reading: what the Ge\u2019ez script gives you free, what is language-specific, and where the gaps still are.',
    lede: 'Tigrinya-speaking families abroad face the same problem as Amharic-speaking ones, with fewer materials. The script is the part you can start on today.',
    sections: [
      {
        h: 'Start with what the script gives you',
        p: [
          'Tigrinya is written in the fidel, the same Ge\u2019ez script as Amharic, with one additional family - ቐ - making 34 families and 238 characters.',
          'That matters because letter shapes, the seven vowel orders, tracing and sound-to-symbol practice are all language-neutral. A child can begin reading work immediately, long before any Tigrinya-specific material exists.',
        ],
      },
      {
        h: 'What is language-specific, and therefore scarcer',
        p: [
          'Letter names, example words, stories and recorded audio all have to be made for Tigrinya specifically - they cannot be borrowed from Amharic. This is where the shortage of material for diaspora families really bites.',
          'It is worth knowing this before you start, so a gap in resources reads as a gap in the market rather than something you are doing wrong.',
        ],
      },
      {
        h: 'A realistic plan',
        list: [
          'Do the script daily - ten minutes, family by family, in the traditional order. This part needs nothing that does not already exist.',
          'Do the language socially - names of people and food, greetings, video calls with relatives. Keep it separate from the reading time so a hard day in one does not poison the other.',
          'Write Tigrinya words by hand as they come up. A child who has traced a word remembers the shape of it far better than one who has only seen it.',
        ],
      },
      {
        h: 'Where eGeez is, honestly',
        p: [
          'The script foundations work in Tigrinya today: the journey, the letter families including ቐ, tracing, games, review and the teacher tools all run in the Tigrinya pack.',
          'The full Tigrinya course - letter names and chants, first words, stories, native-speaker audio - is still being built, so Story Time is Amharic-only for now and the Tigrinya path simply skips it. We would rather say that than ship half-finished screens.',
        ],
        cta: { to: '/tigrinya', label: 'Tigrinya plans and waitlist' },
      },
    ],
  },
]

export const guideBySlug = (slug) => GUIDES.find((g) => g.slug === slug) || null
