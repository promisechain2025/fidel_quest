import { describe, it, expect } from 'vitest'
import { AM_PACK } from '../packs/am'
import { TI_PACK } from '../packs/ti'
import { RUNNER_CAST } from '../components/runnerCast'
import { MEET_HERO_BY_FAMILY } from '../data/meetHeroes'
import { AudioEngine } from './audioEngine'
import {
  FIDEL_AUDIO_BASE,
  FIDEL_MANIFEST_URL,
  joinPublicUrl,
  publicUrl,
} from './publicUrl'

describe('joinPublicUrl', () => {
  it('keeps public assets at the site root when the app is served from /', () => {
    expect(joinPublicUrl('/', '/audio/fidel/')).toBe('/audio/fidel/')
    expect(joinPublicUrl('/', '/audio/fidel/manifest.json')).toBe('/audio/fidel/manifest.json')
    expect(joinPublicUrl('/', '/audio/fidel/letters/ha-1.mp3')).toBe('/audio/fidel/letters/ha-1.mp3')
    expect(joinPublicUrl('/', '/art/meet/ha.webp')).toBe('/art/meet/ha.webp')
    expect(joinPublicUrl('/', '/art/runner/anbessa-chase.webp')).toBe('/art/runner/anbessa-chase.webp')
    expect(joinPublicUrl('/', '/art/stories/bible-creation-1.webp')).toBe('/art/stories/bible-creation-1.webp')
  })

  it('prefixes public assets with /app/ for the web PWA build', () => {
    expect(joinPublicUrl('/app/', '/audio/fidel/letters/ha-1.mp3')).toBe('/app/audio/fidel/letters/ha-1.mp3')
    expect(joinPublicUrl('/app/', '/audio/fidel/manifest.json')).toBe('/app/audio/fidel/manifest.json')
    expect(joinPublicUrl('/app/', '/art/meet/ha.webp')).toBe('/app/art/meet/ha.webp')
    expect(joinPublicUrl('/app/', '/art/runner/jibby-chase.webp')).toBe('/app/art/runner/jibby-chase.webp')
    expect(joinPublicUrl('/app/', '/art/stories/where-is-sam-1.webp')).toBe('/app/art/stories/where-is-sam-1.webp')
  })

  it('accepts a base without a trailing slash and a path without a leading slash', () => {
    expect(joinPublicUrl('/app', 'audio/fidel/letters/ha-1.mp3')).toBe('/app/audio/fidel/letters/ha-1.mp3')
    expect(joinPublicUrl('', '/art/meet/ha.webp')).toBe('/art/meet/ha.webp')
  })
})

describe('publicUrl on this build', () => {
  it('follows import.meta.env.BASE_URL for audio and art', () => {
    const base = import.meta.env.BASE_URL || '/'
    expect(publicUrl('/audio/fidel/letters/ha-1.mp3')).toBe(joinPublicUrl(base, '/audio/fidel/letters/ha-1.mp3'))
    expect(FIDEL_AUDIO_BASE).toBe(publicUrl('/audio/fidel/'))
    expect(FIDEL_MANIFEST_URL).toBe(publicUrl('/audio/fidel/manifest.json'))
    expect(AM_PACK.audioBase).toBe(FIDEL_AUDIO_BASE)
    expect(AM_PACK.manifestUrl).toBe(FIDEL_MANIFEST_URL)
    expect(TI_PACK.audioBase).toBe(FIDEL_AUDIO_BASE)
    expect(TI_PACK.manifestUrl).toBe(FIDEL_MANIFEST_URL)
    expect(MEET_HERO_BY_FAMILY.ha).toBe(publicUrl('/art/meet/ha.webp'))
    expect(RUNNER_CAST.anbessaChase).toBe(publicUrl('/art/runner/anbessa-chase.webp'))
    expect(RUNNER_CAST.jibbyFront).toBe(publicUrl('/art/runner/jibby-front.webp'))
  })

  it('points a default AudioEngine at the same audio root as the packs', () => {
    const engine = new AudioEngine()
    expect(engine.audioBase).toBe(FIDEL_AUDIO_BASE)
    expect(engine.manifestUrl).toBe(FIDEL_MANIFEST_URL)
    expect(engine.resolve('letters/ha-1')).toEqual({
      type: 'file',
      src: publicUrl('/audio/fidel/letters/ha-1.mp3'),
    })
  })
})
