/* My progress — one screen per child.
   Kid view: the approved card layout (rows, games, week bars, listen, next).
   Grown-ups view: the same cards plus day names, the weekly-target stepper,
   weak letters, activities not opened, this week's accuracy, and share.
   Every number comes from progressModel(). No storage reads in this file. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpen, Brain, Castle, Church, Clock, Drum, Flame, Footprints, Grid3x3, Layers,
  Library, Minus, Play, Plus, ScrollText, Share2, ShoppingBasket, Star, Target,
  ToyBrick, TrainFront, X,
} from 'lucide-react'
import { t } from '../platform/i18n'
import { useChildModel } from '../platform/childModel'
import { loadProgressModel, setWeekTarget, WEEK_TARGET_STEP } from '../platform/progressModel'
import { progressCardUrl } from '../platform/progressCard'
import { nativeShare } from '../platform/native'

const FOCUS = 'focus-visible:outline-3 focus-visible:outline-offset-2'

function useProgressModel() {
  const rev = useChildModel()
  // rev is the invalidation tick; loadProgressModel reads storage, not rev.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => loadProgressModel(), [rev])
}

const GAME_ICON = {
  echo: Brain,
  train: TrainFront,
  market: ShoppingBasket,
  beats: Drum,
  tower: Layers,
  blocks: Church,
  brickwords: ToyBrick,
  mama: Castle,
  runner: Footprints,
  catch: Star,
  traffic: Target,
  bingo: Grid3x3,
  twins: BookOpen,
  mix: Layers,
  hunt: Flame,
  explore: Library,
}
const GAME_TONE = {
  echo: '#cfe8ff', train: '#ffe9a6', market: '#d9f2cf', beats: '#ffd6cc', tower: '#f3e0ff',
  blocks: '#ffe9a6', brickwords: '#cfe8ff', mama: '#f3e0c0', runner: '#d9f2cf', catch: '#d9f2cf', traffic: '#ffe9a6',
  bingo: '#f3e0ff', twins: '#ffd6cc', mix: '#ffe9a6', hunt: '#ffe9a6', explore: '#cfe8ff',
}
const DAY_LABELS = [
  ['mpMon', 'Mon'], ['mpTue', 'Tue'], ['mpWed', 'Wed'], ['mpThu', 'Thu'],
  ['mpFri', 'Fri'], ['mpSat', 'Sat'], ['mpSun', 'Sun'],
]

function gameLabel(id) {
  switch (id) {
    case 'echo': return t('echoShort', 'Echo Match')
    case 'train': return t('trainShort', 'Vowel Train')
    case 'market': return t('wordMarketShort', 'Word Market')
    case 'beats': return t('beatsShort', 'Kebero Beats')
    case 'tower': return t('towerShort', 'Letter Tower')
    case 'blocks': return t('blockChurchShort', 'Block Church')
    case 'brickwords': return t('wordBricksShort', 'Word Bricks')
    case 'mama': return t('mamaShort', 'Tower')
    case 'runner': return t('mpRunner', 'Letter Runner')
    case 'catch': return t('mpCatch', 'Letter Catch')
    case 'traffic': return t('trShort', 'Traffic')
    case 'bingo': return t('bingoShort', 'Bingo')
    case 'twins': return t('twinsShort', 'Twins')
    case 'mix': return t('mpMix', 'Mix')
    case 'hunt': return t('huntShort', 'Daily Hunt')
    case 'explore': return t('explorerShort', 'Explorer')
    default: return ''
  }
}

function Track({ pct, tone = 'gold', tall = false, testId }) {
  const fill = tone === 'green'
    ? 'linear-gradient(#7fd46b,#3fa535)'
    : tone === 'blue'
      ? 'linear-gradient(#7cc4ff,#2f8be0)'
      : tone === 'red'
        ? 'linear-gradient(#ff9a8a,#e5533d)'
        : 'linear-gradient(#ffd34d,#f2a900)'
  return (
    <span data-testid={testId} data-pct={pct} className="relative block min-w-0 flex-1 overflow-hidden rounded-full" style={{ height: tall ? 22 : 14, background: 'color-mix(in srgb, var(--line) 80%, #c9b07a)', boxShadow: 'inset 0 2px 0 rgba(0,0,0,.08)' }} aria-hidden="true">
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: fill, transition: 'width 500ms ease' }} />
    </span>
  )
}

function Card({ children, testId, className = '' }) {
  return (
    <section data-testid={testId} className={`rounded-[18px] p-3 ${className}`} style={{ background: 'var(--card)', boxShadow: '0 5px 0 var(--line)' }}>
      {children}
    </section>
  )
}

function CardTitle({ children, aside }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
      <span>{children}</span>
      {aside ? <span>{aside}</span> : null}
    </div>
  )
}

export function RowGrid({ tiles }) {
  return (
    <div data-testid="mp-rows" className="grid grid-cols-11 gap-1" style={{ touchAction: 'manipulation' }}>
      {tiles.map((tile) => {
        const face = tile.state === 'mastered'
          ? { background: 'var(--tile)', color: 'var(--glyph)', boxShadow: '0 3px 0 var(--tile-deep)' }
          : tile.state === 'partial'
            ? { background: 'color-mix(in srgb, var(--tile) 42%, var(--card))', color: 'var(--ink)', boxShadow: '0 3px 0 var(--line)' }
            : { background: 'color-mix(in srgb, var(--line) 70%, var(--card))', color: 'var(--muted)' }
        return (
          <div
            key={tile.id}
            data-testid={`mp-row-${tile.id}`}
            data-state={tile.state}
            data-fill={Math.round(tile.fill * 100)}
            className="geez relative flex aspect-square items-center justify-center rounded-md font-black"
            lang="am"
            style={{ fontSize: 'clamp(12px, 2.5vw, 18px)', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', ...face }}
          >
            {tile.char}
            {tile.state === 'partial' && (
              <span aria-hidden="true" className="absolute bottom-[3px] left-[3px] right-[3px] h-[3px] overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, var(--line) 80%, #c9b07a)' }}>
                <span className="block h-full rounded-full" style={{ width: `${Math.max(8, Math.round(tile.fill * 100))}%`, background: 'var(--accent)' }} />
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function BarRow({ icon, tone, label, value, max, stars, bar = 'green', testId }) {
  const pct = max ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0
  const Icon = icon
  return (
    <div data-testid={testId} className="grid items-center gap-2" style={{ gridTemplateColumns: '30px minmax(0,1fr) auto' }}>
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg" style={{ background: tone, boxShadow: '0 3px 0 rgba(0,0,0,.18)' }} aria-hidden="true">
        {typeof Icon === 'string'
          ? <span className="geez text-base font-black" lang="am">{Icon}</span>
          : <Icon className="h-4 w-4" strokeWidth={2.4} color="#3b2a12" />}
      </span>
      <div className="min-w-0">
        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm font-extrabold leading-tight">
          {label ? <span className="min-w-0 truncate">{label}</span> : <span />}
          <span className="shrink-0 tabular-nums" style={{ color: 'var(--muted)' }}>{value}/{max}</span>
        </div>
        <Track pct={pct} tone={bar} />
      </div>
      {stars != null && (
        <span className="flex items-center gap-0.5 text-xs font-black tabular-nums" style={{ color: 'var(--muted)' }} aria-label={t('mpStarCount', '{n} stars', { n: stars })}>
          <Star className="h-3.5 w-3.5" fill="currentColor" style={{ color: 'var(--star)' }} aria-hidden="true" />{stars}
        </span>
      )}
    </div>
  )
}

export function StatTile({ icon, value, label, testId }) {
  return (
    <div data-testid={testId} className="rounded-2xl px-2 py-2.5 text-center" style={{ background: 'var(--card)', boxShadow: '0 4px 0 var(--line)' }}>
      <p className="flex items-center justify-center gap-1 text-[22px] font-black tabular-nums leading-none">{icon}<span>{value}</span></p>
      <p className="mt-1 text-[11px] font-extrabold leading-tight" style={{ color: 'var(--muted)' }}>{label}</p>
    </div>
  )
}

function WeekCard({ model, grown }) {
  const w = model.week
  const pct = w.target ? Math.max(0, Math.min(100, Math.round((w.minutes / w.target) * 100))) : 0
  const daily = w.daily || 1
  return (
    <Card testId="mp-week">
      <CardTitle aside={grown ? t('mpMonSun', 'Mon–Sun') : null}>
        {grown
          ? t('mpWeekTitle', 'This week · minutes vs target')
          : <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />}
      </CardTitle>
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 shrink-0" style={{ color: 'var(--sky)' }} aria-hidden="true" />
        <Track pct={pct} tone="blue" tall testId="mp-week-bar" />
        <span className="shrink-0 text-[22px] font-black tabular-nums leading-none" data-testid="mp-week-total">
          {w.minutes}<small className="text-sm font-black" style={{ color: 'var(--muted)' }}> / {w.target}</small>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5" data-testid="mp-days">
        {w.days.map((d, i) => {
          const h = daily ? Math.max(0, Math.min(100, Math.round((d.minutes / daily) * 100))) : 0
          return (
            <div key={d.date} data-testid={`mp-day-${i}`} data-hit={d.hit ? '1' : '0'} data-today={d.today ? '1' : '0'} className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-black tabular-nums" style={{ color: 'var(--ink)' }}>{d.minutes}</span>
              <span className="relative block w-full max-w-[34px] overflow-hidden rounded-lg" style={{ height: 96, background: 'color-mix(in srgb, var(--line) 80%, #c9b07a)', boxShadow: 'inset 0 2px 0 rgba(0,0,0,.08)', outline: d.today ? '3px solid var(--accent)' : 'none', outlineOffset: 1 }}>
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 rounded-lg" style={{ height: `${h}%`, background: d.hit ? 'linear-gradient(#7fd46b,#3fa535)' : 'linear-gradient(#7cc4ff,#2f8be0)' }} />
              </span>
              {grown
                ? <span className="text-[11px] font-extrabold" style={{ color: 'var(--muted)' }}>{t(DAY_LABELS[i][0], DAY_LABELS[i][1])}</span>
                : <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: d.today ? 'var(--accent)' : 'var(--line)' }} />}
            </div>
          )
        })}
      </div>
      {grown && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-extrabold" data-testid="mp-target">
          <span>{t('mpTarget', 'Weekly target:')}</span>
          <button type="button" aria-label={t('mpTargetDown', 'Lower the weekly target')} disabled={w.target <= 15}
            onClick={() => setWeekTarget(w.target - WEEK_TARGET_STEP)}
            className={`flex h-11 w-11 items-center justify-center rounded-xl font-black disabled:opacity-40 ${FOCUS}`}
            style={{ background: 'var(--tile)', color: 'var(--glyph)', boxShadow: '0 3px 0 var(--tile-deep)', outlineColor: 'var(--sky)' }}>
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="min-w-[4.5rem] text-center text-base font-black tabular-nums" data-testid="mp-target-value">{t('mpTargetValue', '{n} min', { n: w.target })}</span>
          <button type="button" aria-label={t('mpTargetUp', 'Raise the weekly target')} disabled={w.target >= 420}
            onClick={() => setWeekTarget(w.target + WEEK_TARGET_STEP)}
            className={`flex h-11 w-11 items-center justify-center rounded-xl font-black disabled:opacity-40 ${FOCUS}`}
            style={{ background: 'var(--tile)', color: 'var(--glyph)', boxShadow: '0 3px 0 var(--tile-deep)', outlineColor: 'var(--sky)' }}>
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
          <span style={{ color: 'var(--muted)' }} data-testid="mp-target-note">
            {t('mpTargetNote', '= {n} min a day · {hit} of 7 days hit target', { n: w.daily, hit: w.hitDays })}
          </span>
        </div>
      )}
    </Card>
  )
}

function listenMeta(id) {
  if (id === 'prayers') return { icon: 'ጸ', tone: '#ffe9a6', label: t('mpListenPrayer', 'Prayers'), bar: 'red' }
  if (id === 'bible') return { icon: ScrollText, tone: '#cfe8ff', label: t('mpListenBible', 'Bible stories'), bar: 'blue' }
  if (id === 'books') return { icon: Library, tone: '#d9f2cf', label: t('mpListenBooks', 'Story books'), bar: 'green' }
  return { icon: BookOpen, tone: '#f3e0ff', label: t('mpListenWords', 'Words'), bar: 'gold' }
}

async function shareReport(setCopied) {
  const url = progressCardUrl()
  if (!url) return
  const shared = await nativeShare({ title: 'eGeez progress', text: t('gpReportShareText', 'Our eGeez progress report:'), url })
  if (!shared) {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* no clipboard */ }
  }
}

