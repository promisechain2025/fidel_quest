/* ============================================================================
   KOKEB'S BINGO — the renderer (solo + teacher-configured classroom)
   ----------------------------------------------------------------------------
   Audio-first fidel bingo. The voiced letter is NEVER shown to a player - the
   whole game is listening. Ways in:

   - SOLO   : Kokeb calls a letter aloud; the kid finds it and daubs. Line wins.
   - HOST   : the teacher SETS UP a game - picks which letters are in play and
              the winning shape (line / diagonal / X / corners / full card) -
              then gets a QR + code. Kids scan to open a UNIQUE card dealt from
              exactly those letters. The teacher then calls letters aloud (shown
              on the teacher screen only) and keeps the called list to verify a
              shouted BINGO. The whole config rides inside the QR/link (no
              backend), so every device reconstructs the same pool + rule.
   - JOIN   : a kid's card. `?bingo=<config>` (scan) or a typed/pasted code.
              Shows only the card + the goal shape; the kid marks what they hear.

   Thin shell over the pure `bingoCore`; letters/pattern come from the config.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import QRCode from 'qrcode'
import { ChevronLeft, Volume2, Star, Users, User, Megaphone, ScanLine, Check, Eye, EyeOff } from 'lucide-react'
import { rngShuffle } from '../platform/rng'
import { playForm, playEffect } from '../platform/audioEngine'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { formOf, ALL_FORMS, FOCUS } from '../FidelQuestApp'
import AnbessaSvg from './AnbessaSvg'
import KokebSvg from './KokebSvg'
import { LetterTile } from './Manuscript'
import { initBingo, bingoTransition, currentCall, dealCard, toggleMark, initCaller, callNext, lastCalled, encodeBingoConfig, decodeBingoConfig, PATTERNS, Phase, BingoEvent } from '../bingoCore'

// One base letter (order 1 = ግዕዝ) per family - the teacher's selectable set.
const BASE_FORMS = ALL_FORMS.filter((f) => f.order === 1)
const ID_TO_INDEX = new Map(BASE_FORMS.map((f) => [f.familyId, f.familyIndex]))
const INDEX_TO_FORM = new Map(BASE_FORMS.map((f) => [f.familyIndex, f]))
const poolFromFamilies = (indices) => indices.map((i) => INDEX_TO_FORM.get(i)?.audioKey).filter(Boolean)

// Illustrative cells for each winning pattern (a 3x3 picture, not the detector).
const PATTERN_ART = { line: [0, 1, 2], diagonal: [0, 4, 8], x: [0, 2, 4, 6, 8], corners: [0, 2, 6, 8], blackout: [0, 1, 2, 3, 4, 5, 6, 7, 8] }
const PATTERN_LABEL = { line: ['bingoPatLine', 'Line'], diagonal: ['bingoPatDiagonal', 'Diagonal'], x: ['bingoPatX', 'X'], corners: ['bingoPatCorners', 'Corners'], blackout: ['bingoPatBlackout', 'Full card'] }

function PatternGlyph({ pattern, dot = 7, gap = 3 }) {
  const on = new Set(PATTERN_ART[pattern] || [])
  return (
    <span className="inline-grid" style={{ gridTemplateColumns: `repeat(3, ${dot}px)`, gap }} aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{ width: dot, height: dot, borderRadius: '50%', background: on.has(i) ? 'var(--go)' : 'var(--line)' }} />
      ))}
    </span>
  )
}

function QrPanel({ url, size = 168 }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(url, { margin: 1, width: size * 2, color: { light: '#ffffff', dark: '#12203a' } }).then((u) => alive && setSrc(u)).catch(() => alive && setSrc(null))
    return () => { alive = false }
  }, [url, size])
  if (!src) return <span style={{ width: size, height: size }} className="block rounded-2xl" />
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} className="rounded-2xl bg-white p-1.5" style={{ imageRendering: 'pixelated' }} />
}

function Shell({ title, onBack, children, scroll = false }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-lg font-black">{title}</h1>
        <div className="w-11" />
      </header>
      <main className={scroll ? 'flex-1 overflow-y-auto' : 'flex flex-1 flex-col'}>{children}</main>
    </div>
  )
}

function CardGrid({ card, marked, winSet, onCell, buzz = -1, disabled = false, reduce }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {card.map((key, i) => (
        <motion.button
          key={i} type="button" onClick={() => onCell(i)} disabled={disabled}
          whileTap={reduce || disabled ? undefined : { scale: 0.93 }}
          animate={buzz === i && !reduce ? { x: [0, -5, 5, -4, 0] } : { x: 0 }} transition={{ duration: 0.3 }}
          aria-label={formOf(key)?.sound || 'letter'} className={`relative rounded-2xl ${FOCUS}`} style={{ outlineColor: 'var(--go)' }}
        >
          <LetterTile glyph={formOf(key)?.char} state={marked[i] ? 'done' : 'current'} size={82} style={winSet && winSet.has(i) ? { boxShadow: '0 0 0 4px var(--go), 0 5px 0 var(--tile-deep)' } : undefined} />
          {marked[i] && (
            <motion.span className="pointer-events-none absolute inset-0 flex items-center justify-center" initial={reduce ? false : { scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 16 }}>
              <Star className="h-11 w-11" style={{ color: 'var(--star)', fill: 'var(--star)', opacity: 0.92 }} aria-hidden="true" />
            </motion.span>
          )}
        </motion.button>
      ))}
    </div>
  )
}

function WinButtons({ onAgain, onBack }) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onAgain} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>{t('bingoAgain', 'New card')}</button>
      <button type="button" onClick={onBack} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>{t('orderDone', 'Done')}</button>
    </div>
  )
}

/* --- SOLO ------------------------------------------------------------------- */
function SoloBingo({ soundOn, onBack, families, reduce }) {
  const pool = useMemo(() => {
    const inScope = families && families.length ? ALL_FORMS.filter((f) => families.includes(f.familyId)) : ALL_FORMS
    const src = inScope.length ? inScope : ALL_FORMS
    const bases = src.filter((f) => f.order === 1).map((f) => f.audioKey)
    if (bases.length >= 9) return bases
    const more = [...new Set([...bases, ...src.map((f) => f.audioKey)])]
    return more.length >= 9 ? more : [...new Set([...more, ...BASE_FORMS.map((f) => f.audioKey)])]
  }, [families])
  const startRef = useRef(Math.floor(Math.random() * 997) + 1)
  const [round, setRound] = useState(0)
  const [ctx, setCtx] = useState(() => initBingo((round + 1) * 191 + startRef.current, pool, 3))
  const [buzz, setBuzz] = useState(-1)
  useEffect(() => { setCtx(initBingo((round + 1) * 191 + startRef.current, pool, 3)) }, [round, pool])
  const call = currentCall(ctx)
  const calledForm = call != null ? formOf(ctx.card[call]) : null
  const won = ctx.phase === Phase.WIN
  useEffect(() => { if (calledForm) playForm(calledForm, soundOn) }, [ctx.callIdx, round, won]) // eslint-disable-line react-hooks/exhaustive-deps
  const onCell = (index) => {
    if (won) return
    recordAnswer(String(currentCall(ctx)), String(index), 'bingo')
    const r = bingoTransition(ctx, { type: BingoEvent.DAUB, payload: { index } })
    if (r.accepted) { setCtx(r.next); if (r.won) setTimeout(() => playEffect('win', soundOn), 200); else playEffect('good', soundOn) } else { playEffect('bad', soundOn); setBuzz(index); setTimeout(() => setBuzz(-1), 320) }
  }
  const winSet = useMemo(() => new Set(won && ctx.winLine ? ctx.winLine : []), [won, ctx.winLine])
  return (
    <Shell title={t('bingoTitle', "Kokeb's Bingo")} onBack={onBack}>
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        {won ? <AnbessaSvg size={92} mood="happy" pose="cheer" /> : <KokebSvg size={64} />}
        {won ? (
          <div className="flex flex-col items-center gap-4"><p className="text-2xl font-black" style={{ color: 'var(--go)' }}>{t('bingoWin', 'BINGO!')}</p><WinButtons onAgain={() => setRound((r) => r + 1)} onBack={onBack} /></div>
        ) : (
          <>
            <button type="button" onClick={() => calledForm && playForm(calledForm, soundOn)} aria-label={t('bingoSayAgain', 'Hear the letter again')} className={`flex items-center gap-3 rounded-2xl px-6 py-3 ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
              <Volume2 className="h-7 w-7" style={{ color: 'var(--sky)' }} aria-hidden="true" /><span className="text-base font-black" style={{ color: 'var(--muted)' }}>{t('bingoListen', 'Listen!')}</span>
            </button>
            <p className="text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('bingoHint', 'Find it on your card!')}</p>
          </>
        )}
        <CardGrid card={ctx.card} marked={ctx.marked} winSet={winSet} onCell={onCell} buzz={buzz} disabled={won} reduce={reduce} />
      </div>
    </Shell>
  )
}

/* --- HOST SETUP: teacher picks letters + winning shape ---------------------- */
function HostSetup({ onBack, onStart, families }) {
  const [sel, setSel] = useState(() => {
    const s = new Set((families || []).map((id) => ID_TO_INDEX.get(id)).filter((i) => i != null))
    for (const f of BASE_FORMS) { if (s.size >= 12) break; s.add(f.familyIndex) }
    return s
  })
  const [pattern, setPattern] = useState('line')
  const toggle = (i) => setSel((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n })
  const enough = sel.size >= 9
  return (
    <Shell title={t('bingoSetup', 'Set up Class Bingo')} onBack={onBack} scroll>
      <div className="flex flex-col gap-4 pb-4">
        <section>
          <p className="mb-2 text-sm font-black">{t('bingoPickLetters', 'Pick the letters')} <span style={{ color: 'var(--muted)' }}>({sel.size})</span></p>
          <div className="grid grid-cols-6 gap-1.5">
            {BASE_FORMS.map((f) => {
              const on = sel.has(f.familyIndex)
              return (
                <button key={f.familyIndex} type="button" onClick={() => toggle(f.familyIndex)} aria-pressed={on} aria-label={f.sound} className={`geez relative flex h-11 items-center justify-center rounded-xl text-xl font-black ${FOCUS}`} style={{ background: on ? 'var(--go-soft)' : 'var(--paper)', border: `2px solid ${on ? 'var(--go)' : 'var(--line)'}`, color: 'var(--glyph)' }}>
                  {f.char}
                  {on && <Check className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white p-px" style={{ color: 'var(--go)' }} aria-hidden="true" />}
                </button>
              )
            })}
          </div>
          {!enough && <p className="mt-2 text-xs font-bold" style={{ color: 'var(--jibby, #c0562f)' }}>{t('bingoNeedMore', 'Pick at least 9 letters.')}</p>}
        </section>
        <section>
          <p className="mb-2 text-sm font-black">{t('bingoPickPattern', 'Pick the winning shape')}</p>
          <div className="flex flex-wrap gap-2">
            {PATTERNS.map((p) => {
              const on = pattern === p
              return (
                <button key={p} type="button" onClick={() => setPattern(p)} aria-pressed={on} className={`flex flex-col items-center gap-1.5 rounded-2xl px-3 py-2.5 ${FOCUS}`} style={{ background: on ? 'var(--go-soft)' : 'var(--paper)', border: `2px solid ${on ? 'var(--go)' : 'var(--line)'}`, minWidth: 64 }}>
                  <PatternGlyph pattern={p} />
                  <span className="text-[11px] font-black" style={{ color: on ? 'var(--go-ink)' : 'var(--muted)' }}>{t(PATTERN_LABEL[p][0], PATTERN_LABEL[p][1])}</span>
                </button>
              )
            })}
          </div>
        </section>
        <button type="button" disabled={!enough} onClick={() => onStart({ families: [...sel], pattern })} className={`chunk mt-1 rounded-2xl px-6 py-3.5 font-black text-white ${FOCUS}`} style={{ background: enough ? 'var(--go)' : 'var(--line)', boxShadow: `0 4px 0 ${enough ? 'var(--go-deep)' : 'var(--line)'}`, '--chunk-depth': '4px', opacity: enough ? 1 : 0.6 }}>
          <span className="inline-flex items-center gap-2"><Megaphone className="h-5 w-5" aria-hidden="true" /> {t('bingoStart', 'Start game')}</span>
        </button>
      </div>
    </Shell>
  )
}

/* --- HOST CALLER: QR + code + call over the chosen letters ------------------ */
function HostCaller({ soundOn, onBack, config }) {
  const code = useMemo(() => encodeBingoConfig(config), [config])
  const pool = useMemo(() => poolFromFamilies(config.families), [config])
  const [caller, setCaller] = useState(() => initCaller(pool, 1))
  // Show the glyph on the (often projected) teacher screen, or keep it VOICE
  // ONLY so advanced kids must recognize by ear and can't just shape-match.
  // Flip to Show anytime to verify a shouted BINGO against the called list.
  const [reveal, setReveal] = useState(true)
  const joinUrl = useMemo(() => { try { return `${window.location.origin}${window.location.pathname}?bingo=${code}` } catch { return `?bingo=${code}` } }, [code])
  const last = lastCalled(caller)
  const lastForm = last ? formOf(last) : null
  const done = caller.idx >= caller.order.length
  const next = () => { if (done) return; const c = callNext(caller); setCaller(c); const k = lastCalled(c); if (k) playForm(formOf(k), soundOn) }
  const Seg = ({ active, on, icon, label }) => (
    <button type="button" onClick={on} aria-pressed={active} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${FOCUS}`} style={{ background: active ? 'var(--go)' : 'transparent', color: active ? '#fff' : 'var(--muted)' }}>{icon}{label}</button>
  )
  return (
    <Shell title={t('bingoHost', 'Class Bingo')} onBack={onBack} scroll>
      <div className="flex flex-col items-center gap-3 pb-4">
        <div className="flex w-full flex-col items-center gap-2 rounded-3xl px-5 py-4" style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
          <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: 'var(--muted)' }}><ScanLine className="h-4 w-4" aria-hidden="true" /> {t('bingoJoinWith', 'Kids scan to join')}</div>
          <QrPanel url={joinUrl} />
          <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--muted)' }}>
            <PatternGlyph pattern={config.pattern} dot={6} /> {t('bingoGoal', 'Make this shape to win')}
          </div>
        </div>

        {/* teacher display mode: show the letters as a scaffold, or voice only */}
        <div className="flex rounded-full p-0.5" style={{ background: 'var(--paper)', border: '1.5px solid var(--line)' }}>
          <Seg active={reveal} on={() => setReveal(true)} icon={<Eye className="h-4 w-4" aria-hidden="true" />} label={t('bingoShowLetters', 'Show letters')} />
          <Seg active={!reveal} on={() => setReveal(false)} icon={<EyeOff className="h-4 w-4" aria-hidden="true" />} label={t('bingoVoiceOnly', 'Voice only')} />
        </div>

        <div className="flex flex-col items-center gap-2">
          {lastForm ? (
            <button type="button" onClick={() => playForm(lastForm, soundOn)} aria-label={t('bingoSayAgain', 'Hear the letter again')} className={`flex items-center gap-3 rounded-2xl px-6 py-2.5 ${FOCUS}`} style={{ background: 'var(--go-soft)', border: '2px solid var(--go)', boxShadow: '0 4px 0 var(--go)' }}>
              <Volume2 className="h-6 w-6" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
              {reveal ? <span className="geez text-4xl font-black" style={{ color: 'var(--go-ink)' }}>{lastForm.char}</span> : <span className="text-base font-black" style={{ color: 'var(--go-ink)' }}>{t('bingoListen', 'Listen!')}</span>}
            </button>
          ) : <p className="text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('bingoHostReady', 'Call a letter for the class to find.')}</p>}
        </div>
        <button type="button" onClick={next} disabled={done} className={`chunk rounded-2xl px-6 py-3 font-black text-white ${FOCUS}`} style={{ background: done ? 'var(--line)' : 'var(--go)', boxShadow: `0 4px 0 ${done ? 'var(--line)' : 'var(--go-deep)'}`, '--chunk-depth': '4px', opacity: done ? 0.6 : 1 }}>
          <span className="inline-flex items-center gap-2"><Megaphone className="h-5 w-5" aria-hidden="true" /> {done ? t('bingoAllCalled', 'All letters called') : t('bingoCallNext', 'Call next letter')}</span>
        </button>
        {caller.called.length > 0 && (
          <div className="mt-1 w-full">
            <p className="mb-1.5 text-center text-[11px] font-black uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{t('bingoCalledSoFar', 'Called so far')} ({caller.called.length}/{caller.order.length})</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {caller.called.map((k, i) => (
                <span key={i} className="geez flex h-9 w-9 items-center justify-center rounded-lg text-lg font-black" style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', color: 'var(--glyph)' }}>
                  {reveal ? formOf(k)?.char : <Volume2 className="h-4 w-4" style={{ color: 'var(--muted)' }} aria-hidden="true" />}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

/* --- JOIN / PLAY: a kid's unique card from the teacher's config ------------- */
function PlayBingo({ soundOn, onBack, code, reduce }) {
  const config = useMemo(() => decodeBingoConfig(code), [code])
  const pool = useMemo(() => (config ? poolFromFamilies(config.families) : BASE_FORMS.map((f) => f.audioKey)), [config])
  const pattern = config?.pattern || 'line'
  const seedRef = useRef(Math.floor(Math.random() * 1e6) + 1)
  const [state, setState] = useState(() => dealCard(pool, seedRef.current, 3, pattern))
  const won = state.phase === Phase.WIN
  const onCell = (i) => {
    if (won) return
    const ns = toggleMark(state, i)
    setState(ns)
    if (ns.marked[i]) playForm(formOf(state.card[i]), soundOn)
    if (ns.phase === Phase.WIN) setTimeout(() => playEffect('win', soundOn), 160)
  }
  const winSet = useMemo(() => new Set(won && state.winLine ? state.winLine : []), [won, state.winLine])
  const newCard = () => { seedRef.current = (seedRef.current * 48271) % 2147483647; setState(dealCard(pool, seedRef.current, 3, pattern)) }
  return (
    <Shell title={t('bingoTitle', "Kokeb's Bingo")} onBack={onBack}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        {won ? <AnbessaSvg size={88} mood="happy" pose="cheer" /> : <KokebSvg size={56} />}
        {won ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-3xl font-black" style={{ color: 'var(--go)' }}>{t('bingoWin', 'BINGO!')}</p>
            <p className="text-center text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('bingoShout', 'Shout BINGO so your teacher can check!')}</p>
            <WinButtons onAgain={newCard} onBack={onBack} />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'var(--card)', border: '1.5px solid var(--line)' }}>
              <PatternGlyph pattern={pattern} dot={6} /> <span className="text-[11px] font-black" style={{ color: 'var(--muted)' }}>{t('bingoGoal', 'Make this shape to win')}</span>
            </div>
            <p className="text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('bingoPlayHint', 'Listen to your teacher. Tap the letters you hear!')}</p>
          </>
        )}
        <CardGrid card={state.card} marked={state.marked} winSet={winSet} onCell={onCell} disabled={won} reduce={reduce} />
      </div>
    </Shell>
  )
}

/* --- hub / menu ------------------------------------------------------------- */
export default function BingoCard({ soundOn, onBack, families = [], code = null }) {
  const reduce = useReducedMotion()
  const [mode, setMode] = useState(code ? 'play' : 'menu')
  const [config, setConfig] = useState(null)
  const [joinCode, setJoinCode] = useState(code || '')
  const [entered, setEntered] = useState('')

  if (mode === 'solo') return <SoloBingo soundOn={soundOn} onBack={() => setMode('menu')} families={families} reduce={reduce} />
  if (mode === 'setup') return <HostSetup onBack={() => setMode('menu')} families={families} onStart={(cfg) => { setConfig(cfg); setMode('host') }} />
  if (mode === 'host' && config) return <HostCaller soundOn={soundOn} onBack={() => setMode('setup')} config={config} />
  if (mode === 'play' && joinCode) return <PlayBingo soundOn={soundOn} onBack={code ? onBack : () => setMode('menu')} code={joinCode} reduce={reduce} />

  const Card = ({ icon, title, desc, tone, onClick }) => (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: tone, color: '#fff' }}>{icon}</span>
      <span className="flex flex-col"><span className="font-black">{title}</span><span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{desc}</span></span>
    </button>
  )

  return (
    <Shell title={t('bingoTitle', "Kokeb's Bingo")} onBack={onBack}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <KokebSvg size={72} />
        {mode === 'join' ? (
          <div className="flex w-full flex-col items-center gap-3">
            <p className="text-center text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('bingoEnterCode', 'Enter the code from your teacher')}</p>
            <input value={entered} onChange={(e) => setEntered(e.target.value.trim())} placeholder="…" className={`w-56 rounded-2xl px-4 py-3 text-center text-lg font-black ${FOCUS}`} style={{ background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--sky)' }} />
            <div className="flex gap-3">
              <button type="button" disabled={!entered} onClick={() => { setJoinCode(entered); setMode('play') }} className={`chunk rounded-2xl px-6 py-3 font-black text-white ${FOCUS}`} style={{ background: entered ? 'var(--go)' : 'var(--line)', boxShadow: `0 4px 0 ${entered ? 'var(--go-deep)' : 'var(--line)'}`, '--chunk-depth': '4px', opacity: entered ? 1 : 0.6 }}>{t('bingoJoin', 'Join')}</button>
              <button type="button" onClick={() => setMode('menu')} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>{t('back', 'Back')}</button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3">
            <Card icon={<User className="h-6 w-6" />} tone="var(--sky)" title={t('bingoSolo', 'Play solo')} desc={t('bingoSoloDesc', 'Kokeb calls, you find the letters')} onClick={() => setMode('solo')} />
            <Card icon={<Megaphone className="h-6 w-6" />} tone="var(--go)" title={t('bingoHostCard', 'Host for a class')} desc={t('bingoHostDesc', 'Teacher: pick letters and call')} onClick={() => setMode('setup')} />
            <Card icon={<Users className="h-6 w-6" />} tone="var(--star)" title={t('bingoJoinGame', 'Join a game')} desc={t('bingoJoinDesc', 'Enter your class code to get a card')} onClick={() => setMode('join')} />
          </div>
        )}
      </div>
    </Shell>
  )
}
