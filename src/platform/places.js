/* ============================================================================
   PLACES — the journey's geography, unique to the language being learned
   ----------------------------------------------------------------------------
   An Amharic learner travels Ethiopia (Lalibela, Simien, Gondar, Bahir
   Dar...); a Tigrinya learner travels Eritrea plus Axum in Tigray (Asmara,
   Keren, Massawa, Dahlak...). One module owns the lists so the chapter
   bands (home path), the 3D Runner levels, and the Skylands islands all
   tell the same journey - and a new pack only edits here.

   `builder`/`landmark` reference the procedural scenery that already
   exists (Runner chunk builders, Skylands landmark kinds); several places
   can share a builder - the SIGN says where you are, the low-poly scenery
   only has to rhyme with it.
   ========================================================================== */
import { getActivePackId } from './ethiopic'

/* Chapter bands on the home path: 4 letter chapters + the vowel lap. */
const CHAPTERS = {
  am: ['Lalibela', 'Aksum', 'Simien', 'Gondar', 'Vowel Skies'],
  ti: ['Axum', 'Asmara', 'Keren', 'Massawa', 'Vowel Skies'],
}

/* Letter Runner levels: name + country + palette + scenery builder. */
const RUNNER = {
  am: [
    { id: 'lalibela', name: 'Lalibela', country: 'Ethiopia', sky: 0x9cc9e8, ground: 0x96653f, fog: [45, 170], builder: 'lalibela' },
    { id: 'aksum', name: 'Aksum', country: 'Ethiopia', sky: 0xaed4ea, ground: 0xb99b62, fog: [45, 170], builder: 'aksum' },
    { id: 'simien', name: 'Simien Mountains', country: 'Ethiopia', sky: 0x9fc6e0, ground: 0x5e8f4e, fog: [40, 150], builder: 'simien' },
    { id: 'gondar', name: 'Gondar', country: 'Ethiopia', sky: 0xa9cfe6, ground: 0x7c8a56, fog: [45, 170], builder: 'gondar' },
    { id: 'bahirdar', name: 'Bahir Dar', country: 'Ethiopia', sky: 0xa5d8ee, ground: 0x7fae6a, fog: [50, 180], builder: 'massawa' },
    { id: 'addis', name: 'Addis Ababa', country: 'Ethiopia', sky: 0xb7d8ea, ground: 0x9aa0a8, fog: [45, 170], builder: 'asmara' },
  ],
  ti: [
    { id: 'axum', name: 'Axum', country: 'Ethiopia (Tigray)', sky: 0xaed4ea, ground: 0xb99b62, fog: [45, 170], builder: 'aksum' },
    { id: 'asmara', name: 'Asmara', country: 'Eritrea', sky: 0xb7d8ea, ground: 0x9aa0a8, fog: [45, 170], builder: 'asmara' },
    { id: 'keren', name: 'Keren', country: 'Eritrea', sky: 0xa9cfe6, ground: 0x9c8a56, fog: [45, 170], builder: 'gondar' },
    { id: 'massawa', name: 'Massawa', country: 'Eritrea', sky: 0xa5d8ee, ground: 0xe2d3b3, fog: [50, 180], builder: 'massawa' },
    { id: 'semenawi', name: 'Semenawi Bahri', country: 'Eritrea', sky: 0x9fc6e0, ground: 0x5e8f4e, fog: [40, 150], builder: 'simien' },
    { id: 'dahlak', name: 'Dahlak Islands', country: 'Eritrea', sky: 0xa5d8ee, ground: 0xe8ddb9, fog: [50, 180], builder: 'massawa' },
  ],
}

/* Skylands islands: 4 sessions, colors + landmark kind. */
const SKYLANDS = {
  am: [
    { place: 'Lalibela', country: 'Ethiopia', rock: '#9a6a45', grass: '#8fbf5a', landmark: 'lalibela' },
    { place: 'Aksum', country: 'Ethiopia', rock: '#b3905c', grass: '#a8c060', landmark: 'aksum' },
    { place: 'Simien Mountains', country: 'Ethiopia', rock: '#7d8a63', grass: '#6fae58', landmark: 'simien' },
    { place: 'Gondar', country: 'Ethiopia', rock: '#8a7a55', grass: '#93b768', landmark: 'lalibela' },
  ],
  ti: [
    { place: 'Axum', country: 'Ethiopia (Tigray)', rock: '#b3905c', grass: '#a8c060', landmark: 'aksum' },
    { place: 'Semenawi Bahri', country: 'Eritrea', rock: '#7d8a63', grass: '#6fae58', landmark: 'simien' },
    { place: 'Keren', country: 'Eritrea', rock: '#9a6a45', grass: '#9fb35f', landmark: 'lalibela' },
    { place: 'Massawa', country: 'Eritrea', rock: '#c9b489', grass: '#9fc987', landmark: 'massawa' },
  ],
}

const packOr = (table) => table[getActivePackId()] || table.am

export const chapterPlaces = () => packOr(CHAPTERS)
export const runnerPlaces = () => packOr(RUNNER)
export const skylandsPlaces = () => packOr(SKYLANDS)
