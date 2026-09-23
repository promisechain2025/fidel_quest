/* ============================================================================
   LETTER RUNNER — 3D WORLD (three.js)
   ----------------------------------------------------------------------------
   The WebGL lane-runner, split out of FidelQuestApp.jsx so the three.js
   stack loads lazily: the home path ships no 3D code, and this chunk is
   fetched only when a capable device enters an arcade node (ArcadeGateway
   lazy-imports it; degraded devices get Runner2D and never load it).
   Every level is set in a famous place in Ethiopia or Eritrea, built
   procedurally from primitives — no image assets. The pure runner machine
   stays in FidelQuestApp §4b: steering Kokeb into a lane gate dispatches
   the same FEED event the 2D buttons used to send.
   ========================================================================== */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Sparkles, Volume2, X } from 'lucide-react'
import {
  Chunky,
  FOCUS,
  Sprite2D,
  starPath,
  drawHyena,
  drawZebra,
  formOf,
  runnerReducer,
  runnerInitial,
  selectRunnerQuestion,
  RunnerEvent,
  RunnerState,
  RUNNER_QPL,
  RUNNER_BASE_SPEED,
  RUNNER_SPEEDS,
  RUNNER_SPEED_ORDER,
  SIGN_SPAWN_Z,
  loadRunnerSpeed,
  saveRunnerSpeed,
  loadRunnerBest,
  saveRunnerBest,
} from './FidelQuestApp'
import { playForm, playEffect } from './platform/audioEngine'
import { recordAnswer } from './platform/telemetry'
import { INDEXES } from './platform/ethiopic'
import { t } from './platform/i18n'
import { LOW_END, savePerf } from './platform/quality'
import { Runner2D } from './components/ArcadeFallback'
import { hasOnboarded, markOnboarded, prefersReducedMotion, tutTargetCenter } from './platform/tutorial'
import { runnerPlaces } from './platform/places'
import GhostHand from './GhostHand'
const LANE_X = [-2.4, 0, 2.4]
const CHUNK = 48
const CHUNK_COUNT = 7

/* The run's geography follows the language being learned: Ethiopian places
   for Amharic, Eritrea + Axum for Tigrinya (platform/places.js). */
export const PLACES = runnerPlaces()
export const placeForLevel = (level) => PLACES[(level - 1) % PLACES.length]

/* ── canvas-drawn textures (glyph signs, Kokeb, the Muncher) ── */

