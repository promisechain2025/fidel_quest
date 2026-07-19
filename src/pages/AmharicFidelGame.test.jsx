import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import AmharicFidelGame, {
  FIDEL_FAMILIES,
  LEVELS,
  WORDS,
  CHAR_TO_FORM,
  buildQuestions,
  buildQuestion,
  buildWordQuestions,
  starsForAccuracy,
  weightTargets,
} from './AmharicFidelGame'
import { computeTraceResult, computeTraceResultV2, strokeSpec, TRACE_TOLERANCE } from '../components/FidelTracePad'
import { audio as platformAudio } from '../platform/audioEngine'

// jsdom has no Audio; the component guards construction, but stubbing lets
// us assert the game never crashes on sound calls.
beforeEach(() => {
  vi.stubGlobal(
    'Audio',
    class {
      constructor() {
        this.volume = 1
      }
      addEventListener() {}
      removeEventListener() {}
      play() {
        return Promise.resolve()
      }
    },
  )
})

describe('Fidel data integrity', () => {
  it('covers the full 33-family abugida', () => {
    expect(FIDEL_FAMILIES).toHaveLength(33)
  })

  it('every family has exactly seven forms with unique characters', () => {
    const seen = new Set()
    FIDEL_FAMILIES.forEach((family) => {
      expect(family.forms).toHaveLength(7)
      family.forms.forEach((form) => {
        expect(seen.has(form.char)).toBe(false)
        seen.add(form.char)
        expect(form.audioKey).toMatch(/^[a-z]+-[1-7]$/)
      })
      if (family.labialForm) {
        expect(seen.has(family.labialForm.char)).toBe(false)
        seen.add(family.labialForm.char)
        expect(family.labialForm.audioKey).toMatch(/^[a-z]+-8$/)
      }
    })
  })

  it('every twin family shares its base pronunciation with its twin', () => {
    FIDEL_FAMILIES.filter((f) => f.twinOf).forEach((family) => {
      const twin = FIDEL_FAMILIES.find((f) => f.name === family.twinOf)
      expect(twin).toBeDefined()
      expect(family.forms[0].sound).toBe(twin.forms[0].sound)
    })
  })

  it('every word starts with a character that exists in the fidel table', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(15)
    WORDS.forEach((word) => {
      expect(CHAR_TO_FORM.get(word.startChar)).toBeDefined()
      expect(word.geez.startsWith(word.startChar)).toBe(true)
      expect(word.picture).toBeTruthy()
      expect(word.meaning).toBeTruthy()
    })
  })

  it('per-vowel words start within their OWN family and have unique audio keys', () => {
    // The primer promise: a family's example words begin with one of that
    // family's seven forms (or its labial), so "which letter starts it?"
    // always has an in-family answer.
    FIDEL_FAMILIES.forEach((f) => {
      const list = Array.isArray(f.words) ? f.words : f.word ? [f.word] : []
      list.forEach((w) => {
        const chars = f.labialForm ? f.chars + f.labialForm.char : f.chars
        expect([...chars].includes([...w.geez][0])).toBe(true)
      })
    })
    const latins = WORDS.map((w) => w.latin)
    expect(new Set(latins).size).toBe(latins.length)
  })

  it('levels reference valid families and forms', () => {
    LEVELS.forEach((level) => {
      level.familyIndices.forEach((fi) => expect(FIDEL_FAMILIES[fi]).toBeDefined())
      level.formOrders.forEach((o) => expect(o).toBeGreaterThanOrEqual(0))
      level.formOrders.forEach((o) => expect(o).toBeLessThan(7))
    })
  })
})

