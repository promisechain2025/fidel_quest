/* ============================================================================
   FIDEL SKYLANDS — a 3D cumulative-progression Amharic alphabet game
   ----------------------------------------------------------------------------
   Concept: a chain of floating islands, each themed after a famous place in
   Ethiopia or Eritrea, and each growing a magical Fidel tree whose fruit are
   letters. Learning phase: tap every fruit to hear it. Game phase: pluck the
   fruit that matches the sound you hear — drawn CUMULATIVELY from the current
   session plus every earlier session. Beating an island springs a plank
   bridge to the next one and the sky warms.

   Single-file by design. Section map:
     §1 DATA          sessions of the Ge'ez table (generated, test-verified)
     §2 QUESTIONS     seeded RNG + cumulative, twin-safe question factory
     §3 PROGRESSION   strict state machine; sessionsCompleted gates content
     §4 SOUND         mp3 placeholder contract with Web Audio fallback tones
     §5 ART           canvas-drawn characters and glyph textures
     §6 3D SCENE      R3F islands, trees, fruit, bridges, particle physics
     §7 UI            2D HUD overlay + app shell

   Physics note: rapier/cannon need WASM/workers that an offline artifact
   cannot fetch, so the "physics" here is hand-rolled — gravity-integrated
   particle bursts and spring dynamics (@react-spring/three) — which keeps
   the file fully self-contained.
   ========================================================================== */

import { useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Sparkles, Billboard } from '@react-three/drei'
import { useSpring, animated, config as springConfig } from '@react-spring/three'
import * as THREE from 'three'
import { audio as audioEngine } from './platform/audioEngine'
import { rngShuffle } from './platform/rng'
import { FIDEL_FAMILIES, ORDERS as PACK_ORDERS } from './platform/ethiopic'
import { recordAnswer } from './platform/telemetry'
import { t } from './platform/i18n'
import GhostHand from './GhostHand'
import { hasOnboarded, markOnboarded, prefersReducedMotion } from './platform/tutorial'
import { LOW_END } from './platform/quality'

/* ============================================================================
   §1 DATA
   ========================================================================== */

/* Families come from the Ethiopic Engine (script table + active pack). */

/** Base (1st-order) form of every family: the teaching unit of this game. */
const BASE_FORMS = FIDEL_FAMILIES.map((f, i) => ({
  char: Array.from(f.chars)[0],
  sound: f.consonant + PACK_ORDERS[0].vowel,
  audioKey: `${f.id}-1`,
  familyIndex: i,
}))
const FORM_BY_KEY = new Map(BASE_FORMS.map((f) => [f.audioKey, f]))

const SESSION_FRUIT = ['#ff7a59', '#ffc24b', '#8ed069', '#5db7ff']

export const SESSIONS = [
  {
    n: 1, title: 'First Letters', place: 'Lalibela', country: 'Ethiopia',
    rock: '#9a6a45', grass: '#8fbf5a', landmark: 'lalibela',
  },
  {
    n: 2, title: 'More Letters', place: 'Aksum', country: 'Ethiopia',
    rock: '#b3905c', grass: '#a8c060', landmark: 'aksum',
  },
  {
    n: 3, title: 'Even More Letters', place: 'Simien Mountains', country: 'Ethiopia',
    rock: '#7d8a63', grass: '#6fae58', landmark: 'simien',
  },
  {
    n: 4, title: 'The Last Letters', place: 'Massawa', country: 'Eritrea',
    rock: '#c9b489', grass: '#9fc987', landmark: 'massawa',
  },
].map((s, i) => ({
  ...s,
  fruit: SESSION_FRUIT[i],
  pool: BASE_FORMS.slice(i * 8, i === 3 ? 33 : i * 8 + 8).map((f) => f.audioKey),
}))

/** Cumulative pool for game level n: sessions 1..n. */
const cumulativePool = (n) => SESSIONS.slice(0, n).flatMap((s) => s.pool)
const sessionOfKey = (key) => SESSIONS.find((s) => s.pool.includes(key))
/** Every base letter - used when the player opts into "all letters" instead of
   the default island-cumulative pool. */
const ALL_BASE = BASE_FORMS.map((f) => f.audioKey)

/* ============================================================================
   §2 QUESTIONS (seeded, cumulative, twin-safe) — over the shared platform RNG
   ========================================================================== */

/**
 * Level n quiz: 5+n questions over the cumulative pool. Twin letters that
 * share a sound are never shown together. Recent-session letters are
 * guaranteed at least half the questions so new material gets practiced.
 */
export function buildQuiz(n, seed, allForms = false) {
  const pool = allForms ? ALL_BASE : cumulativePool(n)
  const fresh = SESSIONS[n - 1].pool
  const older = pool.filter((k) => !fresh.includes(k))
  const count = 5 + n
  const optionCount = Math.min(4 + Math.ceil(n / 2), 6)
  let state = seed
  let freshShuffled, olderShuffled
  ;[freshShuffled, state] = rngShuffle(fresh, state)
  ;[olderShuffled, state] = rngShuffle(older, state)
  const freshCount = Math.min(freshShuffled.length, Math.ceil(count / 2))
  let targets = [...freshShuffled.slice(0, freshCount), ...olderShuffled.slice(0, count - freshCount)]
  // Cycle if a session pool is smaller than its quota (defensive).
  while (targets.length < count) targets.push(freshShuffled[targets.length % freshShuffled.length])
  ;[targets, state] = rngShuffle(targets, state)

  const questions = targets.map((target) => {
    const sound = FORM_BY_KEY.get(target).sound
    let distractors
    ;[distractors, state] = rngShuffle(
      pool.filter((k) => k !== target && FORM_BY_KEY.get(k).sound !== sound),
      state,
    )
    let options
    ;[options, state] = rngShuffle([target, ...distractors.slice(0, optionCount - 1)], state)
    return { target, options }
  })
  return questions
}

/**
 * Jibby's Snack Attack: the boss review. He steals three letters from
 * EARLIER sessions (the review material); level 1 steals from its own pool.
 * Stolen letters have pairwise-distinct sounds so each is findable by ear.
 */
export function pickStolen(n, seed, allForms = false) {
  const pool = allForms ? ALL_BASE : cumulativePool(Math.max(1, n - 1))
  const [shuffled] = rngShuffle(pool, (seed ^ 0x9e37) | 1)
  const chosen = []
  for (const k of shuffled) {
    if (chosen.length === 3) break
    const sound = FORM_BY_KEY.get(k).sound
    if (!chosen.some((c) => FORM_BY_KEY.get(c).sound === sound)) chosen.push(k)
  }
  return chosen
}

