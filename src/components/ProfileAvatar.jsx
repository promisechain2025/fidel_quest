/* A child's avatar: one of the app's own characters (authored SVG) or a
   code-drawn animal from the word-picture library, on a soft coloured disc.
   No image assets, nothing fetched - same "drawn in code" rule as the cast.
   Ids come from platform/profiles.js AVATARS. */
import AnbessaSvg from './AnbessaSvg'
import KokebSvg from './KokebSvg'
import ZebraSvg from './ZebraSvg'
import JibbySvg from './JibbySvg'
import WordPicture from './Pictures'

const EMOJI = { dog: '🐶', cat: '🐱', bird: '🐦', fish: '🐟', horse: '🐎', camel: '🐫', cow: '🐄', bee: '🐝' }
const DISC = {
  anbessa: '#ffe2a8',
  kokeb: '#fff1b8',
  zebra: '#e4ecf5',
  jibby: '#f1dcc4',
  dog: '#f6e0cc',
  cat: '#fde3e3',
  bird: '#d9f0ff',
  fish: '#d6f3ee',
  horse: '#eadccd',
  camel: '#f7e7c6',
  cow: '#e6f2dc',
  bee: '#fff0b3',
}

function Art({ id, size }) {
  const s = Math.round(size * 0.86)
  if (id === 'kokeb') return <KokebSvg size={s} title="" />
  if (id === 'zebra') return <ZebraSvg size={s} title="" />
  if (id === 'jibby') return <JibbySvg size={s} title="" />
  if (EMOJI[id]) return <WordPicture emoji={EMOJI[id]} size={Math.round(size * 0.78)} />
  return <AnbessaSvg size={s} title="" />
}

export default function ProfileAvatar({ avatar = 'anbessa', size = 64, ring = null, className = '' }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size, background: DISC[avatar] || DISC.anbessa, boxShadow: ring ? `0 0 0 4px ${ring}` : 'inset 0 -3px 0 rgba(0,0,0,0.08)' }}
      aria-hidden="true"
    >
      <Art id={avatar} size={size} />
    </span>
  )
}
