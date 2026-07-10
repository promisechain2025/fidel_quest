/* ============================================================================
   GROWN-UPS DASHBOARD
   ----------------------------------------------------------------------------
   A parent-gated view over the learning telemetry: a mastery grid of the 33
   base letters, "trouble letters" with concrete practice tips and one-tap
   deep links, per-mode accuracy, and progress totals. All numbers come from
   pure selectors over the answer ledger (src/platform/telemetry.js).

   The gate is two non-reading-child steps: hold a button for two seconds,
   then match a written number word to its digits.
   ========================================================================== */

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Star, Flame, Sparkles, Trash2 } from 'lucide-react'
import { loadLedger, clearLedger, letterStats, troubleLetters, confusions, tipFor, accuracyOf } from './platform/telemetry'
import { FIDEL_FAMILIES, INDEXES } from './platform/ethiopic'
import { LEVELS, loadProgress, loadRunnerBest } from './FidelQuestApp'
import { t } from './platform/i18n'
import ParentalGate from './components/ParentalGate'
import { isNativePlatform } from './platform/native'
import { reminderOn, setReminder } from './platform/notify'
import { communityCode, setCommunityCode } from './platform/community'
import { loadPlan, makePlan, setRequireWarmup, loadCoach, etaStamp, PACES } from './platform/coach'
import { learnedFamilyIds, loadJourney } from './journey'
import { dayStamp } from './platform/streak'
import { toEthiopic, formatEthiopic } from './platform/ethioCalendar'
import { Bell, Heart } from 'lucide-react'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOf = (key) => INDEXES.byAudioKey.get(key)
const levelOf = (form) =>
  form.order > 1 ? Math.min(8, Math.floor(form.familyIndex / 8) + 5) : Math.min(4, Math.floor(form.familyIndex / 8) + 1)

function masteryColor(stat) {
  if (!stat || stat.seen === 0) return 'var(--line)'
  const rate = stat.correct / stat.seen
  if (rate >= 0.85) return 'var(--go)'
  if (rate >= 0.6) return 'var(--star)'
  return 'var(--bad)'
}

/** Optional display name shown on "challenge a friend" links (utils/challenge.js).
   Parent-gated because it is the one place the app stores anything a child
   might share. Empty = challenges read "A friend". Never leaves the device
   except inside a challenge link the parent chooses to send. */
function NicknameField() {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem('fq.nickname') || '' } catch { return '' }
  })
  const save = (v) => {
    const clean = v.replace(/[<>]/g, '').slice(0, 16)
    setName(clean)
    try { localStorage.setItem('fq.nickname', clean) } catch { /* storage blocked */ }
  }
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {t('gpPlayerName', 'Player name')}
      </h2>
      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
        {t('gpPlayerNameHint', 'Shown on challenges you send to friends. Optional — leave it blank to stay "A friend". It never leaves this device except inside a challenge link you choose to share.')}
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => save(e.target.value)}
        maxLength={16}
        placeholder={t('gpPlayerNamePh', 'e.g. Selam')}
        aria-label={t('gpPlayerName', 'Player name')}
        className={`mt-3 w-full rounded-2xl border-2 px-4 py-3 font-bold ${FOCUS}`}
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
      />
    </section>
  )
}

/** Opt-in daily reminder (native only; a no-op toggle on the web is hidden). */
function ReminderCard() {
  const [on, setOn] = useState(reminderOn())
  const [busy, setBusy] = useState(false)
  if (!isNativePlatform()) return null
  const toggle = async () => {
    setBusy(true)
    const next = await setReminder(!on, {
      title: t('remindTitle', 'Anbessa misses you!'),
      body: t('remindBody', 'Come learn a letter today.'),
      hour: 17,
    })
    setOn(next)
    setBusy(false)
  }
  return (
    <section className="flex items-center justify-between gap-3 rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5" style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <div>
          <h2 className="text-sm font-black">{t('remindTitleLabel', 'Daily reminder')}</h2>
          <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{t('remindDesc', 'A gentle nudge each afternoon to keep the streak going.')}</p>
        </div>
      </div>
      <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={toggle} className={`relative h-8 w-14 shrink-0 rounded-full ${FOCUS}`} style={{ background: on ? 'var(--go)' : 'var(--line)', outlineColor: 'var(--sky)', opacity: busy ? 0.6 : 1 }}>
        <span className="absolute top-1 h-6 w-6 rounded-full bg-white transition-all" style={{ left: on ? '1.75rem' : '0.25rem' }} aria-hidden="true" />
      </button>
    </section>
  )
}

/** The learning plan: pace, warm-up enforcement, and the finish date. The
    pace can also be (re)registered here; enforcement lives ONLY here, behind
    the grown-up gate - the child-facing default is a nudge, never a block. */
