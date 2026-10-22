/* ============================================================================
   PRAYER BOOK - ጸሎት ዘዘወትር as a paper book with reading marks
   ----------------------------------------------------------------------------
   Design: docs/prayer-book.md. Clean text by default; while the owner's
   recording plays, the current word shows its reading mark (saffron) and a
   letter-by-letter glow, the next word a faint mark. The eye toggle shows all
   marks (they stay on during playback). Pages turn with a finger-follow
   paper fold (transform-only, so it holds 60fps on low-end phones); with
   reduced motion it becomes a plain slide. No words in the chrome: icons only.
   ========================================================================== */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff, Pause, Play, Rabbit, Target, Turtle } from 'lucide-react'
import TSELOT from '../data/tselotMarks.json'
import WUDASE_MON from '../data/wudaseMondayMarks.json'
import WUDASE_TUE from '../data/wudaseTuesdayMarks.json'
import WUDASE_WED from '../data/wudaseWednesdayMarks.json'
import WUDASE_THU from '../data/wudaseThursdayMarks.json'
import WUDASE_FRI from '../data/wudaseFridayMarks.json'
import WUDASE_SAT from '../data/wudaseSaturdayMarks.json'
import WUDASE_SUN from '../data/wudaseSundayMarks.json'
import { paginate, pageOfUnit, nextRecorded, glowLetter, geezNumeral, loadResume, saveResume, markNames, splitTitle } from '../platform/prayerBook'
import { getActivePackId } from '../platform/ethiopic'
import { startPractice, endPractice, isPracticeMode, subscribePracticeMode, prayerOpen, prayerClose, prayerPage, prayerAudio, prayerRange, playCurrentPrayerOnly, startUnitForPage } from '../platform/prayerPractice'
import { FIDEL_AUDIO_BASE } from '../platform/publicUrl'

const SIZES = [0.82, 0.9, 1, 1.16, 1.32]
// Default is fitted: step down until the longest paragraph fits one page (readable floor 0.82).
const FIT_STEPS = [1, 0.94, 0.88, 0.82]
const SIZE_KEY = 'fq.prayer.size'

const BOOKS = [TSELOT, WUDASE_MON, WUDASE_TUE, WUDASE_WED, WUDASE_THU, WUDASE_FRI, WUDASE_SAT, WUDASE_SUN]
const BOOK_KEY = 'fq.prayer.book'
// Playback speed (pitch preserved). 0.5 is for practice; never faster than 1.25.
export const SPEEDS = [0.5, 0.75, 1, 1.25]
const SPEED_DEFAULT = 2
const SPEED_KEY = 'fq.prayer.speed'
const MARKS_KEY = 'fq.prayer.marks'
// Three ways to follow the owner's voice; the choice is remembered per device.
//  letter (ቅጽሪ): the word being read glows and its letters light up one by one (default)
//  word (ንባብ):   the whole word being read glows at once (no letter run)
//  listen (ወርድ): plain page, no highlight at all; the page still turns with the voice
export const READ_MODES = [
  { id: 'letter', label: 'ቅጽሪ', icon: 'ቅ' },
  { id: 'listen', label: 'ወርድ', icon: 'ወ' },
  { id: 'word', label: 'ንባብ', icon: 'ን' },
]
const READ_KEY = 'fq.prayer.readmode'
function applyRate(el, rate) {
  if (!el) return
  el.preservesPitch = true; el.mozPreservesPitch = true; el.webkitPreservesPitch = true
  try { el.playbackRate = rate } catch { /* ignore */ }
}
const TURN_MS = 650

