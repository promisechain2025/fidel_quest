/* ============================================================================
   APP GALLERY — real screens, in the order a child meets them
   ----------------------------------------------------------------------------
   A feature list cannot answer "what is this actually like"; the product can.
   The six shots tell the arc in one glance: find the next step, meet the
   letter by sound, write it, prove it by ear, read a real word, then see the
   whole fidel.

   Images live in public/shots as `<pack>-<key>.webp` with a PNG beside them
   for the <picture> fallback, generated at 560px (2x the ~280px they render
   at). Regenerate with scratch tooling against a seeded app build - they are
   captures of the real thing, never mock-ups, so a screen that changes in the
   app must be recaptured here.
   ========================================================================== */
import { Picture, Reveal } from '../components.jsx'
import { t } from '../i18n.js'

/** key -> caption. The captions describe the STEP, not the screen, so they
    read as a curriculum rather than a tour of the UI. */
const SHOTS = [
  ['journey', 'agJourney', 'One path, one next step'],
  ['learn', 'agLearn', 'Meet the letter by sound'],
  ['trace', 'agTrace', 'Write it with a finger'],
  ['quiz', 'agQuiz', 'Prove it by ear'],
  ['words', 'agWords', 'Read a real word'],
  ['explorer', 'agExplorer', 'The whole fidel, tappable'],
]

export default function AppGallery({ pack = 'am', keys = null, className = '' }) {
  const shots = keys ? SHOTS.filter(([k]) => keys.includes(k)) : SHOTS
  const cols = shots.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-3'
  return (
    <div className={`grid grid-cols-2 gap-4 ${cols} ${className}`}>
      {shots.map(([key, tKey, fallback], i) => {
        const caption = t(tKey, fallback)
        return (
          <Reveal key={key} delay={i * 0.04}>
            <figure className="m-0">
              <Picture
                src={`/shots/${pack}-${key}.png`}
                loading="lazy"
                decoding="async"
                width={560}
                height={1212}
                alt={caption}
                className="w-full rounded-2xl"
                style={{ border: '1px solid var(--line)' }}
              />
              <figcaption className="mt-2 text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>
                {caption}
              </figcaption>
            </figure>
          </Reveal>
        )
      })}
    </div>
  )
}
