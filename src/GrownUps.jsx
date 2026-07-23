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

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Star, Flame, Sparkles, Trash2, Sun, Moon, Globe, Volume2, VolumeX } from 'lucide-react'
import { loadLedger, clearLedger, letterStats, troubleLetters, confusions, tipFor, accuracyOf } from './platform/telemetry'
import { resetEverything, unlockEverything } from './utils/devUnlock'
import { useChildModel } from './platform/childModel'
import { licenseState, markSupported, grantFeedbackGrace, FEEDBACK_GRACE_DAYS } from './platform/license'
import { buyUrl, feedbackMailto, shareWithFamily, privacyUrl } from './platform/support'
import { shareProgressSnapshot, importProgressFile } from './platform/progress'
import { FIDEL_FAMILIES, INDEXES } from './platform/ethiopic'
import { LEVELS, loadProgress, loadRunnerBest } from './FidelQuestApp'
import { t, getLang } from './platform/i18n'
import ParentalGate from './components/ParentalGate'
import { Harag } from './components/Manuscript'
import { LanguageSheet } from './FidelQuestApp'
import { getTheme, toggleTheme } from './platform/theme'
import { PACKS, getActivePackId } from './platform/ethiopic'
import { isNativePlatform } from './platform/native'
import { reminderOn, setReminder } from './platform/notify'
import { communityCode, setCommunityCode } from './platform/community'
import { loadCrashes, clearCrashes } from './platform/crashLog'
import { loadStoriesRead } from './platform/stories'
import { loadProfiles, addProfile, switchProfile, deleteProfile, profileLabel, MAX_PROFILES } from './platform/profiles'
import { familyPackUnlocked, unlockFamilyPack, redeemFamilyCode, familyPackUrl, FAMILY_PACK_PRICE } from './platform/familyPack'
import { iapAvailable, familyPackStorePrice, buyFamilyPack, restoreFamilyPack } from './platform/iap'
import { loadPlan, makePlan, setRequireWarmup, loadCoach, etaStamp, PACES } from './platform/coach'
import { learnedFamilyIds, loadJourney } from './journey'
import { dayStamp } from './platform/streak'
import { formatDual } from './platform/ethioCalendar'
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
  const eta = plan ? formatDual(etaStamp(dayStamp(), learned, (PACES.find((p) => p.id === plan.pace) || PACES[1]).perWeek), getLang()) : null
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
          {t('planEta', 'Whole Fidel by {date}', { date: eta })}
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
/* One device, several children: each child gets their own path, streak,
   rewards, and trouble letters. Adding a second child is the paid Family
   Pack; on native store builds only a redeem code is offered (store rules
   forbid pointing at outside payment). Switching reloads the app - every
   screen holds the active child's state. */