/* ---- mark shapes (viewBox 0 0 24 16; drawn in currentColor) ------------- */
export function MarkShape({ type, size = 22, style }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <svg width={size} height={size * 0.67} viewBox="0 0 24 16" style={style} preserveAspectRatio={type === 'tie' ? 'none' : undefined} aria-hidden="true" data-mark={type}>
      {type === 'tenesh' && <path d="M4 13 L12 4 L20 13" {...p} />}
      {type === 'seyaf' && (<><path d="M5 14 L15 3" {...p} /><circle cx="19.5" cy="13" r="2" fill="currentColor" /></>)}
      {type === 'tetay' && <path d="M3 8 L21 8" {...p} strokeWidth={3.6} />}
      {type === 'wedaqi' && (<><path d="M3 12 C 6 2, 16 1, 19 9" {...p} /><path d="M15.5 8.5 L19.5 13 L22 7.5" {...p} /></>)}
      {type === 'tebqo' && (<><circle cx="8" cy="8" r="2.4" fill="currentColor" /><circle cx="16" cy="8" r="2.4" fill="currentColor" /></>)}
      {type === 'tie' && <path d="M2 4 C 7 13, 17 13, 22 4" {...p} strokeWidth={2.4} />}
    </svg>
  )
}

/* ---- compact title: "ውዳሴ ማርያም ዘሰኑይ" -> small book line over the day,
   so the header stays one icon-row tall instead of wrapping at 22px --- */
function TitleLabel({ title }) {
  // One centered line like every other screen's header (GameHeader: 18px, 900).
  // The book name ("ውዳሴ ማርያም") stays in the text for screen readers and the
  // shelf; the visible line is the day, or the whole two-word title.
  const [over, main] = splitTitle(title)
  return (
    <>
      {over && <span className="pb-sr">{over} </span>}
      <span className="pb-title-main">{main}</span>
    </>
  )
}

/* ---- one reading unit (a word, or joined words) ------------------------- */
function Unit({ u, idx, mode, glow, onTap }) {
  // mode: 'hidden' | 'all' | 'current' | 'next'
  const show = mode !== 'hidden'
  const tone = mode === 'current' ? 'var(--pb-saffron)' : mode === 'next' ? 'var(--pb-faint)' : 'var(--pb-ink)'
  let flat = 0
  const last = u.w.length - 1
  return (
    <span className={`pb-unit${mode === 'current' ? ' pb-current' : ''}${u.a ? '' : ' pb-norec'}`} data-unit={idx} onClick={() => onTap(idx)}>
      {u.w.map((w, wi) => {
        const holy = u.h && u.h.includes(wi)
        const letters = [...w]
        return (
          <span key={wi} className={`pb-word${holy ? ' pb-holy' : ''}`}>
            {letters.map((ch, li) => {
              const k = flat++
              const st = glow < 0 ? '' : k < glow ? ' pb-read' : k === glow ? ' pb-glow' : ' pb-ahead'
              return (
                <span key={li} className={`pb-l${st}`}>
                  {ch}
                  {show && wi === last && li === u.li && (
                    <span className="pb-mark" style={{ color: tone }}><MarkShape type={u.m} size={20} /></span>
                  )}
                </span>
              )
            })}
            {wi < last ? '\u00a0' : u.p || ''}
          </span>
        )
      })}
      {show && u.w.length > 1 && (
        <span className="pb-tie" style={{ color: tone }}><MarkShape type="tie" size={40} style={{ width: '100%' }} /></span>
      )}
    </span>
  )
}

function PageFace({ UNITS, units, pageNo, markMode, glowFor, onTap }) {
  return (
    <div className="pb-face">
      <div className="pb-text geez-book">
        {units.map((i, k) => [
          UNITS[i].s && k > 0 ? <span key={`p${i}`} className="pb-para" /> : null,
          <Unit key={i} u={UNITS[i]} idx={i} mode={markMode(i)} glow={glowFor(i)} onTap={onTap} />,
        ])}
      </div>
      <div className="pb-folio">{geezNumeral(pageNo)}</div>
    </div>
  )
}

