/* ============================================================================
   ማማ — playable tower game
   ----------------------------------------------------------------------------
   One fidel brick falls at a time. Drag it (or tap it, then tap the tower or
   the bin) onto the tower or into the bin. A lookalike on the tower bounces
   off. The letter the word needs, dropped in the bin, is spat back. Level 3
   hides the picture until the word is done. The child's speed is remembered.
   After IDLE_MS with no touch the fall freezes and the napping brick shows.

   Back on the picker returns to the backpack. A finished word is a building
   in the city (fq.mama.v1) and a round on the app progress area `mama`.
   Open ?mama=preview&scene=play|miss|win|city&still=1 to hold a real frame.
   UI copy is t(key, English). No Latin sits beside a fidel.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Ear, Hand, House, RotateCcw, Star, ThumbsUp, Volume2 } from 'lucide-react'
import { t, getLang } from '../platform/i18n'
import { publicUrl } from '../platform/publicUrl'
import { audio, playEffect, playForm } from '../platform/audioEngine'
import { recordAnswer } from '../platform/telemetry'
import { noteDone, noteRound } from '../platform/appProgress'
import { getActivePackId } from '../platform/ethiopic'
import { TibebFrame } from './Manuscript'
import { Baseplate, BrickTile, GuideSign, WoodTopBar, brickCss, overRect, roundBtnCss, studCss, useLandscapeShort, useMedia, WOOD } from './brickKit'
import {
  IDLE_MS, LEVELS, MAMA_PIGMENTS, SPEED_MS, initRound, mamaPools, mamaTransition, packIndex, previewRound, speedFor,
} from '../mamaCore'
import { addBuilding, loadMama, rememberSpeed } from '../mamaSave'
import './mamaPreview.css'

const MEADOW = publicUrl('/img/games/brick-meadow.webp')
const picUrl = (name) => publicUrl(`/img/games/bw/${name}.webp`)
function wordByLatin(pools, latin) {
  for (const list of Object.values(pools)) {
    const found = list.find((w) => w.latin === latin)
    if (found) return found
  }
  return null
}

function useBox() {
  const tablet = useMedia('(min-width: 900px) and (min-height: 700px)')
  const land = useLandscapeShort()
  if (tablet) return { bw: 128, bh: 60, font: 36, dancer: 200, binW: 148, binH: 176, pic: 220, cityW: 104, cityH: 48, cityFont: 28, cityPic: 132 }
  if (land) return { bw: 86, bh: 34, font: 20, dancer: 62, binW: 76, binH: 92, pic: 92, cityW: 52, cityH: 24, cityFont: 15, cityPic: 48 }
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
    </svg>
  )
}

function ToyRabbit({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <ellipse cx="24" cy="16" rx="4" ry="12" fill="#f4efe4" />
      <ellipse cx="36" cy="16" rx="4" ry="12" fill="#f4efe4" />
      <ellipse cx="24" cy="17" rx="1.8" ry="7" fill="#e7a0a8" />
      <ellipse cx="36" cy="17" rx="1.8" ry="7" fill="#e7a0a8" />
      <circle cx="32" cy="34" r="11" fill="#f4efe4" />
      <ellipse cx="32" cy="48" rx="10" ry="7" fill="#f4efe4" />
      <circle cx="48" cy="46" r="4" fill="#fff" />
      <circle cx="28" cy="33" r="1.5" fill="#24160c" />
      <circle cx="36" cy="33" r="1.5" fill="#24160c" />
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

function SpeedButton({ on, label, testId, onClick, children }) {
  return (
    <button
      type="button"
      className={`bk-btn mama-speed${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      data-testid={testId}
      onClick={onClick}
      style={{ ...roundBtnCss(on ? '#f2c230' : '#f6e6c4'), border: on ? '3px solid #a9832f' : '3px solid #fff' }}
    >
      {children}
    </button>
  )
}

function PicturePrompt({ src, size, onHear }) {
  return (
    <button type="button" className="mama-board mama-prompt" style={WOOD} data-testid="mama-picture" aria-label={t('echoTapHear', 'Tap to hear')} onClick={onHear}>
      <span className="mama-board-well" style={{ width: size, height: size }}>
        <img src={src} alt="" draggable={false} style={{ width: size - 12, height: size - 12 }} />
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

function TrashCan({ w, h, bite, box, binRef, onBin }) {
  return (
    <button type="button" ref={binRef} className={`mama-bin${bite ? ' is-chomp' : ''}`} data-testid="mama-bin" aria-label={t('mamaBin', 'The bin')} style={{ width: w, height: h }} onClick={onBin}>
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
          <FidelBrick char={bite.char} color={MAMA_PIGMENTS[2]} w={Math.round(box.bw * 0.72)} h={Math.round(box.bh * 0.86)} font={Math.round(box.font * 0.7)} />
        </span>
      )}
    </button>
  )
}

function FallingBrick({ brick, color, box, armed, speedMs, still, onArm, onRelease }) {
  const drag = useRef(null)
  const skipClick = useRef(false)
  const [pos, setPos] = useState(null)
  const down = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    drag.current.dx = dx
    drag.current.dy = dy
    if (Math.hypot(dx, dy) > 8) setPos({ dx, dy })
  }
  const up = (e) => {
    if (!drag.current) return
    const moved = Math.hypot(drag.current.dx, drag.current.dy) > 12
    const pt = { x: e.clientX, y: e.clientY }
    drag.current = null
    setPos(null)
    if (moved) { skipClick.current = true; onRelease(pt) }
  }
  return (
    <button
      type="button"
      data-testid="mama-fall"
      data-role={brick.role}
      className={`mama-fall${armed ? ' is-armed' : ''}`}
      aria-label={brick.char}
      style={{ '--fall': `${speedMs}ms`, touchAction: 'none', transform: pos ? `translate(${pos.dx}px, ${pos.dy}px) scale(1.06)` : undefined, animation: pos || still ? 'none' : undefined, zIndex: pos ? 20 : 4 }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { drag.current = null; setPos(null) }}
      onClick={() => { if (skipClick.current) { skipClick.current = false; return } onArm() }}
    >
      <span className="mama-lines" aria-hidden="true" />
      <FidelBrick char={brick.char} color={color} w={box.bw} h={box.bh} font={box.font} />
    </button>
  )
}

function guideFor(round, nap) {
  if (nap) return { icon: Hand, text: t('mamaRest', 'Bricks rest when you wait'), tone: 'guide' }
  if (!round) return { icon: Hand, text: t('mamaPick', 'Pick a tower'), tone: 'guide' }
  if (round.phase === 'win') return { icon: ThumbsUp, text: t('nice', 'Nice!'), tone: 'ok' }
  if (round.outcome === 'bounce') return { icon: RotateCcw, text: t('mamaMiss', 'It jumps off'), tone: 'try' }
  if (round.outcome === 'spit') return { icon: RotateCcw, text: t('mamaSpit', 'It comes back'), tone: 'try' }
  if (round.outcome === 'chomp') return { icon: ThumbsUp, text: t('mamaChomp', 'In the bin'), tone: 'ok' }
  return { icon: Hand, text: t('mamaDrop', 'Drop it on the tower'), tone: 'guide' }
}

export default function MamaPreview({ onBack, soundOn = true, framed = false, scene: sceneProp, seed: seedProp, still: stillProp } = {}) {
  const reduce = useReducedMotion()
  const land = useLandscapeShort()
  const box = useBox()
  const preview = (() => {
    if (sceneProp) return { scene: sceneProp, seed: seedProp || 4, still: !!stillProp }
    if (typeof window === 'undefined') return null
    const q = new URLSearchParams(window.location.search)
    if (q.get('mama') !== 'preview') return null
    const scene = q.get('scene')
    if (!['pick', 'play', 'miss', 'win', 'city'].includes(scene || '')) return { scene: 'pick', seed: 4, still: q.get('still') === '1' }
    return { scene, seed: Number(q.get('seed')) || 4, still: q.get('still') === '1' }
  })()
  const still = !!(preview?.still || stillProp || reduce)
  // Same stores as every other game: fq.pack for the learn language, fq.lang for the UI text.
  // Read when the screen opens. A pack or UI-language change reloads the app first, and
  // nothing here writes either key.
  const [packId] = useState(() => getActivePackId())
  const [uiLang] = useState(() => getLang())
  const [pools] = useState(() => mamaPools(packId))
  const [view, setView] = useState(preview?.scene === 'city' ? 'city' : preview?.scene === 'pick' || !preview ? 'pick' : 'play')
  const [round, setRound] = useState(() => (preview && preview.scene !== 'pick' && preview.scene !== 'city' ? previewRound(preview.scene, preview.seed, pools, packId) : null))
  const [speed, setSpeed] = useState(() => speedFor(loadMama().speed, round?.level || 1))
  const [armed, setArmed] = useState(false)
  const [nap, setNap] = useState(false)
  const [fallKey, setFallKey] = useState(0)
  const [city, setCity] = useState(() => loadMama().city)
  const lastTouch = useRef(Date.now())
  const slotRef = useRef(null)
  const binRef = useRef(null)
  const level = LEVELS[round?.level || 1]
  const speedMs = SPEED_MS[speed]

  const poke = () => { lastTouch.current = Date.now(); setNap(false) }

  useEffect(() => {
    if (view !== 'play' || still || round?.phase === 'win') return undefined
    const id = setInterval(() => {
      if (Date.now() - lastTouch.current >= IDLE_MS) setNap(true)
    }, 400)
    return () => clearInterval(id)
  }, [view, still, round?.phase, fallKey])

  const hear = () => { if (round?.word) audio.play(round.word.clip, { enabled: soundOn, chime: { familyIndex: 0, order: 1 } }) }

  const drop = (type, fromDrag) => {
    poke()
    if (!fromDrag && !armed) return
    if (!round?.brick) return
    const brick = round.brick
    const need = round.letters[round.placed]
    const res = mamaTransition(round, type)
    if (!res.accepted) return
    setArmed(false)
    const correct = (type === 'tower' && brick.role === 'need') || (type === 'bin' && brick.role === 'decoy')
    recordAnswer(need?.key, brick.key, 'mama')
    if (res.state.outcome === 'win') {
      noteRound('mama', 3)
      noteDone('mama')
      setCity(addBuilding(round.word.latin).city)
      playEffect('win', soundOn)
      audio.play(round.word.clip, { enabled: soundOn, chime: { familyIndex: 0, order: 1 } })
    } else if (res.state.outcome === 'place') {
      const form = packIndex(packId).byAudioKey.get(brick.key)
      if (form) playForm(form, soundOn)
    } else if (res.state.outcome === 'spit') {
      playEffect('bad', soundOn)
      setFallKey((k) => k + 1)
    } else {
      playEffect(res.state.outcome === 'chomp' ? 'good' : 'bad', soundOn)
    }
    setRound(res.state)
    if (res.state.outcome === 'bounce' || res.state.outcome === 'chomp') {
      const mark = res.state.outcome
      setTimeout(() => {
        setRound((cur) => (cur && cur.outcome === mark ? mamaTransition(cur, 'settle').state : cur))
      }, still ? 0 : 720)
    }
  }

  const release = (pt) => {
    poke()
    if (overRect(slotRef.current, pt, 56)) drop('tower', true)
    else if (overRect(binRef.current, pt, 56)) drop('bin', true)
  }

  const start = (id) => {
    poke()
    const next = initRound(id, (Date.now() % 997) || 1, pools[id], packId)
    if (!next) return
    setSpeed(speedFor(loadMama().speed, id))
    setRound(next)
    setArmed(false)
    setView('play')
  }

  const chooseSpeed = (next) => {
    poke()
    const value = speed === next ? 'mid' : next
    setSpeed(value)
    rememberSpeed(value)
  }

  const showPicture = view === 'play' && round && !(level.hearOnly && round.phase !== 'win')
  const guide = view === 'city'
    ? { icon: House, text: t('mamaCity', 'Your little city'), tone: 'guide' }
    : view === 'pick'
      ? { icon: Hand, text: t('mamaPick', 'Pick a tower'), tone: 'guide' }
      : guideFor(round, nap)
  const total = view === 'pick' ? 3 : view === 'city' ? Math.max(city.length, 1) : round?.letters.length || 1
  const value = view === 'pick' ? 0 : view === 'city' ? city.length : round?.phase === 'win' ? round.letters.length : round?.placed || 0
  const buildings = city.map((latin) => wordByLatin(pools, latin)).filter(Boolean)

  const screen = (
    <div
      className={`bk-screen mama-screen mx-auto flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden${still ? ' is-still' : ''}${nap ? ' is-nap' : ''}`}
      data-testid="mama-preview"
      data-pack={packId}
      data-lang={uiLang}
      data-word={round?.word?.geez || ''}
      data-scene={view === 'play' && round?.phase === 'win' ? 'win' : view}
      data-level={round?.level || 0}
      data-speed={speed}
      onPointerDown={poke}
    >
      <div className="mama-stage" data-scene={view}>
        <div className="mama-meadow" style={{ backgroundImage: `url(${MEADOW})` }} aria-hidden="true" />
        <div className="mama-shade" aria-hidden="true" />
        <WoodTopBar
          onBack={() => { if (view === 'pick') onBack?.(); else { setView('pick'); setRound(null) } }}
          value={value}
          total={total}
          done={round?.phase === 'win' || view === 'city'}
          guide={<GuideSign icon={guide.icon} text={guide.text} tone={guide.tone} compact={land} />}
        />
        <div className={`mama-body${view === 'play' ? ' is-field' : ''}`}>
          {view === 'pick' && (
            <div className="mama-pick">
              <h1 className="mama-logo">
                <FidelBrick char="ማ" color={MAMA_PIGMENTS[0]} w={116} h={52} font={34} />
                <FidelBrick char="ማ" color={MAMA_PIGMENTS[1]} w={116} h={52} font={34} />
              </h1>
              <div className="mama-cards">
                {[1, 2, 3].map((id) => {
                  const spec = LEVELS[id]
                  const sample = pools[id][0]
                  return (
                    <button type="button" key={id} className="mama-card chunk" data-testid={`mama-level-${id}`} aria-label={t('mamaLevel', 'Level {n}', { n: id })} onClick={() => start(id)}>
                      <span className="mama-mini" aria-hidden="true">
                        {Array.from({ length: spec.len }, (_, i) => <i key={i} className={spec.glow && i === spec.len - 1 ? 'is-next' : ''} style={{ background: spec.glow && i === spec.len - 1 ? undefined : MAMA_PIGMENTS[i % 4], borderStyle: 'solid' }} />)}
                      </span>
                      {spec.hearOnly
                        ? <span className="mama-ear" aria-hidden="true"><Ear color="#f8f2e2" strokeWidth={2.4} className="h-10 w-10" /></span>
                        : sample && <img className="mama-card-pic" src={picUrl(sample.pic)} alt="" draggable={false} />}
                      <span className="mama-badge" aria-hidden="true">
                        {spec.speed === 'fast' ? <ToyRabbit className="h-9 w-9" /> : spec.speed === 'slow' ? <ToyTurtle className="h-9 w-9" /> : <span className="mama-mini" style={{ gap: 3 }}><i style={{ width: 28, height: 10, background: MAMA_PIGMENTS[1] }} /><i style={{ width: 28, height: 10, background: MAMA_PIGMENTS[2] }} /></span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {view === 'city' && (
            <div className="mama-city" data-testid="mama-city">
              <div className="mama-strip">
                {buildings.map((word, index) => (
                  <div key={word.latin} className={`mama-bldg${index === buildings.length - 1 ? ' is-fresh' : ''}`} data-testid="mama-building" data-fresh={index === buildings.length - 1 ? '1' : '0'}>
                    <img className="mama-roof" src={picUrl(word.pic)} alt="" draggable={false} style={{ width: box.cityPic, height: box.cityPic }} />
                    {index === buildings.length - 1 && <Star className="mama-fresh-star h-8 w-8" fill="#ffd23a" color="#e0971c" strokeWidth={2} aria-hidden="true" />}
                    <div className="mama-stack">
                      {word.letters.map((letter, i) => (
                        <FidelBrick key={`${letter.char}-${i}`} char={letter.char} color={MAMA_PIGMENTS[i % 4]} w={box.cityW} h={box.cityH} font={box.cityFont} lit={index === buildings.length - 1} reading={index === buildings.length - 1 && i === word.letters.length - 1} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Baseplate className="mama-plate" style={{ width: '100%', height: 40, marginTop: 0 }} testId="mama-street" />
            </div>
          )}
          {view === 'play' && round && (
            <>
              {round.phase === 'win' ? null : showPicture
                ? <PicturePrompt src={picUrl(round.word.pic)} size={box.pic} onHear={hear} />
                : <HearPrompt size={box.pic} onHear={hear} />}
              <div className="mama-field">
                <div className="mama-tower" data-testid="mama-tower">
                  {round.phase === 'win' && (
                    <div className="mama-dancer-wrap">
                      <div className="mama-rays" aria-hidden="true" />
                      <button type="button" className="mama-dancer-hit" data-testid="mama-city-go" aria-label={t('mamaCity', 'Your little city')} onClick={() => setView('city')}>
                        <img className="mama-dancer" data-testid="mama-dancer" src={picUrl(round.word.pic)} alt="" draggable={false} style={{ width: box.dancer, height: box.dancer }} />
                      </button>
                      <button type="button" className="mama-vol mama-hear-float" data-testid="mama-hear" aria-label={t('echoTapHear', 'Tap to hear')} onClick={hear}>
                        <Volume2 className="h-6 w-6" color="#1f5fb8" strokeWidth={2.8} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  {round.brick && (
                    <FallingBrick
                      key={`${round.brick.char}-${round.placed}-${fallKey}`}
                      brick={round.brick}
                      color={MAMA_PIGMENTS[round.placed % 4]}
                      box={box}
                      armed={armed}
                      speedMs={speedMs}
                      still={still}
                      onArm={() => { poke(); setArmed((a) => !a) }}
                      onRelease={release}
                    />
                  )}
                  {round.fx && (
                    <div className="mama-bounce" data-testid="mama-bounce">
                      <span className="mama-arc" aria-hidden="true" />
                      <FidelBrick char={round.fx.char} color={MAMA_PIGMENTS[3]} w={box.bw} h={box.bh} font={box.font} />
                    </div>
                  )}
                  <div className="mama-stack">
                    {round.letters.map((letter, i) => {
                      const filled = i < round.placed
                      const next = round.phase !== 'win' && i === round.placed
                      const reading = round.phase === 'win' && i === Math.min(2, round.letters.length - 1)
                      return (
                        <div key={`${letter.char}-${i}`} data-filled={filled ? '1' : '0'}>
                          {filled
                            ? <FidelBrick char={letter.char} color={MAMA_PIGMENTS[i % 4]} w={box.bw} h={box.bh} font={box.font} lit={round.phase === 'win'} reading={reading} />
                            : next
                              ? <button type="button" ref={slotRef} data-testid="mama-slot" data-next={level.glow ? '1' : '0'} className={`mama-slot${level.glow ? ' is-next' : ''}`} style={{ width: box.bw, height: box.bh }} aria-label={t('mamaDrop', 'Drop it on the tower')} onClick={() => drop('tower')} />
                              : <div className="mama-slot" style={{ width: box.bw, height: box.bh }} />}
                        </div>
                      )
                    })}
                  </div>
                  <Baseplate className="mama-plate" style={{ width: box.bw + 56, height: Math.max(36, Math.round(box.bh * 0.78)) }} />
                </div>
                <TrashCan w={box.binW} h={box.binH} bite={round.bite} box={box} binRef={binRef} onBin={() => drop('bin')} />
              </div>
            </>
          )}
        </div>
      </div>
      {view === 'play' && round?.phase !== 'win' && (
        <div className="mama-bar" style={WOOD}>
          <div className="mama-speeds">
            <SpeedButton on={speed === 'slow'} label={t('mamaSlow', 'Slow')} testId="mama-slow" onClick={() => chooseSpeed('slow')}>
              <ToyTurtle />
            </SpeedButton>
            {nap && <NapBrick />}
            <SpeedButton on={speed === 'fast'} label={t('mamaFast', 'Fast')} testId="mama-fast" onClick={() => chooseSpeed('fast')}>
              <ToyRabbit />
            </SpeedButton>
          </div>
        </div>
      )}
    </div>
  )
  return framed ? <><TibebFrame />{screen}</> : screen
}
