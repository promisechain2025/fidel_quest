/* ============================================================================
   DIASPORA UI LANGUAGES
   ----------------------------------------------------------------------------
   Extra app-text languages for the countries with the largest Ethiopian &
   Eritrean communities: English (default), Amharic, German, Italian, Swedish,
   Dutch, Norwegian, French. English is every key's fallback, so these packs
   cover the high-visibility core (navigation, buttons, feedback, celebrations,
   Fidel Master, Tee Shop) plus the full REINFORCEMENT word lists; anything a
   pack omits simply shows in English. Best-effort translations, FLAGGED FOR
   NATIVE-SPEAKER REVIEW. (Hebrew/Arabic are also big diaspora languages but are
   right-to-left and need layout work first — tracked for a later pass.)
   ========================================================================== */

// Order shown in the picker. `label` is the language's own endonym.
export const LANG_META = [
  { id: 'en', label: 'English' },
  { id: 'am', label: 'አማርኛ' },
  { id: 'de', label: 'Deutsch' },
  { id: 'it', label: 'Italiano' },
  { id: 'sv', label: 'Svenska' },
  { id: 'nl', label: 'Nederlands' },
  { id: 'no', label: 'Norsk' },
  { id: 'fr', label: 'Français' },
]
export const LANG_IDS = LANG_META.map((l) => l.id)

/* Reinforcement words spoken/shown on right (praise) and wrong (encourage)
   answers, per language. English lives here too so one helper serves both the
   main app and the Classic game. */
export const REINFORCE = {
  en: {
    praise: ['Great job!', 'Wonderful!', 'You are a star!', 'Brilliant!', 'Amazing!', 'Fantastic!', 'You did it!', 'Way to go!', 'Superb!', 'Awesome!'],
    encourage: ['Try again!', 'So close!', 'You can do it!', 'Almost!', 'Keep going!', 'Nearly there!', 'Give it another go!', 'Listen again!'],
  },
  am: {
    praise: ['ጎበዝ!', 'በጣም ጎበዝ!', 'ኮከብ ነህ!', 'ድንቅ!', 'እሰይ!', 'ግሩም!', 'አሪፍ!', 'ተባረክ!', 'ዋው!'],
    encourage: ['እንደገና ሞክር!', 'ተቃርበሃል!', 'ትችላለህ!', 'አይዞህ!', 'በርታ!', 'ደግመህ ስማ!'],
  },
  de: {
    praise: ['Super!', 'Toll gemacht!', 'Du bist ein Star!', 'Klasse!', 'Fantastisch!', 'Wunderbar!', 'Du hast es geschafft!', 'Ausgezeichnet!', 'Bravo!'],
    encourage: ['Versuch es nochmal!', 'Fast!', 'Du schaffst das!', 'Weiter so!', 'Hör nochmal zu!', 'Beinahe!'],
  },
  it: {
    praise: ['Bravo!', 'Ottimo lavoro!', 'Sei una stella!', 'Fantastico!', 'Magnifico!', 'Ce l’hai fatta!', 'Eccellente!', 'Meraviglioso!', 'Evviva!'],
    encourage: ['Riprova!', 'Quasi!', 'Ce la puoi fare!', 'Continua così!', 'Ascolta di nuovo!', 'Ci sei quasi!'],
  },
  sv: {
    praise: ['Bra jobbat!', 'Toppen!', 'Du är en stjärna!', 'Fantastiskt!', 'Underbart!', 'Du klarade det!', 'Utmärkt!', 'Superbra!', 'Hurra!'],
    encourage: ['Försök igen!', 'Nästan!', 'Du klarar det!', 'Fortsätt så!', 'Lyssna igen!', 'Du är nästan där!'],
  },
  nl: {
    praise: ['Goed gedaan!', 'Geweldig!', 'Je bent een ster!', 'Fantastisch!', 'Prachtig!', 'Het is je gelukt!', 'Uitstekend!', 'Super!', 'Hoera!'],
    encourage: ['Probeer opnieuw!', 'Bijna!', 'Jij kan het!', 'Ga zo door!', 'Luister nog eens!', 'Je bent er bijna!'],
  },
  no: {
    praise: ['Bra jobba!', 'Kjempebra!', 'Du er en stjerne!', 'Fantastisk!', 'Flott!', 'Du klarte det!', 'Utmerket!', 'Supert!', 'Hurra!'],
    encourage: ['Prøv igjen!', 'Nesten!', 'Du klarer det!', 'Fortsett sånn!', 'Hør en gang til!', 'Du er nesten der!'],
  },
  fr: {
    praise: ['Bravo !', 'Super !', 'Tu es une star !', 'Génial !', 'Fantastique !', 'Magnifique !', 'Tu as réussi !', 'Excellent !', 'Formidable !'],
    encourage: ['Essaie encore !', 'Presque !', 'Tu peux le faire !', 'Continue !', 'Écoute encore !', 'Tu y es presque !'],
  },
}