/* ============================================================================
   §3 PROGRESSION — the strict cumulative unlocking machine
   sessionsCompleted (persisted) = islands whose GAME level has been beaten.
   learnedSessions = learning phases finished. Guards:
     - learning n is open iff n <= sessionsCompleted + 1
     - game n is open iff learnedSessions >= n (learn before you play)
     - game n draws questions from sessions 1..n (see §2)
   ========================================================================== */

const SAVE_KEY = 'fq3.skylands'
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY)) || {}
    return { sessionsCompleted: s.sessionsCompleted | 0, learnedSessions: s.learnedSessions | 0 }
  } catch {
    return { sessionsCompleted: 0, learnedSessions: 0 }
  }
}
function persist(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    /* session-only */
  }
}

export const canLearn = (st, n) => n >= 1 && n <= SESSIONS.length && n <= st.sessionsCompleted + 1
export const canPlay = (st, n) => n >= 1 && n <= SESSIONS.length && st.learnedSessions >= n && n <= st.sessionsCompleted + 1

function initialState() {
  return { ...loadSave(), mode: 'map', session: 0, heard: [], quiz: null, qIndex: 0, phase: null, correct: 0, burstId: 0, stolen: [] }
}

function reducer(st, a) {
  switch (a.type) {
    case 'OPEN_LEARNING':
      if (!canLearn(st, a.n)) return st
      return { ...st, mode: 'learning', session: a.n, heard: [] }
    case 'HEAR':
      return st.heard.includes(a.key) ? st : { ...st, heard: [...st.heard, a.key] }
    case 'FINISH_LEARNING': {
      if (st.mode !== 'learning' || st.heard.length < SESSIONS[st.session - 1].pool.length) return st
      const learnedSessions = Math.max(st.learnedSessions, st.session)
      persist({ sessionsCompleted: st.sessionsCompleted, learnedSessions })
      return { ...st, learnedSessions, mode: 'game', quiz: buildQuiz(st.session, a.seed, a.allForms), stolen: pickStolen(st.session, a.seed, a.allForms), qIndex: 0, phase: 'question', correct: 0 }
    }
    case 'OPEN_GAME':
      if (!canPlay(st, a.n)) return st
      return { ...st, mode: 'game', session: a.n, quiz: buildQuiz(a.n, a.seed, a.allForms), stolen: pickStolen(a.n, a.seed, a.allForms), qIndex: 0, phase: 'question', correct: 0 }
    case 'PLUCK': {
      if (st.mode !== 'game') return st
      if (st.phase === 'question') {
        const q = st.quiz[st.qIndex]
        if (!q.options.includes(a.key)) return st
        const good = a.key === q.target
        return { ...st, phase: good ? 'good' : 'bad', lastPick: a.key, correct: st.correct + (good ? 1 : 0), burstId: good ? st.burstId + 1 : st.burstId }
      }
      if (st.phase === 'boss') {
        if (!st.stolen.includes(a.key)) return st
        const good = a.key === st.stolen[0]
        return { ...st, phase: good ? 'boss-good' : 'boss-bad', lastPick: a.key, correct: st.correct + (good ? 1 : 0), burstId: good ? st.burstId + 1 : st.burstId }
      }
      return st
    }
    case 'FEEDBACK_DONE': {
      if (st.phase === 'bad') return { ...st, phase: 'question' } // retry same letter
      if (st.phase === 'boss-bad') return { ...st, phase: 'boss' }
      if (st.phase === 'boss-good') {
        const stolen = st.stolen.slice(1)
        if (stolen.length > 0) return { ...st, stolen, phase: 'boss' }
        const sessionsCompleted = Math.max(st.sessionsCompleted, st.session)
        persist({ sessionsCompleted, learnedSessions: st.learnedSessions })
        return { ...st, stolen, sessionsCompleted, phase: 'complete' }
      }
      if (st.qIndex + 1 < st.quiz.length) return { ...st, qIndex: st.qIndex + 1, phase: 'question' }
      return { ...st, phase: 'boss' } // Jibby's Snack Attack: win the stolen letters back
    }
    case 'TO_MAP':
      return { ...st, mode: 'map', session: 0, quiz: null, phase: null }
    default:
      return st
  }
}

/* ============================================================================
   §4 SOUND — thin wrappers over the platform AudioEngine (source cascade,
   cross-fades, memoized misses); chime hints keep the synth floor
   per-letter deterministic.
   ========================================================================== */

function playKey(key, enabled) {
  const form = FORM_BY_KEY.get(key)
  audioEngine.play(`letters/${key}`, {
    enabled,
    chime: { familyIndex: form ? form.familyIndex : 0, order: 1 },
  })
}
function playFx(kind, enabled) {
  audioEngine.playEffect(kind, enabled)
}

/* ============================================================================
   §5 ART — canvas textures shared by sprites and the HUD
   ========================================================================== */