function canvasTexture(size, draw) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function glyphTexture(char) {
  return canvasTexture(256, (g, s) => {
    const face = g.createLinearGradient(0, 16, 0, s - 8)
    face.addColorStop(0, '#f6e7c8')
    face.addColorStop(0.5, '#e4c98a')
    face.addColorStop(1, '#d2b06a')
    g.fillStyle = face
    g.beginPath()
    g.roundRect(10, 10, s - 20, s - 20, 40)
    g.fill()
    g.lineWidth = 7
    g.strokeStyle = '#b08958'
    g.stroke()
    g.fillStyle = '#5c4020'
    g.font = `900 ${s * 0.56}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(char, s / 2, s / 2 + s * 0.02)
  })
}

/* Equirectangular highland sky. The chase camera looks slightly down, so
   the pixels on screen are only the band just above the horizon (texture
   v about 0.37 to 0.50). The warm wash has to live THERE, not at the
   zenith. Fog uses the same horizon colour. A canvas background costs no
   extra mesh, including on the low-end tier. */
function mixSky(skyNum, t, toward) {
  const sky = [(skyNum >> 16) & 255, (skyNum >> 8) & 255, skyNum & 255]
  return sky.map((v, i) => Math.round(v + (toward[i] - v) * t))
}
function rgbNum(rgb) {
  return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]
}
function skyTexture(skyNum) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  // The chase camera only shows v about 0.37–0.50. Blue stays at the top of
  // that band; the golden hour and the far escarpment live on the horizon.
  const haze = mixSky(skyNum, 0.48, [255, 186, 112])
  if (!g) return { tex, fog: rgbNum(haze) }
  const css = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
  const grad = g.createLinearGradient(0, 0, 0, 256)
  // Visible sky is only v 0.37–0.50. Keep that upper half blue; gold is the
  // horizon, not a slab across the whole band.
  grad.addColorStop(0, '#3d6eac')
  grad.addColorStop(0.34, '#5e92c4')
  grad.addColorStop(0.40, '#8eb6d4')
  grad.addColorStop(0.455, '#f2c98a')
  grad.addColorStop(0.50, css(haze))
  grad.addColorStop(1, css(mixSky(skyNum, 0.55, [150, 108, 72])))
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 256)

  // Wisps in the visible band, warm rather than paper-white.
  g.fillStyle = 'rgba(255, 246, 230, 0.42)'
  const puffs = [[64, 102, 40, 11], [92, 98, 24, 13], [150, 108, 22, 8], [214, 104, 30, 10], [246, 100, 16, 9]]
  for (const [x, y, rx, ry] of puffs) {
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    g.fill()
  }

  // Low sun, soft halo, no hard rays. Sits about 14 degrees above the horizon.
  const glow = g.createRadialGradient(392, 108, 4, 392, 108, 78)
  glow.addColorStop(0, 'rgba(255, 250, 230, 0.95)')
  glow.addColorStop(0.16, 'rgba(255, 214, 130, 0.55)')
  glow.addColorStop(0.42, 'rgba(255, 176, 80, 0.16)')
  glow.addColorStop(1, 'rgba(255, 176, 80, 0)')
  g.fillStyle = glow
  g.fillRect(300, 40, 180, 140)
  const column = g.createLinearGradient(392, 88, 392, 136)
  column.addColorStop(0, 'rgba(255, 210, 130, 0)')
  column.addColorStop(0.55, 'rgba(255, 196, 110, 0.22)')
  column.addColorStop(1, 'rgba(255, 186, 100, 0)')
  g.fillStyle = column
  g.fillRect(350, 88, 90, 48)

  // Flat-topped highland line kissing the horizon, so the vista still reads
  // when fog swallows the far meshes.
  g.fillStyle = 'rgba(118, 132, 154, 0.78)'
  g.beginPath()
  g.moveTo(0, 134)
  g.lineTo(0, 122)
  g.lineTo(36, 118)
  g.lineTo(70, 124)
  g.lineTo(70, 112)
  g.lineTo(128, 112)
  g.lineTo(128, 121)
  g.lineTo(176, 116)
  g.lineTo(220, 124)
  g.lineTo(262, 114)
  g.lineTo(318, 114)
  g.lineTo(318, 122)
  g.lineTo(372, 117)
  g.lineTo(424, 126)
  g.lineTo(468, 116)
  g.lineTo(512, 121)
  g.lineTo(512, 134)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(168, 132, 118, 0.45)'
  g.beginPath()
  g.moveTo(0, 136)
  g.lineTo(0, 128)
  g.lineTo(48, 126)
  g.lineTo(90, 130)
  g.lineTo(140, 124)
  g.lineTo(190, 130)
  g.lineTo(250, 125)
  g.lineTo(310, 131)
  g.lineTo(380, 126)
  g.lineTo(450, 132)
  g.lineTo(512, 127)
  g.lineTo(512, 136)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255, 232, 200, 0.38)'
  g.beginPath()
  g.ellipse(256, 130, 250, 9, 0, 0, Math.PI * 2)
  g.fill()
  return { tex, fog: rgbNum(haze) }
}

/* Highland turf and a packed-earth road. Painted once per place (turf) or
   once per world (road). Repeat across the long ground plane. No Math.random:
   the blotches are a fixed weave so a level always looks the same. */
function paintRepeat(draw, w, h, repeatX, repeatY) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (g) draw(g, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  return tex
}
function turfTexture(groundNum) {
  const place = [(groundNum >> 16) & 255, (groundNum >> 8) & 255, groundNum & 255]
  // Meadow first. The place tint is only a wash, so Lalibela stays green
  // highland instead of a brown slab.
  const grass = [86, 158, 58]
  const base = grass.map((v, i) => Math.round(v * 0.72 + place[i] * 0.28))
  const lift = (amt) => base.map((v) => Math.max(0, Math.min(255, v + amt)))
  const css = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
  return paintRepeat((g, w, h) => {
    g.fillStyle = css(base)
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 36; i++) {
      g.globalAlpha = 0.32
      g.fillStyle = css(lift(i % 2 ? 34 : -26))
      g.beginPath()
      g.ellipse((i * 47) % w, (i * 83) % h, 16 + (i % 5) * 5, 8 + (i % 3) * 4, i * 0.4, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 0.75
    g.strokeStyle = css(lift(40))
    g.lineWidth = 1.6
    g.lineCap = 'round'
    for (let i = 0; i < 26; i++) {
      const x = (i * 29) % w
      const y = (i * 53) % h
      g.beginPath()
      g.moveTo(x, y + 12)
      g.quadraticCurveTo(x + 4, y + 5, x - 1, y)
      g.stroke()
    }
    g.globalAlpha = 1
    g.fillStyle = '#e2c056'
    for (let i = 0; i < 5; i++) {
      g.beginPath()
      g.arc((i * 70 + 24) % w, (i * 40 + 18) % h, 2, 0, Math.PI * 2)
      g.fill()
    }
  }, 256, 256, 8, 30)
}
function dirtTexture() {
  return paintRepeat((g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0, '#a87444')
    grad.addColorStop(0.14, '#d4b888')
    grad.addColorStop(0.5, '#f0e0c0')
    grad.addColorStop(0.86, '#d4b888')
    grad.addColorStop(1, '#9a6840')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(110, 72, 36, 0.32)'
    g.lineWidth = 3
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(w * 0.28, 0)
    g.bezierCurveTo(w * 0.34, h * 0.3, w * 0.22, h * 0.62, w * 0.3, h)
    g.stroke()
    g.beginPath()
    g.moveTo(w * 0.72, 0)
    g.bezierCurveTo(w * 0.66, h * 0.35, w * 0.78, h * 0.7, w * 0.7, h)
    g.stroke()
    g.fillStyle = 'rgba(90, 58, 32, 0.28)'
    for (let i = 0; i < 16; i++) {
      g.beginPath()
      g.ellipse((i * 23) % (w - 8) + 4, (i * 41) % (h - 8) + 4, 2 + (i % 3), 1.3, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = 'rgba(255, 246, 226, 0.2)'
    g.fillRect(w * 0.38, 0, w * 0.24, h)
  }, 128, 256, 1, 16)
}
function charTexture(draw, mood) {
  return canvasTexture(256, (g, s) => draw(g, s, mood))
}

let ZEBRA_TEX = null
function zebraAt(g, x, z, scale = 2) {
  ZEBRA_TEX = ZEBRA_TEX || charTexture(drawZebra)
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ZEBRA_TEX, transparent: true }))
  sp.scale.set(scale, scale, 1)
  sp.position.set(x, scale * 0.45, z)
  g.add(sp)
}

function ringTexture() {
  return canvasTexture(128, (g, s) => {
    g.lineWidth = 10
    g.strokeStyle = '#ffc800'
    g.beginPath()
    g.arc(s / 2, s / 2, s * 0.42, 0, 7)
    g.stroke()
  })
}

/* ── the runner characters ── */

/* Anbessa and Jibby are real low-poly meshes in the runner (not billboard
   sprites): chunky bodies from scaled spheres, legs that pivot at the hip so
   they can pump, and a soft blob shadow that grounds them on the track. Both
   are built feet-at-origin facing -Z (down the road, away from the chase
   camera) like every classic kids' runner. */

function sphAt(parent, r, color, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat(color))
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  parent.add(m)
  return m
}

function blobShadow(group, r) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 22),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }),
  )
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.02
  group.add(m)
}

function legAt(parent, x, y, z, r, h, color) {
  const leg = new THREE.Group()
  leg.position.set(x, y, z)
  cyl(leg, r, r + 0.01, h, color, 0, -h / 2, 0)
  sphAt(leg, r + 0.02, color, 0, -h, -0.02, 1, 0.7, 1.15)
  parent.add(leg)
  return leg
}

function buildRunnerLion() {
  const fur = 0xf6b84a
  const deep = 0xd48418
  const mane = 0xc25e0c
  const maneDark = 0x7a3208
  const group = new THREE.Group()
  blobShadow(group, 0.62)
  const body = new THREE.Group()
  group.add(body)
  // Wide hind stance so both back paws read from the chase camera.
  const legs = [[-0.3, 0.36], [0.3, 0.36], [-0.15, -0.34], [0.15, -0.34]]
    .map(([lx, lz], i) => legAt(body, lx, 0.6, lz, i < 2 ? 0.115 : 0.07, i < 2 ? 0.58 : 0.46, deep))
  // Long cub: chest down the road, big haunches toward the camera.
  sphAt(body, 0.18, fur, 0, 0.78, -0.38, 0.9, 0.8, 1.0)
  sphAt(body, 0.24, fur, 0, 0.72, -0.06, 1.1, 0.82, 1.15)
  sphAt(body, 0.3, fur, 0, 0.58, 0.28, 1.28, 0.78, 1.05)
  sphAt(body, 0.12, 0xffe8c4, 0, 0.46, 0.2, 0.7, 0.4, 0.65)
  // Star on the back, where the chase camera looks.
  const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(128, (g, sz) => {
    starPath(g, sz / 2, sz / 2, sz * 0.44, sz * 0.19)
    g.fillStyle = '#ffe14a'
    g.fill()
    g.lineWidth = 8
    g.strokeStyle = '#c98400'
    g.stroke()
  }), transparent: true }))
  star.scale.set(0.58, 0.58, 1)
  star.position.set(0, 0.96, 0.02)
  body.add(star)
  // Tail curls up and out to the side. A straight stick read as a third leg.
  // setMood droops this root; the tip curl stays.
  const tail = new THREE.Group()
  tail.position.set(-0.04, 0.7, 0.48)
  tail.rotation.x = -0.2
  tail.rotation.z = -0.55
  cyl(tail, 0.05, 0.055, 0.28, deep, 0, 0.15, 0)
  const tip = new THREE.Group()
  tip.position.set(0, 0.3, 0)
  tip.rotation.z = -0.35
  cyl(tip, 0.04, 0.042, 0.2, deep, 0, 0.1, 0)
  sphAt(tip, 0.15, 0x4e280c, 0, 0.24, 0, 1.2, 1.05, 0.85)
  tail.add(tip)
  body.add(tail)
  // Mane is one dark cape on the back of the neck, not a ring of beads.
  const head = new THREE.Group()
  head.position.set(0, 1.2, -0.16)
  sphAt(head, 0.15, fur, 0, -0.18, 0.06, 1.05, 0.65, 0.85)
  sphAt(head, 0.36, mane, 0, 0.05, 0.0, 1.35, 1.12, 0.7)
  sphAt(head, 0.3, maneDark, 0, 0.04, 0.12, 1.48, 1.0, 0.36)
  sphAt(head, 0.2, fur, 0, 0.02, -0.14)
  sphAt(head, 0.09, 0xffe6c4, 0, -0.02, -0.26, 1.1, 0.65, 0.9)
  sphAt(head, 0.035, 0x6e4520, 0, 0, -0.34)
  for (const side of [-1, 1]) {
    sphAt(head, 0.045, 0xffffff, side * 0.09, 0.06, -0.2)
    sphAt(head, 0.024, 0x3a2a14, side * 0.09, 0.06, -0.24)
  }
  // Ears stand clear of the mane. Groups so the worried droop still carries them.
  const ears = [-1, 1].map((side) => {
    const ear = new THREE.Group()
    ear.position.set(side * 0.18, 0.42, -0.02)
    ear.rotation.z = side * 0.18
    cone(ear, 0.1, 0.46, 0xf8d48a, 0, 0.22, 0, 6)
    sphAt(ear, 0.05, 0xff9aab, 0, 0.16, 0.03, 0.55, 1.15, 0.35)
    head.add(ear)
    return ear
  })
  body.add(head)
  return { group, body, legs, tail, earL: ears[0], earR: ears[1] }
}

function buildRunnerHyena() {
  const coat = 0xc6ad84
  const spot = 0x2a2118
  const dark = 0x6a5344
  const crest = 0x3c322a
  const belly = 0xf0e2c6
  const group = new THREE.Group()
  blobShadow(group, 0.48)
  const body = new THREE.Group()
  group.add(body)
  const legs = [[-0.15, 0.22], [0.15, 0.22], [-0.13, -0.2], [0.13, -0.2]]
    .map(([lx, lz]) => legAt(body, lx, 0.46, lz, 0.055, 0.42, dark))
  // Sloped torso: haunches low toward the camera, shoulders high down the road.
  const torso = sphAt(body, 0.3, coat, 0, 0.62, 0.02, 0.92, 0.82, 1.5)
  torso.rotation.x = -0.32
  sphAt(body, 0.16, belly, 0, 0.48, 0.08, 0.7, 0.55, 1.1)
  // Bristly crest, tallest over the shoulders.
  for (let i = 0; i < 6; i++) {
    const t = i / 5
    cone(body, 0.045, 0.2 - t * 0.06, crest, 0, 1.02 - t * 0.16, -0.32 + t * 0.55, 5)
  }
  // Spots on the back and flanks, where the chase camera can see them.
  for (const [sx, sy, sz] of [[-0.22, 0.74, 0.3], [0.2, 0.66, 0.34], [-0.1, 0.56, 0.42], [0.18, 0.8, 0.14], [0, 0.86, 0.24], [-0.24, 0.6, 0.08], [0.08, 0.7, 0.38]]) {
    sphAt(body, 0.085, spot, sx, sy, sz, 1.2, 0.7, 0.45)
  }
  const tail = new THREE.Group()
  tail.position.set(0, 0.52, 0.5)
  tail.rotation.x = -0.85
  cyl(tail, 0.03, 0.042, 0.34, crest, 0, 0.16, 0)
  sphAt(tail, 0.07, crest, 0, 0.34, 0)
  body.add(tail)
  // Looks back over the shoulder so the chase camera sees the face.
  // Body still runs down the road.
  const head = new THREE.Group()
  head.position.set(0, 1.08, -0.16)
  head.rotation.y = 2.5
  head.rotation.x = 0.22
  sphAt(head, 0.24, coat, 0, 0.04, 0)
  sphAt(head, 0.14, coat, 0, -0.02, -0.16, 0.9, 0.8, 1.2)
  for (const side of [-1, 1]) {
    const ear = new THREE.Group()
    ear.position.set(side * 0.16, 0.26, 0.02)
    ear.rotation.z = side * -0.15
    cone(ear, 0.14, 0.36, 0xf0d7a2, 0, 0.16, 0, 7)
    sphAt(ear, 0.07, crest, 0, 0.08, -0.02, 0.6, 1, 0.4)
    head.add(ear)
  }
  sphAt(head, 0.13, belly, 0, -0.06, -0.32, 0.85, 0.65, 1.25)
  sphAt(head, 0.055, 0x2c2418, 0, 0, -0.46)
  sphAt(head, 0.1, 0x3a2216, 0, -0.14, -0.34, 1, 0.45, 0.9)
  cone(head, 0.028, 0.07, 0xffffff, 0.05, -0.12, -0.4).rotation.x = Math.PI
  for (const side of [-1, 1]) {
    sphAt(head, 0.062, 0xffffff, side * 0.1, 0.08, -0.22)
    sphAt(head, 0.032, 0x241c12, side * 0.11, 0.075, -0.27)
    sphAt(head, 0.014, 0xffffff, side * 0.09, 0.09, -0.28)
    const brow = cyl(head, 0.02, 0.02, 0.12, crest, side * 0.1, 0.15, -0.22)
    brow.rotation.z = Math.PI / 2 - side * 0.4
  }
  for (const [sx, sy, sz] of [[-0.16, 0.02, -0.08], [0.15, -0.02, -0.1], [0.12, 0.08, 0.06]]) {
    sphAt(head, 0.035, spot, sx, sy, sz, 1, 0.8, 0.6)
  }
  body.add(head)
  return { group, body, legs, tail }
}

/* Diagonal leg pairs swing in opposite phase - a simple believable run. */
function runnerLegSwing(legs, run, amp) {
  for (let i = 0; i < legs.length; i++) {
    legs[i].rotation.x = Math.sin(run + (i % 2 === 0 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * amp
  }
}

/* ── tiny mesh helpers ── */

const MATS = new Map()
function mat(color) {
  if (!MATS.has(color)) MATS.set(color, new THREE.MeshLambertMaterial({ color }))
  return MATS.get(color)
}
function box(g, w, h, d, color, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color))
  m.position.set(x, y, z)
  m.rotation.y = ry
  g.add(m)
  return m
}
function cyl(g, rt, rb, h, color, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color))
  m.position.set(x, y, z)
  g.add(m)
  return m
}
function cone(g, r, h, color, x, y, z, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color))
  m.position.set(x, y, z)
  g.add(m)
  return m
}
function sph(g, r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(color))
  m.position.set(x, y, z)
  g.add(m)
  return m
}

/* A meskel tuft on the track shoulder. One or two per chunk; skipped density
   on the low-end tier so the extra cones stay a handful. */
function grassTuft(g, x, z) {
  const greens = [0x2f6a32, 0x4e8a3c, 0x67b255, 0x3d7a34, 0x8fbe58]
  greens.forEach((c, i) => {
    const blade = cone(g, 0.045, 0.38 + (i % 3) * 0.08, c, x + (i - 2) * 0.09, 0.18, z + ((i % 2) - 0.5) * 0.06, 4)
    blade.rotation.z = (i - 2) * 0.16
  })
  cone(g, 0.035, 0.08, 0xffd34d, x, 0.46, z, 4)
}

const isSharedMat = (m) => { for (const v of MATS.values()) if (v === m) return true; return false }
/** Free the GPU resources of a group before dropping it. three.js does NOT
    reclaim geometry/texture buffers on scene.remove(), so gates (rebuilt every
    question) and chunks (rebuilt every level) leak without this. Per-instance
    geometries always go; the shared MATS colour materials and the shared zebra
    texture are left intact (reused across gates/chunks/worlds). */
function disposeGroup(root) {
  if (!root) return
  root.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    const mats = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : []
    for (const m of mats) {
      if (isSharedMat(m)) continue // never dispose the shared colour cache
      if (m.map && m.map !== ZEBRA_TEX) m.map.dispose() // shared zebra texture stays
      m.dispose()
    }
  })
}

/* ── procedural landmarks; i is the chunk index for deterministic variety ── */

function acacia(g, x, z, s = 1) {
  cyl(g, 0.1 * s, 0.18 * s, 2.4 * s, 0x6b4a2d, x, 1.2 * s, z, 6)
  // Flat highland canopy, not a pine spike.
  cone(g, 2.3 * s, 0.62 * s, 0x3f6e30, x, 2.5 * s, z, 10)
  cone(g, 1.5 * s, 0.4 * s, 0x6a9a48, x, 2.78 * s, z, 9)
}
function palm(g, x, z, s = 1) {
  cyl(g, 0.1 * s, 0.18 * s, 3 * s, 0x8a6a45, x, 1.5 * s, z, 6)
  cone(g, 1.4 * s, 0.8 * s, 0x3f7d3a, x, 3.2 * s, z, 7)
  sph(g, 0.42 * s, 0x2f6330, x, 3 * s, z)
}

function chunkLalibela(g, i) {
  // Red-rock mounds and, on alternating chunks, the sunken cross church.
  for (const side of [-1, 1]) {
    cone(g, 2.6, 3 + ((i * 7 + side) % 3), 0x7d4b2a, side * (11 + ((i * 5) % 4)), 1.4, -10, 7)
    cone(g, 1.8, 2.2, 0x8f5a34, side * (15 + ((i * 3) % 5)), 1.1, -30, 6)
    sph(g, 1, 0x6f4225, side * 9, 0.4, -40)
  }
  if (i % 2 === 0) {
    const side = i % 4 === 0 ? -1 : 1
    const px = side * 13
    box(g, 13, 0.3, 13, 0x5b3018, px, 0.16, -22) // the excavated pit rim
    box(g, 9.5, 0.2, 9.5, 0x3c1f0e, px, 0.32, -22)
    box(g, 6.4, 1.7, 2.1, 0xa06a3c, px, 1.15, -22) // Bete Giyorgis cross arms
    box(g, 2.1, 1.7, 6.4, 0xa06a3c, px, 1.15, -22)
    box(g, 5.4, 0.35, 1.6, 0x7d4b24, px, 2.2, -22) // cross relief on the roof
    box(g, 1.6, 0.35, 5.4, 0x7d4b24, px, 2.2, -22)
  }
  acacia(g, -18 - ((i * 11) % 5), -44, 0.9)
}

function chunkAksum(g, i) {
  // The stelae field: tall carved obelisks and acacia savanna.
  for (const side of [-1, 1]) {
    const h = 7 + ((i * 5 + side * 3) % 7)
    const x = side * (9 + ((i * 3) % 4))
    cyl(g, 0.55, 0.95, h, 0xb0a58c, x, h / 2, -14, 4)
    sph(g, 0.62, 0xb0a58c, x, h + 0.1, -14)
    cyl(g, 0.5, 0.7, 2.2, 0x9c9179, side * 14, 1.1, -34, 4)
    box(g, 1.8, 0.5, 1.8, 0x9c9179, side * 11, 0.25, -42)
  }
  acacia(g, 17 + ((i * 7) % 4), -24, 1.1)
  acacia(g, -19 - ((i * 5) % 4), -8, 0.9)
  if (i % 2 === 0) zebraAt(g, 15 + ((i * 5) % 4), -20, 2)
}

/* Flat-topped amba. y is the ground; the cap is the pale cliff lip. */
function plateau(g, x, z, w, h, d, rock, cap) {
  box(g, w, h, d, rock, x, h / 2, z)
  box(g, w * 0.64, Math.max(0.4, h * 0.28), d * 0.64, cap, x, h + h * 0.1, z)
}

/* Static valley the road runs into. Side walls frame the lanes; the center
   stays open so letter gates keep a clear line to the horizon. */
function buildHighlandVista() {
  const g = new THREE.Group()
  // Far blue ridge, then olive slopes with a tan cliff lip. Not gray blocks.
  plateau(g, -26, -118, 32, 14, 14, 0x6e8eae, 0xc5dcc0)
  plateau(g, 28, -124, 30, 12, 12, 0x7a96b4, 0xd5e4c8)
  plateau(g, 0, -108, 18, 4.2, 10, 0x7aaa48, 0xd4e6a4)
  plateau(g, -30, -52, 14, 8, 16, 0x5f8a3e, 0xe4d2a8)
  plateau(g, 32, -56, 13, 7.5, 14, 0x6a9448, 0xe8d4aa)
  plateau(g, -18, -36, 7, 3.4, 6, 0x78b050, 0xdce8a8)
  plateau(g, 19, -32, 6.5, 3, 5.5, 0x78b050, 0xdce8a8)
  acacia(g, -15, -26, 1.15)
  acacia(g, 16, -42, 1)
  return g
}

function chunkSimien(g, i) {
  // Roadside amba you pass, off the lanes. The far valley is the static vista.
  for (const side of [-1, 1]) {
    const x = side * (17 + ((i * 3) % 4))
    plateau(g, x, -18 - ((i * 5) % 10), 7, 4.5 + ((i + side + 4) % 3), 6, 0x6d8a52, 0xb7c8a0)
    plateau(g, side * (25 + ((i * 2) % 3)), -38, 9, 6 + (i % 3), 8, 0x5c6c56, 0xc8b8a4)
  }
  acacia(g, 12 + ((i * 3) % 3), -50, 0.8)
  if (i % 3 === 0) zebraAt(g, -13, -26, 1.8)
}

function chunkGondar(g, i) {
  // Fasil Ghebbi: round dome-capped towers and crenellated walls.
  if (i % 2 === 0) {
    const side = i % 4 === 0 ? 1 : -1
    const px = side * 12
    box(g, 10, 2.6, 1.2, 0x8a6b4f, px, 1.3, -24)
    for (let t = 0; t < 5; t++) box(g, 0.9, 0.7, 1.3, 0x8a6b4f, px - 4 + t * 2, 2.95, -24)
    cyl(g, 1.5, 1.7, 5.4, 0x96775a, px - 5.5, 2.7, -24, 12)
    sph(g, 1.5, 0xa8886a, px - 5.5, 5.6, -24)
    cyl(g, 1.2, 1.4, 4.2, 0x96775a, px + 5.5, 2.1, -24, 12)
    sph(g, 1.2, 0xa8886a, px + 5.5, 4.4, -24)
  }
  for (const side of [-1, 1]) acacia(g, side * (16 + ((i * 5) % 4)), -42, 1)
  if (i % 3 === 1) zebraAt(g, 14, -8, 1.9)
  cone(g, 2.2, 2.6, 0x5e7d4e, -10, 1.3, -6, 7)
}

function chunkAsmara(g, i) {
  // Art-deco boulevard; every other chunk carries the winged Fiat Tagliero.
  const pastels = [0xe8c9a0, 0xd8a7a0, 0xc9d3c0, 0xd9c9ae]
  for (const side of [-1, 1]) {
    const h = 3.5 + ((i * 3 + (side + 1)) % 3)
    box(g, 5, h, 6, pastels[(i + side + 2) % 4], side * 13, h / 2, -34)
    box(g, 4, h * 0.7, 5, pastels[(i + side + 3) % 4], side * 12, h * 0.35, -12)
    palm(g, side * 8, -24, 1)
    palm(g, side * 8.5, -46, 0.9)
  }
  if (i % 2 === 1) {
    const px = 11
    box(g, 2.2, 5.4, 2.2, 0xf0e8d8, px, 2.7, -22) // the central tower
    box(g, 9, 0.35, 2.6, 0xf0e8d8, px - 4.5, 3.6, -22) // cantilevered wings
    box(g, 9, 0.35, 2.6, 0xf0e8d8, px + 4.5, 3.6, -22)
    box(g, 1.4, 0.8, 1.4, 0xc94f3f, px, 5.8, -22)
  }
}

function chunkMassawa(g, i) {
  // Red Sea port: white coral-stone arches on the left, open sea to the right.
  box(g, 60, 0.12, CHUNK, 0x2e86b8, 26, 0.06, -CHUNK / 2 + 4) // the sea
  const bx = -(10 + ((i * 3) % 3))
  const h = 3 + ((i * 5) % 2)
  box(g, 6, h, 5, 0xf2ead8, bx, h / 2, -18)
  cyl(g, 1.1, 1.1, 2.4, 0xe8dfc8, bx + 2, 1.2, -14, 12)
  sph(g, 1.1, 0xf2ead8, bx + 2, 2.5, -14)
  box(g, 5, 2.6, 4, 0xefe5d0, bx - 1, 1.3, -38)
  palm(g, -8, -30, 1)
  palm(g, -9, -6, 0.85)
  // dhow with a lateen sail
  const sx = 18 + ((i * 7) % 8)
  box(g, 2.6, 0.5, 1, 0x7a5230, sx, 0.4, -26)
  cone(g, 1.1, 2.4, 0xf6f1e4, sx, 1.9, -26, 3)
}

const CHUNK_BUILDERS = {
  lalibela: chunkLalibela,
  aksum: chunkAksum,
  simien: chunkSimien,
  gondar: chunkGondar,
  asmara: chunkAsmara,
  massawa: chunkMassawa,
}

/* ── the world ── */

class RunnerWorld {
  constructor(canvas, onGate) {
    this.onGate = onGate
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW_END })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW_END ? 1.25 : 2))
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(64, 1, 0.1, 260)
    // Classic centered chase camera, straight down the track. The run
    // sprites are drawn from behind at three-quarter (glancing back over
    // the shoulder), so Anbessa faces the letter gates by construction and
    // the lanes line up with the screen: left lane is left of the screen.
    // Close enough that mane, ears, tail, and Jibby read from the chase view.
    this.camera.position.set(0, 2.75, 4.15)
    this.camera.lookAt(0, 1.0, -7)

    this.scene.add(new THREE.HemisphereLight(0xfff8e8, 0x6a9a48, 1.35))
    const sun = new THREE.DirectionalLight(0xfff4d4, 1.65)
    sun.position.set(-6, 12, 4)
    this.scene.add(sun)

    this.skyMap = null

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 560), mat(0x6a8a48))
    this.ground.rotation.x = -Math.PI / 2
    this.ground.position.z = -200
    this.scene.add(this.ground)
    this._turfMat = null
    this.track = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 560), new THREE.MeshLambertMaterial({ map: dirtTexture() }))
    this.track.rotation.x = -Math.PI / 2
    this.track.position.set(0, 0.03, -200)
    this.scene.add(this.track)
    // Green shoulders so the packed-earth road reads against meadow, even
    // when a place's ground colour is red rock.
    for (const side of [-1, 1]) {
      const verge = new THREE.Mesh(new THREE.PlaneGeometry(12, 560), mat(0x6aaa40))
      verge.rotation.x = -Math.PI / 2
      verge.position.set(side * 10.2, 0.018, -200)
      this.scene.add(verge)
    }
    this.vista = buildHighlandVista()
    this.scene.add(this.vista)

    // Anbessa as a real low-poly mesh (feet at the group origin), seen from
    // behind running toward the letters.
    this.playerChar = buildRunnerLion()
    this.player = this.playerChar.group
    this.player.scale.setScalar(1.95)
    this.player.position.set(0, 0, 0)
    this.scene.add(this.player)

    this.ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), transparent: true, opacity: 0 }))
    this.ring.position.set(0, 1.2, 0)
    this.scene.add(this.ring)

    // Kokeb the star rides along above Anbessa, brightening with his power.
    this.buddy = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(128, (g, sz) => {
      starPath(g, sz / 2, sz / 2, sz * 0.44, sz * 0.19)
      g.fillStyle = '#ffc800'
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = '#e0a400'
      g.stroke()
    }), transparent: true }))
    this.buddy.scale.set(0.8, 0.8, 1)
    this.buddy.position.set(-1.1, 2.8, 0)
    this.scene.add(this.buddy)
    this.power = 0

    this.munchChar = buildRunnerHyena()
    this.muncher = this.munchChar.group
    // Beside Anbessa at the same depth, so a phone chase frame shows his
    // whole spotted body. z near the camera cropped him to a sliver.
    this.muncher.scale.setScalar(1.62)
    this.muncher.position.set(1.62, 0, 0.15)
    this.scene.add(this.muncher)
    this._munchScale = 1.62

    // Extra hyenas that join the chase as wrong answers pile up, so the pressure
    // is visible: one more Jibby per mistake, closing in, and swarming Anbessa
    // when the boss round is lost.
    this.extras = []
    for (let i = 0; i < 3; i++) {
      const char = buildRunnerHyena()
      const sp = char.group
      sp.scale.setScalar(0)
      sp.position.set(0, 0, 7.5)
      this.scene.add(sp)
      this.extras.push({ sp, char, sc: 0 })
    }

    this.chunks = []
    this.gate = null
    this.laneIndex = 1
    this.speedScale = 1
    this.speed = RUNNER_BASE_SPEED
    this.threat = 0 // 0..RUNNER_QPL wrong feeds
    this.bossMode = null // null | 'win' | 'lose'
    this.ringT = -1
    this.t = 0
    this.disposed = false
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  setPlace(place) {
    const prevSky = this.skyMap
    const sky = skyTexture(place.sky)
    this.skyMap = sky.tex
    this.scene.background = this.skyMap
    this.scene.fog = new THREE.Fog(sky.fog, place.fog[0] + 28, place.fog[1])
    if (prevSky) prevSky.dispose()
    const prevTurf = this._turfMat
    this._turfMat = new THREE.MeshLambertMaterial({ map: turfTexture(place.ground) })
    this.ground.material = this._turfMat
    if (prevTurf) {
      prevTurf.map?.dispose()
      prevTurf.dispose()
    }
    for (const c of this.chunks) { this.scene.remove(c); disposeGroup(c) }
    this.chunks = []
    const build = CHUNK_BUILDERS[place.builder] || CHUNK_BUILDERS[place.id]
    for (let k = 0; k < CHUNK_COUNT; k++) {
      const g = new THREE.Group()
      build(g, k)
      const side = k % 2 === 0 ? -1 : 1
      grassTuft(g, side * 5.15, -8)
      if (!LOW_END) grassTuft(g, -side * 5.25, -28)
      // Pale shoulder and lane dashes ride in the chunk so the road reads as moving.
      box(g, 0.16, 0.02, CHUNK * 0.92, 0xf3e6c8, -3.55, 0.055, -CHUNK / 2)
      box(g, 0.16, 0.02, CHUNK * 0.92, 0xf3e6c8, 3.55, 0.055, -CHUNK / 2)
      for (let d = 0; d < 6; d++) {
        box(g, 0.16, 0.02, 1.5, 0xf7f0dc, -1.15, 0.06, -4 - d * 8)
        box(g, 0.16, 0.02, 1.5, 0xf7f0dc, 1.15, 0.06, -4 - d * 8)
      }
      g.position.z = -k * CHUNK + 10
      this.scene.add(g)
      this.chunks.push(g)
    }
  }

  setQuestion(options) {
    this.clearGate()
    const g = new THREE.Group()
    for (let lane = 0; lane < 3; lane++) {
      const form = INDEXES.byAudioKey.get(options[lane])
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        new THREE.MeshBasicMaterial({ map: glyphTexture(form.char), transparent: true }),
      )
      sign.position.set(LANE_X[lane], 1.95, 0)
      g.add(sign)
      cyl(g, 0.07, 0.07, 1.6, 0x8a6a45, LANE_X[lane], 0.55, 0, 6)
    }
    box(g, 8.4, 0.18, 0.18, 0xc4a36a, 0, 3, 0)
    cyl(g, 0.09, 0.09, 3, 0x8a6a45, -4.1, 1.5, 0, 6)
    cyl(g, 0.09, 0.09, 3, 0x8a6a45, 4.1, 1.5, 0, 6)
    g.position.z = SIGN_SPAWN_Z
    this.gate = g
    this.gatePassed = false
    this.scene.add(g)
  }

  clearGate() {
    if (this.gate) {
      this.scene.remove(this.gate)
      disposeGroup(this.gate) // free the 3 glyph textures + geometries this gate built
      this.gate = null
    }
  }

  burst() {
    this.ringT = 0
  }

  /** Kid-selectable pace: scales how fast the track (and letters) approach. */
  setSpeed(scale) {
    this.speedScale = scale
    this.speed = RUNNER_BASE_SPEED * scale
  }

  tick(dt, running) {
    if (this.disposed) return
    this.t += dt
    const dz = running ? this.speed * dt : this.speed * dt * 0.25

    for (const c of this.chunks) {
      c.position.z += dz
      if (c.position.z > CHUNK + 14) c.position.z -= CHUNK_COUNT * CHUNK
    }
    if (this.gate) {
      this.gate.position.z += dz
      if (!this.gatePassed && this.gate.position.z >= -0.2) {
        this.gatePassed = true
        this.onGate(this.laneIndex)
      }
      if (this.gate.position.z > 12) this.clearGate()
    }

    const px = LANE_X[this.laneIndex]
    const steer = px - this.player.position.x
    this.player.position.x += steer * Math.min(1, dt * 10)
    // Bounce and pump the legs (the blob shadow stays on the ground); lean
    // the whole body toward the lane being steered to.
    this.playerChar.body.position.y = this.reduced ? 0 : Math.abs(Math.sin(this.t * 9)) * 0.1
    if (!this.reduced) runnerLegSwing(this.playerChar.legs, this.t * 10, 0.65)
    this.player.rotation.z = Math.max(-0.22, Math.min(0.22, -steer * 0.35))

    // The Muncher: closer with every wrong feed; lunges or flees at the boss.
    // Rest pose stays in frame beside Anbessa. Each miss steps him forward.
    let mz = 0.15 - this.threat * 0.06
    let my = 0
    if (this.bossMode === 'lose') mz = 0.02
    if (this.bossMode === 'win') {
      mz = 10.5
      my = 4
    }
    this.muncher.position.z += (mz - this.muncher.position.z) * Math.min(1, dt * (this.bossMode ? 4 : 2.5))
    // Chase from the right shoulder so he never hides Anbessa; pile straight
    // on when the boss round is lost.
    const mx = this.player.position.x * 0.45 + (this.bossMode === 'lose' ? 0.1 : 1.58)
    this.muncher.position.x += (mx - this.muncher.position.x) * Math.min(1, dt * 2)
    this.muncher.position.y += (my - this.muncher.position.y) * Math.min(1, dt * 3)
    this.munchChar.body.position.y = this.reduced ? 0 : Math.abs(Math.sin(this.t * 7)) * 0.08
    if (!this.reduced) runnerLegSwing(this.munchChar.legs, this.t * 10.5, 0.6)
    const mscale = this.bossMode === 'lose' ? 2.15 : 1.62
    this._munchScale += (mscale - this._munchScale) * Math.min(1, dt * 4)
    // Jibby leans toward the lion he is chasing.
    this.muncher.rotation.z = Math.max(-0.24, Math.min(0.24, (this.player.position.x - this.muncher.position.x) * 0.18))
    this.muncher.scale.setScalar(this._munchScale)

    // The growing pack: one extra Jibby per mistake beyond the first, flanking
    // and closing in; on a lost boss they all pile onto Anbessa.
    for (let i = 0; i < this.extras.length; i++) {
      const e = this.extras[i]
      const active = this.bossMode === 'lose' || this.threat > i + 1
      const target = active ? (this.bossMode === 'lose' ? 2.2 : 1.5) : 0
      e.sc += (target - e.sc) * Math.min(1, dt * 4)
      const side = i % 2 === 0 ? -1 : 1
      const tx = this.player.position.x * 0.6 + side * (1.7 + i * 0.35)
      const tz = this.bossMode === 'lose' ? 0.9 + i * 0.7 : 4.4 - this.threat * 0.7 + i * 0.9
      e.sp.position.x += (tx - e.sp.position.x) * Math.min(1, dt * 2)
      e.sp.position.z += (tz - e.sp.position.z) * Math.min(1, dt * (this.bossMode ? 4 : 2))
      e.char.body.position.y = this.reduced ? 0 : Math.abs(Math.sin(this.t * 7 + i * 1.7)) * 0.08
      if (!this.reduced && e.sc > 0.2) runnerLegSwing(e.char.legs, this.t * 10.5 + i * 1.3, 0.6)
      e.sp.rotation.z = Math.max(-0.24, Math.min(0.24, (this.player.position.x - e.sp.position.x) * 0.16))
      e.sp.scale.setScalar(e.sc)
    }

    if (this.ringT >= 0) {
      this.ringT += dt
      const k = this.ringT / 0.55
      if (k >= 1) {
        this.ringT = -1
        this.ring.material.opacity = 0
      } else {
        this.ring.position.set(this.player.position.x, 1.2 + this.playerChar.body.position.y, 0.1)
        this.ring.scale.setScalar(1.2 + k * 3.2)
        this.ring.material.opacity = 1 - k
      }
    }

    const bs = 0.7 + this.power * 0.13 + (this.reduced ? 0 : Math.sin(this.t * 5) * 0.05)
    this.buddy.scale.set(bs, bs, 1)
    this.buddy.position.set(this.player.position.x - 1.15, 2.75 + this.playerChar.body.position.y, 0)
    this.buddy.material.rotation = Math.sin(this.t * 2.2) * 0.25

    this.renderer.render(this.scene, this.camera)
  }

  setMood(worried) {
    // Readable from behind: worried droops the ears sideways and the tail down.
    const c = this.playerChar
    for (const [ear, side] of [[c.earL, -1], [c.earR, 1]]) {
      ear.position.y = worried ? 0.22 : 0.42
      ear.rotation.z = worried ? side * -0.9 : side * 0.18
    }
    c.tail.rotation.x = worried ? 1.15 : -0.2
    c.tail.rotation.z = worried ? -0.2 : -0.55
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.disposed = true
    // renderer.dispose() alone leaves uploaded geometry/texture buffers; walk
    // the whole scene freeing per-instance resources first (shared MATS + zebra
    // texture survive for the next world, which reuses them).
    if (this.skyMap) { this.skyMap.dispose(); this.skyMap = null }
    this.scene.background = null
    disposeGroup(this.scene)
    this.renderer.dispose()
  }
}

/* ── the 3D runner screen ── */

export default function Runner({ seed, soundOn, onExit, onRetry, pool }) {
  const [ctx, dispatch] = useReducer(runnerReducer, { seed, pool }, (a) => runnerInitial(a.seed, a.pool))
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const worldRef = useRef(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const [lane, setLane] = useState(1)
  const [speedName, setSpeedName] = useState(loadRunnerSpeed)
  const [webglOk, setWebglOk] = useState(true)
  const [banner, setBanner] = useState(true)
  const [demo, setDemo] = useState(() => !hasOnboarded('runner') && !prefersReducedMotion())
  const demoRef = useRef(demo)
  demoRef.current = demo
  const [hand, setHand] = useState({ x: null, y: null })
  const [yourTurn, setYourTurn] = useState(false)
  const endDemo = useCallback(() => {
    markOnboarded('runner')
    setDemo(false)
    setHand({ x: null, y: null })
    setYourTurn(true)
    setTimeout(() => setYourTurn(false), 1700)
  }, [])
  useEffect(() => {
    if (!hasOnboarded('runner') && prefersReducedMotion()) markOnboarded('runner')
  }, [])

  const question = selectRunnerQuestion(ctx)
  const targetForm = question ? formOf(question.target) : null
  const place = placeForLevel(ctx.level)
  const running = ctx.status === RunnerState.RUNNING
  const feeding = ctx.status === RunnerState.FEEDING
  const boss = ctx.status === RunnerState.BOSS
  const destroyed = ctx.status === RunnerState.DESTROYED

  const steerTo = useCallback((target) => {
    setLane(() => {
      const next = Math.max(0, Math.min(2, target))
      if (worldRef.current) worldRef.current.laneIndex = next
      return next
    })
  }, [])
  const steer = useCallback((delta) => {
    setLane((l) => {
      const next = Math.max(0, Math.min(2, l + delta))
      if (worldRef.current) worldRef.current.laneIndex = next
      return next
    })
  }, [])

  // World lifecycle.
  useEffect(() => {
    let world
    try {
      world = new RunnerWorld(canvasRef.current, (laneIdx) => {
        const q = selectRunnerQuestion(ctxRef.current)
        if (q) dispatch({ type: RunnerEvent.FEED, payload: { audioKey: q.options[laneIdx] } })
      })
    } catch {
      // Remember 3D is not viable so every future arcade entry routes straight
      // to the 2D fallback instead of re-failing here.
      savePerf('low')
      setWebglOk(false)
      return undefined
    }
    worldRef.current = world
    world.setSpeed(RUNNER_SPEEDS[speedName] ?? 1)
    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const st = ctxRef.current.status
      try {
        world.tick(dt, st === RunnerState.RUNNING)
      } catch {
        // A mid-run WebGL context loss makes render throw; drop to the 2D
        // fallback rather than freezing the loop (and the game) silently.
        savePerf('low')
        setWebglOk(false)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const ro = new ResizeObserver(() => {
      const r = wrapRef.current?.getBoundingClientRect()
      if (r) world.resize(r.width, r.height)
    })
    ro.observe(wrapRef.current)
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') steer(-1)
      if (e.key === 'ArrowRight') steer(1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', onKey)
      world.dispose()
      worldRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the chosen pace to the live world and remember it.
  useEffect(() => {
    worldRef.current?.setSpeed(RUNNER_SPEEDS[speedName] ?? 1)
    saveRunnerSpeed(speedName)
  }, [speedName])

  // Level changes re-dress the world and show the destination banner.
  useEffect(() => {
    const world = worldRef.current
    if (!world) return undefined
    world.setPlace(place)
    world.speed = Math.min(30, 16 + (ctx.level - 1) * 2.2)
    setBanner(true)
    const t = setTimeout(() => setBanner(false), 1900)
    return () => clearTimeout(t)
  }, [ctx.level, webglOk]) // eslint-disable-line react-hooks/exhaustive-deps

  // Machine-state side effects drive the 3D scene.
  useEffect(() => {
    const world = worldRef.current
    if (!world) return undefined
    world.threat = ctx.wrong
    world.power = ctx.correct
    if (running) {
      world.bossMode = null
      world.setMood(false)
      world.setQuestion(question.options)
      playForm(targetForm, soundOn)
    }
    if (feeding) {
      world.clearGate()
      playEffect(ctx.lastFeed?.good ? 'good' : 'bad', soundOn)
      const fedQ = ctx.queue[ctx.qIndex]
      if (fedQ && ctx.lastFeed && !demoRef.current) recordAnswer(fedQ.target, ctx.lastFeed.audioKey, 'runner')
      if (demoRef.current) endDemo()
      if (ctx.lastFeed?.good) world.burst()
      else world.setMood(true)
      const t = setTimeout(() => dispatch({ type: RunnerEvent.FEED_DONE }), 900)
      return () => clearTimeout(t)
    }
    if (boss) {
      world.bossMode = ctx.survivedBoss ? 'win' : 'lose'
      world.setMood(!ctx.survivedBoss)
      playEffect(ctx.survivedBoss ? 'win' : 'bad', soundOn)
      const t = setTimeout(() => dispatch({ type: RunnerEvent.BOSS_DONE }), 2200)
      return () => clearTimeout(t)
    }
    return undefined
  }, [ctx.status, ctx.qIndex, ctx.level]) // eslint-disable-line react-hooks/exhaustive-deps

  // Demo driver: nudge Anbessa toward the correct gate, one tap at a time.
  useEffect(() => {
    if (!demo || ctx.status !== RunnerState.RUNNING || !question) return undefined
    const correctLane = question.options.indexOf(question.target)
    const t = setInterval(() => {
      if (lane < correctLane) {
        setHand(tutTargetCenter('steer-right') || { x: null, y: null })
        steer(1)
      } else if (lane > correctLane) {
        setHand(tutTargetCenter('steer-left') || { x: null, y: null })
        steer(-1)
      } else {
        setHand({ x: null, y: null })
      }
    }, 750)
    return () => clearInterval(t)
  }, [demo, ctx.status, ctx.qIndex, lane]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!destroyed) return
    const best = loadRunnerBest()
    if (ctx.fed > best.fed) saveRunnerBest({ fed: ctx.fed, level: ctx.level })
  }, [destroyed]) // eslint-disable-line react-hooks/exhaustive-deps

  if (destroyed) {
    return <RunnerDestroyed ctx={ctx} onRetry={onRetry} onExit={onExit} />
  }

  // WebGL unavailable (context creation failed, or lost mid-run): fall to the
  // fully-playable WebGL-free 2D runner instead of a dead static screen, so a
  // required arcade node can still be completed and the child is never stuck.
  if (!webglOk) {
    return <Runner2D seed={seed} soundOn={soundOn} onExit={onExit} pool={pool} />
  }

  return (
    <div className="mx-auto flex h-screen max-w-xl flex-col px-4 pb-4 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={() => onExit({ level: ctxRef.current.level, survivedBoss: ctxRef.current.survivedBoss })} aria-label={t('runQuit', 'Quit run')} className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <X className="h-6 w-6" />
        </button>
        <span className="rounded-xl px-2.5 py-1 text-xs font-black text-white" style={{ background: 'var(--sky)' }}>
          L{ctx.level} · {place.name}
        </span>
        <div className="flex flex-1 items-center justify-center gap-1.5" aria-label={`Power ${ctx.correct}, Muncher ${ctx.wrong}, of ${RUNNER_QPL} meals`}>
          {Array.from({ length: RUNNER_QPL }, (_, i) => {
            const state = i < ctx.correct ? 'power' : i < ctx.correct + ctx.wrong ? 'muncher' : 'empty'
            return <motion.span key={i} className="block h-3.5 w-3.5 rounded-full" animate={{ background: state === 'power' ? 'var(--go)' : state === 'muncher' ? 'var(--bad)' : 'var(--line)', scale: state === 'empty' ? 0.8 : 1 }} />
          })}
        </div>
        <span className="mono flex items-center gap-1 rounded-xl px-2.5 py-1 text-sm font-black" style={{ background: 'var(--card)', border: '2px solid var(--line)' }} aria-label={`${ctx.fed} letters fed`}>
          <Sparkles className="h-4 w-4" style={{ color: 'var(--star)' }} aria-hidden="true" />
          {ctx.fed}
        </span>
      </header>

      <div ref={wrapRef} className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-3xl border-2" style={{ borderColor: 'var(--line)' }}>
        {webglOk ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              steerTo(Math.min(2, Math.floor(((e.clientX - r.left) / r.width) * 3)))
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center font-bold" style={{ color: 'var(--muted)' }}>
            3D graphics are not available on this device. Try the lesson levels instead!
          </div>
        )}
        {/* Speed selector — kids pick how fast the letters come. */}
        <div className="absolute left-2 top-2 z-20 flex items-center gap-1 rounded-full p-1" style={{ background: 'rgba(0,0,0,0.4)' }}>
          {RUNNER_SPEED_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeedName(s)}
              aria-pressed={speedName === s}
              className={`rounded-full px-2.5 py-1 text-xs font-black ${FOCUS}`}
              style={{ background: speedName === s ? 'var(--sky)' : 'transparent', color: '#fff', outlineColor: 'var(--sky)' }}
            >
              {t(`speed_${s}`, s)}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {banner && (
            <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 top-14 text-center">
              <span className="rounded-2xl px-4 py-2 text-sm font-black uppercase tracking-widest text-white" style={{ background: 'rgba(0,0,0,0.45)' }}>
                Level {ctx.level} — {place.name}, {place.country}
              </span>
            </motion.div>
          )}
          {boss && (
            <motion.div key="bosscap" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 bottom-5 text-center">
              <span className="rounded-2xl px-4 py-2 text-base font-black uppercase tracking-wider text-white" style={{ background: ctx.survivedBoss ? 'var(--go)' : 'var(--bad)' }}>
                {ctx.survivedBoss ? t('runBossWin', 'Anbessa’s letter power wins!') : t('runBossAttack', 'Jibby the hyena attacks!')}
              </span>
            </motion.div>
          )}
          {feeding && !ctx.lastFeed?.good && (
            <motion.div key="flash" className="pointer-events-none absolute inset-0" style={{ background: 'var(--bad)' }} initial={{ opacity: 0.4 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        <p className="text-center font-extrabold" aria-live="polite">
          {t('steerInto', 'Steer Anbessa into')}{' '}
          <button
            type="button"
            onClick={() => playForm(targetForm, soundOn)}
            disabled={boss}
            className={`chunk inline-flex items-center gap-1.5 rounded-xl px-3 py-1 align-middle text-white ${FOCUS}`}
            style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}
            aria-label={`Play the sound ${targetForm?.sound} again`}
          >
            <Volume2 className="h-5 w-5" aria-hidden="true" />“{targetForm?.sound}”
          </button>
        </p>
        <div className="flex items-center gap-2.5">
          {demo && <GhostHand x={hand.x} y={hand.y} visible onSkip={endDemo} />}
          <AnimatePresence>
            {yourTurn && (
              <motion.p initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-x-0 top-1/3 z-50 text-center text-3xl font-black" style={{ color: 'var(--go-ink)' }}>
                Your turn!
              </motion.p>
            )}
          </AnimatePresence>
          <Chunky tone="card" className="flex h-16 flex-1 items-center justify-center" aria-label={t('runMoveLeft', 'Move left')} onClick={() => steer(-1)} data-tut="steer-left">
            <ChevronLeft className="h-8 w-8" aria-hidden="true" />
          </Chunky>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="block h-2.5 w-6 rounded-full" style={{ background: i === lane ? 'var(--accent)' : 'var(--line)' }} />
            ))}
          </div>
          <Chunky tone="card" className="flex h-16 flex-1 items-center justify-center" aria-label={t('runMoveRight', 'Move right')} onClick={() => steer(1)} data-tut="steer-right">
            <ChevronLeft className="h-8 w-8 rotate-180" aria-hidden="true" />
          </Chunky>
        </div>
      </div>
    </div>
  )
}

/** Jibby the hyena, drawn from the same art as his 3D sprite. */
function Muncher({ size = 56 }) {
  return (
    <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}>
      <Sprite2D draw={drawHyena} size={size} />
    </motion.div>
  )
}

function RunnerDestroyed({ ctx, onRetry, onExit }) {
  const best = loadRunnerBest()
  const isBest = ctx.fed >= best.fed && ctx.fed > 0
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-10 text-center">
      <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 14 }}>
        <Muncher size={96} />
      </motion.div>
      <h1 className="mt-5 text-3xl font-black uppercase tracking-wide" style={{ color: 'var(--bad-ink)' }}>
        {t('munched', 'Munched!')}
      </h1>
      <p className="mt-2 max-w-xs font-bold" style={{ color: 'var(--muted)' }}>
        Jibby the hyena caught Anbessa in {placeForLevel(ctx.level).name}, {placeForLevel(ctx.level).country} (level {ctx.level}). Feed him more correct letters to keep him strong!
      </p>

      <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Letters fed
          </p>
          <p className="mono flex items-center justify-center gap-1 text-2xl font-black" style={{ color: 'var(--go-ink)' }}>
            <Sparkles className="h-5 w-5" style={{ color: 'var(--star)' }} aria-hidden="true" />
            {ctx.fed}
          </p>
        </div>
        <div className="rounded-2xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {isBest ? t('runNewBest', 'New best!') : t('runBest', 'Best')}
          </p>
          <p className="mono text-2xl font-black" style={{ color: 'var(--accent)' }}>
            {Math.max(best.fed, ctx.fed)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <Chunky tone="go" className="w-full py-4 text-base uppercase" onClick={onRetry}>
          {t('runAgain', 'Run again')}
        </Chunky>
        <Chunky tone="card" className="w-full py-4 text-base uppercase" onClick={() => onExit({ level: ctx.level, survivedBoss: ctx.survivedBoss })}>
          {t('home', 'Home')}
        </Chunky>
      </div>
    </div>
  )
}

