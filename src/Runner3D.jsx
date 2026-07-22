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
import { LOW_END } from './platform/quality'
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
    g.fillStyle = '#fffdf6'
    g.beginPath()
    g.roundRect(8, 8, s - 16, s - 16, 36)
    g.fill()
    g.lineWidth = 10
    g.strokeStyle = '#e0b25a'
    g.stroke()
    g.fillStyle = '#3c3529'
    g.font = `900 ${s * 0.62}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(char, s / 2, s / 2 + s * 0.03)
  })
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
  const group = new THREE.Group()
  blobShadow(group, 0.46)
  const body = new THREE.Group()
  group.add(body)
  const legs = [[-0.15, 0.16], [0.15, 0.16], [-0.15, -0.14], [0.15, -0.14]]
    .map(([lx, lz]) => legAt(body, lx, 0.44, lz, 0.065, 0.42, 0xe08300))
  sphAt(body, 0.34, 0xf7a83c, 0, 0.64, 0.03, 1, 1.02, 1.3)
  // his signature star on the rump
  const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(128, (g, sz) => {
    starPath(g, sz / 2, sz / 2, sz * 0.44, sz * 0.19)
    g.fillStyle = '#ffc800'
    g.fill()
    g.lineWidth = 6
    g.strokeStyle = '#e0a400'
    g.stroke()
  }), transparent: true }))
  star.scale.set(0.28, 0.28, 1)
  star.position.set(-0.18, 0.74, 0.52)
  body.add(star)
  // tail up and wagging when happy; setMood droops it
  const tail = new THREE.Group()
  tail.position.set(0.12, 0.7, 0.34)
  tail.rotation.x = 0.3
  tail.rotation.z = -0.7
  cyl(tail, 0.04, 0.05, 0.45, 0xe08300, 0, 0.22, 0)
  sphAt(tail, 0.08, 0x8a5a00, 0, 0.47, 0)
  body.add(tail)
  // head straight down the road: the mane halo IS the silhouette
  const head = new THREE.Group()
  head.position.set(0, 1.08, -0.06)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    sphAt(head, 0.125, 0xd97706, Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0.02, 1, 1, 0.7)
  }
  sphAt(head, 0.24, 0xf7a83c, 0, 0, -0.04)
  // ears poke out past the mane; groups so the worried droop carries the pinks
  const ears = [-1, 1].map((side) => {
    const ear = new THREE.Group()
    ear.position.set(side * 0.26, 0.3, 0)
    sphAt(ear, 0.1, 0xf7a83c, 0, 0, 0, 1, 1, 0.6)
    sphAt(ear, 0.05, 0xffb7c5, 0, 0.01, 0.06, 1, 1, 0.5)
    head.add(ear)
    return ear
  })
  body.add(head)
  return { group, body, legs, tail, earL: ears[0], earR: ears[1] }
}

function buildRunnerHyena() {
  const coat = 0x9a8b76, dark = 0x6e614f, crest = 0x57493a, belly = 0xc9b99d
  const group = new THREE.Group()
  blobShadow(group, 0.42)
  const body = new THREE.Group()
  group.add(body)
  const legs = [[-0.14, 0.18], [0.14, 0.18], [-0.14, -0.16], [0.14, -0.16]]
    .map(([lx, lz]) => legAt(body, lx, 0.4, lz, 0.055, 0.38, dark))
  // sloped torso: haunches low at the rear, shoulders high at the front
  sphAt(body, 0.32, coat, 0, 0.6, 0.04, 1, 0.95, 1.4).rotation.x = 0.16
  // dorsal crest down the spine
  for (let i = 0; i < 5; i++) {
    cone(body, 0.05, 0.16, crest, 0, 0.99 - i * 0.04, -0.25 + i * 0.15)
  }
  // spots on the haunches
  for (const [sx, sy, sz] of [[-0.2, 0.7, 0.22], [0.22, 0.66, 0.18], [-0.16, 0.52, 0.3], [0.14, 0.5, 0.32], [0.02, 0.62, 0.38]]) {
    sphAt(body, 0.045, dark, sx, sy, sz, 1, 1, 0.5)
  }
  const tail = new THREE.Group()
  tail.position.set(0.08, 0.56, 0.42)
  tail.rotation.x = -0.7
  tail.rotation.z = -0.35
  cyl(tail, 0.035, 0.045, 0.3, crest, 0, 0.14, 0)
  sphAt(tail, 0.065, crest, 0, 0.3, 0)
  body.add(tail)
  // head turned to flash the grin back down the road
  const head = new THREE.Group()
  head.position.set(0, 0.98, -0.36)
  head.rotation.y = 1.15
  sphAt(head, 0.22, coat, 0, 0, -0.02)
  for (const side of [-1, 1]) {
    sphAt(head, 0.105, 0x8a7d6a, side * 0.16, 0.2, 0.02, 1, 1.15, 0.5)
    sphAt(head, 0.055, crest, side * 0.16, 0.2, -0.02, 1, 1.15, 0.5)
  }
  sphAt(head, 0.115, belly, 0, -0.06, -0.2, 0.85, 0.7, 1.05)
  sphAt(head, 0.04, 0x3a2d1c, 0, -0.02, -0.31)
  // open grin: dark mouth band + teeth
  sphAt(head, 0.09, 0x3a2216, 0, -0.125, -0.2, 0.9, 0.45, 0.95)
  for (const tx of [-0.05, 0, 0.05]) {
    cone(head, 0.018, 0.05, 0xffffff, tx, -0.135, -0.285).rotation.x = Math.PI
  }
  // eyes + heavy mischievous brows
  for (const side of [-1, 1]) {
    sphAt(head, 0.045, 0xffffff, side * 0.1, 0.06, -0.185)
    sphAt(head, 0.022, 0x241c12, side * 0.1, 0.055, -0.225)
    cyl(head, 0.015, 0.015, 0.09, crest, side * 0.1, 0.125, -0.19).rotation.z = Math.PI / 2 - side * 0.25
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

/* ── procedural landmarks; i is the chunk index for deterministic variety ── */

function acacia(g, x, z, s = 1) {
  cyl(g, 0.12 * s, 0.2 * s, 2.2 * s, 0x6b4a2d, x, 1.1 * s, z, 6)
  cone(g, 2.1 * s, 0.9 * s, 0x4f7a34, x, 2.6 * s, z, 9)
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

function chunkSimien(g, i) {
  // Highland escarpment: layered peaks pushed out beyond the track.
  for (const side of [-1, 1]) {
    cone(g, 9 + ((i * 3 + side) % 4), 11 + ((i * 7) % 6), 0x55794a, side * (22 + ((i * 5) % 6)), 5, -26, 7)
    cone(g, 6, 8, 0x6b8f5b, side * 16, 3.6, -44, 6)
    cone(g, 3.4, 4, 0x7fa06a, side * 12, 1.9, -8, 6)
  }
  sph(g, 0.8, 0x8a9a7a, 8, 0.3, -36)
  sph(g, 0.6, 0x8a9a7a, -7, 0.25, -16)
  acacia(g, 10 + ((i * 3) % 3), -50, 0.8)
  if (i % 3 === 0) zebraAt(g, -12, -28, 1.8)
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
    this.camera.position.set(0, 3.9, 7.2)
    this.camera.lookAt(0, 1.1, -11)

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a55, 1.15))
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.4)
    sun.position.set(-6, 12, 4)
    this.scene.add(sun)

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 560), new THREE.MeshLambertMaterial({ color: 0x888888 }))
    this.ground.rotation.x = -Math.PI / 2
    this.ground.position.z = -200
    this.scene.add(this.ground)
    this.track = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 560), new THREE.MeshLambertMaterial({ color: 0xcfc0a0 }))
    this.track.rotation.x = -Math.PI / 2
    this.track.position.set(0, 0.02, -200)
    this.scene.add(this.track)

    // Anbessa as a real low-poly mesh (feet at the group origin), seen from
    // behind running toward the letters.
    this.playerChar = buildRunnerLion()
    this.player = this.playerChar.group
    this.player.scale.setScalar(1.9)
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
    this.muncher.scale.setScalar(1.75)
    this.muncher.position.set(1.4, 0, 3.9)
    this.scene.add(this.muncher)
    this._munchScale = 1.75

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
    this.scene.background = new THREE.Color(place.sky)
    this.scene.fog = new THREE.Fog(place.sky, place.fog[0], place.fog[1])
    this.ground.material = mat(place.ground)
    for (const c of this.chunks) this.scene.remove(c)
    this.chunks = []
    const build = CHUNK_BUILDERS[place.builder] || CHUNK_BUILDERS[place.id]
    for (let k = 0; k < CHUNK_COUNT; k++) {
      const g = new THREE.Group()
      build(g, k)
      // lane dashes ride along in the chunk so the ground reads as moving
      for (let d = 0; d < 6; d++) {
        box(g, 0.18, 0.02, 1.6, 0xfff6dd, -1.2, 0.05, -4 - d * 8)
        box(g, 0.18, 0.02, 1.6, 0xfff6dd, 1.2, 0.05, -4 - d * 8)
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
    box(g, 8.4, 0.22, 0.22, 0xe0b25a, 0, 3, 0)
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
    // Baseline sits at the bottom edge of the centered chase camera (ears and
    // grin looming into frame); every wrong feed brings him up toward Anbessa.
    let mz = 3.9 - this.threat * 0.75
    let my = 0
    if (this.bossMode === 'lose') mz = 0.4
    if (this.bossMode === 'win') {
      mz = 10.5
      my = 4
    }
    this.muncher.position.z += (mz - this.muncher.position.z) * Math.min(1, dt * (this.bossMode ? 4 : 2.5))
    // Chase from the right shoulder so he never hides Anbessa; pile straight
    // on when the boss round is lost.
    const mx = this.player.position.x * 0.75 + (this.bossMode === 'lose' ? 0 : 1.15)
    this.muncher.position.x += (mx - this.muncher.position.x) * Math.min(1, dt * 2)
    this.muncher.position.y += (my - this.muncher.position.y) * Math.min(1, dt * 3)
    this.munchChar.body.position.y = this.reduced ? 0 : Math.abs(Math.sin(this.t * 7)) * 0.08
    if (!this.reduced) runnerLegSwing(this.munchChar.legs, this.t * 10.5, 0.6)
    const mscale = this.bossMode === 'lose' ? 2.9 : 1.75
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
      ear.position.y = worried ? 0.24 : 0.3
      ear.rotation.z = worried ? side * -0.9 : 0
    }
    c.tail.rotation.x = worried ? 1.6 : 0.3
    c.tail.rotation.z = worried ? -0.2 : -0.7
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.disposed = true
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
      world.tick(dt, st === RunnerState.RUNNING)
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