function makeCanvas(size, draw) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  return c
}
function tex(size, draw) {
  const t = new THREE.CanvasTexture(makeCanvas(size, draw))
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function starPath(g, cx, cy, ro, ri) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? ro : ri
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    g[i === 0 ? 'moveTo' : 'lineTo'](cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  g.closePath()
}

const TEXTURES = {}
function lazyTex(name, size, draw) {
  if (!TEXTURES[name]) TEXTURES[name] = tex(size, draw)
  return TEXTURES[name]
}
function glyphTex(char) {
  if (!TEXTURES[char]) {
    TEXTURES[char] = tex(128, (g, s) => {
      g.fillStyle = '#3c2a10'
      g.font = `900 ${s * 0.78}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.strokeStyle = '#fff'
      g.lineWidth = s * 0.09
      g.strokeText(char, s / 2, s / 2 + s * 0.04)
      g.fillText(char, s / 2, s / 2 + s * 0.04)
    })
  }
  return TEXTURES[char]
}

/* Front-facing character art (kept local so this mode stays self-contained /
   standalone-bundleable). These are the detailed chibi versions — tail, paws,
   full mane, cheeks, mouth for Anbessa; crest, heavy brow, spots and a toothy
   grin for Jibby — so the Skylands boss/waiting sprites match the rest of the
   app instead of looking flat. Front-facing is deliberate here: Jibby looms
   toward the player as a boss, Anbessa waits and greets. */
function drawAnbessa(g, s) {
  const cx = s / 2
  // tail with a tuft
  g.strokeStyle = '#e08300'
  g.lineWidth = s * 0.04
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx + s * 0.14, s * 0.8)
  g.quadraticCurveTo(cx + s * 0.34, s * 0.82, cx + s * 0.33, s * 0.66)
  g.stroke()
  g.fillStyle = '#8a5a00'
  g.beginPath()
  g.arc(cx + s * 0.33, s * 0.64, s * 0.045, 0, 7)
  g.fill()
  // body
  g.fillStyle = '#f7a83c'
  g.beginPath()
  g.roundRect(cx - s * 0.15, s * 0.58, s * 0.3, s * 0.32, s * 0.13)
  g.fill()
  // belly
  g.fillStyle = '#ffdfae'
  g.beginPath()
  g.ellipse(cx, s * 0.76, s * 0.1, s * 0.11, 0, 0, 7)
  g.fill()
  // paws
  g.fillStyle = '#e08300'
  for (const px of [-0.08, 0.08]) {
    g.beginPath()
    g.ellipse(cx + px * s, s * 0.895, s * 0.05, s * 0.028, 0, 0, 7)
    g.fill()
  }
  // star on his chest
  starPath(g, cx, s * 0.72, s * 0.062, s * 0.028)
  g.fillStyle = '#ffc800'
  g.fill()
  g.lineWidth = s * 0.012
  g.strokeStyle = '#e0a400'
  g.stroke()
  // mane
  g.fillStyle = '#d97706'
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.beginPath()
    g.arc(cx + Math.cos(a) * s * 0.28, s * 0.4 + Math.sin(a) * s * 0.28, s * 0.1, 0, 7)
    g.fill()
  }
  // ears
  for (const side of [-1, 1]) {
    g.fillStyle = '#f7a83c'
    g.beginPath()
    g.arc(cx + side * s * 0.19, s * 0.17, s * 0.07, 0, 7)
    g.fill()
    g.fillStyle = '#ffdfae'
    g.beginPath()
    g.arc(cx + side * s * 0.19, s * 0.175, s * 0.038, 0, 7)
    g.fill()
  }
  // head
  g.fillStyle = '#f7a83c'
  g.beginPath()
  g.arc(cx, s * 0.4, s * 0.265, 0, 7)
  g.fill()
  // cheeks
  g.fillStyle = 'rgba(255,120,80,0.35)'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(cx + side * s * 0.16, s * 0.46, s * 0.035, 0, 7)
    g.fill()
  }
  // muzzle
  g.fillStyle = '#ffe9c8'
  g.beginPath()
  g.ellipse(cx, s * 0.475, s * 0.115, s * 0.085, 0, 0, 7)
  g.fill()
  // nose
  g.fillStyle = '#8a5a00'
  g.beginPath()
  g.ellipse(cx, s * 0.44, s * 0.034, s * 0.024, 0, 0, 7)
  g.fill()
  // happy mouth
  g.strokeStyle = '#8a5a00'
  g.lineWidth = s * 0.014
  g.lineCap = 'round'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(cx + side * s * 0.032, s * 0.468, s * 0.032, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
  }
  // eyes
  g.fillStyle = '#3c2a10'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.ellipse(cx + side * s * 0.1, s * 0.375, s * 0.027, s * 0.038, 0, 0, 7)
    g.fill()
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(cx + side * s * 0.1 - s * 0.008, s * 0.365, s * 0.009, 0, 7)
    g.fill()
    g.fillStyle = '#3c2a10'
  }
}

function drawJibby(g, s) {
  const cx = s / 2
  // big rounded ears
  for (const side of [-1, 1]) {
    g.fillStyle = '#8a7d6a'
    g.beginPath()
    g.ellipse(cx + side * s * 0.18, s * 0.17, s * 0.08, s * 0.115, side * 0.25, 0, 7)
    g.fill()
    g.fillStyle = '#57493a'
    g.beginPath()
    g.ellipse(cx + side * s * 0.18, s * 0.185, s * 0.045, s * 0.07, side * 0.25, 0, 7)
    g.fill()
  }
  // scruffy crest
  g.fillStyle = '#57493a'
  for (let i = -2; i <= 2; i++) {
    g.beginPath()
    g.moveTo(cx + i * s * 0.055 - s * 0.03, s * 0.185)
    g.lineTo(cx + i * s * 0.055, s * 0.1)
    g.lineTo(cx + i * s * 0.055 + s * 0.03, s * 0.185)
    g.closePath()
    g.fill()
  }
  // head
  g.fillStyle = '#9a8b76'
  g.beginPath()
  g.arc(cx, s * 0.43, s * 0.28, 0, 7)
  g.fill()
  // spots
  g.fillStyle = '#6e614f'
  for (const [px, py, pr] of [[0.3, 0.3, 0.028], [0.68, 0.27, 0.024], [0.74, 0.42, 0.02], [0.26, 0.46, 0.022]]) {
    g.beginPath()
    g.arc(px * s, py * s, pr * s, 0, 7)
    g.fill()
  }
  // heavy brow
  g.strokeStyle = '#57493a'
  g.lineWidth = s * 0.03
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - s * 0.16, s * 0.3)
  g.quadraticCurveTo(cx, s * 0.27, cx + s * 0.16, s * 0.3)
  g.stroke()
  // mischievous eyes
  for (const side of [-1, 1]) {
    g.fillStyle = '#fff'
    g.beginPath()
    g.ellipse(cx + side * s * 0.1, s * 0.36, s * 0.05, s * 0.042, 0, 0, 7)
    g.fill()
    g.fillStyle = '#241c12'
    g.beginPath()
    g.arc(cx + side * s * 0.085, s * 0.372, s * 0.02, 0, 7)
    g.fill()
  }
  // muzzle
  g.fillStyle = '#c9b99d'
  g.beginPath()
  g.ellipse(cx, s * 0.55, s * 0.165, s * 0.125, 0, 0, 7)
  g.fill()
  // nose
  g.fillStyle = '#3a2d1c'
  g.beginPath()
  g.ellipse(cx, s * 0.485, s * 0.045, s * 0.03, 0, 0, 7)
  g.fill()
  // toothy grin
  g.strokeStyle = '#3a2d1c'
  g.lineWidth = s * 0.016
  g.beginPath()
  g.moveTo(cx - s * 0.12, s * 0.575)
  g.quadraticCurveTo(cx, s * 0.655, cx + s * 0.12, s * 0.575)
  g.stroke()
  g.fillStyle = '#fff'
  for (let i = 0; i < 4; i++) {
    const x = cx - s * 0.105 + i * s * 0.056
    const y = s * (0.585 + Math.sin((i / 3) * Math.PI) * 0.028)
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + s * 0.028, y + s * 0.05)
    g.lineTo(x + s * 0.056, y)
    g.closePath()
    g.fill()
  }
}

/* ============================================================================
   §6 3D SCENE
   ========================================================================== */

const ISLAND_GAP = 11
const islandPos = (i) => [i * ISLAND_GAP, 0, i % 2 === 1 ? -2.2 : 0]
const SKY_BY_PROGRESS = ['#a9dcf5', '#ffe6bd', '#ffd6a0', '#f2bfd8', '#a9c7f2']

function Landmark({ kind, rock }) {
  switch (kind) {
    case 'lalibela':
      return (
        <group position={[-2.3, 0.55, 1.6]} scale={0.62}>
          <mesh castShadow position={[0, 0.3, 0]}>
            <boxGeometry args={[2.4, 0.6, 0.8]} />
            <meshStandardMaterial color="#a06a3c" />
          </mesh>
          <mesh castShadow position={[0, 0.3, 0]}>
            <boxGeometry args={[0.8, 0.6, 2.4]} />
            <meshStandardMaterial color="#a06a3c" />
          </mesh>
        </group>
      )
    case 'aksum':
      return (
        <group position={[-2.4, 0.5, 1.4]} scale={0.7}>
          <mesh castShadow position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.28, 0.45, 2.8, 4]} />
            <meshStandardMaterial color="#b0a58c" />
          </mesh>
          <mesh castShadow position={[0.9, 0.7, 0.4]}>
            <cylinderGeometry args={[0.2, 0.32, 1.4, 4]} />
            <meshStandardMaterial color="#a39877" />
          </mesh>
        </group>
      )
    case 'simien':
      return (
        <group position={[-2.4, 0.4, 1.5]} scale={0.75}>
          <mesh castShadow position={[0, 0.9, 0]}>
            <coneGeometry args={[1.1, 1.8, 6]} />
            <meshStandardMaterial color="#55794a" />
          </mesh>
          <mesh castShadow position={[1, 0.6, 0.3]}>
            <coneGeometry args={[0.7, 1.2, 6]} />
            <meshStandardMaterial color="#6b8f5b" />
          </mesh>
        </group>
      )
    case 'massawa':
      return (
        <group position={[-2.3, 0.45, 1.5]} scale={0.65}>
          <mesh castShadow position={[0, 0.55, 0]}>
            <boxGeometry args={[1.8, 1.1, 1.2]} />
            <meshStandardMaterial color="#f2ead8" />
          </mesh>
          <mesh castShadow position={[0.7, 1.35, 0]}>
            <sphereGeometry args={[0.45, 12, 10]} />
            <meshStandardMaterial color="#f2ead8" />
          </mesh>
          <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.6, 20]} />
            <meshStandardMaterial color="#2e86b8" />
          </mesh>
        </group>
      )
    default:
      return null
  }
}

/** A letter fruit hanging in the tree. Springy, pluckable, glyph-labelled. */
function Fruit({ form, position, color, state, heard, onPluck }) {
  // state: 'idle' | 'correct' | 'wrong'
  const [hover, setHover] = useState(false)
  const { scale, pos } = useSpring({
    scale: state === 'correct' ? 0.1 : hover ? 1.25 : 1,
    pos: state === 'correct' ? [0, 5.6, 0] : position,
    config: state === 'correct' ? springConfig.stiff : springConfig.wobbly,
  })
  const wobble = useRef(0)
  const inner = useRef(null)
  useFrame((_, dt) => {
    if (!inner.current) return
    if (state === 'wrong') wobble.current = Math.min(1, wobble.current + dt * 6)
    else wobble.current = Math.max(0, wobble.current - dt * 4)
    inner.current.rotation.z = Math.sin(performance.now() / 60) * 0.35 * wobble.current
  })
  return (
    <animated.group position={pos} scale={scale}>
      <group ref={inner}>
        {/* stem */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 5]} />
          <meshStandardMaterial color="#5c8a3c" />
        </mesh>
        <mesh
          castShadow
          // Fire on press, not click: the fruits float/bob, so a touch that
          // lands and lifts on slightly different coords fails onClick and the
          // tap is lost - which stalls learning (Start stays disabled) and the
          // quiz. onPointerDown registers the tap reliably on mobile.
          onPointerDown={(e) => {
            e.stopPropagation()
            onPluck(form.audioKey)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHover(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHover(false)
            document.body.style.cursor = 'auto'
          }}
        >
          <sphereGeometry args={[0.44, 20, 16]} />
          <meshStandardMaterial color={color} roughness={0.35} emissive={heard ? color : '#000'} emissiveIntensity={heard ? 0.35 : 0} />
        </mesh>
        <Billboard position={[0, 0, 0.46]}>
          <mesh>
            <planeGeometry args={[0.62, 0.62]} />
            <meshBasicMaterial map={glyphTex(form.char)} transparent depthWrite={false} />
          </mesh>
        </Billboard>
      </group>
    </animated.group>
  )
}

/** Gravity-integrated particle burst — the hand-rolled physics moment. */
function Burst({ position, color }) {
  const ref = useRef(null)
  const parts = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        vel: new THREE.Vector3(Math.sin(i * 2.4) * (1.6 + (i % 3)), 2.6 + ((i * 7) % 5) * 0.5, Math.cos(i * 2.4) * (1.6 + ((i + 1) % 3))),
        pos: new THREE.Vector3(...position),
      })),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const life = useRef(0)
  useFrame((_, dt) => {
    life.current += dt
    parts.forEach((p, i) => {
      p.vel.y -= 9.8 * dt // gravity
      p.pos.addScaledVector(p.vel, dt)
      dummy.position.copy(p.pos)
      const s = Math.max(0.001, 0.11 * (1 - life.current / 1.1))
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 22]}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshBasicMaterial color={color} />
    </instancedMesh>
  )
}

/** Plank bridge that springs into place when an island is beaten. */
function Bridge({ from, built }) {
  const a = islandPos(from)
  const b = islandPos(from + 1)
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => {
        const t = (i + 0.5) / 7
        return <Plank key={i} x={a[0] + (b[0] - a[0]) * t} z={a[2] + (b[2] - a[2]) * t} y={0.2 - Math.sin(t * Math.PI) * 0.25} built={built} delay={i * 90} />
      })}
    </group>
  )
}
function Plank({ x, y, z, built, delay }) {
  const { scale } = useSpring({ scale: built ? 1 : 0, delay, config: springConfig.wobbly })
  return (
    <animated.mesh castShadow position={[x, y, z]} scale={scale} rotation={[0, Math.PI / 2, 0]}>
      <boxGeometry args={[1.1, 0.14, 1.5]} />
      <meshStandardMaterial color="#b07c4a" />
    </animated.mesh>
  )
}

function Island({ session, index, unlocked, active, cleared, mode, st, dispatch, soundOn }) {
  const pos = islandPos(index)
  const isLearning = active && mode === 'learning'
  const isGame = active && mode === 'game'
  const question = isGame && st.phase !== 'complete' ? st.quiz[st.qIndex] : null
  const bossing = isGame && typeof st.phase === 'string' && st.phase.startsWith('boss')

  // Fruit set: learning shows the session pool; the game shows the current
  // question's cumulative options. Ring layout around the foliage.
  const fruitKeys = isLearning ? session.pool : bossing ? st.stolen : question ? question.options : session.pool.slice(0, 5)
  // Fruit hang on the CAMERA-FACING side of the canopy in two arcs, so every
  // option is always visible and pluckable (a back-of-tree fruit would be
  // unreachable by the pointer raycaster and could make a question unwinnable).
  const ring = useMemo(
    () =>
      fruitKeys.map((key, i) => {
        if (bossing) {
          // Stolen fruit hover in Jibby's clutches, low and center-front.
          return { key, p: [(i - (fruitKeys.length - 1) / 2) * 1.05, 1.9 + (i % 2) * 0.28, 2.4] }
        }
        // Rows of four keep every fruit inside a narrow portrait frustum.
        const row = Math.floor(i / 4)
        const col = i % 4
        const inRow = Math.min(4, fruitKeys.length - row * 4)
        return {
          key,
          p: [(col - (inRow - 1) / 2) * 0.98, 4.35 - row * 1.12 + (col % 2) * 0.2, 1.28 + ((i * 13) % 3) * 0.14],
        }
      }),
    [fruitKeys.join('|'), bossing], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const rock = unlocked ? session.rock : '#8d8d94'
  const grass = unlocked ? session.grass : '#a5a8ab'

  const pluck = useCallback(
    (key) => {
      if (isLearning) {
        playKey(key, soundOn)
        dispatch({ type: 'HEAR', key })
      } else if (isGame && (st.phase === 'question' || st.phase === 'boss')) {
        dispatch({ type: 'PLUCK', key })
      }
    },
    [isLearning, isGame, st.phase, soundOn, dispatch],
  )

  return (
    <Float speed={1.1} rotationIntensity={0.04} floatIntensity={0.5}>
      <group position={pos}>
        {/* island body */}
        <mesh castShadow receiveShadow position={[0, -1.6, 0]}>
          <cylinderGeometry args={[3.6, 0.9, 3, 8]} />
          <meshStandardMaterial color={rock} flatShading />
        </mesh>
        <mesh receiveShadow position={[0, 0.02, 0]}>
          <cylinderGeometry args={[3.7, 3.7, 0.35, 20]} />
          <meshStandardMaterial color={grass} />
        </mesh>

        {unlocked && <Landmark kind={session.landmark} rock={rock} />}

        {/* the Fidel tree */}
        <mesh castShadow position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.22, 0.42, 2.1, 8]} />
          <meshStandardMaterial color="#7a4a26" />
        </mesh>
        {[[0, 3.3, 0, 1.5], [-1.1, 2.8, 0.4, 1.05], [1.05, 2.9, -0.3, 1.1]].map(([x, y, z, r], i) => (
          <mesh key={i} castShadow position={[x, y, z]}>
            <sphereGeometry args={[r, 18, 14]} />
            <meshStandardMaterial color={unlocked ? '#4f9a44' : '#9aa89a'} roughness={0.8} emissive={active ? '#2f7a2a' : '#000'} emissiveIntensity={active ? 0.35 : 0} />
          </mesh>
        ))}
        {active && <Sparkles count={LOW_END ? 10 : 26} scale={[5, 4, 4]} position={[0, 3.2, 0]} size={4} speed={0.5} color="#ffe9a0" />}

        {/* fruit */}
        {(isLearning || isGame) &&
          ring.map(({ key, p }) => (
            <Fruit
              key={`${st.qIndex}-${key}`}
              form={FORM_BY_KEY.get(key)}
              position={p}
              color={sessionOfKey(key).fruit}
              heard={isLearning && st.heard.includes(key)}
              state={
                !isGame
                  ? 'idle'
                  : st.phase === 'good' && key === st.quiz[st.qIndex].target
                    ? 'correct'
                    : st.phase === 'boss-good' && key === st.stolen[0]
                      ? 'correct'
                      : st.phase === 'bad' || st.phase === 'boss-bad'
                        ? 'wrong'
                        : 'idle'
              }
              onPluck={pluck}
            />
          ))}

        {/* correct-answer burst */}
        {isGame && (st.phase === 'good' || st.phase === 'boss-good') && <Burst key={st.burstId} position={[0, st.phase === 'boss-good' ? 2.4 : 3.4, 1.6]} color="#ffc800" />}
        {bossing && <JibbyBoss remaining={st.stolen.length} agitated={st.phase === 'boss-bad'} />}

        {/* Anbessa waits on the active island; Jibby pops up on a wrong pluck */}
        {active && (
          <>
            <Billboard position={[2.5, 1.15, 1.7]}>
              <mesh>
                <planeGeometry args={[1.9, 1.9]} />
                <meshBasicMaterial map={lazyTex('anbessa', 256, drawAnbessa)} transparent depthWrite={false} />
              </mesh>
            </Billboard>
            <JibbyPeek show={isGame && st.phase === 'bad'} />
          </>
        )}

        {/* lock badge on locked islands */}
        {!unlocked && (
          <Billboard position={[0, 3.4, 1.4]}>
            <mesh>
              <planeGeometry args={[1.3, 1.3]} />
              <meshBasicMaterial
                map={lazyTex('lock', 128, (g, sz) => {
                  g.fillStyle = 'rgba(60,53,41,0.85)'
                  g.beginPath()
                  g.roundRect(sz * 0.3, sz * 0.42, sz * 0.4, sz * 0.34, sz * 0.08)
                  g.fill()
                  g.lineWidth = sz * 0.08
                  g.strokeStyle = 'rgba(60,53,41,0.85)'
                  g.beginPath()
                  g.arc(sz / 2, sz * 0.42, sz * 0.14, Math.PI, 0)
                  g.stroke()
                })}
                transparent
                depthWrite={false}
              />
            </mesh>
          </Billboard>
        )}
        {cleared && (
          <Billboard position={[-2.6, 3.6, 0.6]}>
            <mesh>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                map={lazyTex('star', 128, (g, sz) => {
                  starPath(g, sz / 2, sz / 2, sz * 0.42, sz * 0.18)
                  g.fillStyle = '#ffc800'
                  g.fill()
                })}
                transparent
                depthWrite={false}
              />
            </mesh>
          </Billboard>
        )}
      </group>
    </Float>
  )
}

/** Boss mode: Jibby looms front and center, shrinking with each rescue. */
function JibbyBoss({ remaining, agitated }) {
  const { s, y } = useSpring({
    s: 1.35 + remaining * 0.3 + (agitated ? 0.22 : 0),
    y: 3.15,
    from: { s: 0.2, y: -1.2 },
    config: springConfig.wobbly,
  })
  return (
    <animated.group position-x={0} position-z={1.7} position-y={y} scale={s}>
      <Billboard>
        <mesh>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial map={lazyTex('jibby', 256, drawJibby)} transparent depthWrite={false} />
        </mesh>
      </Billboard>
    </animated.group>
  )
}

function JibbyPeek({ show }) {
  const { y } = useSpring({ y: show ? 1.35 : -1.4, config: springConfig.wobbly })
  return (
    <animated.group position-x={-2.6} position-z={1.9} position-y={y}>
      <Billboard>
        <mesh>
          <planeGeometry args={[1.7, 1.7]} />
          <meshBasicMaterial map={lazyTex('jibby', 256, drawJibby)} transparent depthWrite={false} />
        </mesh>
      </Billboard>
    </animated.group>
  )
}

/** Camera: overview of the archipelago on the map, close-up on an island. */
function CameraRig({ mode, session, sessionsCompleted }) {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(0, 1, 0))
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current += dt
    const k = Math.min(1, dt * 2.2)
    let target, lookAt
    if (mode === 'map') {
      const mid = (Math.min(sessionsCompleted, SESSIONS.length - 1) * ISLAND_GAP) / 2
      // Idle drift: the archipelago breathes instead of freezing in place.
      const sway = Math.sin(t.current * 0.2) * 1.7
      const bob = Math.sin(t.current * 0.13) * 0.5
      target = new THREE.Vector3(mid + sway, 7.5 + bob, 17.5)
      lookAt = new THREE.Vector3(mid + sway * 0.35, 0.6, 0)
    } else {
      const p = islandPos(session - 1)
      target = new THREE.Vector3(p[0] + 0.4, 4.4, p[2] + 9.2)
      lookAt = new THREE.Vector3(p[0], 2.4, p[2])
    }
    camera.position.lerp(target, k)
    look.current.lerp(lookAt, k)
    camera.lookAt(look.current)
  })
  return null
}

/** On the map, Anbessa hops across the bridges to the frontier island. */
function MapAnbessa({ mode, sessionsCompleted }) {
  const group = useRef(null)
  const frontier = islandPos(Math.min(sessionsCompleted, SESSIONS.length - 1))
  const target = useMemo(() => new THREE.Vector3(frontier[0] - 2.2, 1.35, frontier[2] + 2.1), [frontier[0], frontier[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  const pos = useRef(null)
  if (pos.current === null) pos.current = target.clone() // spawn at home, walk only on later progress
  useFrame(() => {
    if (!group.current) return
    const walking = pos.current.distanceTo(target) > 0.15
    if (walking) pos.current.lerp(target, 0.016)
    const now = performance.now()
    const hop = walking ? Math.abs(Math.sin(now / 115)) * 0.4 : Math.sin(now / 520) * 0.07
    group.current.position.set(pos.current.x, pos.current.y + hop, pos.current.z)
  })
  if (mode !== 'map') return null
  return (
    <group ref={group}>
      <Billboard>
        <mesh>
          <planeGeometry args={[1.9, 1.9]} />
          <meshBasicMaterial map={lazyTex('anbessa', 256, drawAnbessa)} transparent depthWrite={false} />
        </mesh>
      </Billboard>
      <Billboard position={[0.95, 1.25, 0]}>
        <mesh>
          <planeGeometry args={[0.65, 0.65]} />
          <meshBasicMaterial
            map={lazyTex('star', 128, (g, sz) => {
              starPath(g, sz / 2, sz / 2, sz * 0.42, sz * 0.18)
              g.fillStyle = '#ffc800'
              g.fill()
            })}
            transparent
            depthWrite={false}
          />
        </mesh>
      </Billboard>
    </group>
  )
}

function Clouds() {
  const group = useRef(null)
  useFrame((_, dt) => {
    if (group.current) group.current.children.forEach((c, i) => {
      c.position.x += dt * (0.25 + (i % 3) * 0.12)
      if (c.position.x > 50) c.position.x = -18
    })
  })
  return (
    <group ref={group}>
      {Array.from({ length: LOW_END ? 5 : 9 }, (_, i) => (
        <mesh key={i} position={[((i * 13) % 60) - 10, 5.5 + ((i * 7) % 5), -14 - ((i * 5) % 9)]}>
          <sphereGeometry args={[1.6 + (i % 3) * 0.7, 10, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.85} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Scene({ st, dispatch, soundOn }) {
  const sky = SKY_BY_PROGRESS[Math.min(st.sessionsCompleted, SKY_BY_PROGRESS.length - 1)]
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 26, 60]} />
      <ambientLight intensity={0.75} color="#fff4e0" />
      <directionalLight castShadow position={[8, 14, 6]} intensity={1.6} color="#fff2d8" shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={40} shadow-camera-top={20} shadow-camera-bottom={-20} />
      <CameraRig mode={st.mode} session={st.session} sessionsCompleted={st.sessionsCompleted} />
      <MapAnbessa mode={st.mode} sessionsCompleted={st.sessionsCompleted} />
      <Clouds />
      {SESSIONS.map((s, i) => (
        <Island key={s.n} session={s} index={i} unlocked={i <= st.sessionsCompleted} active={st.session === s.n} cleared={st.sessionsCompleted >= s.n} mode={st.mode} st={st} dispatch={dispatch} soundOn={soundOn} />
      ))}
      {SESSIONS.slice(0, -1).map((s, i) => (
        <Bridge key={i} from={i} built={st.sessionsCompleted >= s.n} />
      ))}
    </>
  )
}

/* ============================================================================
   §7 UI — HUD overlay + app shell
   ========================================================================== */

const BTN = 'chunk rounded-2xl font-extrabold tracking-wide text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

export default function FidelSkylands({ onExit, allLetters = false }) {
  const [st, dispatch] = useReducer(reducer, undefined, initialState)
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem('fq3.sound') !== '0'
    } catch {
      return true
    }
  })
  const toggleSound = () => {
    setSoundOn((v) => {
      try {
        localStorage.setItem('fq3.sound', v ? '0' : '1')
      } catch {
        /* session-only */
      }
      return !v
    })
  }

  // The fruit glyphs are canvas-baked into GPU textures. If a texture is baked
  // before the bundled Ethiopic font has loaded, the letter comes out blank and
  // stays cached that way ("letters not loading"). Rebake once fonts are ready.
  const [glyphV, setGlyphV] = useState(0)
  useEffect(() => {
    const fonts = typeof document !== 'undefined' ? document.fonts : null
    if (!fonts || !fonts.load) return undefined
    // Common case first: main.jsx preloads the face at startup, so by the
    // time Skylands mounts it is usually ready and the first bake was fine -
    // skip the rebake entirely (a remount would pointlessly tear down the
    // whole R3F scene on exactly the low-end devices this mode protects).
    try { if (fonts.check?.("900 64px 'Noto Sans Ethiopic'")) return undefined } catch { /* fall through */ }
    let cancelled = false
    const rebake = () => {
      if (cancelled) return
      // Drop the cached single-char glyph textures (named textures like
      // 'anbessa'/'star' are longer keys and are kept) so the fruit letters
      // re-bake now that the font is available. Deliberately NOT calling
      // dispose(): the still-mounted scene's materials reference these
      // textures until the keyed remount commits, and disposing live GPU
      // textures blanks the fruit for a frame. The handful of orphaned
      // 128px canvases are garbage-collected with the old scene.
      for (const k of Object.keys(TEXTURES)) {
        if (Array.from(k).length === 1) delete TEXTURES[k]
      }
      setGlyphV((v) => v + 1)
    }
    // Await the Ethiopic font specifically (fonts.ready can resolve before a
    // never-referenced font has even started loading). Rebake on success or
    // failure so we never get stuck on blank fruit.
    Promise.resolve()
      .then(() => fonts.load("900 64px 'Noto Sans Ethiopic'"))
      .then(rebake, rebake)
    return () => { cancelled = true }
  }, [])

  const [hint, setHint] = useState(() => !hasOnboarded('skylands') && !prefersReducedMotion())
  useEffect(() => {
    if (!hasOnboarded('skylands') && prefersReducedMotion()) markOnboarded('skylands')
  }, [])
  useEffect(() => {
    if (hint && st.mode === 'learning' && st.heard.length > 0) {
      markOnboarded('skylands')
      setHint(false)
    }
  }, [hint, st.mode, st.heard.length])

  const question = st.mode === 'game' && st.phase && st.phase !== 'complete' ? st.quiz[st.qIndex] : null
  const targetForm = question ? FORM_BY_KEY.get(question.target) : null
  const bossForm = st.stolen && st.stolen.length ? FORM_BY_KEY.get(st.stolen[0]) : null
  const session = st.session ? SESSIONS[st.session - 1] : null

  // Speak each new question; advance feedback on a timer.
  useEffect(() => {
    if (st.mode === 'game' && st.phase === 'question') playKey(question.target, soundOn)
    if (st.mode === 'game' && st.phase === 'boss' && bossForm) playKey(bossForm.audioKey, soundOn)
  }, [st.mode, st.phase, st.qIndex, st.stolen && st.stolen.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (['good', 'bad', 'boss-good', 'boss-bad'].includes(st.phase)) {
      playFx(st.phase.endsWith('good') ? 'good' : 'bad', soundOn)
      const heard = st.phase.startsWith('boss') ? st.stolen[0] : st.quiz[st.qIndex].target
      if (heard && st.lastPick) recordAnswer(heard, st.lastPick, 'sky')
      const t = setTimeout(() => dispatch({ type: 'FEEDBACK_DONE' }), st.phase.endsWith('good') ? 950 : 1100)
      return () => clearTimeout(t)
    }
    if (st.phase === 'complete') playFx('win', soundOn)
    return undefined
  }, [st.phase, st.qIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const allHeard = st.mode === 'learning' && st.heard.length >= session.pool.length
  const nextLearn = st.sessionsCompleted + 1
  const champion = st.sessionsCompleted >= SESSIONS.length

  return (
    <div className="fixed inset-0" style={{ background: 'var(--paper)' }}>
      <Canvas shadows={!LOW_END} dpr={LOW_END ? [1, 1.25] : [1, 2]} camera={{ fov: 50, position: [0, 7.5, 17.5] }}>
        <Scene key={glyphV} st={st} dispatch={dispatch} soundOn={soundOn} />
      </Canvas>

      {hint && st.mode === 'learning' && typeof window !== 'undefined' && (
        <GhostHand x={window.innerWidth / 2 + 30} y={window.innerHeight * 0.38} visible blocking={false} />
      )}

      {/* ── HUD ── */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="flex items-center gap-2 p-3">
          {st.mode === 'map' && onExit && (
            <button type="button" onClick={() => onExit({ sessionsCompleted: st.sessionsCompleted })} className={`${BTN} pointer-events-auto px-4 py-2 text-sm`} style={{ background: 'var(--card)', color: 'var(--ink)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px' }}>
              {t('home', 'Home')}
            </button>
          )}
          {st.mode !== 'map' && (
            <button type="button" onClick={() => dispatch({ type: 'TO_MAP' })} className={`${BTN} pointer-events-auto px-4 py-2 text-sm`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px' }}>
              {t('skyMap', 'Map')}
            </button>
          )}
          <span className="rounded-2xl px-3 py-1.5 text-sm font-black" style={{ background: 'var(--card)', border: '2px solid var(--line)' }}>
            {st.mode === 'map' && t('skylandsTitle', 'Fidel Skylands')}
            {st.mode === 'learning' && `${t('skySession', 'Session')} ${st.session} · ${session.place}`}
            {st.mode === 'game' && `${t('level', 'Level')} ${st.session} · ${session.place}`}
          </span>
          <span className="ml-auto flex items-center gap-1 rounded-2xl px-3 py-1.5 font-black" style={{ background: 'var(--card)', border: '2px solid var(--line)' }} aria-label={`${st.sessionsCompleted} of ${SESSIONS.length} islands cleared`}>
            <span aria-hidden="true" style={{ color: 'var(--star)' }}>★</span>
            {st.sessionsCompleted}/{SESSIONS.length}
          </span>
          <button type="button" onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'} className={`${BTN} pointer-events-auto px-3 py-1.5 text-sm`} style={{ background: 'var(--card)', color: 'var(--muted)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px' }}>
            {soundOn ? '🔊' : '🔇'}
          </button>
        </header>

        <div className="mt-auto p-3">
          {st.mode === 'map' && (
            <div className="pointer-events-auto mx-auto max-w-md rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
              {champion ? (
                <p className="text-center text-lg font-black" style={{ color: 'var(--go-ink)' }}>
                  {t('skyAllCleared', 'All four skylands cleared — Anbessa is a Fidel Champion!')}
                </p>
              ) : (
                <>
                  <p className="text-center font-bold">
                    <span className="font-black">{SESSIONS[nextLearn - 1].place}, {SESSIONS[nextLearn - 1].country}</span>
                    {' — '}
                    {st.learnedSessions >= nextLearn ? t('skyReady', `ready for Level ${nextLearn}: it tests Sessions 1–${nextLearn}!`, { n: nextLearn }) : t('skyLearnPrompt', `learn Session ${nextLearn}'s letters to wake the tree.`, { n: nextLearn })}
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    <button type="button" onClick={() => dispatch({ type: 'OPEN_LEARNING', n: nextLearn })} className={`${BTN} pointer-events-auto px-5 py-3`} style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep)' }}>
                      {t('skyLearnBtn', `Learn Session ${nextLearn}`, { n: nextLearn })}
                    </button>
                    <button type="button" disabled={st.learnedSessions < nextLearn} onClick={() => dispatch({ type: 'OPEN_GAME', n: nextLearn, seed: (Date.now() % 1000000) | 1, allForms: allLetters })} className={`${BTN} px-5 py-3 pointer-events-auto`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)' }}>
                      {t('skyPlayBtn', `Play Level ${nextLearn}`, { n: nextLearn })}
                    </button>
                  </div>
                  {st.sessionsCompleted > 0 && (
                    <p className="mt-2 text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>
                      {t('skyReplay', 'Replay:')} {SESSIONS.slice(0, st.sessionsCompleted).map((s) => (
                        <button key={s.n} type="button" onClick={() => dispatch({ type: 'OPEN_GAME', n: s.n, seed: (Date.now() % 1000000) | 1, allForms: allLetters })} className="pointer-events-auto mx-1 underline">
                          {t('level', 'Level')} {s.n}
                        </button>
                      ))}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {st.mode === 'learning' && (
            <div className="pointer-events-auto mx-auto max-w-md rounded-3xl border-2 p-4 text-center" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
              <p className="font-bold">
                {t('skyLearnTap', 'Tap every fruit to hear its letter —')}{' '}
                <span className="mono font-black" style={{ color: 'var(--sky)' }}>
                  {st.heard.length}/{session.pool.length}
                </span>
              </p>
              <button type="button" disabled={!allHeard} onClick={() => dispatch({ type: 'FINISH_LEARNING', seed: (Date.now() % 1000000) | 1, allForms: allLetters })} className={`${BTN} mt-3 px-6 py-3`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)' }}>
                {allHeard ? t('skyStartQuest', `Start Level ${st.session} quest`, { n: st.session }) : t('skyListenFirst', 'Listen to them all first')}
              </button>
            </div>
          )}

          {st.mode === 'game' && st.phase !== 'complete' && (
            <div className="pointer-events-auto mx-auto max-w-md rounded-3xl border-2 p-4 text-center" style={{ background: 'var(--card)', borderColor: 'var(--line)' }} aria-live="polite">
              <div className="mb-2 flex justify-center gap-1.5">
                {st.quiz.map((_, i) => (
                  <span key={i} className="block h-2.5 w-2.5 rounded-full" style={{ background: i < st.qIndex ? 'var(--go)' : i === st.qIndex ? 'var(--accent)' : 'var(--line)' }} />
                ))}
              </div>
              {st.phase === 'question' && (
                <p className="font-bold">
                  {t('skyPluck', 'Pluck the fruit that says')}{' '}
                  <button type="button" onClick={() => playKey(question.target, soundOn)} className={`${BTN} pointer-events-auto inline-flex items-center gap-1 px-3 py-1 align-middle`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px' }}>
                    🔊 “{targetForm.sound}”
                  </button>
                </p>
              )}
              {st.phase === 'good' && (
                <p className="text-lg font-black" style={{ color: 'var(--go-ink)' }}>
                  {t('skyRight', 'Yes!')} {targetForm.char} “{targetForm.sound}”
                </p>
              )}
              {st.phase === 'bad' && (
                <p className="text-lg font-black" style={{ color: 'var(--bad-ink)' }}>
                  {t('skyWrong', 'Jibby giggles — listen again for')} “{targetForm.sound}”
                </p>
              )}
              {st.phase === 'boss' && bossForm && (
                <p className="font-bold">
                  <span className="font-black" style={{ color: 'var(--bad-ink)' }}>{t('skyStole', `Jibby stole ${st.stolen.length} letters!`, { n: st.stolen.length })}</span>{' '}
                  {t('skyWinBack', 'Win back the one that says')}{' '}
                  <button type="button" onClick={() => playKey(bossForm.audioKey, soundOn)} className={`${BTN} pointer-events-auto inline-flex items-center gap-1 px-3 py-1 align-middle`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px' }}>
                    🔊 “{bossForm.sound}”
                  </button>
                </p>
              )}
              {st.phase === 'boss-good' && bossForm && (
                <p className="text-lg font-black" style={{ color: 'var(--go-ink)' }}>
                  {t('skyRescued', 'Rescued!')} {bossForm.char} “{bossForm.sound}”
                </p>
              )}
              {st.phase === 'boss-bad' && bossForm && (
                <p className="text-lg font-black" style={{ color: 'var(--bad-ink)' }}>
                  {t('skyHold', 'Jibby holds on tight — listen again for')} “{bossForm.sound}”
                </p>
              )}
            </div>
          )}

          {st.phase === 'complete' && (
            <div className="pointer-events-auto mx-auto max-w-md rounded-3xl border-2 p-5 text-center" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
              <p className="text-2xl font-black uppercase" style={{ color: 'var(--go-ink)' }}>
                {t('skyCleared', 'Island cleared!')}
              </p>
              <p className="mt-1 font-bold" style={{ color: 'var(--muted)' }}>
                {t('skyClearedSub', `${st.quiz.length} letters + 3 rescued from Jibby ·`, { n: st.quiz.length })} {st.session < SESSIONS.length ? t('skyBridge', `the bridge to ${SESSIONS[st.session].place} has grown!`, { place: SESSIONS[st.session].place }) : t('skyAllFree', 'every skyland is free!')}
              </p>
              <button type="button" onClick={() => dispatch({ type: 'TO_MAP' })} className={`${BTN} mt-3 px-8 py-3`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)' }}>
                {t('continue', 'Continue')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
