/* ============================================================================
   ማማ (Tower) — design mock
   ----------------------------------------------------------------------------
   Open with ?mama=preview  (add &scene=pick|play|miss|win|city and &still=1).
   Not linked from the backpack or the journey. Do not merge: main auto-deploys.

   Toy-brick fidel fall one at a time. The child will drag a brick onto the
   tower (the word grows from the bottom) or into the bin, whose lid chomps.
   A wrong letter on the tower bounces off, with no penalty and no game over.
   Decoys are vowel-order siblings. L1 glows the next slot and moves slowly,
   L2 does not glow, L3 is faster and hear-only until the word is done.
   The filled star and the new city building mark where a finished round would
   be reported. A visit would be reported on enter. This mock reports neither.
   UI copy is t(key, English). No Latin sits beside a fidel.
   ========================================================================== */
import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Ear, Hand, House, RotateCcw, Star, ThumbsUp, Volume2 } from 'lucide-react'
import { t } from '../platform/i18n'
import { publicUrl } from '../platform/publicUrl'
import { audio } from '../platform/audioEngine'
import { TibebFrame } from './Manuscript'
import { Baseplate, BrickTile, GuideSign, WoodTopBar, brickCss, roundBtnCss, studCss, useLandscapeShort, useMedia, WOOD } from './brickKit'
import {
  CITY_WORDS, MAMA_LEVELS, MAMA_PIGMENTS, PROGRESS_HOOK, poseFor, sceneFromSearch,
} from '../mamaMock'
import './mamaPreview.css'

const MEADOW = publicUrl('/img/games/brick-meadow.webp')
const picUrl = (name) => publicUrl(`/img/games/bw/${name}.webp`)

function readRoute(sceneProp, levelProp, stillProp) {
  if (sceneProp) {
    const scene = sceneProp
    const level = levelProp || (scene === 'win' ? 3 : 1)
    return { scene, level, still: !!stillProp }
  }
  const q = new URLSearchParams(window.location.search)
  const scene = sceneFromSearch(window.location.search)
  let level = scene === 'win' ? 3 : 1
  const asked = Number(q.get('level'))
  if ((scene === 'play' || scene === 'miss') && [1, 2, 3].includes(asked)) level = asked
  return { scene, level, still: q.get('still') === '1' }
}

function useBox() {
  const tablet = useMedia('(min-width: 900px) and (min-height: 700px)')
  const land = useLandscapeShort()
  if (tablet) return { bw: 128, bh: 60, font: 36, dancer: 200, binW: 148, binH: 176, pic: 220, cityW: 104, cityH: 48, cityFont: 28, cityPic: 132 }
  if (land) return { bw: 86, bh: 34, font: 20, dancer: 78, binW: 76, binH: 92, pic: 92, cityW: 52, cityH: 24, cityFont: 15, cityPic: 48 }
  return { bw: 112, bh: 52, font: 32, dancer: 138, binW: 108, binH: 128, pic: 150, cityW: 64, cityH: 30, cityFont: 20, cityPic: 68 }
}

function FidelBrick({ char, color, w, h, font, lit, reading }) {
  const face = brickCss(color, Math.max(4, Math.round(h * 0.12)))
  const glow = reading
    ? `0 0 0 4px #fff6c2, 0 0 22px 8px rgba(255, 214, 60, 1), ${face.boxShadow}`
    : lit
      ? `0 0 0 3px #ffe28a, 0 0 16px 6px rgba(255, 190, 40, 0.95), ${face.boxShadow}`
      : face.boxShadow
  return (
    <div className={`mama-brickwrap${lit ? ' is-lit' : ''}${reading ? ' is-reading' : ''}`}>
      <BrickTile color={color} width={w} height={h} studs={2} style={{ ...face, boxShadow: glow, fontSize: font }}>
        <span className="mama-plaque geez">{char}</span>
      </BrickTile>
    </div>
  )
}

