/* Explorer: the ኣቡጊዳ (abugida) arrangement option. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Explore } from '../FidelQuestApp'
import { FIDEL_FAMILIES, ORDERS, INDEXES } from '../platform/ethiopic'
import { audio } from '../platform/audioEngine'
import { mergeFamilies } from '../platform/ethiopic'
import { TI_PACK } from '../packs/ti'
import { ABUGIDA_FAMILY_IDS, abugidaChart, abugidaFamilies, LAYOUT_KEY } from '../platform/abugida'
import { SWAP_KEYS } from '../platform/profiles'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'

// The printed ኣቡጊዳ chart (Ethiopian Review 1991, am.wikipedia.org/wiki/አቡጊዳ),
// first column and first/last rows, typed by hand from the source.
const FIRST_COLUMN = 'አ በ ገ ደ ሀ ወ ዘ ዠ ሐ ጠ ጨ የ ከ ኸ ለ መ ነ ኘ ሰ ሸ ዐ ፈ ጸ ቀ ረ ሠ ተ ቸ ኀ ጰ ፀ ፐ ጀ'.split(' ')
const ROW_1 = 'አ ቡ ጊ ዳ ሄ ው ዞ'.split(' ')
const ROW_2 = 'በ ጉ ዲ ሃ ዌ ዝ ዦ'.split(' ')
const ROW_LAST = 'ጀ ኡ ቢ ጋ ዴ ህ ዎ'.split(' ')
const baseChar = (id) => INDEXES.byAudioKey.get(`${id}-1`).char

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('abugida order helper', () => {
  it('names every script family exactly once (nothing missing, nothing extra)', () => {
    expect(new Set(ABUGIDA_FAMILY_IDS).size).toBe(ABUGIDA_FAMILY_IDS.length)
    expect([...ABUGIDA_FAMILY_IDS].sort()).toEqual(ETHIOPIC_SCRIPT.families.map((f) => f.id).sort())
  })

  it('puts the active pack\'s families in the printed chart order', () => {
    const chars = abugidaFamilies(FIDEL_FAMILIES).map((f) => baseChar(f.id))
    expect(chars).toEqual(FIRST_COLUMN.filter((c) => FIDEL_FAMILIES.some((f) => baseChar(f.id) === c)))
    expect(chars).toHaveLength(FIDEL_FAMILIES.length)
  })

  it('appends a family the order list does not know, instead of dropping it', () => {
    const odd = { id: 'zz-new', chars: 'x' }
    const out = abugidaFamilies([odd, ...FIDEL_FAMILIES])
    expect(out[out.length - 1]).toBe(odd)
    expect(out).toHaveLength(FIDEL_FAMILIES.length + 1)
  })

  it('builds the rotation: column c is the list shifted up by c, in order c+1', () => {
    const chart = abugidaChart(FIDEL_FAMILIES)
    const charAt = (r) => chart[r].map((c) => INDEXES.byAudioKey.get(c.key).char)
    expect(chart).toHaveLength(FIDEL_FAMILIES.length)
    expect(charAt(0)).toEqual(ROW_1)
    expect(charAt(1)).toEqual(ROW_2)
    expect(charAt(chart.length - 1)).toEqual(ROW_LAST)
    // every letter once
    const keys = chart.flat().map((c) => c.key)
    expect(new Set(keys).size).toBe(FIDEL_FAMILIES.length * ORDERS.length)
    chart.flat().forEach((c) => expect(INDEXES.byAudioKey.get(c.key)).toBeTruthy())
  })
})

describe('abugida order with the Tigrinya pack (34 families)', () => {
  it('slots ቐ right after ቀ and rotates over 34 rows', () => {
    const ti = mergeFamilies(ETHIOPIC_SCRIPT, TI_PACK)
    expect(ti).toHaveLength(34)
    const ids = abugidaFamilies(ti).map((f) => f.id)
    expect(ids[ids.indexOf('qe') + 1]).toBe('qhe')
    const chart = abugidaChart(ti)
    expect(chart).toHaveLength(34)
    expect(chart[0].map((c) => c.family.id)).toEqual(['a', 'be', 'ge', 'de', 'ha', 'we', 'ze'])
    expect(new Set(chart.flat().map((c) => c.key)).size).toBe(34 * 7)
  })
})

describe('Explorer layout option', () => {
  it('defaults to the current vowel view', () => {
    render(<Explore soundOn onBack={() => {}} />)
    expect(screen.queryByTestId('abugida-chart')).toBeNull()
    expect(screen.getByTestId('explore-layout-vowel')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('explore-layout-abugida')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('button', { name: ORDERS[0].geezName })).toHaveLength(1)
  })

  it('switches to the chart and back, and shows the printed order', async () => {
    render(<Explore soundOn onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('explore-layout-abugida'))
    const chart = await screen.findByTestId('abugida-chart')
    const cells = Array.from(chart.querySelectorAll('button')).map((b) => b.textContent)
    expect(cells).toHaveLength(FIDEL_FAMILIES.length * 7)
    expect(cells.slice(0, 7)).toEqual(ROW_1)
    expect(cells.slice(7, 14)).toEqual(ROW_2)
    expect(cells.slice(-7)).toEqual(ROW_LAST)
    // the vowel picker is not needed (all 7 orders are in the chart)
    expect(screen.queryByRole('button', { name: ORDERS[0].geezName })).toBeNull()
    fireEvent.click(screen.getByTestId('explore-layout-vowel'))
    expect(await screen.findByRole('button', { name: ORDERS[0].geezName })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('abugida-chart')).toBeNull())
  })

  it('plays the same recording as the vowel view for each chart cell', async () => {
    const play = vi.spyOn(audio, 'play').mockResolvedValue(undefined)
    render(<Explore soundOn onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('explore-layout-abugida'))
    const chart = await screen.findByTestId('abugida-chart')
    const tap = (key) => fireEvent.click(chart.querySelector(`[data-chart-key="${key}"]`))
    tap('a-1')
    expect(play).toHaveBeenLastCalledWith('letters/a-1', expect.objectContaining({ enabled: true }))
    tap('be-2') // ቡ
    expect(play).toHaveBeenLastCalledWith('letters/be-2', expect.objectContaining({ enabled: true }))
    tap('je-7') // ጆ, last row's last form wraps around the list
    expect(play).toHaveBeenLastCalledWith('letters/je-7', expect.objectContaining({ enabled: true }))
    // muted stays muted in the chart too
    play.mockClear()
  })

  it('is silent when sound is off', () => {
    const play = vi.spyOn(audio, 'play').mockResolvedValue(undefined)
    localStorage.setItem(LAYOUT_KEY, 'abugida')
    render(<Explore soundOn={false} onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('abugida-chart').querySelector('[data-chart-key="a-1"]'))
    expect(play).toHaveBeenLastCalledWith('letters/a-1', expect.objectContaining({ enabled: false }))
  })

  it('persists the choice per child (raw key is a swap key) and restores it', () => {
    expect(SWAP_KEYS).toContain(LAYOUT_KEY)
    const first = render(<Explore soundOn onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('explore-layout-abugida'))
    expect(localStorage.getItem(LAYOUT_KEY)).toBe('abugida')
    first.unmount()
    render(<Explore soundOn onBack={() => {}} />)
    expect(screen.getByTestId('abugida-chart')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('explore-layout-vowel'))
    expect(localStorage.getItem(LAYOUT_KEY)).toBe('vowel')
  })

  it('ignores a garbage stored value and falls back to the vowel view', () => {
    localStorage.setItem(LAYOUT_KEY, '{nope')
    render(<Explore soundOn onBack={() => {}} />)
    expect(screen.queryByTestId('abugida-chart')).toBeNull()
  })

  it('shows no Latin text anywhere in the chart or the layout toggle', () => {
    localStorage.setItem(LAYOUT_KEY, 'abugida')
    render(<Explore soundOn onBack={() => {}} />)
    const chart = screen.getByTestId('abugida-chart')
    expect(chart.textContent).not.toMatch(/[A-Za-z0-9]/)
    expect(screen.getByTestId('explore-layout').textContent).not.toMatch(/[A-Za-z0-9]/)
    // glyph-only buttons still carry an accessible name for screen readers
    expect(screen.getByTestId('explore-layout-abugida')).toHaveAttribute('aria-label')
  })
})