function ProfilesCard() {
  const [reg, setReg] = useState(loadProfiles)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [code, setCode] = useState('')
  const [codeState, setCodeState] = useState('') // '' | 'bad'
  const [unlocked, setUnlocked] = useState(familyPackUnlocked)
  // Native store price for the IAP button; '' until fetched (or unavailable).
  const [storePrice, setStorePrice] = useState('')
  const [iapMsg, setIapMsg] = useState('') // '' | 'error' | 'none'
  useEffect(() => {
    if (!unlocked && iapAvailable()) familyPackStorePrice().then(setStorePrice)
  }, [unlocked])
  const refresh = () => {
    setReg(loadProfiles())
    setUnlocked(familyPackUnlocked())
  }
  const doBuyNative = async () => {
    setIapMsg('')
    const r = await buyFamilyPack()
    if (r === 'purchased') refresh()
    else if (r === 'error' || r === 'unavailable') setIapMsg('error')
  }
  const doRestore = async () => {
    setIapMsg('')
    const r = await restoreFamilyPack()
    if (r === 'restored') refresh()
    else if (r === 'none') setIapMsg('none')
    else if (r === 'error') setIapMsg('error')
  }

  const doSwitch = (id) => {
    if (switchProfile(id)) window.location.reload()
  }
  const doAdd = () => {
    if (addProfile(newName)) window.location.reload()
  }
  const doRedeem = () => {
    if (redeemFamilyCode(code)) {
      setCodeState('')
      refresh()
    } else setCodeState('bad')
  }

  const inputCls = `w-full rounded-2xl border-2 px-4 py-3 font-bold ${FOCUS}`
  const inputStyle = { background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }
  const buyLink = familyPackUrl() || buyUrl()

  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {t('gpProfilesTitle', 'Children on this device')}
      </h2>
      <ul className="mt-3 space-y-2">
        {reg.list.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-2xl border-2 px-3 py-2" style={{ borderColor: p.id === reg.active ? 'var(--go)' : 'var(--line)', background: 'var(--paper)' }}>
            <span className="flex-1 truncate font-extrabold">{profileLabel(p, t('gpChild', 'Child'))}</span>
            {p.id === reg.active ? (
              <span className="rounded-lg px-2 py-0.5 text-[11px] font-black uppercase text-white" style={{ background: 'var(--go)' }}>
                {t('gpActiveNow', 'Playing')}
              </span>
            ) : (
              <>
                <button type="button" onClick={() => doSwitch(p.id)} className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px' }}>
                  {t('gpSwitchTo', 'Switch')}
                </button>
                <button
                  type="button"
                  aria-label={t('gpDeleteChild', `Delete ${profileLabel(p)}`, { name: profileLabel(p) })}
                  onClick={() => {
                    if (window.confirm(t('gpDeleteConfirm', `Delete ${profileLabel(p)} and all their progress? This cannot be undone.`, { name: profileLabel(p) }))) {
                      deleteProfile(p.id)
                      refresh()
                    }
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${FOCUS}`}
                  style={{ color: 'var(--bad-ink)' }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {reg.list.length < MAX_PROFILES &&
        (unlocked ? (
          adding ? (
            <div className="mt-3 space-y-2">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={16} placeholder={t('gpChildNamePh', "Child's name")} aria-label={t('gpChildNamePh', "Child's name")} className={inputCls} style={inputStyle} />
              <div className="flex gap-2">
                <button type="button" onClick={doAdd} className={`chunk rounded-xl px-4 py-2 text-sm font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px' }}>
                  {t('gpAddStart', 'Add and start fresh')}
                </button>
                <button type="button" onClick={() => setAdding(false)} className={`chunk rounded-xl px-4 py-2 text-sm font-extrabold ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px' }}>
                  {t('gpCancel', 'Cancel')}
                </button>
              </div>
              <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                {t('gpAddHint', 'The child playing now keeps everything; the new child starts at the first letter.')}
              </p>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className={`chunk mt-3 rounded-xl px-4 py-2 text-sm font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px' }}>
              {t('gpAddChild', 'Add another child')}
            </button>
          )
        ) : (
          <div className="mt-3 rounded-2xl border-2 p-3" style={{ borderColor: 'var(--line)', background: 'var(--paper)' }}>
            <p className="text-sm font-extrabold">{t('gpPackTitle', 'Family Pack — profiles for every child')}</p>
            <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              {isNativePlatform() && !iapAvailable()
                ? t('gpPackNative', 'Each child gets their own path, streak, and rewards on this device. Have a Family Pack code? Enter it below.')
                : t('gpPackWeb', `One ${FAMILY_PACK_PRICE} unlock gives every child in the family their own path, streak, and rewards on this device — instead of buying the app again.`, { price: FAMILY_PACK_PRICE })}
            </p>
            {iapAvailable() && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={doBuyNative} className={`chunk rounded-xl px-4 py-2 text-sm font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px' }}>
                  {storePrice
                    ? t('gpPackBuyStore', `Get the Family Pack (${storePrice})`, { price: storePrice })
                    : t('gpPackBuyStoreNoPrice', 'Get the Family Pack')}
                </button>
                <button type="button" onClick={doRestore} className={`chunk rounded-xl px-4 py-2 text-sm font-extrabold ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px' }}>
                  {t('gpPackRestore', 'Restore purchase')}
                </button>
                {iapMsg === 'error' && (
                  <span className="text-xs font-bold" style={{ color: 'var(--bad-ink)' }}>{t('gpPackIapError', 'The store did not respond — try again in a moment.')}</span>
                )}
                {iapMsg === 'none' && (
                  <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('gpPackIapNone', 'No Family Pack found on this account.')}</span>
                )}
              </div>
            )}
            {!isNativePlatform() && (
              <div className="mt-2 flex flex-wrap gap-2">
                {buyLink ? (
                  <a href={buyLink} target="_blank" rel="noreferrer" className={`chunk rounded-xl px-4 py-2 text-sm font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px' }}>
                    {t('gpPackBuy', `Get the Family Pack (${FAMILY_PACK_PRICE})`, { price: FAMILY_PACK_PRICE })}
                  </a>
                ) : null}
                <button type="button" onClick={() => { unlockFamilyPack('web'); refresh() }} className={`chunk rounded-xl px-4 py-2 text-sm font-extrabold ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px' }}>
                  {t('gpPackPaid', 'I already paid')}
                </button>
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setCodeState('') }}
                placeholder={t('gpPackCodePh', 'FAM code')}
                aria-label={t('gpPackCodePh', 'FAM code')}
                className={inputCls}
                style={{ ...inputStyle, ...(codeState === 'bad' ? { borderColor: 'var(--bad)' } : null) }}
              />
              <button type="button" onClick={doRedeem} className={`chunk shrink-0 rounded-xl px-4 py-2 text-sm font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px' }}>
                {t('gpPackRedeem', 'Redeem')}
              </button>
            </div>
            {codeState === 'bad' && (
              <p className="mt-1 text-xs font-bold" style={{ color: 'var(--bad-ink)' }}>{t('gpPackCodeBad', 'That code does not look right — check it and try again.')}</p>
            )}
          </div>
        ))}
    </section>
  )
}

/* The reading signal: stories finished, comprehension accuracy, and how
   often the child asked for word help - the surface where the whole
   curriculum pays off finally reports to the parent. */
function ReadingCard({ events }) {
  const read = Object.values(loadStoriesRead().read).reduce((a, b) => a + b, 0)
  const compRight = events.filter((e) => e.m === 'story' && e.k.startsWith('storyq:') && e.p === e.k).length
  const compMiss = events.filter((e) => e.m === 'story' && e.k.startsWith('storyq:') && e.p !== e.k).length
  const helpTaps = events.filter((e) => e.m === 'story' && e.k.startsWith('sword:')).length
  if (read === 0 && helpTaps === 0) return null
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {t('gpReadingTitle', 'Reading')}
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="mono text-2xl font-black" style={{ color: 'var(--go-ink)' }}>{read}</p>
          <p className="text-[11px] font-black uppercase" style={{ color: 'var(--muted)' }}>{t('gpReadingReads', 'Stories read')}</p>
        </div>
        <div>
          <p className="mono text-2xl font-black" style={{ color: 'var(--sky)' }}>{compRight + compMiss > 0 ? `${Math.round((compRight / (compRight + compMiss)) * 100)}%` : '—'}</p>
          <p className="text-[11px] font-black uppercase" style={{ color: 'var(--muted)' }}>{t('gpReadingComp', 'Understood')}</p>
        </div>
        <div>
          <p className="mono text-2xl font-black" style={{ color: 'var(--accent)' }}>{helpTaps}</p>
          <p className="text-[11px] font-black uppercase" style={{ color: 'var(--muted)' }}>{t('gpReadingHelp', 'Word helps')}</p>
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
        {t('gpReadingHint', 'Fewer word helps on a re-read means growing fluency. Re-reading favorites is exactly right at this age.')}
      </p>
    </section>
  )
}

/* Native only: appears when the daily on-device backup file exists, so a
   family recovering from storage eviction or a reinstall has one tap back. */
function BackupCard() {
  const [info, setInfo] = useState(null)
  const [state, setState] = useState('') // '' | 'done' | 'none'
  useEffect(() => {
    import('./platform/backup').then((m) => m.backupInfo().then(setInfo)).catch(() => {})
  }, [])
  if (!info) return null
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {t('gpBackupTitle', 'Device backup')}
      </h2>
      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
        {t('gpBackupBody', `Progress is saved to this device daily (last: ${info.day}, ${info.children} child${info.children > 1 ? 'ren' : ''}) and travels with your phone backup. If the app ever loses its memory, restore here.`, { day: info.day, n: info.children })}
      </p>
      <button
        type="button"
        onClick={async () => {
          const m = await import('./platform/backup')
          const n = await m.restoreBackup()
          if (n > 0) window.location.reload()
          else setState('none')
        }}
        className={`chunk mt-3 rounded-xl px-4 py-2 text-sm font-extrabold text-white ${FOCUS}`}
        style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px' }}
      >
        {t('gpBackupRestore', 'Restore from backup')}
      </button>
      {state === 'none' && <p className="mt-1 text-xs font-bold" style={{ color: 'var(--bad-ink)' }}>{t('gpBackupNone', 'Nothing restorable was found.')}</p>}
    </section>
  )
}

/* Shown only when the boundary has caught something on this device: the
   crash notes a grown-up can screenshot into a support mail. Local only. */
function CrashCard() {
  const [crashes, setCrashes] = useState(loadCrashes)
  if (!crashes.length) return null
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--bad-ink)' }}>
        {t('gpCrashTitle', `App health · ${crashes.length} recent errors`, { n: crashes.length })}
      </h2>
      <ul className="mt-2 space-y-1.5">
        {crashes.map((c, i) => (
          <li key={i} className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            <span className="mono">{c.day}</span> — {c.msg}
            {c.at ? <span className="block pl-4 opacity-80">{c.at}</span> : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
        {t('gpCrashHint', 'The game recovered each time. If this keeps happening, screenshot this card and email us.')}
      </p>
      <button
        type="button"
        onClick={() => {
          clearCrashes()
          setCrashes([])
        }}
        className="chunk mt-3 rounded-xl px-3 py-1.5 text-xs font-extrabold"
        style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px' }}
      >
        {t('gpCrashClear', 'Clear the notes')}
      </button>
    </section>
  )
}

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

export default function GrownUps({ onBack, onPractice, onReplayLevel, onPlacement, soundOn = true, onToggleSound }) {
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmUnlock, setConfirmUnlock] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  // Theme + language moved here (behind the gate) so a child cannot flip them
  // mid-task; the grown-up sets them where they set everything else.
  const [theme, setThemeState] = useState(() => getTheme())
  // Re-renders whenever any child state is written; every read below is
  // a fresh pure-selector pass, so no manual refresh bumps are needed.
  useChildModel()

  const events = useMemo(() => (open ? loadLedger() : []), [open])
  const stats = useMemo(() => letterStats(events), [events])
  const trouble = useMemo(() => troubleLetters(events), [events])
  const pairs = useMemo(() => confusions(events), [events])
  const progress = loadProgress()
  const runnerBest = loadRunnerBest()
  const stars = LEVELS.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0)

  return (
    <div className="mx-auto min-h-screen max-w-xl px-7 pb-12 pt-6">
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
      <div className="mt-2 flex justify-center"><Harag /></div>

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

          {/* Settings: theme + language, deliberately behind the gate. */}
          <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {t('gpSettings', 'Settings')}
            </h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-black">
                {theme === 'dark' ? <Moon className="h-5 w-5" style={{ color: 'var(--accent)' }} aria-hidden="true" /> : <Sun className="h-5 w-5" style={{ color: 'var(--accent)' }} aria-hidden="true" />}
                {t('gpTheme', 'Theme')}
              </span>
              <button
                type="button"
                onClick={() => setThemeState(toggleTheme())}
                className={`chunk rounded-xl px-4 py-2 text-sm font-extrabold ${FOCUS}`}
                style={{ background: 'var(--paper-2)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
              >
                {theme === 'dark' ? t('gpThemeNight', 'Night') : t('gpThemeDay', 'Daylight')}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-black">
                <Globe className="h-5 w-5" style={{ color: 'var(--sky)' }} aria-hidden="true" />
                {t('langTitle', 'Language')}
              </span>
              <button
                type="button"
                onClick={() => setLangOpen(true)}
                className={`chunk rounded-xl px-4 py-2 text-sm font-extrabold ${FOCUS}`}
                style={{ background: 'var(--paper-2)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
              >
                <span className="geez">{PACKS[getActivePackId()].nativeName}</span>
              </button>
            </div>
            {onToggleSound && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-black">
                  {soundOn ? <Volume2 className="h-5 w-5" style={{ color: 'var(--go-ink)' }} aria-hidden="true" /> : <VolumeX className="h-5 w-5" style={{ color: 'var(--muted)' }} aria-hidden="true" />}
                  {t('gpSound', 'Sound')}
                </span>
                <button type="button" role="switch" aria-checked={soundOn} onClick={onToggleSound} className={`relative h-8 w-14 shrink-0 rounded-full ${FOCUS}`} style={{ background: soundOn ? 'var(--go)' : 'var(--line)', outlineColor: 'var(--sky)' }}>
                  <span className="absolute top-1 h-6 w-6 rounded-full bg-white transition-all" style={{ left: soundOn ? '1.75rem' : '0.25rem' }} aria-hidden="true" />
                </button>
              </div>
            )}
          </section>

          <ProfilesCard />

          {/* Skip-ahead: shown while the journey is young enough that a
             heritage child might be grinding letters they already read. */}
          {onPlacement && learnedFamilyIds(loadJourney()).length < FIDEL_FAMILIES.length && (
            <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
              <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                {t('gpPlaceTitle', 'Already knows some letters?')}
              </h2>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                {t('gpPlaceBody', 'A short listening check places the child on the path: each passed group of letters is credited, and the first miss ends the check. Hand the device to the child for this.')}
              </p>
              <button type="button" onClick={onPlacement} className={`chunk mt-3 rounded-xl px-4 py-2 text-sm font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px' }}>
                {t('gpPlaceCta', 'Start the skip-ahead check')}
              </button>
            </section>
          )}

          <NicknameField />

          <ReminderCard />
          <PlanCard />

          <CommunityCard />

          <ReadingCard events={events} />

          <BackupCard />

          <CrashCard />

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

          {/* support / license: the paid-app picture and every way to help -
             buy, ask a relative abroad to gift it, or honest feedback for
             more free days. Mirrors the once-a-day SupportAsk dialog. */}
          {(() => {
            const lic = licenseState()
            const buy = buyUrl()
            return (
              <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
                <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  <Heart className="h-4 w-4" aria-hidden="true" /> {t('paySupport', 'Support eGeez')}
                </h2>
                <p className="mt-2 text-sm font-bold" style={{ color: lic.phase === 'ended' ? 'var(--bad-ink)' : 'var(--go-ink)' }}>
                  {lic.phase === 'licensed'
                    ? t('payThanks', 'Thank you for supporting eGeez!')
                    : lic.phase === 'trial'
                      ? t('payLeft', 'Free try-out: {n} days left', { n: lic.daysLeft })
                      : t('payEnded', 'Your free try-out has ended.')}
                </p>
                {lic.phase !== 'licensed' && (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {buy && (
                        <a href={buy} target="_blank" rel="noopener noreferrer" className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
                          {t('payBuy', 'Buy the app')}
                        </a>
                      )}
                      <button type="button" onClick={shareWithFamily} className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
                        {t('payFamily', 'Ask family to gift it')}
                      </button>
                      {lic.feedbackAvailable && (
                        <button
                          type="button"
                          onClick={() => {
                            grantFeedbackGrace()
                            try { window.open(feedbackMailto(), '_blank', 'noopener') } catch { /* no mail app */ }
                          }}
                          className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold ${FOCUS}`}
                          style={{ background: 'var(--paper)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
                        >
                          {t('payFeedback', 'Not buying? Tell us honestly why')}
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                      {t('payFamilyHint', 'No way to pay where you live? A relative anywhere in the world can gift it - share this with them.')}
                      {lic.feedbackAvailable && <> {t('payFeedbackHint', 'Honest feedback earns {n} more free days.', { n: FEEDBACK_GRACE_DAYS })}</>}
                    </p>
                    <button type="button" onClick={() => markSupported('grownups')} className={`mt-2 text-xs font-extrabold underline ${FOCUS}`} style={{ color: 'var(--go-ink)', outlineColor: 'var(--go)' }}>
                      {t('payOwned', 'My family already bought it')}
                    </button>
                  </>
                )}
              </section>
            )
          })()}

          {/* move to another phone: the child's whole progress as one small
             file (platform/progress.js) - share it out, load it on the new
             device. No server; travels over WhatsApp/AirDrop like a photo. */}
          <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {t('gpMoveTitle', 'Move to another phone')}
            </h2>
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              {t('gpMoveHint', 'Save all learning progress as one small file, send it to the new phone (WhatsApp works), then load it there.')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => shareProgressSnapshot()} className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
                {t('gpExport', 'Save progress file')}
              </button>
              <label className={`chunk cursor-pointer rounded-xl px-3 py-1.5 text-xs font-extrabold ${FOCUS}`} style={{ background: 'var(--paper)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--ink)' }}>
                {t('gpImport', 'Load progress file')}
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (!f) return
                    const n = await importProgressFile(f)
                    if (n > 0) window.location.reload()
                  }}
                />
              </label>
            </div>
          </section>

          {/* QA unlock: open every level, island and letter without playing
             through - same as the ?unlock URL param, but reachable on a phone.
             Reversible with the reset right below. */}
          <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            {!confirmUnlock ? (
              <button type="button" onClick={() => setConfirmUnlock(true)} className={`flex items-center gap-2 text-sm font-extrabold ${FOCUS}`} style={{ color: 'var(--go-ink)', outlineColor: 'var(--go)' }}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('gpUnlockAll', 'Open everything (for testing)…')}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold" style={{ color: 'var(--go-ink)' }}>
                  {t('gpUnlockConfirm', 'Open every level, island and letter for testing?')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    unlockEverything()
                    setConfirmUnlock(false)
                  }}
                  className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`}
                  style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}
                >
                  {t('gpUnlockYes', 'Yes, open all')}
                </button>
                <button type="button" onClick={() => setConfirmUnlock(false)} className={`text-xs font-extrabold ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
                  {t('gpResetNo', 'Keep it')}
                </button>
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
                    // A TRUE fresh player: journey, islands, classic stars,
                    // streak/coach, hunt, plan and the learning ledger. This
                    // is the recovery path when a device carries leftover QA
                    // (?unlock) data - it must not leave anything behind.
                    clearLedger()
                    resetEverything()
                    setConfirmReset(false)
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

          {/* In-app privacy-policy link (Apple 5.1.1(i)) + contact, in the
              gated grown-ups area. eGeez collects no data; the policy says so. */}
          <p className="mt-6 text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            {privacyUrl() && (
              <a href={privacyUrl()} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--sky)' }}>
                {t('gpPrivacy', 'Privacy policy')}
              </a>
            )}
            {privacyUrl() && <span aria-hidden="true"> · </span>}
            {t('gpNoData', 'eGeez keeps everything on this device and collects no data.')}
          </p>
        </div>
      )}
      <AnimatePresence>
        {langOpen && <LanguageSheet key="gp-lang" onClose={() => setLangOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