export function MyProgress({ mode = 'kid', onNext, onClose }) {
  const model = useProgressModel()
  const [copied, setCopied] = useState(false)
  const grown = mode === 'grown'
  const pct = model.rows.total ? Math.round((model.rows.mastered / model.rows.total) * 100) : 0
  const weak = model.grown.weak.map((w) => w.char).join(' ')
  const closed = model.grown.notOpened.map(gameLabel).filter(Boolean).join(', ')
  return (
    <div data-testid="my-progress" data-mode={mode} className="mx-auto w-full max-w-[1000px] px-3 py-3" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div className="mb-3 flex items-center gap-2">
        {model.name ? <h2 className="min-w-0 truncate text-xl font-black leading-tight" data-testid="mp-name">{model.name}</h2> : <h2 className="text-xl font-black leading-tight">{t('apTitle', 'My progress')}</h2>}
        {onClose && (
          <button type="button" onClick={onClose} aria-label={t('apClose', 'Close')} className={`ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="grid items-start gap-3 min-[800px]:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-3">
          <Card testId="mp-fidel">
            <CardTitle aside={`${model.rows.mastered} / ${model.rows.total}`}>{t('mpFidelRows', 'Fidel rows')}</CardTitle>
            <p className="text-[28px] font-black leading-none" data-testid="mp-row-count">
              {model.rows.mastered}
              <small className="text-sm font-black" style={{ color: 'var(--muted)' }}>
                {' '}{t('mpRowLine', '/ {rows} rows · {letters} / {total} letters', { rows: model.rows.total, letters: model.rows.letters, total: model.rows.totalLetters })}
              </small>
            </p>
            <div className="my-2"><Track pct={pct} tall testId="mp-fidel-bar" /></div>
            <RowGrid tiles={model.rows.tiles} />
          </Card>
          <Card testId="mp-games">
            <CardTitle aside={t('mpLevelsStars', 'levels · stars')}>{t('mpGames', 'Games')}</CardTitle>
            <div className="flex flex-col gap-2">
              {model.games.map((g) => (
                <BarRow key={g.id} testId={`mp-game-${g.id}`} icon={GAME_ICON[g.id] || Star} tone={GAME_TONE[g.id] || '#ffe9a6'} label={gameLabel(g.id)} value={g.level} max={g.max} stars={g.stars} />
              ))}
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-3">
          <WeekCard model={model} grown={grown} />
          <div className="grid grid-cols-3 gap-2">
            <StatTile testId="mp-streak" icon={<Flame className="h-5 w-5" fill="currentColor" style={{ color: 'var(--accent)' }} aria-hidden="true" />} value={model.streak} label={t('mpStreak', 'day streak')} />
            <StatTile testId="mp-words" icon={<BookOpen className="h-5 w-5" style={{ color: 'var(--sky)' }} aria-hidden="true" />} value={model.words.done} label={t('mpWords', 'words')} />
            <StatTile testId="mp-stars" icon={<Star className="h-5 w-5" fill="currentColor" style={{ color: 'var(--star)' }} aria-hidden="true" />} value={model.stars} label={t('mpStars', 'stars')} />
          </div>
          <Card testId="mp-listen">
            <CardTitle>{t('mpListen', 'Listen & read')}</CardTitle>
            <div className="flex flex-col gap-2">
              {model.listen.map((row) => {
                const meta = listenMeta(row.id)
                return <BarRow key={row.id} testId={`mp-listen-${row.id}`} icon={meta.icon} tone={meta.tone} label={grown ? meta.label : ''} value={row.done} max={row.max} bar={meta.bar} />
              })}
            </div>
          </Card>
          {grown && (
            <Card testId="mp-grown">
              <CardTitle>{t('mpForGrown', 'For grown-ups')}</CardTitle>
              <p className="text-sm font-extrabold" data-testid="mp-weak">
                {t('mpWeakLead', 'Needs practice:')}{' '}
                {weak
                  ? <><span className="geez text-base font-black" lang="am">{weak}</span> <span style={{ color: 'var(--bad)' }}>{t('mpWeakNote', '(accuracy under 60%)')}</span></>
                  : <span style={{ color: 'var(--muted)' }}>{t('mpWeakNone', 'none this week')}</span>}
              </p>
              <p className="mt-1 text-sm font-extrabold" data-testid="mp-closed">
                {t('mpNotOpened', 'Not opened yet:')} {closed || t('mpNone', 'none')}
              </p>
              <p className="mt-1 text-sm font-extrabold" data-testid="mp-accuracy">
                {model.grown.accuracy == null
                  ? t('mpWeekEmpty', 'This week: {days} days · {answers} answers', { days: model.grown.daysActive, answers: model.grown.answers })
                  : t('mpWeekSummary', 'This week: {days} days · {answers} answers · {pct}% right', { days: model.grown.daysActive, answers: model.grown.answers, pct: model.grown.accuracy })}
              </p>
              <button type="button" data-testid="mp-share" onClick={() => shareReport(setCopied)}
                className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold text-white ${FOCUS}`}
                style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', outlineColor: 'var(--sky)' }}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                {copied ? t('gpReportCopied', 'Link copied!') : t('gpReportShare', 'Share progress report')}
              </button>
            </Card>
          )}
          <button
            type="button"
            data-testid="mp-next"
            disabled={!model.next}
            onClick={() => model.next && onNext?.(model.next)}
            className={`flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-black text-white disabled:opacity-60 ${FOCUS}`}
            style={{ background: 'var(--go)', boxShadow: '0 5px 0 var(--go-deep)', outlineColor: 'var(--sky)' }}
          >
            <Play className="h-5 w-5" fill="currentColor" aria-hidden="true" />
            {model.next
              ? t('mpNext', 'Next: row {row}, form {form}', { row: model.next.char, form: model.next.order })
              : t('mpAllDone', 'Every row is done')}
          </button>
        </div>
      </div>
    </div>
  )
}