function Slot({ w, h, next }) {
  return <div className={`mama-slot${next ? ' is-next' : ''}`} data-next={next ? '1' : '0'} style={{ width: w, height: h }} />
}

function ToyTurtle({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <ellipse cx="18" cy="46" rx="6" ry="3.2" fill="#3e6438" />
      <ellipse cx="34" cy="48" rx="6" ry="3.2" fill="#3e6438" />
      <ellipse cx="20" cy="28" rx="5" ry="3" fill="#3e6438" />
      <ellipse cx="36" cy="26" rx="5" ry="3" fill="#3e6438" />
      <ellipse cx="30" cy="36" rx="18" ry="13" fill="#57854e" />
      <ellipse cx="30" cy="34" rx="12" ry="8" fill="#e2c27a" />
      <path d="M30 27 v14 M22 34 h16" stroke="#6e5318" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="30" r="7" fill="#7eab72" />
      <circle cx="53" cy="28" r="1.6" fill="#24160c" />
      <path d="M54 32 q3 1 4 0" fill="none" stroke="#3e6438" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ToyRabbit({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <ellipse cx="18" cy="12" rx="3.2" ry="8" fill="#f4efe4" />
      <ellipse cx="26" cy="12" rx="3.2" ry="8" fill="#f4efe4" />
      <ellipse cx="18" cy="13" rx="1.5" ry="5" fill="#e7a0a8" />
      <ellipse cx="26" cy="13" rx="1.5" ry="5" fill="#e7a0a8" />
      <circle cx="24" cy="26" r="8" fill="#f4efe4" />
      <ellipse cx="24" cy="36" rx="8" ry="6" fill="#f4efe4" />
      <circle cx="38" cy="34" r="3" fill="#fff" />
      <circle cx="21" cy="25" r="1.2" fill="#24160c" />
      <circle cx="27" cy="25" r="1.2" fill="#24160c" />
      <path d="M22 29 q2 1.6 4 0" fill="none" stroke="#a8463d" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function NapBrick() {
  return (
    <span className="mama-nap" role="img" data-testid="idle-rest" aria-label={t('mamaRest', 'Bricks rest when you wait')}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="6" y="16" width="36" height="24" rx="6" fill="#40608c" />
        <ellipse cx="16" cy="12" rx="5" ry="3.2" fill="#7f9cc4" />
        <ellipse cx="32" cy="12" rx="5" ry="3.2" fill="#7f9cc4" />
        <path d="M13 27 q5 4 9 0" fill="none" stroke="#f8f2e2" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M26 27 q5 4 9 0" fill="none" stroke="#f8f2e2" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="18" y="32" width="3.4" height="6" rx="1" fill="#f8f2e2" />
        <rect x="26.5" y="32" width="3.4" height="6" rx="1" fill="#f8f2e2" />
      </svg>
    </span>
  )
}

function SpeedButton({ on, label, testId, onClick, children, color }) {
  return (
    <button
      type="button"
      className={`bk-btn mama-speed${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      data-testid={testId}
      onClick={onClick}
      style={{ ...roundBtnCss(on ? '#f2c230' : color), border: on ? '3px solid #a9832f' : '3px solid #fff' }}
    >
      {children}
    </button>
  )
}

function SpeedBar({ speed, setSpeed }) {
  return (
    <div className="mama-bar" style={WOOD}>
      <div className="mama-speeds">
        <SpeedButton on={speed === 'slow'} label={t('mamaSlow', 'Slow')} testId="mama-slow" color="#f6e6c4" onClick={() => setSpeed('slow')}>
          <ToyTurtle />
        </SpeedButton>
        <NapBrick />
        <SpeedButton on={speed === 'fast'} label={t('mamaFast', 'Fast')} testId="mama-fast" color="#f6e6c4" onClick={() => setSpeed('fast')}>
          <ToyRabbit />
        </SpeedButton>
      </div>
    </div>
  )
}

function PicturePrompt({ src, size, onHear }) {
  return (
    <button type="button" className="mama-board mama-prompt" style={WOOD} data-testid="mama-picture" aria-label={t('echoTapHear', 'Tap to hear')} onClick={onHear}>
      <span className="mama-board-well" style={{ width: size, height: size }}>
        <img src={src} alt="" draggable={false} width={size} height={size} style={{ width: size - 12, height: size - 12 }} />
      </span>
      <span className="mama-vol" aria-hidden="true">
        <Volume2 className="h-6 w-6" color="#1f5fb8" strokeWidth={2.8} />
      </span>
    </button>
  )
}

function HearPrompt({ size, onHear }) {
  return (
    <button type="button" className="mama-hear mama-prompt" data-testid="mama-hear" aria-label={t('echoTapHear', 'Tap to hear')} onClick={onHear} style={{ width: size, height: size }}>
      <Ear className="h-12 w-12" color="#f8f2e2" strokeWidth={2.4} aria-hidden="true" />
    </button>
  )
}

function TrashCan({ w, h, bite, biteColor, metrics }) {
  return (
    <button type="button" className={`mama-bin${bite ? ' is-chomp' : ''}`} data-testid="mama-bin" aria-label={t('mamaBin', 'The bin')} style={{ width: w, height: h }}>
      <span className="mama-lid" aria-hidden="true">
        <span className="mama-studs">
          <span style={studCss('#c0983f', 16)} />
          <span style={studCss('#c0983f', 16)} />
        </span>
      </span>
      <span className="mama-bin-body">
        <span className="mama-eye"><i /></span>
        <span className="mama-eye"><i /></span>
        <span className="mama-cheek" />
        <span className="mama-cheek" />
      </span>
      {bite && (
        <span className="mama-bite" data-testid="mama-bite">
          <FidelBrick char={bite} color={biteColor} w={Math.round(metrics.bw * 0.78)} h={Math.round(metrics.bh * 0.92)} font={Math.round(metrics.font * 0.72)} />
        </span>
      )}
    </button>
  )
}

function Tower({ level, scene, box, onHear }) {
  const pose = poseFor(scene, level)
  const won = scene === 'win'
  const { letters, placed, falling, bounce } = pose
  return (
    <div className="mama-tower" data-testid="mama-tower">
      {won && (
        <div className="mama-dancer-wrap">
          <div className="mama-rays" aria-hidden="true" />
          {[0, 1, 2, 3].map((i) => (
            <Star key={i} className="mama-star h-7 w-7" fill="#ffd23a" color="#e0971c" strokeWidth={2} aria-hidden="true" style={{ left: `${12 + i * 22}%`, top: i % 2 ? -6 : 18 }} />
          ))}
          <img className="mama-dancer" data-testid="mama-dancer" src={picUrl(level.pic)} alt="" draggable={false} style={{ width: box.dancer, height: box.dancer }} />
          <button type="button" className="mama-vol mama-hear-float" data-testid="mama-hear" aria-label={t('echoTapHear', 'Tap to hear')} onClick={onHear}>
            <Volume2 className="h-6 w-6" color="#1f5fb8" strokeWidth={2.8} aria-hidden="true" />
          </button>
        </div>
      )}
      {falling && (
        <div className="mama-fall" data-testid="mama-fall">
          <span className="mama-lines" aria-hidden="true" />
          <FidelBrick char={falling} color={MAMA_PIGMENTS[placed % 4]} w={box.bw} h={box.bh} font={box.font} />
        </div>
      )}
      {bounce && (
        <div className="mama-bounce" data-testid="mama-bounce">
          <span className="mama-arc" aria-hidden="true" />
          <FidelBrick char={bounce} color={MAMA_PIGMENTS[3]} w={box.bw} h={box.bh} font={box.font} />
        </div>
      )}
      <div className="mama-stack">
        {letters.map((ch, i) => {
          const filled = i < placed
          const next = !won && i === placed && level.glow
          const reading = won && i === Math.min(2, letters.length - 1)
          return (
            <div key={`${ch}-${i}`} data-slot={i} data-filled={filled ? '1' : '0'}>
              {filled
                ? <FidelBrick char={ch} color={MAMA_PIGMENTS[i % 4]} w={box.bw} h={box.bh} font={box.font} lit={won} reading={reading} />
                : <Slot w={box.bw} h={box.bh} next={next} />}
            </div>
          )
        })}
      </div>
      <Baseplate className="mama-plate" style={{ width: box.bw + 56, height: Math.max(36, Math.round(box.bh * 0.78)) }} />
    </div>
  )
}

function LevelCard({ level, onPick }) {
  const letters = Array.from(level.geez)
  return (
    <button type="button" className="mama-card chunk" data-testid={`mama-level-${level.id}`} aria-label={t('mamaLevel', 'Level {n}', { n: level.id })} onClick={() => onPick(level.id)}>
      <span className="mama-mini" aria-hidden="true">
        {letters.map((_, i) => <i key={i} className={level.glow && i === 1 ? 'is-next' : ''} style={{ background: level.glow && i === 1 ? undefined : MAMA_PIGMENTS[i % 4], opacity: level.glow && i === 1 ? 1 : 0.85, borderStyle: 'solid' }} />)}
      </span>
      {level.hearOnly
        ? <span className="mama-ear" aria-hidden="true"><Ear color="#f8f2e2" strokeWidth={2.4} className="h-10 w-10" /></span>
        : <img className="mama-card-pic" src={picUrl(level.pic)} alt="" draggable={false} />}
      <span className="mama-badge" aria-hidden="true">
        {level.speed === 'fast' ? <ToyRabbit className="h-9 w-9" /> : level.speed === 'slow' ? <ToyTurtle className="h-9 w-9" /> : <span className="mama-mini" style={{ gap: 3 }}><i style={{ width: 28, height: 10, background: MAMA_PIGMENTS[1] }} /><i style={{ width: 28, height: 10, background: MAMA_PIGMENTS[2] }} /></span>}
      </span>
    </button>
  )
}

function Picker({ onPick }) {
  return (
    <div className="mama-pick">
      <h1 className="mama-logo">
        <FidelBrick char="ማ" color={MAMA_PIGMENTS[0]} w={116} h={52} font={34} />
        <FidelBrick char="ማ" color={MAMA_PIGMENTS[1]} w={116} h={52} font={34} />
      </h1>
      <div className="mama-cards">
        {MAMA_LEVELS.map((level) => <LevelCard key={level.id} level={level} onPick={onPick} />)}
      </div>
    </div>
  )
}

function Building({ word, box }) {
  const letters = Array.from(word.geez)
  return (
    <div className={`mama-bldg${word.fresh ? ' is-fresh' : ''}`} data-testid="mama-building" data-fresh={word.fresh ? '1' : '0'} data-progress-hook={word.fresh ? PROGRESS_HOOK.round : undefined}>
      <img className="mama-roof" src={picUrl(word.pic)} alt="" draggable={false} style={{ width: box.cityPic, height: box.cityPic }} />
      {word.fresh && <Star className="mama-fresh-star h-8 w-8" fill="#ffd23a" color="#e0971c" strokeWidth={2} aria-hidden="true" />}
      <div className="mama-stack">
        {letters.map((ch, i) => (
          <FidelBrick key={`${ch}-${i}`} char={ch} color={MAMA_PIGMENTS[i % 4]} w={box.cityW} h={box.cityH} font={box.cityFont} lit={!!word.fresh} reading={!!word.fresh && i === letters.length - 1} />
        ))}
      </div>
    </div>
  )
}

function City({ box }) {
  return (
    <div className="mama-city" data-testid="mama-city">
      <div className="mama-strip">
        {CITY_WORDS.map((word) => <Building key={word.geez} word={word} box={box} />)}
      </div>
      <Baseplate className="mama-plate" style={{ width: '100%', height: 40, marginTop: 0 }} testId="mama-street" />
    </div>
  )
}

function guideFor(scene) {
  if (scene === 'play') return { icon: Hand, text: t('mamaDrop', 'Drop it on the tower') }
  if (scene === 'miss') return { icon: RotateCcw, text: t('mamaMiss', 'It jumps off') }
  if (scene === 'win') return { icon: ThumbsUp, text: t('nice', 'Nice!') }
  if (scene === 'city') return { icon: House, text: t('mamaCity', 'Your little city') }
  return { icon: Hand, text: t('mamaPick', 'Pick a tower') }
}

function hear(latin) {
  audio.play(`words/${latin}`, { enabled: true, chime: { familyIndex: 0, order: 1 } })
}

export default function MamaPreview({ scene: sceneProp, level: levelProp, still: stillProp } = {}) {
  const reduce = useReducedMotion()
  const land = useLandscapeShort()
  const box = useBox()
  const [route, setRoute] = useState(() => readRoute(sceneProp, levelProp, stillProp))
  const level = MAMA_LEVELS[route.level - 1]
  const [speed, setSpeed] = useState(level.speed)
  useEffect(() => { setSpeed(level.speed) }, [level.speed])

  const { scene } = route
  const playing = scene === 'play' || scene === 'miss' || scene === 'win'
  const pose = playing ? poseFor(scene, level) : null
  const guide = guideFor(scene)
  const total = scene === 'pick' ? 3 : scene === 'city' ? CITY_WORDS.length : pose.letters.length
  const value = scene === 'pick' ? 0 : scene === 'city' ? CITY_WORDS.length : pose.placed
  const showPrompt = playing && scene !== 'win'

  return (
    <>
      <TibebFrame />
      <div
        className={`bk-screen mama-screen mx-auto flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden${route.still || reduce ? ' is-still' : ''}`}
        data-testid="mama-preview"
        data-scene={scene}
        data-level={route.level}
        data-speed={playing ? speed : undefined}
        data-progress-hook={PROGRESS_HOOK.visit}
        data-area={PROGRESS_HOOK.area}
      >
        <div className="mama-stage" data-scene={scene}>
          <div className="mama-meadow" style={{ backgroundImage: `url(${MEADOW})` }} aria-hidden="true" />
          <div className="mama-shade" aria-hidden="true" />
          <WoodTopBar
            onBack={() => { if (scene !== 'pick') setRoute((r) => ({ ...r, scene: 'pick' })) }}
            value={value}
            total={total}
            done={scene === 'win' || scene === 'city'}
            guide={<GuideSign icon={guide.icon} text={guide.text} tone={scene === 'win' ? 'ok' : 'guide'} compact={land} />}
          />
          <div className={`mama-body${playing ? ' is-field' : ''}`}>
            {scene === 'pick' && <Picker onPick={(n) => setRoute((r) => ({ ...r, scene: 'play', level: n }))} />}
            {scene === 'city' && <City box={box} />}
            {playing && (
              <>
                {showPrompt && (level.hearOnly
                  ? <HearPrompt size={box.pic} onHear={() => hear(level.latin)} />
                  : <PicturePrompt src={picUrl(level.pic)} size={box.pic} onHear={() => hear(level.latin)} />)}
                <div className="mama-field">
                  <Tower level={level} scene={scene} box={box} onHear={() => hear(level.latin)} />
                  <TrashCan
                    w={box.binW}
                    h={box.binH}
                    bite={pose.bite}
                    biteColor={MAMA_PIGMENTS[2]}
                    metrics={box}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        {playing && <SpeedBar speed={speed} setSpeed={setSpeed} />}
      </div>
    </>
  )
}