describe('question generation', () => {
  it('builds the configured number of questions with 4 unique options', () => {
    LEVELS.forEach((level) => {
      const questions = buildQuestions(level)
      expect(questions).toHaveLength(level.questionCount)
      questions.forEach(({ target, options }) => {
        expect(options).toHaveLength(4)
        expect(options.map((o) => o.char)).toContain(target.char)
        expect(new Set(options.map((o) => o.char)).size).toBe(4)
        // No two options may share a pronunciation (h/hh, s/ss twins),
        // otherwise the question would have two right answers to the ear.
        expect(new Set(options.map((o) => o.sound)).size).toBe(4)
      })
    })
  })

  it('never quizzes outside the learned families in scoped mode', () => {
    // A child three families into the journey (below the 4-form floor that
    // used to trigger a full-level fallback) must still only ever see
    // letters from those families - widened by vocal order, not strangers.
    const learnedIdx = new Set([0, 1, 2]) // ha, le, hha
    for (const level of [LEVELS[0], LEVELS[1]]) {
      const qs = buildQuestions(level, { familyIndices: learnedIdx })
      expect(qs.length).toBeGreaterThan(0)
      for (const q of qs) {
        for (const form of [q.target, ...q.options]) {
          expect(learnedIdx.has(form.familyIndex)).toBe(true)
        }
      }
    }
  })

  it('never offers a same-sounding twin as a distractor', () => {
    const level = LEVELS[0] // contains both Ha (ሀ) and Hha (ሐ)
    const pool = level.familyIndices.flatMap((fi) => [FIDEL_FAMILIES[fi].forms[0]])
    const haForm = FIDEL_FAMILIES[0].forms[0]
    for (let i = 0; i < 25; i++) {
      const { options } = buildQuestion(level, haForm, pool)
      const sounds = options.map((o) => o.sound)
      expect(sounds.filter((s) => s === haForm.sound)).toHaveLength(1)
    }
  })

  it('weights targets by persisted miss counts, capped at 3x', () => {
    const forms = FIDEL_FAMILIES[0].forms.slice(0, 3) // ሀ ሁ ሂ
    const weighted = weightTargets(forms, { [forms[0].char]: 2, [forms[1].char]: 7 })
    expect(weighted.filter((f) => f.char === forms[0].char)).toHaveLength(3)
    expect(weighted.filter((f) => f.char === forms[1].char)).toHaveLength(3) // capped
    expect(weighted.filter((f) => f.char === forms[2].char)).toHaveLength(1)
  })

  it('practice rounds only target the given forms but draw distractors from the level pool', () => {
    const level = { ...LEVELS[0], questionCount: 6 }
    const targetForms = [FIDEL_FAMILIES[1].forms[0], FIDEL_FAMILIES[3].forms[0]] // ለ, መ
    const questetChars = new Set(targetForms.map((f) => f.char))
    const questions = buildQuestions(level, { targetForms })
    expect(questions).toHaveLength(6)
    questions.forEach(({ target, options }) => {
      expect(questetChars.has(target.char)).toBe(true)
      expect(options).toHaveLength(4)
    })
  })

  it('word questions target the word-leading character with 4 unique options', () => {
    const wordLevel = LEVELS.find((l) => l.mode === 'word-to-char')
    const questions = buildWordQuestions(wordLevel)
    expect(questions).toHaveLength(wordLevel.questionCount)
    questions.forEach(({ word, target, options }) => {
      expect(target.char).toBe(word.startChar)
      expect(options.map((o) => o.char)).toContain(target.char)
      expect(new Set(options.map((o) => o.char)).size).toBe(4)
      expect(new Set(options.map((o) => o.sound)).size).toBe(4)
    })
  })

  it('awards stars by accuracy bands (0.8 = the pass bar)', () => {
    expect(starsForAccuracy(1)).toBe(3)
    expect(starsForAccuracy(0.9)).toBe(3)
    expect(starsForAccuracy(0.8)).toBe(2)
    expect(starsForAccuracy(0.7)).toBe(1)
    expect(starsForAccuracy(0)).toBe(1)
  })
})

describe('trace scoring', () => {
  // A 10x10 grid mask around (50,50)..(95,95).
  const mask = []
  for (let x = 50; x <= 95; x += 5) for (let y = 50; y <= 95; y += 5) mask.push([x, y])

  it('gives 3 stars for full on-letter coverage', () => {
    const result = computeTraceResult(mask, mask)
    expect(result.coverage).toBe(1)
    expect(result.stray).toBe(0)
    expect(result.stars).toBe(3)
  })

  it('gives 0 stars for no ink and for ink far away from the letter', () => {
    expect(computeTraceResult(mask, []).stars).toBe(0)
    const farAway = [[300, 300], [310, 310], [280, 290]]
    expect(computeTraceResult(mask, farAway).stars).toBe(0)
  })

  it('degrades stars as coverage drops', () => {
    const half = mask.filter(([x]) => x <= 70)
    const result = computeTraceResult(mask, half)
    expect(result.stars).toBeGreaterThanOrEqual(1)
    expect(result.stars).toBeLessThan(3)
  })
})