/* ---- shelf: which reading is open (remembered per device) -------------- */
export default function PrayerBook({ onBack, pack }) {
  const [id, setId] = useState(() => {
    try { const v = localStorage.getItem(BOOK_KEY); return BOOKS.some((b) => b.id === v) ? v : BOOKS[0].id } catch { return BOOKS[0].id }
  })
  useEffect(() => { try { localStorage.setItem(BOOK_KEY, id) } catch { /* ignore */ } }, [id])
  const book = BOOKS.find((b) => b.id === id) || BOOKS[0]
  // Practice tracking contract (platform/prayerPractice.js): the page is open
  // while the book is mounted; leaving the book ends a practice session.
  useEffect(() => { prayerOpen(); return () => { prayerAudio(false); prayerClose(); endPractice() } }, [])
  return <BookView key={book.id} book={book} onBack={onBack} pack={pack} onPick={setId} />
}

function BookView({ book: BOOK, onBack, pack, onPick }) {
  const UNITS = BOOK.units
  const [shelf, setShelf] = useState(false)
  const NAMES = markNames(pack || getActivePackId())
  // Pages are cut from REAL layout: every unit is laid out once in a hidden
  // page of the same size, we read which line each lands on, and fill each
  // page with as many whole lines as fit. Marks are absolutely positioned,
  // so marks on/off never changes the cut.
  const [size, setSize] = useState(() => {
    try { const r = localStorage.getItem(SIZE_KEY); const v = r === null ? null : Number(r); return SIZES[v] ? v : null } catch { return null }
  })
  useEffect(() => { try { if (size === null) localStorage.removeItem(SIZE_KEY); else localStorage.setItem(SIZE_KEY, String(size)) } catch { /* ignore */ } }, [size])
  const [fit, setFit] = useState(FIT_STEPS[0])
  const scale = size === null ? fit : SIZES[size]
  const stageRef = useRef(null)
  const measRef = useRef(null)
  const [pages, setPages] = useState(() => paginate(UNITS, 70))
  useLayoutEffect(() => {
    const el = measRef.current
    if (!el || typeof window === 'undefined') return
    const measure = () => {
      const box = el.clientHeight
      const kids = el.querySelectorAll('[data-unit]')
      if (!box || kids.length !== UNITS.length) return
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 0
      if (!lh) return
      // Group units into visual lines (pixel tops include paragraph gaps).
      const lines = []
      for (let i = 0; i < kids.length; i++) {
        const t = kids[i].offsetTop
        const L = lines[lines.length - 1]
        if (!L || t > L.top + lh / 2) lines.push({ top: t, units: [i], para: !!UNITS[i].s })
        else L.units.push(i)
      }
      if (lines.length < 2) return // no real layout (tests): keep the fallback
      if (size === null) {
        // Auto-fit: if a paragraph is taller than a page, try the next smaller step.
        let worst = 0
        for (let a = 0; a < lines.length; a++) {
          if (!lines[a].para && a > 0) continue
          let b = a
          while (b + 1 < lines.length && !lines[b + 1].para) b++
          worst = Math.max(worst, lines[b].top + lh - lines[a].top)
        }
        const nxt = FIT_STEPS[FIT_STEPS.indexOf(fit) + 1]
        if (worst > box + 0.5 && nxt) { setFit(nxt); return }
      }
      const out = []
      let k = 0
      while (k < lines.length) {
        const top = lines[k].top
        let e = k
        while (e + 1 < lines.length && lines[e + 1].top + lh - top <= box + 0.5) e++
        // No lone first line of a paragraph at the page bottom.
        if (e > k && e + 1 < lines.length && lines[e].para && !lines[e + 1].para) e--
        const pg = []
        for (let q = k; q <= e; q++) pg.push(...lines[q].units)
        out.push(pg)
        k = e + 1
      }
      setPages(out)
    }
    measure()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure)
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [size, fit, UNITS])
  const resume = useMemo(() => loadResume(BOOK.id), [BOOK.id])
  const [page, setPage] = useState(() => (resume && resume.unit >= 0 ? pageOfUnit(paginate(UNITS, 70), resume.unit) : Math.max(0, resume?.page || 0)))
  const pageSafe = Math.min(page, pages.length - 1)
  // Keep the resume word on screen when the budget changes after measuring.
  const anchor = useRef(resume && resume.unit >= 0 ? resume.unit : null)
  const shownFirst = useRef(null)
  useEffect(() => {
    const a = anchor.current !== null ? anchor.current : shownFirst.current
    if (a !== null) setPage(pageOfUnit(pages, a))
  }, [pages])
  // Marks are hidden by default (kids outgrow them); the eye choice is remembered per child.
  const [showAll, setShowAll] = useState(() => { try { return localStorage.getItem(MARKS_KEY) === '1' } catch { return false } })
  useEffect(() => { try { localStorage.setItem(MARKS_KEY, showAll ? '1' : '0') } catch { /* ignore */ } }, [showAll])
  // Legend is a sheet opened by its own button; it sits in the layout (never over the text) and closes on tap.
  const [legendOpen, setLegendOpen] = useState(false)
  useEffect(() => { if (!showAll) setLegendOpen(false) }, [showAll])
  const [readMode, setReadMode] = useState(() => {
    try { const v = localStorage.getItem(READ_KEY); return READ_MODES.some((m) => m.id === v) ? v : 'letter' } catch { return 'letter' }
  })
  useEffect(() => { try { localStorage.setItem(READ_KEY, readMode) } catch { /* ignore */ } }, [readMode])
  const [modeOpen, setModeOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  // Practice mode: prayer time is tracked, and playback stops after the current prayer.
  const [practice, setPractice] = useState(isPracticeMode)
  useEffect(() => subscribePracticeMode(setPractice), [])
  const practiceRef = useRef(practice)
  practiceRef.current = practice
  const [cur, setCur] = useState(resume?.unit ?? -1)
  const [glow, setGlow] = useState(-1)
  const [speed, setSpeed] = useState(() => {
    try { const r = localStorage.getItem(SPEED_KEY); const v = r === null ? SPEED_DEFAULT : Number(r); return SPEEDS[v] ? v : SPEED_DEFAULT } catch { return SPEED_DEFAULT }
  })
  useEffect(() => { try { localStorage.setItem(SPEED_KEY, String(speed)) } catch { /* ignore */ } applyRate(audio.current, SPEEDS[speed]) }, [speed])
  const [turn, setTurn] = useState(null) // { dir: 1|-1, from, to }
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  const audio = useRef(null)
  const raf = useRef(0)
  const flap = useRef(null)
  const shade = useRef(null)
  const sheen = useRef(null)
  const drag = useRef(null)
  const playingRef = useRef(false)
  const curRef = useRef(cur)
  curRef.current = cur
  const pageRef = useRef(pageSafe)
  pageRef.current = pageSafe

  useEffect(() => { shownFirst.current = pages[pageSafe][0] }, [pages, pageSafe])
  const firstPage = useRef(true)
  useEffect(() => { if (firstPage.current) { firstPage.current = false; return } prayerPage() }, [pageSafe])
  useEffect(() => { saveResume(BOOK.id, { page: pageSafe, unit: cur >= 0 ? cur : pages[pageSafe][0] }) }, [BOOK.id, pageSafe, cur, pages])

  /* ---- audio ------------------------------------------------------------ */
  const stopAudio = useCallback(() => {
    cancelAnimationFrame(raf.current)
    if (audio.current) { try { audio.current.pause() } catch { /* ignore */ } }
  }, [])
  useEffect(() => () => stopAudio(), [stopAudio])

  /* ---- the fold: drive transform directly for 60fps ---------------------- */
  const setAngle = useCallback((deg) => {
    const el = flap.current
    if (el) el.style.transform = reduced ? `translateX(${(deg / 180) * -100}%)` : `rotateY(${-deg}deg)`
    const k = Math.sin((Math.min(deg, 180) * Math.PI) / 180)
    if (shade.current) shade.current.style.opacity = String(k * 0.6)
    if (sheen.current) sheen.current.style.opacity = String(0.25 + Math.min(1, deg / 90) * 0.75)
  }, [reduced])

  const animateTo = useCallback((from, to, done) => {
    const t0 = performance.now()
    const step = (t) => {
      const k = Math.min(1, (t - t0) / (TURN_MS * Math.abs(to - from) / 180 || 1))
      const e = 1 - Math.pow(1 - k, 3)
      setAngle(from + (to - from) * e)
      if (k < 1) requestAnimationFrame(step); else done && done()
    }
    requestAnimationFrame(step)
  }, [setAngle])

  // Start a turn: forward flips current page away (0→180), back brings the
  // previous page in (180→0) over the current one.
  const beginTurn = useCallback((dir) => {
    const from = pageRef.current
    const to = from + dir
    if (to < 0 || to >= pages.length) return false
    setTurn({ dir, from, to })
    return true
  }, [pages.length])

  const finishTurn = useCallback((commit) => {
    setTurn((t) => {
      if (t && commit) setPage(t.to)
      return null
    })
  }, [])

  const autoTurn = useCallback((then) => {
    if (!beginTurn(1)) return then && then()
    requestAnimationFrame(() => {
      setAngle(0)
      animateTo(0, 180, () => { finishTurn(true); then && requestAnimationFrame(then) })
    })
  }, [beginTurn, animateTo, finishTurn, setAngle])

  /* ---- playback ---------------------------------------------------------- */
  const playUnit = useCallback((i) => {
    if (i < 0) { setPlaying(false); playingRef.current = false; setGlow(-1); prayerAudio(false); return }
    const p = pageOfUnit(pages, i)
    if (p !== pageRef.current) {
      if (p === pageRef.current + 1) return autoTurn(() => playUnit(i))
      setPage(p)
    }
    anchor.current = i
    setCur(i)
    setGlow(0)
    const u = UNITS[i]
    if (!audio.current) audio.current = new Audio()
    const el = audio.current
    el.src = FIDEL_AUDIO_BASE + u.a
    applyRate(el, SPEEDS[speed])
    // In practice mode play ONLY the current prayer, then stop (no auto-advance, no loop).
    el.onended = () => {
      cancelAnimationFrame(raf.current)
      if (playingRef.current) playUnit(practiceRef.current ? playCurrentPrayerOnly(UNITS, i) : nextRecorded(UNITS, i))
      else prayerAudio(false)
    }
    const tick = () => {
      if (el.duration > 0) setGlow(glowLetter(u, el.currentTime / el.duration))
      raf.current = requestAnimationFrame(tick)
    }
    el.play().then(() => { raf.current = requestAnimationFrame(tick) }).catch(() => { setPlaying(false); playingRef.current = false })
  }, [UNITS, pages, speed, autoTurn])

  const togglePlay = () => {
    if (playingRef.current) { playingRef.current = false; setPlaying(false); stopAudio(); setGlow(-1); prayerAudio(false); return }
    const onPage = pages[pageSafe]
    const start = startUnitForPage(UNITS, onPage, cur, practiceRef.current)
    if (start < 0) return
    playingRef.current = true
    setPlaying(true)
    prayerAudio(true, prayerRange(UNITS, start)[0])
    playUnit(start)
  }

  const tapUnit = (i) => {
    anchor.current = i
    if (playingRef.current || !UNITS[i].a) return
    prayerAudio(true, prayerRange(UNITS, i)[0])
    playUnit(i)
    playingRef.current = false
    setCur(i)
  }

  /* ---- turning pages: swipe, edge taps, arrows, keyboard ----------------- */
  // A manual turn stops the reader first (turning used to be locked while playing).
  const stopForTurn = () => {
    if (!playingRef.current) return
    playingRef.current = false; setPlaying(false); stopAudio(); setGlow(-1); prayerAudio(false)
  }
  const turning = useRef(false)
  // Animated turn for taps / arrows / keys. Forward = next page (swipe left).
  const goTurn = useCallback((dir) => {
    if (turning.current || drag.current) return
    const to = pageRef.current + dir
    if (to < 0 || to >= pages.length) return
    stopForTurn()
    if (!beginTurn(dir)) return
    turning.current = true
    requestAnimationFrame(() => {
      const a = dir === 1 ? 0 : 180
      setAngle(a)
      animateTo(a, dir === 1 ? 180 : 0, () => { finishTurn(true); turning.current = false })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length, beginTurn, setAngle, animateTo, finishTurn])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTurn(1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTurn(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTurn])

  const onPointerDown = (e) => {
    if (turn || turning.current) return
    drag.current = { x: e.clientX, y: e.clientY, w: e.currentTarget.getBoundingClientRect().width, dir: 0, lock: '', t: performance.now() }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    // Direction lock: decide once, after a small move, whether this is a page swipe.
    if (!d.lock && Math.hypot(dx, dy) > 10) {
      d.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y'
      if (d.lock === 'y') { drag.current = null; return }
      d.dir = dx < 0 ? 1 : -1
      stopForTurn()
      if (!beginTurn(d.dir)) { drag.current = null; return }
      d.t = performance.now(); d.x0 = e.clientX
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    if (!d.dir) return
    // Page follows the finger a little faster than 1:1 so a short swipe goes far.
    const frac = Math.max(0, Math.min(1, (Math.abs(dx) * 1.6) / d.w))
    setAngle(d.dir === 1 ? frac * 180 : 180 - frac * 180)
  }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d || !d.dir) return
    const dx = e.clientX - d.x
    const moved = d.dir === 1 ? -dx : dx // distance in the turning direction
    const v = Math.abs(e.clientX - (d.x0 ?? d.x)) / Math.max(1, performance.now() - d.t)
    const frac = Math.max(0, Math.min(1, (Math.abs(dx) * 1.6) / d.w))
    const commit = moved > 0 && (frac > 0.25 || v > 0.3 || Math.abs(dx) > 60)
    const now = d.dir === 1 ? frac * 180 : 180 - frac * 180
    const target = d.dir === 1 ? (commit ? 180 : 0) : (commit ? 0 : 180)
    turning.current = true
    animateTo(now, target, () => { finishTurn(commit); turning.current = false })
  }
  const canBack = pageSafe > 0
  const canNext = pageSafe < pages.length - 1

  // Put a freshly mounted flap at its start angle before paint.
  useEffect(() => { if (turn) setAngle(turn.dir === 1 ? 0 : 180) }, [turn, setAngle])

  /* ---- what each unit shows ---------------------------------------------- */
  const nextUnit = playing && cur >= 0 ? nextRecorded(UNITS, cur) : -1
  const markMode = (i) => {
    if (readMode === 'listen') return showAll ? 'all' : 'hidden'
    if (playing && i === cur) return 'current'
    if (showAll) return 'all'
    if (playing && i === nextUnit) return 'next'
    return 'hidden'
  }
  const glowFor = (i) => (playing && i === cur && readMode === 'letter' ? glow : -1)
  const face = (p) => <PageFace UNITS={UNITS} units={pages[p]} pageNo={p + 1} markMode={markMode} glowFor={glowFor} onTap={tapUnit} />

  // Layers: base (what will be revealed) under the flap (the turning page).
  const baseP = turn ? (turn.dir === 1 ? turn.to : turn.from) : pageSafe
  const flapP = turn ? (turn.dir === 1 ? turn.from : turn.to) : null
  // Books without a recording yet: no play or speed controls at all (layout slots kept).
  const voiced = useMemo(() => UNITS.some((u) => u.a), [UNITS])
  const hasRec = startUnitForPage(UNITS, pages[pageSafe], -1, practice) >= 0

  // Keep the word being read (or the page's first word) on screen across a re-cut.
  const resize = (d) => {
    anchor.current = playingRef.current && curRef.current >= 0 ? curRef.current : pages[pageSafe][0]
    setSize(() => {
      const k = d > 0 ? SIZES.findIndex((z) => z > scale + 1e-6) : SIZES.findLastIndex((z) => z < scale - 1e-6)
      return k >= 0 ? k : SIZES.indexOf(scale) >= 0 ? SIZES.indexOf(scale) : null
    })
  }

  const speedEl = (voiced ? (<div className="pb-speed" role="group" aria-label="ፍጥነት" data-testid="speed" data-rate={SPEEDS[speed]}>
          <button type="button" className="pb-spd" onClick={() => setSpeed((v) => Math.max(0, v - 1))} disabled={speed === 0} aria-label="ቀስ" data-testid="speed-down"><Turtle size={22} /></button>
          <span className="pb-spd-dots" aria-hidden="true">{SPEEDS.map((r, k) => <span key={k} className={`${k === speed ? 'on' : ''}${r === 1 ? ' one' : ''}`} />)}</span>
          <button type="button" className="pb-spd" onClick={() => setSpeed((v) => Math.min(SPEEDS.length - 1, v + 1))} disabled={speed === SPEEDS.length - 1} aria-label="ፍጠን" data-testid="speed-up"><Rabbit size={22} /></button>
        </div>
        ) : <span className="pb-speed" aria-hidden="true" />)
  const playEl = (ic) => (voiced ? (
        <button type="button" className="pb-play" onClick={togglePlay} disabled={!hasRec} aria-label={playing ? 'አቁም' : 'አንብብ'} data-testid="play">
          {playing ? <Pause size={ic} fill="currentColor" /> : <Play size={ic} fill="currentColor" />}
        </button>
        ) : <span className="pb-play-slot" aria-hidden="true" data-testid="no-voice" />)
  const sizeEl = (<div className="pb-size">
          <button type="button" className="pb-sz" onClick={() => resize(-1)} disabled={scale <= SIZES[0] + 1e-6} aria-label="ፊደል አሳንስ" data-testid="size-down"><span className="geez-book" style={{ fontSize: 17 }}>አ</span></button>
          <button type="button" className="pb-sz" onClick={() => resize(1)} disabled={scale >= SIZES[SIZES.length - 1] - 1e-6} aria-label="ፊደል አተልቅ" data-testid="size-up"><span className="geez-book" style={{ fontSize: 28 }}>አ</span></button>
        </div>)

  return (
    <div className="pb-root" data-testid="prayer-book" data-readmode={readMode} style={{ '--pb-scale': scale }} data-fit={size === null ? 'auto' : 'user'}>
      <header className="pb-top">
        <div className="pb-top-side">
          <button type="button" className="pb-icon" onClick={onBack} aria-label="ተመለስ"><ChevronLeft size={24} /></button>
          {showAll && (
            <button type="button" className={`pb-icon pb-legend-btn${legendOpen ? ' pb-on' : ''}`} onClick={() => setLegendOpen((v) => !v)} aria-label="የምልክቶች መፍቻ" aria-expanded={legendOpen} data-testid="legend-toggle">
              <MarkShape type="tenesh" size={22} />
            </button>
          )}
        </div>
        <button type="button" className="pb-title" onClick={() => setShelf((v) => !v)} aria-expanded={shelf} data-testid="book-picker" aria-label={BOOK.title}><TitleLabel title={BOOK.title} /></button>
        {shelf && (
          <div className="pb-shelf geez-book" role="menu">
            {BOOKS.map((b) => (
              <button key={b.id} type="button" role="menuitem" className={`pb-shelf-item${b.id === BOOK.id ? ' pb-on' : ''}`} data-testid={`book-${b.id}`} onClick={() => { setShelf(false); if (b.id !== BOOK.id) onPick(b.id) }}>{b.title}</button>
            ))}
          </div>
        )}
        <div className="pb-top-side pb-top-end">
          {voiced && (
            <button type="button" className={`pb-icon pb-mode-btn${modeOpen ? ' pb-on' : ''}`} onClick={() => setModeOpen((v) => !v)} aria-label="የንባብ ዓይነት" aria-expanded={modeOpen} data-testid="read-mode" data-mode={readMode}>
              <span className="geez-book pb-mode-ic">{READ_MODES.find((m) => m.id === readMode).icon}</span>
            </button>
          )}
          <button type="button" className={`pb-icon pb-practice${practice ? ' pb-on' : ''}`} onClick={() => (practice ? endPractice() : startPractice('button'))} aria-label="ልምምድ" aria-pressed={practice} data-testid="practice-toggle">
            <Target size={24} />
            {practice && <span className="pb-practice-dot" aria-hidden="true" />}
          </button>
          <button type="button" className={`pb-icon${showAll ? ' pb-on' : ''}`} onClick={() => setShowAll((x) => !x)} aria-label="ምልክቶች" aria-pressed={showAll} data-testid="marks-toggle">
            {showAll ? <Eye size={24} /> : <EyeOff size={24} />}
          </button>
        </div>
      </header>

      {modeOpen && (
        <div className="pb-shelf pb-modes geez-book" role="menu" data-testid="read-mode-menu">
          {READ_MODES.map((m) => (
            <button key={m.id} type="button" role="menuitemradio" aria-checked={m.id === readMode} className={`pb-shelf-item pb-mode-item${m.id === readMode ? ' pb-on' : ''}`} data-testid={`read-mode-${m.id}`} onClick={() => { setReadMode(m.id); setModeOpen(false) }}>
              <span className={`pb-mode-demo pb-demo-${m.id}`} aria-hidden="true">{m.id === 'letter' ? <><span className="d1">ሰ</span><span className="d2">ላ</span><span className="d3">ም</span></> : 'ሰላም'}</span>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {showAll && legendOpen && (
        <div className="pb-legend geez-book" role="button" tabIndex={0} aria-label="ዝጋ" data-testid="legend" onClick={() => setLegendOpen(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') setLegendOpen(false) }}>
          {['tenesh', 'seyaf', 'tetay', 'wedaqi', 'tie', 'tebqo'].map((k) => (
            <span key={k} className="pb-chip"><MarkShape type={k} size={k === 'tie' ? 26 : 20} />{NAMES[k]}</span>
          ))}
        </div>
      )}

      <div ref={stageRef} className="pb-stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="pb-book">
          <div className="pb-page pb-measure" aria-hidden="true">
            <div className="pb-face">
              <div ref={measRef} className="pb-text geez-book">
                {UNITS.map((u, i) => [
                  u.s && i > 0 ? <span key={`p${i}`} className="pb-para" /> : null,
                  <Unit key={i} u={u} idx={i} mode="hidden" glow={-1} onTap={() => {}} />,
                ])}
              </div>
              <div className="pb-folio">፩</div>
            </div>
          </div>
          <div className="pb-page pb-base">{face(baseP)}<div ref={shade} className="pb-shade" /></div>
          {flapP !== null && (
            <div ref={flap} className={`pb-page pb-flap${reduced ? ' pb-slide' : ''}`}>
              <div className="pb-front">{face(flapP)}<div ref={sheen} className="pb-sheen" /></div>
              {!reduced && <div className="pb-back" />}
            </div>
          )}
        </div>
        <button type="button" className="pb-edge pb-edge-l" onClick={() => goTurn(-1)} disabled={!canBack} aria-label="ወደ ኋላ" data-testid="page-back"><span className="pb-arrow"><ChevronLeft size={22} /></span></button>
        <button type="button" className="pb-edge pb-edge-r" onClick={() => goTurn(1)} disabled={!canNext} aria-label="ቀጣይ" data-testid="page-next"><span className="pb-arrow"><ChevronRight size={22} /></span></button>
      </div>

      <footer className="pb-fb" data-testid="controls">{speedEl}{playEl(26)}{sizeEl}</footer>
    </div>
  )
}
