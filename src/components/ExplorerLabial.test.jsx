/* Explorer family view: the bonus labialized tile (e.g. ሏ) plays its own
   recording when one exists and is hidden when only a chime/effect would
   answer the tap (no -8 clips are recorded yet). */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { FamilyDetail, FIDEL_FAMILIES } from '../FidelQuestApp'
import { audio } from '../platform/audioEngine'

const le = FIDEL_FAMILIES.find((f) => f.labial && f.id === 'le')

afterEach(() => vi.restoreAllMocks())

describe('Explorer bonus (labialized) form', () => {
  it('is hidden when there is no recording for it', async () => {
    vi.spyOn(audio, 'hasClip').mockResolvedValue(false)
    render(<FamilyDetail family={le} soundOn />)
    await act(async () => {})
    expect(audio.hasClip).toHaveBeenCalledWith('letters/le-8')
    expect(screen.queryByText('Bonus form')).toBeNull()
  })

  it('plays its own clip (with a transliteration) when one exists', async () => {
    vi.spyOn(audio, 'hasClip').mockResolvedValue(true)
    const play = vi.spyOn(audio, 'play').mockResolvedValue(undefined)
    render(<FamilyDetail family={le} soundOn />)
    const tile = await screen.findByRole('button', { name: new RegExp(`Bonus form ${le.labial}, sounds like ${le.consonant}wa`) })
    fireEvent.click(tile)
    expect(play).toHaveBeenCalledWith('letters/le-8', { enabled: true })
  })
})