describe('directional tracing (P6)', () => {
  // A tall glyph mask: origin should be the topmost-then-leftmost point,
  // and the dominant axis should be top-to-bottom.
  const tall = []
  for (let y = 40; y <= 200; y += 8) for (let x = 100; x <= 140; x += 8) tall.push([x, y])

  it('derives origin (top-left) and a TB axis from the mask', () => {
    const spec = strokeSpec('ha', tall)
    expect(spec.origin).toEqual([100, 40])
    expect(spec.dir).toBe('TB')
  })

  it('detects a wide glyph as an LR axis', () => {
    const wide = []
    for (let x = 40; x <= 200; x += 8) for (let y = 100; y <= 140; y += 8) wide.push([x, y])
    expect(strokeSpec('x', wide).dir).toBe('LR')
  })

  it('tightens tolerance from chapter 1 to chapter 4', () => {
    expect(TRACE_TOLERANCE[4].origin).toBeLessThan(TRACE_TOLERANCE[1].origin)
    expect(TRACE_TOLERANCE[4].cover).toBeLessThan(TRACE_TOLERANCE[1].cover)
    expect(TRACE_TOLERANCE[1].needDir).toBe(false)
    expect(TRACE_TOLERANCE[4].needDir).toBe(true)
  })

  it('passes a top-to-bottom stroke that starts at the origin', () => {
    const drawn = tall.slice() // top-to-bottom order, covers the glyph
    const r = computeTraceResultV2(tall, drawn, 4, 'ha')
    expect(r.originOk).toBe(true)
    expect(r.dirOk).toBe(true)
    expect(r.cue).toBe(null)
    expect(r.pass).toBe(true)
  })

  it('cues origin when the stroke starts far from the top', () => {
    const drawn = tall.slice().reverse() // starts at the BOTTOM
    const r = computeTraceResultV2(tall, drawn, 4, 'ha')
    expect(r.cue).toBe('origin')
  })

  it('cues direction (never hard-blocks) when armed and reversed from a valid origin', () => {
    // Start near the top origin, then move upward: right origin, wrong way.
    const drawn = [[100, 44], [110, 42], [120, 40]]
    const r = computeTraceResultV2(tall, drawn, 4, 'ha')
    expect(r.originOk).toBe(true)
    expect(r.dirOk).toBe(false)
    expect(r.cue).toBe('direction')
  })

  it('treats direction as advisory (no cue) in early chapters', () => {
    const drawn = [[100, 44], [110, 42], [120, 40]] // reversed, but chapter 1
    const r = computeTraceResultV2(tall, drawn, 1, 'ha')
    expect(r.cue).toBe(null)
  })
})