function useDialog(onClose) {
  const ref = useRef(null)
  useEffect(() => {
    const root = ref.current
    const app = document.getElementById('root')
    app?.setAttribute('inert', '')
    const nodes = () => [...(root?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])].filter((el) => !el.disabled)
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab' || !root) return
      const list = nodes()
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.activeElement
    nodes()[0]?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      app?.removeAttribute('inert')
      if (prev && prev.focus) prev.focus()
    }
  }, [onClose])
  return ref
}

/** Home chip: fidel rows mastered, not activities tried. */
export function AppProgressChip({ onClick }) {
  const m = useProgressModel()
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="app-progress"
      aria-label={t('mpChipLabel', 'Fidel rows: {n} of {total}', { n: m.rows.mastered, total: m.rows.total })}
      className={`relative flex min-h-[28px] basis-full items-center gap-2 rounded-full px-1 before:absolute before:-inset-x-1 before:-inset-y-[9px] before:content-[''] ${FOCUS}`}
      style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}
    >
      <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-[4px]" style={{ background: 'var(--tile)', boxShadow: '0 2px 0 var(--tile-deep)' }} />
      <Track pct={m.rows.total ? Math.round((m.rows.mastered / m.rows.total) * 100) : 0} testId="app-progress-bar" />
      <span className="mono shrink-0 text-xs font-black tabular-nums" data-testid="app-progress-count">{m.rows.mastered}/{m.rows.total}</span>
      {m.week.todayActive && <Star className="h-3.5 w-3.5 shrink-0" fill="currentColor" style={{ color: 'var(--star)' }} data-testid="app-progress-today" aria-hidden="true" />}
    </button>
  )
}

/** Kid sheet opened from the home chip. */
export function AppProgressSheet({ onClose, onNext, mode = 'kid' }) {
  const ref = useDialog(onClose)
  const node = (
    <div className="fq-modal fixed inset-0 z-[60] flex items-end justify-center min-[800px]:items-center" data-testid="app-progress-sheet" style={{ background: 'var(--overlay)', overscrollBehavior: 'none', touchAction: 'pan-y' }} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('apTitle', 'My progress')}
        className="max-h-[100dvh] w-full max-w-[1000px] overflow-y-auto"
        style={{ background: 'var(--paper)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', touchAction: 'pan-y', WebkitTouchCallout: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <MyProgress mode={mode} onNext={(n) => { onNext?.(n); onClose?.() }} onClose={onClose} />
      </div>
    </div>
  )
  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}

/** Grown-Ups: the same screen, with labels and the target stepper. */
export function AppProgressPanel({ onNext }) {
  return (
    <div data-testid="app-progress-panel">
      <MyProgress mode="grown" onNext={onNext} />
    </div>
  )
}