/* Core UI strings per new language. English (inline fallbacks in t() calls)
   fills every gap, so this is the frequently-seen surface, not every key. */
export const LANGPACKS = {
  de: {
    tagline: 'Lerne das Fidel-Alphabet mit Anbessa',
    playLevel: 'Spielen', backpack: 'Rucksack', home: 'Start', continue: 'Weiter', gotIt: 'Verstanden',
    nice: 'Toll!', amazing: 'Fantastisch! {n} in Folge!', notQuite: 'Nicht ganz!', tryAgain: '— hör zu und versuch es nochmal',
    yourTurn: 'Jetzt sagst du es!', levelComplete: 'Level geschafft!', playAgain: 'Nochmal spielen', listen: 'Hör zu…',
    classicTitle: 'Klassisches Spiel', classicSub: 'Reihen singen, Buchstaben nachfahren, erste Wörter lernen',
    explorerTitle: 'Buchstaben-Entdecker', explorerSub: 'Tippe eine der 231 Silben, um sie zu hören',
    grownups: 'Für Erwachsene: Fortschritt und Tipps', practiceTitle: 'Sternen-Übung',
    wordsTitle: 'Erste Wörter', wordsSub: 'Höre das Wort, tippe sein Bild', whichStart: 'Mit welchem Buchstaben beginnt es?',
    popHint: 'Zerplatze die Blase!', familyDone: 'Familie gemeistert!', traceHint: 'Hör zu und fahre den Buchstaben mit dem Finger nach',
    hearIt: 'Nochmal hören', traceClear: 'Löschen', traceCheck: 'Prüfen', start: 'Start', langText: 'App-Sprache', langLearn: 'Lernsprache',
    teeTitle: 'Anbessa T-Shirt-Shop', teeSub: 'Verdiene und trage deine Alphabet-Shirts', teeOrder: 'Echtes Shirt bestellen', teeSave: 'Design speichern',
    masterTitle: 'Fidel-Meister', masterChart: 'Tafel', masterAuto: 'Auto-Stimme', masterSay: 'Sprich', masterAbugida: 'Abugida', masterPlayAbugida: 'Ganze Abugida abspielen',
    sayGreat: 'Perfekt! ⭐', sayGood: 'Guter Versuch!', sayAgain: 'Sag es nochmal mit mir', saySayIt: 'Sprich es', sayWithMe: 'Sprich mit mir', sayListening: 'Ich höre zu…', sayScore: 'Punkte',
    closetTitle: 'Anbessas Kleiderschrank', closetSub: 'Ziehe Anbessa an und teile es!', keepGoing: 'Weiter so!',
  },
  it: {
    tagline: "Impara l'alfabeto Fidel con Anbessa",
    playLevel: 'Gioca', backpack: 'Zaino', home: 'Home', continue: 'Continua', gotIt: 'Capito',
    nice: 'Bravo!', amazing: 'Fantastico! {n} di fila!', notQuite: 'Non proprio!', tryAgain: '— ascolta e riprova',
    yourTurn: 'Ora tocca a te!', levelComplete: 'Livello completato!', playAgain: 'Gioca ancora', listen: 'Ascolta…',
    classicTitle: 'Gioco Classico', classicSub: 'Canta gli ordini, traccia le lettere, impara le prime parole',
    explorerTitle: 'Esploratore di Lettere', explorerSub: 'Tocca una delle 231 sillabe per ascoltarla',
    grownups: 'Per i grandi: progressi e consigli', practiceTitle: 'Pratica Stella',
    wordsTitle: 'Prime Parole', wordsSub: 'Ascolta la parola, tocca la sua figura', whichStart: 'Con quale lettera inizia?',
    popHint: 'Fai scoppiare la bolla!', familyDone: 'Famiglia imparata!', traceHint: 'Ascolta, poi traccia la lettera con il dito',
    hearIt: 'Ascolta ancora', traceClear: 'Cancella', traceCheck: 'Controlla', start: 'Inizia', langText: 'Lingua app', langLearn: 'Lingua da imparare',
    teeTitle: 'Negozio T-shirt Anbessa', teeSub: 'Guadagna e indossa le tue magliette dell’alfabeto', teeOrder: 'Ordina una vera maglietta', teeSave: 'Salva il disegno',
    masterTitle: 'Maestro del Fidel', masterChart: 'Tabella', masterAuto: 'Voce auto', masterSay: 'Dillo', masterAbugida: 'Abugida', masterPlayAbugida: "Riproduci tutto l'Abugida",
    sayGreat: 'Perfetto! ⭐', sayGood: 'Bel tentativo!', sayAgain: 'Dillo ancora con me', saySayIt: 'Dillo', sayWithMe: 'Dillo con me', sayListening: 'Sto ascoltando…', sayScore: 'Punti',
    closetTitle: 'Armadio di Anbessa', closetSub: 'Vesti Anbessa e condividi!', keepGoing: 'Continua così!',
  },
  sv: {
    tagline: 'Lär dig Fidel-alfabetet med Anbessa',
    playLevel: 'Spela', backpack: 'Ryggsäck', home: 'Hem', continue: 'Fortsätt', gotIt: 'Klart',
    nice: 'Bra!', amazing: 'Fantastiskt! {n} i rad!', notQuite: 'Inte riktigt!', tryAgain: '— lyssna och försök igen',
    yourTurn: 'Nu säger du det!', levelComplete: 'Nivå klar!', playAgain: 'Spela igen', listen: 'Lyssna…',
    classicTitle: 'Klassiskt spel', classicSub: 'Sjung ordningarna, spåra bokstäver, lär dig första orden',
    explorerTitle: 'Bokstavsutforskaren', explorerSub: 'Tryck på någon av de 231 stavelserna för att höra den',
    grownups: 'För vuxna: framsteg och tips', practiceTitle: 'Stjärnövning',
    wordsTitle: 'Första orden', wordsSub: 'Hör ordet, tryck på bilden', whichStart: 'Vilken bokstav börjar det med?',
    popHint: 'Poppa bubblan!', familyDone: 'Familjen klar!', traceHint: 'Lyssna och spåra bokstaven med fingret',
    hearIt: 'Hör igen', traceClear: 'Rensa', traceCheck: 'Kolla', start: 'Start', langText: 'Appspråk', langLearn: 'Språk att lära',
    teeTitle: 'Anbessas T-shirtbutik', teeSub: 'Tjäna och bär dina alfabets-t-shirtar', teeOrder: 'Beställ en riktig t-shirt', teeSave: 'Spara designen',
    masterTitle: 'Fidel-mästare', masterChart: 'Tabell', masterAuto: 'Auto-röst', masterSay: 'Säg det', masterAbugida: 'Abugida', masterPlayAbugida: 'Spela hela Abugidan',
    sayGreat: 'Perfekt! ⭐', sayGood: 'Bra försök!', sayAgain: 'Säg det igen med mig', saySayIt: 'Säg det', sayWithMe: 'Säg med mig', sayListening: 'Jag lyssnar…', sayScore: 'Poäng',
    closetTitle: 'Anbessas garderob', closetSub: 'Klä upp Anbessa och dela!', keepGoing: 'Fortsätt så!',
  },
  nl: {
    tagline: 'Leer het Fidel-alfabet met Anbessa',
    playLevel: 'Spelen', backpack: 'Rugzak', home: 'Home', continue: 'Verder', gotIt: 'Begrepen',
    nice: 'Goed zo!', amazing: 'Geweldig! {n} op een rij!', notQuite: 'Net niet!', tryAgain: '— luister en probeer opnieuw',
    yourTurn: 'Nu zeg jij het!', levelComplete: 'Level voltooid!', playAgain: 'Opnieuw spelen', listen: 'Luister…',
    classicTitle: 'Klassiek spel', classicSub: 'Zing de rijen, teken letters, leer eerste woorden',
    explorerTitle: 'Letterontdekker', explorerSub: 'Tik op een van de 231 lettergrepen om te horen',
    grownups: 'Voor volwassenen: voortgang en tips', practiceTitle: 'Steroefening',
    wordsTitle: 'Eerste woorden', wordsSub: 'Hoor het woord, tik op het plaatje', whichStart: 'Met welke letter begint het?',
    popHint: 'Prik de bel!', familyDone: 'Familie geleerd!', traceHint: 'Luister en trek de letter na met je vinger',
    hearIt: 'Nog eens horen', traceClear: 'Wissen', traceCheck: 'Check', start: 'Start', langText: 'App-taal', langLearn: 'Leertaal',
    teeTitle: 'Anbessa T-shirtwinkel', teeSub: 'Verdien en draag je alfabet-shirts', teeOrder: 'Bestel een echt shirt', teeSave: 'Ontwerp opslaan',
    masterTitle: 'Fidel-meester', masterChart: 'Tabel', masterAuto: 'Auto-stem', masterSay: 'Zeg het', masterAbugida: 'Abugida', masterPlayAbugida: 'Speel de hele Abugida',
    sayGreat: 'Perfect! ⭐', sayGood: 'Goede poging!', sayAgain: 'Zeg het nog eens met mij', saySayIt: 'Zeg het', sayWithMe: 'Zeg met mij mee', sayListening: 'Ik luister…', sayScore: 'Score',
    closetTitle: 'Anbessa’s kledingkast', closetSub: 'Kleed Anbessa aan en deel!', keepGoing: 'Ga zo door!',
  },
  no: {
    tagline: 'Lær Fidel-alfabetet med Anbessa',
    playLevel: 'Spill', backpack: 'Ryggsekk', home: 'Hjem', continue: 'Fortsett', gotIt: 'Skjønner',
    nice: 'Bra!', amazing: 'Fantastisk! {n} på rad!', notQuite: 'Ikke helt!', tryAgain: '— lytt og prøv igjen',
    yourTurn: 'Nå sier du det!', levelComplete: 'Nivå fullført!', playAgain: 'Spill igjen', listen: 'Lytt…',
    classicTitle: 'Klassisk spill', classicSub: 'Syng rekkene, tegn bokstaver, lær første ord',
    explorerTitle: 'Bokstavutforskeren', explorerSub: 'Trykk på en av de 231 stavelsene for å høre den',
    grownups: 'For voksne: fremgang og tips', practiceTitle: 'Stjerneøving',
    wordsTitle: 'Første ord', wordsSub: 'Hør ordet, trykk på bildet', whichStart: 'Hvilken bokstav begynner det med?',
    popHint: 'Sprett boblen!', familyDone: 'Familien mestret!', traceHint: 'Lytt og tegn bokstaven med fingeren',
    hearIt: 'Hør igjen', traceClear: 'Tøm', traceCheck: 'Sjekk', start: 'Start', langText: 'App-språk', langLearn: 'Språk å lære',
    teeTitle: 'Anbessas T-skjortebutikk', teeSub: 'Tjen og bruk dine alfabet-skjorter', teeOrder: 'Bestill en ekte skjorte', teeSave: 'Lagre designet',
    masterTitle: 'Fidel-mester', masterChart: 'Tabell', masterAuto: 'Auto-stemme', masterSay: 'Si det', masterAbugida: 'Abugida', masterPlayAbugida: 'Spill hele Abugidaen',
    sayGreat: 'Perfekt! ⭐', sayGood: 'Godt forsøk!', sayAgain: 'Si det igjen med meg', saySayIt: 'Si det', sayWithMe: 'Si med meg', sayListening: 'Jeg lytter…', sayScore: 'Poeng',
    closetTitle: 'Anbessas garderobe', closetSub: 'Kle på Anbessa og del!', keepGoing: 'Fortsett sånn!',
  },
  fr: {
    tagline: "Apprends l'alphabet Fidel avec Anbessa",
    playLevel: 'Jouer', backpack: 'Sac à dos', home: 'Accueil', continue: 'Continuer', gotIt: 'Compris',
    nice: 'Bravo !', amazing: 'Fantastique ! {n} d’affilée !', notQuite: 'Pas tout à fait !', tryAgain: '— écoute et réessaie',
    yourTurn: "À toi de le dire !", levelComplete: 'Niveau terminé !', playAgain: 'Rejouer', listen: 'Écoute…',
    classicTitle: 'Jeu Classique', classicSub: 'Chante les ordres, trace les lettres, apprends les premiers mots',
    explorerTitle: 'Explorateur de Lettres', explorerSub: 'Touche une des 231 syllabes pour l’entendre',
    grownups: 'Pour les grands : progrès et astuces', practiceTitle: 'Entraînement Étoile',
    wordsTitle: 'Premiers Mots', wordsSub: 'Écoute le mot, touche son image', whichStart: 'Par quelle lettre ça commence ?',
    popHint: 'Fais éclater la bulle !', familyDone: 'Famille maîtrisée !', traceHint: 'Écoute, puis trace la lettre avec ton doigt',
    hearIt: 'Réécouter', traceClear: 'Effacer', traceCheck: 'Vérifier', start: 'Départ', langText: "Langue de l'appli", langLearn: 'Langue à apprendre',
    teeTitle: 'Boutique T-shirt Anbessa', teeSub: 'Gagne et porte tes t-shirts de l’alphabet', teeOrder: 'Commander un vrai t-shirt', teeSave: 'Enregistrer le motif',
    masterTitle: 'Maître du Fidel', masterChart: 'Tableau', masterAuto: 'Voix auto', masterSay: 'Dis-le', masterAbugida: 'Abugida', masterPlayAbugida: "Lire tout l'Abugida",
    sayGreat: 'Parfait ! ⭐', sayGood: 'Bien essayé !', sayAgain: 'Répète avec moi', saySayIt: 'Dis-le', sayWithMe: 'Dis avec moi', sayListening: "J'écoute…", sayScore: 'Score',
    closetTitle: "L'armoire d'Anbessa", closetSub: 'Habille Anbessa et partage !', keepGoing: 'Continue !',
  },
}