describe('<AmharicFidelGame />', () => {
  it('renders one current-level card and a level strip with the rest locked', () => {
    render(<AmharicFidelGame />)
    expect(screen.getByText('Fidel Quest')).toBeInTheDocument()
    // Only the CURRENT level gets a full card; the others live as chips.
    expect(screen.getByText('First Letters').closest('button')).toBeEnabled()
    expect(screen.queryByText('More Letters')).not.toBeInTheDocument()
    LEVELS.forEach((level) => {
      const chip = screen.getByRole('listitem', { name: new RegExp(`^Level ${level.id} - `) })
      if (level.id === 1) expect(chip).toBeEnabled()
      else expect(chip).toBeDisabled()
    })
  })

  it('unlocks later levels from persisted progress', () => {
    localStorage.setItem('fidel-quest-progress-v1', JSON.stringify({ stars: { 1: 3 }, bestScore: 80 }))
    render(<AmharicFidelGame />)
    expect(screen.getByText('More Letters').closest('button')).toBeEnabled()
    expect(screen.getByText(/Best 80/)).toBeInTheDocument()
  })

  it('opens explore mode and drills into a letter family', () => {
    render(<AmharicFidelGame />)
    fireEvent.click(screen.getByText(/Explore Mode/))
    expect(screen.getByText('Explore the Fidel')).toBeInTheDocument()
    // Letter tap plays the sound; the dedicated arrow opens the family.
    fireEvent.click(screen.getByRole('button', { name: /Letter ሀ/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Open the Ha family' }))
    expect(screen.getByText('The Ha family')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2nd form ሁ/ })).toBeInTheDocument()
  })

  it('starts level 1 and rewards a correct answer', () => {
    render(<AmharicFidelGame />)
    fireEvent.click(screen.getByText('First Letters').closest('button'))
    expect(screen.getByText('Find the letter that says')).toBeInTheDocument()

    // The prompt replay button carries the target sound in its aria-label.
    // Resolve the correct answer from the rendered options (not from the
    // global data: twins like ሀ/ሐ share a sound, and only one of a twin
    // pair ever appears among the options).
    const promptButton = screen.getByRole('button', { name: /Play the sound .+ again/ })
    const sound = promptButton.getAttribute('aria-label').match(/Play the sound (.+) again/)[1]
    const correctOption = screen.getAllByRole('button', { name: /^Letter / }).find((b) => {
      const char = b.getAttribute('aria-label').replace('Letter ', '')
      const form = FIDEL_FAMILIES.flatMap((f) => f.forms).find((f) => f.char === char)
      return form.sound === sound
    })

    fireEvent.click(correctOption)
    expect(screen.getByText('+10')).toBeInTheDocument()
  })

  it('resets the streak on a wrong answer without crashing', () => {
    render(<AmharicFidelGame />)
    fireEvent.click(screen.getByText('First Letters').closest('button'))
    const promptButton = screen.getByRole('button', { name: /Play the sound .+ again/ })
    const sound = promptButton.getAttribute('aria-label').match(/Play the sound (.+) again/)[1]
    const wrong = screen
      .getAllByRole('button', { name: /^Letter / })
      .find((b) => {
        const char = b.getAttribute('aria-label').replace('Letter ', '')
        const form = FIDEL_FAMILIES.flatMap((f) => f.forms).find((f) => f.char === char)
        return form.sound !== sound
      })
    fireEvent.click(wrong)
    expect(screen.getByRole('status').textContent).toMatch(/try|almost|close|can do|keep going|nearly|another go|listen/i)
    // Second chance: the wrong option is now disabled but the question stays
    // open (no Continue button); the miss is persisted for adaptive weighting.
    expect(wrong).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull()
    const stored = JSON.parse(localStorage.getItem('fidel-quest-progress-v1'))
    expect(Object.values(stored.missCounts)).toContain(1)
  })

  it('answers via number key shortcuts', () => {
    render(<AmharicFidelGame />)
    fireEvent.click(screen.getByText('First Letters').closest('button'))
    fireEvent.keyDown(window, { key: '2' })
    // Some answer was registered: either the praise or encourage message shows.
    expect(screen.getByRole('status').textContent.length).toBeGreaterThan(1)
  })

  it('chants a family row in sequence with a rolling glow', async () => {
    vi.useFakeTimers()
    // The chant step yields to the letter's voice (afterVoice). jsdom's
    // stubbed audio never reports ending, so resolve the yield instantly -
    // the cadence itself is what this test drives.
    const doneSpy = vi.spyOn(platformAudio, 'whenVoiceDone').mockResolvedValue(undefined)
    try {
      render(<AmharicFidelGame />)
      fireEvent.click(screen.getByText(/Explore Mode/))
      fireEvent.click(screen.getByRole('button', { name: 'Open the Le family' }))
      fireEvent.click(screen.getByRole('button', { name: /Chant the row/ }))
      // First form glows immediately, second after the chant interval (1300ms)
      // plus the flushed voice-yield microtask.
      expect(screen.getByRole('button', { name: /1st.*form ለ/ }).className).toContain('fq-anim-glow')
      await act(async () => { await vi.advanceTimersByTimeAsync(1350) })
      expect(screen.getByRole('button', { name: /2nd.*form ሉ/ }).className).toContain('fq-anim-glow')
      // Runs to the end and stops cleanly.
      await act(async () => { await vi.advanceTimersByTimeAsync(9000) })
      expect(screen.getByRole('button', { name: /1st.*form ለ/ }).className).not.toContain('fq-anim-glow')
    } finally {
      doneSpy.mockRestore()
      vi.useRealTimers()
    }
  })

  it('persists the sound preference in the unified app-wide key', () => {
    render(<AmharicFidelGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Turn sound off' }))
    expect(localStorage.getItem('fq.sound.v1')).toBe('0')
  })

  it('renders the Classic UI in the global app language', () => {
    // Language follows the single global app-text setting (fq.lang), set from
    // the main app's picker, rather than a Classic-only toggle. Amharic and
    // Tigrinya are learn languages only — a legacy stored 'am' falls back to
    // the English UI.
    render(<AmharicFidelGame />)
    expect(screen.getByText('Fidel Quest')).toBeInTheDocument() // English default
    cleanup()
    localStorage.setItem('fq.lang', 'am')
    render(<AmharicFidelGame />)
    expect(screen.getByText('Fidel Quest')).toBeInTheDocument()
  })

  it('opens trace mode and falls back gracefully without canvas support', () => {
    render(<AmharicFidelGame />)
    fireEvent.click(screen.getByText(/Tracing — draw the letters/))
    expect(screen.getByText('Trace the letters')).toBeInTheDocument()
    // Pick the Ha family; jsdom has no canvas 2D, so the pad shows its
    // unsupported note instead of crashing.
    fireEvent.click(screen.getByRole('button', { name: 'The Ha family' }))
    expect(screen.getByText(/Tracing the Ha family/)).toBeInTheDocument()
    expect(screen.getByText(/canvas support/)).toBeInTheDocument()
  })

  it('shows nickname, labialized bonus form, and word card in the family view', () => {
    render(<AmharicFidelGame />)
    fireEvent.click(screen.getByText(/Explore Mode/))
    fireEvent.click(screen.getByRole('button', { name: 'Open the Le family' }))
    expect(screen.getByRole('button', { name: /Letter ሏ, sounds like lwa/ })).toBeInTheDocument()
    expect(screen.getByText('ልጅ')).toBeInTheDocument()
    expect(screen.getByText(/lij — child/)).toBeInTheDocument()
  })
})
