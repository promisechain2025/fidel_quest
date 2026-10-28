/* ኣቡጊዳ chart: every cell's recording must be the recording of exactly the
   fidel drawn on it - in both packs, for a single tap and for "Play all"
   (row by row, in displayed order). Also lists cells with no recording.
   No audio is created or changed; this only reads the clip manifest/files. */
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { AM_PACK } from '../packs/am'
import { TI_PACK } from '../packs/ti'
import { mergeFamilies, deriveForms, deriveIndexes } from '../platform/ethiopic'
import { resolveSource } from '../platform/audioEngine'
import { abugidaChart, LAYOUT_KEY } from '../platform/abugida'

const AUDIO_DIR = path.resolve(__dirname, '../../public/audio/fidel')
const COVERAGE = new Set(JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, 'manifest.json'), 'utf8')).coverage)
const PACKS = [AM_PACK, TI_PACK]
const SCRIPT_BY_ID = Object.fromEntries(ETHIOPIC_SCRIPT.families.map((f) => [f.id, f]))

/** Everything about one pack's chart, computed independently of the UI. */
function packChart(pack) {
  const families = mergeFamilies(ETHIOPIC_SCRIPT, pack)
  const forms = deriveForms(families, pack.orders)
  const idx = deriveIndexes(forms)
  return { families, idx, chart: abugidaChart(families, pack.orders.length) }
}

describe.each(PACKS)('ኣቡጊዳ chart audio mapping ($id pack)', (pack) => {
  const { families, idx, chart } = packChart(pack)
  const cells = chart.flat()

  it('has N rows x 7 columns (33 Amharic / 34 Tigrinya)', () => {
    expect(chart).toHaveLength(families.length)
    expect(families).toHaveLength(pack.id === 'ti' ? 34 : 33)
    chart.forEach((row) => expect(row).toHaveLength(7))
  })

  it('maps every cell to the key of exactly its own glyph (family + vowel order after rotation)', () => {
    chart.forEach((row, r) => row.forEach((cell, c) => {
      // Rotation: row r, column c = family (r + c) mod N, vowel order c + 1.
      const list = chart.map((rw) => rw[0].family) // first column = the family list
      expect(cell.family.id, `row ${r} col ${c} family`).toBe(list[(r + c) % list.length].id)
      expect(cell.order, `row ${r} col ${c} order`).toBe(c + 1)
      // The glyph is written in the SCRIPT table (independent of the pack/UI).
      const glyph = Array.from(SCRIPT_BY_ID[cell.family.id].chars)[c]
      const form = idx.byAudioKey.get(cell.key)
      expect(form, `row ${r} col ${c} has a form`).toBeTruthy()
      expect(form.char, `${cell.key} is drawn as ${glyph}`).toBe(glyph)
      // ...and the glyph leads back to the same key (no two glyphs share a key).
      expect(idx.byChar.get(glyph).audioKey, `${glyph} -> key`).toBe(cell.key)
    }))
    expect(new Set(cells.map((c) => c.key)).size).toBe(families.length * 7)
  })

  it('every cell resolves to a clip that exists on disk (missing recordings listed)', () => {
    const missing = []
    const remapped = []
    for (const cell of cells) {
      const logical = `letters/${cell.key}`
      const r = resolveSource(logical, { manifest: COVERAGE, override: pack.audioOverride || null, memory: null, missing: null, audioBase: '/' })
      if (r.type !== 'file' || !fs.existsSync(path.join(AUDIO_DIR, `${r.src.replace(/^\//, '')}`))) {
        missing.push(`${idx.byAudioKey.get(cell.key).char} (${cell.key})`)
      } else if (r.src !== `/${logical}.mp3`) {
        remapped.push([cell.key, r.src])
      }
    }
    expect(missing, `cells with no recording: ${missing.join(' ')}`).toEqual([])
    // Declared, deliberate redirects only: the Amharic same-sound 1st-order
    // gutturals (ha/hha/kha/a/ae -1 voiced as -4) and Tigrinya's own clips.
    for (const [key, src] of remapped) {
      const id = key.replace(/-\d$/, '')
      const ok = pack.id === 'am'
        ? AM_PACK.audioOverride.orderRemap.ids.includes(id) && key.endsWith('-1') && src === `/letters/${id}-4.mp3`
        : TI_PACK.audioOverride.ids.includes(id) && src === `/letters/ti/${key}.mp3`
      expect(ok, `${key} -> ${src}`).toBe(true)
    }
  })
})

/* ── Through the real Explorer: what is displayed vs what is played ── */
describe.each(PACKS)('Explorer chart playback ($id pack)', (pack) => {
  let Explore
  let audio
  const played = []

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()
    localStorage.setItem('fq.pack', pack.id)
    localStorage.setItem(LAYOUT_KEY, 'abugida')
    // Voice-done resolves immediately so "Play all" runs the whole chant fast.
    vi.doMock('../platform/audioEngine', async (orig) => {
      const actual = await orig()
      return { ...actual, afterVoice: (cb) => { const t = setTimeout(cb, 0); return () => clearTimeout(t) } }
    })
    ;({ Explore } = await import('../FidelQuestApp'))
    ;({ audio } = await import('../platform/audioEngine'))
    played.length = 0
    vi.spyOn(audio, 'play').mockImplementation((key) => { played.push(key); return Promise.resolve() })
  })
  afterEach(() => {
    cleanup()
    vi.doUnmock('../platform/audioEngine')
    vi.restoreAllMocks()
  })

  const displayed = async () => {
    const chart = await screen.findByTestId('abugida-chart')
    const eth = await import('../platform/ethiopic')
    return Array.from(chart.querySelectorAll('button')).map((b) => ({ glyph: b.textContent, key: eth.INDEXES.byChar.get(b.textContent)?.audioKey }))
  }

  it('single tap: each cell plays the recording key of the fidel drawn on it', async () => {
    render(<Explore soundOn onBack={() => {}} />)
    const shown = await displayed()
    const n = (pack.id === 'ti' ? 34 : 33) * 7
    expect(shown).toHaveLength(n)
    const buttons = Array.from(screen.getByTestId('abugida-chart').querySelectorAll('button'))
    buttons.forEach((b, i) => {
      played.length = 0
      fireEvent.click(b)
      expect(shown[i].key, `${shown[i].glyph} is a known letter`).toBeTruthy()
      expect(played, `tap on ${shown[i].glyph}`).toEqual([`letters/${shown[i].key}`])
    })
  })

  it('Play all: plays every displayed cell once, row by row, in displayed order', async () => {
    render(<Explore soundOn onBack={() => {}} />)
    const shown = await displayed()
    fireEvent.click(screen.getByRole('button', { name: /play all/i }))
    await waitFor(() => expect(played.length).toBeGreaterThanOrEqual(shown.length), { timeout: 90000 })
    await waitFor(() => expect(screen.getByRole('button', { name: /play all/i })).toBeInTheDocument(), { timeout: 90000 })
    expect(played).toEqual(shown.map((s) => `letters/${s.key}`))
  }, 200000)
})
