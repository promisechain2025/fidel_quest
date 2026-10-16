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
import { ArrowLeft, Eye, EyeOff, Pause, Play } from 'lucide-react'
import BOOK from '../data/tselotMarks.json'
import { paginate, pageOfUnit, nextRecorded, glowLetter, geezNumeral, loadResume, saveResume, MARK_NAMES } from '../platform/prayerBook'
import { FIDEL_AUDIO_BASE } from '../platform/publicUrl'

const UNITS = BOOK.units
const SPEEDS = [0.8, 1, 1.2]
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
                    <span className="pb-mark" style={{ color: tone }}><MarkShape type={u.m} size={mode === 'current' ? 26 : 20} /></span>
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

function PageFace({ units, pageNo, markMode, glowFor, onTap }) {
  return (
    <div className="pb-face">
      <div className="pb-text geez-book">
        {units.map((i) => (
          <Unit key={i} u={UNITS[i]} idx={i} mode={markMode(i)} glow={glowFor(i)} onTap={onTap} />
        ))}
      </div>
      <div className="pb-folio">{geezNumeral(pageNo)}</div>
    </div>
  )
}

export default function PrayerBook({ onBack }) {
  // Pages are cut from REAL layout: every unit is laid out once in a hidden
  // page of the same size, we read which line each lands on, and fill each
  // page with as many whole lines as fit. Marks are absolutely positioned,
  // so marks on/off never changes the cut.
  const stageRef = useRef(null)
  const measRef = useRef(null)
  const [pages, setPages] = useState(() => paginate(UNITS, 70))
  useLayoutEffect(() => {
    const el = measRef.current
    if (!el || typeof window === 'undefined') return
    const measure = () => {
      const box = el.clientHeight
      const kids = el.children
      if (!box || kids.length !== UNITS.length) return
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 0
      if (!lh) return
      const per = Math.max(2, Math.floor((box + 0.5) / lh))
      const out = []
      let line = -1, lastTop = null
      for (let i = 0; i < kids.length; i++) {
        const t = kids[i].offsetTop
        if (lastTop === null || t > lastTop + lh / 2) { line++; lastTop = t }
        const pg = Math.floor(line / per)
        ;(out[pg] = out[pg] || []).push(i)
      }
      if (line < 1) return // no real layout (tests): keep the fallback
      setPages(out.filter(Boolean))
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
  }, [])
  const resume = useMemo(() => loadResume(BOOK.id), [])
  const [page, setPage] = useState(() => (resume && resume.unit >= 0 ? pageOfUnit(paginate(UNITS, 70), resume.unit) : Math.max(0, resume?.page || 0)))
  const pageSafe = Math.min(page, pages.length - 1)
  // Keep the resume word on screen when the budget changes after measuring.
  const anchor = useRef(resume && resume.unit >= 0 ? resume.unit : null)
  const shownFirst = useRef(null)
  useEffect(() => {
    const a = anchor.current !== null ? anchor.current : shownFirst.current
    if (a !== null) setPage(pageOfUnit(pages, a))
  }, [pages])
  const [showAll, setShowAll] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  useEffect(() => {
    if (!showAll || !legendOpen) return
    const t = setTimeout(() => setLegendOpen(false), 3500)
    return () => clearTimeout(t)
  }, [showAll, legendOpen])
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(resume?.unit ?? -1)
  const [glow, setGlow] = useState(-1)
  const [speed, setSpeed] = useState(0)
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
  useEffect(() => { saveResume(BOOK.id, { page: pageSafe, unit: cur >= 0 ? cur : pages[pageSafe][0] }) }, [pageSafe, cur, pages])

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
    if (i < 0) { setPlaying(false); playingRef.current = false; setGlow(-1); return }
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
    el.playbackRate = SPEEDS[speed]
    el.onended = () => { cancelAnimationFrame(raf.current); if (playingRef.current) playUnit(nextRecorded(UNITS, i)) }
    const tick = () => {
      if (el.duration > 0) setGlow(glowLetter(u, el.currentTime / el.duration))
      raf.current = requestAnimationFrame(tick)
    }
    el.play().then(() => { raf.current = requestAnimationFrame(tick) }).catch(() => { setPlaying(false); playingRef.current = false })
  }, [pages, speed, autoTurn])

  const togglePlay = () => {
    if (playingRef.current) { playingRef.current = false; setPlaying(false); stopAudio(); setGlow(-1); return }
    const onPage = pages[pageSafe]
    let start = cur >= 0 && onPage.includes(cur) && UNITS[cur].a ? cur : onPage.find((i) => UNITS[i].a)
    if (start === undefined) start = nextRecorded(UNITS, onPage[onPage.length - 1])
    if (start < 0 || start === undefined) return
    playingRef.current = true
    setPlaying(true)
    playUnit(start)
  }

  const tapUnit = (i) => {
    anchor.current = i
    if (playingRef.current || !UNITS[i].a) return
    playUnit(i)
    playingRef.current = false
    setCur(i)
  }

  /* ---- drag to turn ------------------------------------------------------ */
  const onPointerDown = (e) => {
    if (turn || playingRef.current) return
    drag.current = { x: e.clientX, w: e.currentTarget.getBoundingClientRect().width, dir: 0, t: performance.now() }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.dir && Math.abs(dx) > 8) {
      d.dir = dx < 0 ? 1 : -1
      if (!beginTurn(d.dir)) { drag.current = null; return }
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    if (!d.dir) return
    const frac = Math.max(0, Math.min(1, Math.abs(dx) / d.w))
    setAngle(d.dir === 1 ? frac * 180 : 180 - frac * 180)
  }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d || !d.dir) return
    const dx = e.clientX - d.x
    const v = Math.abs(dx) / Math.max(1, performance.now() - d.t)
    const frac = Math.min(1, Math.abs(dx) / d.w)
    const commit = frac > 0.35 || v > 0.6
    const now = d.dir === 1 ? frac * 180 : 180 - frac * 180
    const target = d.dir === 1 ? (commit ? 180 : 0) : (commit ? 0 : 180)
    animateTo(now, target, () => finishTurn(commit))
  }

  // Put a freshly mounted flap at its start angle before paint.
  useEffect(() => { if (turn) setAngle(turn.dir === 1 ? 0 : 180) }, [turn, setAngle])

  /* ---- what each unit shows ---------------------------------------------- */
  const nextUnit = playing && cur >= 0 ? nextRecorded(UNITS, cur) : -1
  const markMode = (i) => {
    if (playing && i === cur) return 'current'
    if (showAll) return 'all'
    if (playing && i === nextUnit) return 'next'
    return 'hidden'
  }
  const glowFor = (i) => (playing && i === cur ? glow : -1)
  const face = (p) => <PageFace units={pages[p]} pageNo={p + 1} markMode={markMode} glowFor={glowFor} onTap={tapUnit} />

  // Layers: base (what will be revealed) under the flap (the turning page).
  const baseP = turn ? (turn.dir === 1 ? turn.to : turn.from) : pageSafe
  const flapP = turn ? (turn.dir === 1 ? turn.from : turn.to) : null
  const hasRec = pages[pageSafe].some((i) => UNITS[i].a) || nextRecorded(UNITS, pages[pageSafe][pages[pageSafe].length - 1]) >= 0

  return (
    <div className="pb-root" data-testid="prayer-book">
      <header className="pb-top">
        <button type="button" className="pb-icon" onClick={onBack} aria-label="ተመለስ"><ArrowLeft size={30} /></button>
        <div className="pb-title geez-book">{BOOK.title}</div>
        <button type="button" className={`pb-icon${showAll ? ' pb-on' : ''}`} onClick={() => { setShowAll((s) => !s); setLegendOpen(true) }} aria-label="ምልክቶች" aria-pressed={showAll} data-testid="marks-toggle">
          {showAll ? <Eye size={30} /> : <EyeOff size={30} />}
        </button>
      </header>

      {showAll && legendOpen && (
        <div className="pb-legend geez-book" data-testid="legend" onClick={() => setLegendOpen(false)}>
          {['tenesh', 'seyaf', 'tetay', 'wedaqi', 'tie', 'tebqo'].map((k) => (
            <span key={k} className="pb-chip"><MarkShape type={k} size={k === 'tie' ? 26 : 20} />{MARK_NAMES[k]}</span>
          ))}
        </div>
      )}

      <div ref={stageRef} className="pb-stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="pb-book">
          <div className="pb-page pb-measure" aria-hidden="true">
            <div className="pb-face">
              <div ref={measRef} className="pb-text geez-book">
                {UNITS.map((u, i) => <Unit key={i} u={u} idx={i} mode="hidden" glow={-1} onTap={() => {}} />)}
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
      </div>

      <footer className="pb-bottom">
        <button type="button" className="pb-speed" onClick={() => setSpeed((s) => (s + 1) % SPEEDS.length)} aria-label="ፍጥነት" data-speed={speed}>
          {SPEEDS.map((_, k) => <span key={k} className={k <= speed ? 'on' : ''} />)}
        </button>
        <button type="button" className="pb-play" onClick={togglePlay} disabled={!hasRec} aria-label={playing ? 'አቁም' : 'አንብብ'} data-testid="play">
          {playing ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" />}
        </button>
        <span />
      </footer>
    </div>
  )
}