function PlanCard() {
  const [plan, setPlanState] = useState(loadPlan)
  const learned = learnedFamilyIds(loadJourney()).length
  const paceLabels = {
    chill: t('paceChill', 'Chill - 1 letter family a week'),
    steady: t('paceSteady', 'Steady - 2 families a week'),
    zoom: t('paceZoom', 'Zoom - 4 families a week'),
  }
  const pick = (pace) => setPlanState(makePlan(pace, { requireWarmup: !!plan?.requireWarmup }))
  const toggle = () => { setRequireWarmup(!plan?.requireWarmup); setPlanState(loadPlan()) }
  const eta = plan ? formatEthiopic(toEthiopic(etaStamp(dayStamp(), learned, (PACES.find((p) => p.id === plan.pace) || PACES[1]).perWeek))).latin : null
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{t('gpPlanTitle', 'Learning plan')}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {PACES.map((p) => (
          <button key={p.id} type="button" aria-pressed={plan?.pace === p.id} onClick={() => pick(p.id)} className={`rounded-full border-2 px-3 py-1.5 text-xs font-black ${FOCUS}`} style={plan?.pace === p.id
            ? { background: 'var(--go)', borderColor: 'var(--go)', color: '#fff', outlineColor: 'var(--sky)' }
            : { background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
            {paceLabels[p.id]}
          </button>
        ))}
      </div>
      {plan && eta && (
        <p className="mt-2 text-xs font-bold" style={{ color: 'var(--go-ink)' }}>
          {t('planEta', 'On this pace you finish the whole Fidel by {date}!', { date: eta })}
          {' · '}
          {t('gpWarmups', `${loadCoach().days || 0} warm-ups done`, { n: loadCoach().days || 0 })}
        </p>
      )}
      {plan && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t-2 pt-3" style={{ borderColor: 'var(--line)' }}>
          <div>
            <p className="text-sm font-black">{t('gpRequireWarmup', 'Require warm-up before games')}</p>
            <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{t('gpRequireHint', "When on, the child must finish the day's review before the games open.")}</p>
          </div>
          <button type="button" role="switch" aria-checked={!!plan.requireWarmup} onClick={toggle} className={`relative h-8 w-14 shrink-0 rounded-full ${FOCUS}`} style={{ background: plan.requireWarmup ? 'var(--go)' : 'var(--line)', outlineColor: 'var(--sky)' }}>
            <span className="absolute top-1 h-6 w-6 rounded-full bg-white transition-all" style={{ left: plan.requireWarmup ? '1.75rem' : '0.25rem' }} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  )
}

/** Community / affiliate code: credit a church, school, or community group. */
function CommunityCard() {
  const [code, setCode] = useState(communityCode())
  const [input, setInput] = useState('')
  const apply = () => { const c = setCommunityCode(input); setCode(c); setInput('') }
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        <Heart className="h-4 w-4" aria-hidden="true" /> {t('ccTitle', 'Community code')}
      </h2>
      {code ? (
        <p className="mt-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>
          {t('ccThanks', 'Thanks — you’re supporting')} <span className="mono font-black" style={{ color: 'var(--go-ink)' }}>{code}</span>.{' '}
          <button type="button" onClick={() => { setCommunityCode(''); setCode('') }} className={`font-extrabold ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>{t('ccChange', 'Change')}</button>
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {t('ccBlurb', 'Got a code from a church, school, or community group? Enter it so they get credit.')}
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)} maxLength={12}
              placeholder={t('ccPh', 'e.g. DEBRE')} aria-label={t('ccTitle', 'Community code')}
              className={`mono w-full rounded-2xl border-2 px-4 py-3 font-black uppercase tracking-wider ${FOCUS}`}
              style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
            />
            <button type="button" onClick={apply} disabled={!input.trim()} className={`chunk shrink-0 rounded-2xl px-4 font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', opacity: input.trim() ? 1 : 0.5, outlineColor: 'var(--sky)' }}>
              {t('ccApply', 'Apply')}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export default function GrownUps({ onBack, onPractice, onReplayLevel }) {
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [, forceRefresh] = useState(0)

  const events = useMemo(() => (open ? loadLedger() : []), [open])
  const stats = useMemo(() => letterStats(events), [events])
  const trouble = useMemo(() => troubleLetters(events), [events])
  const pairs = useMemo(() => confusions(events), [events])
  const progress = loadProgress()
  const runnerBest = loadRunnerBest()
  const stars = LEVELS.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0)

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">{t('grownupsShort', 'Grown-ups')}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {t('grownupsSub', 'Progress, trouble letters, and practice tips')}
          </p>
        </div>
      </header>

      {!open ? (
        <ParentalGate onOpen={() => setOpen(true)} />
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {/* totals */}
          <div className="grid grid-cols-3 gap-3">
            {[
              [<Star key="i" className="h-5 w-5" style={{ color: 'var(--star)', fill: 'var(--star)' }} aria-hidden="true" />, `${stars}/${LEVELS.length * 3}`, t('gpLessonStars', 'Lesson stars')],
              [<Sparkles key="i" className="h-5 w-5" style={{ color: 'var(--star)' }} aria-hidden="true" />, `${runnerBest.fed}`, t('gpRunnerBest', 'Runner best')],
              [<Flame key="i" className="h-5 w-5" style={{ color: 'var(--accent)' }} fill="currentColor" aria-hidden="true" />, accuracyOf(events) === null ? '—' : `${accuracyOf(events)}%`, t('gpAccuracy', 'Accuracy')],
            ].map(([icon, value, label]) => (
              <div key={label} className="rounded-2xl border-2 p-3 text-center" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
                <p className="mono flex items-center justify-center gap-1 text-xl font-black">
                  {icon}
                  {value}
                </p>
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          <NicknameField />

          <ReminderCard />
          <PlanCard />

          <CommunityCard />

          {/* mastery grid */}
          <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {t('gpMastery', `Letter mastery · ${events.length} answers recorded`, { n: events.length })}
            </h2>
            <div className="mt-3 grid grid-cols-11 gap-1.5" aria-label="Mastery of the 33 base letters">
              {FIDEL_FAMILIES.map((f) => {
                const key = `${f.id}-1`
                const stat = stats.get(key)
                return (
                  <div key={f.id} className="geez flex aspect-square items-center justify-center rounded-lg text-base font-black" style={{ background: masteryColor(stat), color: stat?.seen ? '#fff' : 'var(--muted)' }} title={stat ? `${f.name}: ${stat.correct}/${stat.seen} correct` : `${f.name}: not practiced yet`}>
                    {Array.from(f.chars)[0]}
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              {t('gpMasteryLegend', 'Green: solid · Yellow: getting there · Red: needs help · Grey: not practiced yet. Quizzes currently practice the first-order letters.')}
            </p>
          </section>

          {/* trouble letters */}
          <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {t('gpTrouble', 'Trouble letters')}
            </h2>
            {trouble.length === 0 ? (
              <p className="mt-2 font-bold" style={{ color: 'var(--muted)' }}>
                {events.length < 10 ? t('gpTroubleFew', 'Not enough play yet — check back after a few games.') : t('gpTroubleNone', 'No trouble letters right now. Nice work!')}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {trouble.map((tl) => {
                  const form = formOf(tl.key)
                  const tip = tipFor(tl.key, pairs, formOf, levelOf)
                  if (!form || !tip) return null
                  return (
                    <motion.div key={tl.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-2xl border-2 p-3" style={{ borderColor: 'var(--bad)', background: 'var(--bad-soft)' }}>
                      <span className="geez flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl font-black text-white" style={{ background: 'var(--bad)' }} aria-hidden="true">
                        {form.char}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-black" style={{ color: 'var(--bad-ink)' }}>
                          {form.char} “{form.sound}” · {tl.correct}/{tl.seen} {t('gpCorrect', 'correct')}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          {tip.text}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={() => onPractice(tip.familyId)} className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
                            {t('gpOpenExplorer', 'Open in Explorer')}
                          </button>
                          <button type="button" onClick={() => onReplayLevel(`level-${tip.level}`)} className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
                            {t('gpReplayLevel', `Replay Level ${tip.level}`, { n: tip.level })}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </section>

          {/* reset */}
          <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            {!confirmReset ? (
              <button type="button" onClick={() => setConfirmReset(true)} className={`flex items-center gap-2 text-sm font-extrabold ${FOCUS}`} style={{ color: 'var(--bad-ink)', outlineColor: 'var(--bad)' }}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> {t('gpReset', 'Reset all progress…')}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold" style={{ color: 'var(--bad-ink)' }}>
                  {t('gpResetConfirm', 'Erase stars, bests, islands, and learning history?')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearLedger()
                    try {
                      for (const k of ['fq2.progress', 'fq2.runner', 'fq3.skylands', 'fq.onboarded.v1']) localStorage.removeItem(k)
                    } catch {
                      /* ignore */
                    }
                    setConfirmReset(false)
                    forceRefresh((n) => n + 1)
                  }}
                  className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`}
                  style={{ background: 'var(--bad)', boxShadow: '0 3px 0 var(--bad-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}
                >
                  {t('gpResetYes', 'Yes, erase')}
                </button>
                <button type="button" onClick={() => setConfirmReset(false)} className={`text-xs font-extrabold ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
                  {t('gpResetNo', 'Keep it')}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
