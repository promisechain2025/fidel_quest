/* ============================================================================
   TEACHER MODE — run a class with links, no accounts, no server
   ----------------------------------------------------------------------------
   For community and church teachers (docs/community-teacher.md). Everything
   rides on the link + receipt rails in platform/classroom.js.

   The organizing spine is the TERM PLAN - the class-side mirror of the
   child's Journey: pick a pace once and the whole term lays itself out as
   weeks of letter families. Every resource hangs off its week:

     Week 3 · መ ሠ    due Jul 19     [TV lesson] [Send homework] 5/7 in

   - TV LESSON opens the chant/quiz board scoped to that week's families.
   - SEND HOMEWORK creates the week's assignment ONCE and remembers it
     (fq.teacher.v1), so re-sharing sends the SAME link (same seed) and
     every student stays comparable; the row shows who turned in and who
     is missing.
   - RESULTS come back as receipt links; each carries the letters the
     child missed, which aggregate into the class trouble-letters card.

   A free-form assignment builder stays for off-plan homework (choose any
   families, base letters or all 7 forms). Reached from Grown-ups or the
   Backpack Teacher tile - both behind the parental gate.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, Link2, Tv, Users, ClipboardList, Share2, Trash2, Check, CalendarDays, Flame } from 'lucide-react'
import QRCode from 'qrcode'
import { t } from '../platform/i18n'
import { FIDEL_FAMILIES } from '../platform/ethiopic'
import { sanitizeName } from '../utils/challenge'
import { addDays } from '../platform/coach'
import { dayStamp } from '../platform/streak'
import { toEthiopic, formatEthiopic } from '../platform/ethioCalendar'
import { appShareUrl } from './ShareCard'
import { isNativePlatform } from '../platform/native'
import { track } from '../platform/analytics'
import ParentalGate from './ParentalGate'
import {
  sanitizeClassCode, classUrl, assignmentUrl,
  loadTeacher, createClass, removeClass, addReceipt, rosterByStudent,
  saveAssignment, assignmentsFor, submissionStats, classTroubleLetters,
  termWeeks, saveTermPlan, currentWeekIndex, weekDue,
} from '../platform/classroom'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const glyphOf = (id) => Array.from(FIDEL_FAMILIES.find((f) => f.id === id)?.chars || '')[0] || ''
const newSeed = () => (Date.now() % 1000000) | 1
// Dates are stored Gregorian (tokens, storage) but SHOWN on the Ethiopian
// calendar, same as the child's plan card - this is a church-school tool.
const ethioDay = (stamp) => formatEthiopic(toEthiopic(stamp)).latin

/** Render a URL as a QR code (offline, via the qrcode package). */
export function QrPanel({ url, size = 200, light = '#ffffff', dark = '#1a1a1a' }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let alive = true
    if (!url) { setSrc(null); return undefined }
    QRCode.toDataURL(url, { margin: 1, width: size * 2, color: { light, dark } })
      .then((u) => { if (alive) setSrc(u) })
      .catch(() => { if (alive) setSrc(null) })
    return () => { alive = false }
  }, [url, size, light, dark])
  if (!src) return null
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} className="rounded-2xl" style={{ imageRendering: 'pixelated' }} />
}

/** Share a URL: OS sheet where available, clipboard fallback. */
async function shareUrl(url, text, onCopied) {
  const body = text ? `${text} ${url}` : url
  if (isNativePlatform()) {
    try { const { Share } = await import('@capacitor/share'); await Share.share({ title: 'Fidel Quest', text: body, url }) } catch { /* dismissed */ }
    return
  }
  try {
    if (navigator.share) { await navigator.share({ title: 'Fidel Quest', text: body, url }); return }
  } catch { return /* user dismissed */ }
  try {
    await navigator.clipboard.writeText(body)
    onCopied?.()
  } catch { /* clipboard blocked */ }
}

function ShareLinkButton({ url, text, label, tone = 'go', small = false }) {
  const [copied, setCopied] = useState(false)
  const copied2s = () => { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const colors = tone === 'go'
    ? { background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)' }
    : { background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)' }
  return (
    <button type="button" onClick={() => shareUrl(url, text, copied2s)} className={`chunk flex items-center justify-center gap-2 rounded-2xl font-black text-white ${small ? 'px-3 py-2 text-xs' : 'px-4 py-3'} ${FOCUS}`} style={{ ...colors, '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
      <Share2 className={small ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
      {copied ? t('linkCopied', 'Link copied!') : label}
    </button>
  )
}

/** Card scaffold. Collapsible by default so the page reads as a short list
    of headings on a phone - the teacher opens only what they need; the Term
    Plan (the working surface) starts open. */
function SectionCard({ icon, title, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const heading = (
    <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
      {icon} {title}
    </h2>
  )
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      {collapsible ? (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`flex w-full items-center justify-between gap-2 ${FOCUS}`} style={{ outlineColor: 'var(--sky)' }}>
          {heading}
          <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--muted)' }} aria-hidden="true" />
        </button>
      ) : heading}
      {(!collapsible || open) && children}
    </section>
  )
}

/** The five-line mental model. Shown in full before a class exists; kept as
    a compact reminder afterwards so the flow is never a mystery. */
function HowItWorksCard({ defaultOpen = true }) {
  const steps = [
    t('tmHow1', 'Create your class once - it lives on this phone, no account.'),
    t('tmHow2', 'Invite students: they open one link or scan the QR code.'),
    t('tmHow3', 'In class, put the letters on the TV - chant or quiz together.'),
    t('tmHow4', "Send the week's homework link to the family WhatsApp group."),
    t('tmHow5', 'Results come back as links - open them here and the roster fills itself.'),
  ]
  return (
    <SectionCard collapsible defaultOpen={defaultOpen} icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />} title={t('tmHowTitle', 'How it works')}>
      <ol className="mt-3 flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: 'var(--sky)' }} aria-hidden="true">
              {i + 1}
            </span>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s}</p>
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}

/** First run: name the class. The code is what students' devices remember. */
function CreateClassCard({ onCreated }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const cleanCode = sanitizeClassCode(code)
  const ok = sanitizeName(name).length > 0 && cleanCode.length >= 4
  const create = () => {
    if (!ok) return
    createClass(cleanCode, name)
    track('teacher_class_create')
    onCreated()
  }
  return (
    <SectionCard icon={<Users className="h-4 w-4" aria-hidden="true" />} title={t('tmCreateTitle', 'Start your class')}>
      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
        {t('tmIntro', 'Run a class with links only - no accounts, no server. Students join by opening one link; results come back to you as links.')}
      </p>
      <label className="mt-3 block text-xs font-black" htmlFor="tm-name">{t('tmYourName', 'Your name (students see it)')}</label>
      <input
        id="tm-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={16}
        placeholder={t('gpPlayerNamePh', 'e.g. Selam')}
        className={`mt-1 w-full rounded-2xl border-2 px-4 py-3 font-bold ${FOCUS}`}
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
      />
      <label className="mt-3 block text-xs font-black" htmlFor="tm-code">{t('tmClassCode', 'Class code (4-12 letters or digits)')}</label>
      <input
        id="tm-code" type="text" value={code} onChange={(e) => setCode(e.target.value)} maxLength={12}
        placeholder={t('tmCodePh', 'e.g. STMARY1')}
        className={`mono mt-1 w-full rounded-2xl border-2 px-4 py-3 font-black uppercase tracking-wider ${FOCUS}`}
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
      />
      <button type="button" onClick={create} disabled={!ok} className={`chunk mt-4 w-full rounded-2xl px-4 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', opacity: ok ? 1 : 0.5, outlineColor: 'var(--sky)' }}>
        {t('tmCreate', 'Create class')}
      </button>
    </SectionCard>
  )
}

/** Turn-in status line for one stored assignment. */
function TurnIns({ code, seed }) {
  const s = submissionStats(code, seed)
  if (!s.known.length) {
    return <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('tmNoneKnown', 'Waiting for the first result link')}</p>
  }
  return (
    <p className="text-xs font-bold" style={{ color: s.missing.length ? 'var(--muted)' : 'var(--go-ink)' }}>
      {t('tmTurnedIn', '{n} of {total} turned in', { n: s.submitted.length, total: s.known.length })}
      {s.missing.length > 0 && ` · ${t('tmMissing', 'missing: {names}', { names: s.missing.join(', ') })}`}
    </p>
  )
}

/**
 * THE TERM PLAN - the teacher's syllabus. Each week owns its TV lesson,
 * its homework link (created once, re-shared identical), and its turn-ins.
 */
function TermPlanCard({ code, teacher, onTv, onChanged }) {
  const cls = loadTeacher().classes[code]
  const plan = cls?.plan || null
  const [, bump] = useState(0)
  const [changing, setChanging] = useState(false)
  const refresh = () => { bump((n) => n + 1); onChanged?.() }
  const weeks = plan ? termWeeks(plan.perWeek) : []
  const nowIdx = plan ? currentWeekIndex(plan) : 0
  const assignments = assignmentsFor(code)
  const weekAssignment = (i) => assignments.find((a) => a.week === i)
  // The week list scrolls inside the card (33 chill-pace weeks would bury
  // everything below); land on the current week.
  const listRef = useRef(null)
  useEffect(() => {
    listRef.current?.querySelector('[data-now="1"]')?.scrollIntoView({ block: 'center' })
  }, [plan?.perWeek])

  const sendHomework = (i, familyIds) => {
    let a = weekAssignment(i)
    if (!a) {
      a = { code, teacher, familyIds, count: 8, due: weekDue(plan, i), seed: newSeed(), orders: [1], week: i, createdDay: dayStamp() }
      saveAssignment(a)
      track('teacher_assignment')
      refresh()
    }
    shareUrl(assignmentUrl(a, appShareUrl()), t('asShareText', 'Fidel Quest homework from your teacher:'))
  }

  if (!plan) {
    return (
      <SectionCard icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} title={t('tmPlanTitle', 'Term plan')}>
        <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          {t('tmPlanIntro', 'Pick how many letter families per week and the whole term lays itself out - every week gets its TV lesson, its homework link, and its turn-in list.')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" onClick={() => { saveTermPlan(code, n); track('teacher_term_plan'); refresh() }} className={`chunk rounded-2xl px-4 py-2.5 text-sm font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
              {t('tmPerWeek', '{n} families a week', { n })}
            </button>
          ))}
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard collapsible defaultOpen icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} title={`${t('tmPlanTitle', 'Term plan')} · ${t('tmPerWeek', '{n} families a week', { n: plan.perWeek })}`}>
      <div ref={listRef} className="mt-3 flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-1">
        {weeks.map((familyIds, i) => {
          const a = weekAssignment(i)
          const isNow = i === nowIdx
          return (
            <div key={i} data-now={isNow ? 1 : 0} className="rounded-2xl border-2 p-3" style={isNow
              ? { background: 'var(--go-soft)', borderColor: 'var(--go)' }
              : { background: 'var(--paper)', borderColor: 'var(--line)', opacity: i < nowIdx ? 0.75 : 1 }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black">
                  {t('tmWeek', 'Week {n}', { n: i + 1 })}
                  {isNow && <span className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-white" style={{ background: 'var(--go)' }}>{t('tmThisWeek', 'this week')}</span>}
                  <span className="geez ml-2 text-lg">{familyIds.map(glyphOf).join(' ')}</span>
                </p>
                <p className="mono text-[11px] font-bold" style={{ color: 'var(--muted)' }}>{t('tmDueShort', 'due {date}', { date: ethioDay(weekDue(plan, i)) })}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onTv(familyIds)} className={`chunk flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-black text-white ${FOCUS}`} style={{ background: 'var(--accent)', boxShadow: '0 3px 0 var(--accent-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
                  <Tv className="h-4 w-4" aria-hidden="true" /> {t('tmTeach', 'TV lesson')}
                </button>
                <button type="button" onClick={() => sendHomework(i, familyIds)} className={`chunk flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-black text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
                  <Share2 className="h-4 w-4" aria-hidden="true" /> {a ? t('tmShareAgain', 'Share link again') : t('tmHomework', 'Send homework')}
                </button>
              </div>
              {a && <div className="mt-2"><TurnIns code={code} seed={a.seed} /></div>}
            </div>
          )
        })}
      </div>
      {/* Explicit pace chooser: tapping Change pace shows the three options
         (the old link silently cycled the pace, which read as broken). */}
      {changing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" aria-pressed={plan.perWeek === n} onClick={() => { saveTermPlan(code, n, plan.startDay); setChanging(false); refresh() }} className={`chunk rounded-2xl px-4 py-2 text-sm font-black ${FOCUS}`} style={plan.perWeek === n
              ? { background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', color: '#fff', outlineColor: 'var(--sky)' }
              : { background: 'var(--paper)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
              {t('tmPerWeek', '{n} families a week', { n })}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setChanging(true)} className={`mt-2 px-1 text-xs font-black underline ${FOCUS}`} style={{ color: 'var(--sky)', outlineColor: 'var(--accent)' }}>
          {t('tmChangePace', 'Change pace')}
        </button>
      )}
    </SectionCard>
  )
}

/** The class's trouble letters, aggregated from receipt links. */
function TroubleCard({ code }) {
  const trouble = classTroubleLetters(code)
  return (
    <SectionCard collapsible defaultOpen={false} icon={<Flame className="h-4 w-4" aria-hidden="true" />} title={t('tmTroubleTitle', 'Class trouble letters')}>
      {trouble.length === 0 ? (
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          {t('tmTroubleEmpty', 'Nothing yet - missed letters arrive inside result links and gather here.')}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {trouble.map((tr) => (
            <div key={tr.familyId} className="flex items-center gap-3 rounded-2xl border-2 p-2.5" style={{ borderColor: 'var(--bad)', background: 'var(--bad-soft)' }}>
              <span className="geez flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl font-black text-white" style={{ background: 'var(--bad)' }} aria-hidden="true">
                {glyphOf(tr.familyId)}
              </span>
              <p className="min-w-0 flex-1 text-xs font-bold" style={{ color: 'var(--bad-ink)' }}>
                {t('tmTroubleWho', '{n} misses · {names}', { n: tr.count, names: tr.students.join(', ') })}
              </p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

/** Free-form assignment builder for off-plan homework. */
function AssignmentBuilder({ code, teacher, onSaved }) {
  const [picked, setPicked] = useState([])
  const [count, setCount] = useState(8)
  const [allOrders, setAllOrders] = useState(false)
  const [due, setDue] = useState(() => addDays(dayStamp(), 7))
  const [made, setMade] = useState(null) // { url }
  const toggle = (id) => {
    setMade(null)
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }
  const make = () => {
    const a = { code, teacher, familyIds: picked, count, due, seed: newSeed(), orders: allOrders ? [1, 2, 3, 4, 5, 6, 7] : [1], week: null, createdDay: dayStamp() }
    const url = assignmentUrl(a, appShareUrl())
    if (url) {
      saveAssignment(a)
      setMade({ url })
      track('teacher_assignment')
      onSaved?.()
    }
  }
  return (
    <SectionCard collapsible defaultOpen={false} icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />} title={t('tmNewAssign', 'Extra assignment')}>
      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
        {t('tmAssignHint', 'Every student gets the same questions. When they finish, the app builds a result link they send back to you.')}
      </p>
      <p className="mt-3 text-xs font-black">{t('tmPickFamilies', 'Letter families')}</p>
      <div className="mt-2 grid grid-cols-11 gap-1.5">
        {FIDEL_FAMILIES.map((f) => {
          const on = picked.includes(f.id)
          return (
            <button key={f.id} type="button" aria-pressed={on} onClick={() => toggle(f.id)} title={f.name} className={`geez flex aspect-square items-center justify-center rounded-lg text-base font-black ${FOCUS}`} style={{ background: on ? 'var(--go)' : 'var(--paper)', color: on ? '#fff' : 'var(--ink)', border: `2px solid ${on ? 'var(--go)' : 'var(--line)'}`, outlineColor: 'var(--sky)' }}>
              {Array.from(f.chars)[0]}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs font-black">{t('tmQuestions', 'Questions')}</p>
          <div className="mt-1 flex gap-1.5">
            {[5, 8, 12, 20].map((n) => (
              <button key={n} type="button" aria-pressed={count === n} onClick={() => { setCount(n); setMade(null) }} className={`mono rounded-full border-2 px-3 py-1.5 text-xs font-black ${FOCUS}`} style={count === n
                ? { background: 'var(--go)', borderColor: 'var(--go)', color: '#fff', outlineColor: 'var(--sky)' }
                : { background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-black">{t('tmForms', 'Letter forms')}</p>
          <div className="mt-1 flex gap-1.5">
            {[[false, t('tmOrdersBase', 'Base letters')], [true, t('tmOrdersAll', 'All 7 forms')]].map(([v, label]) => (
              <button key={String(v)} type="button" aria-pressed={allOrders === v} onClick={() => { setAllOrders(v); setMade(null) }} className={`rounded-full border-2 px-3 py-1.5 text-xs font-black ${FOCUS}`} style={allOrders === v
                ? { background: 'var(--go)', borderColor: 'var(--go)', color: '#fff', outlineColor: 'var(--sky)' }
                : { background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-black" htmlFor="tm-due">{t('tmDue', 'Due date')}</label>
          <input
            id="tm-due" type="date" value={due} onChange={(e) => { setDue(e.target.value); setMade(null) }}
            className={`mono mt-1 block rounded-2xl border-2 px-3 py-2 text-sm font-bold ${FOCUS}`}
            style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {made ? (
          <ShareLinkButton url={made.url} text={t('asShareText', 'Fidel Quest homework from your teacher:')} label={t('tmMakeLink', 'Share assignment link')} />
        ) : (
          <button type="button" onClick={make} disabled={!picked.length} className={`chunk w-full rounded-2xl px-4 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', opacity: picked.length ? 1 : 0.5, outlineColor: 'var(--accent)' }}>
            {t('tmBuildLink', 'Build the link')}
          </button>
        )}
      </div>
    </SectionCard>
  )
}

/** Every assignment this device sent (term weeks + extras), with turn-ins. */
function SentAssignments({ code }) {
  const list = assignmentsFor(code)
  if (!list.length) return null
  return (
    <SectionCard collapsible defaultOpen={false} icon={<Check className="h-4 w-4" aria-hidden="true" />} title={t('tmSent', 'Sent assignments')}>
      <div className="mt-3 flex flex-col gap-2">
        {list.map((a) => (
          <div key={`${a.seed}`} className="rounded-2xl border-2 p-3" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black">
                {a.week != null ? t('tmWeek', 'Week {n}', { n: a.week + 1 }) : t('tmExtra', 'Extra')}
                <span className="geez ml-2 text-base">{a.familyIds.map(glyphOf).join(' ')}</span>
                <span className="mono ml-2 text-[11px] font-bold" style={{ color: 'var(--muted)' }}>{a.count}q · {t('tmDueShort', 'due {date}', { date: ethioDay(a.due) })}</span>
              </p>
              <ShareLinkButton small tone="sky" url={assignmentUrl(a, appShareUrl())} text={t('asShareText', 'Fidel Quest homework from your teacher:')} label={t('tmShareAgain', 'Share link again')} />
            </div>
            <div className="mt-2"><TurnIns code={code} seed={a.seed} /></div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function RosterCard({ code }) {
  const roster = rosterByStudent(code)
  return (
    <SectionCard collapsible defaultOpen={false} icon={<Users className="h-4 w-4" aria-hidden="true" />} title={t('tmRoster', 'Students')}>
      {roster.length === 0 ? (
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          {t('tmRosterEmpty', 'No results yet. When a student finishes, they send you a result link - open it on this device and it files itself here.')}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {roster.map((row) => (
            <div key={row.student} className="rounded-2xl border-2 p-3" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-black">{row.student}</p>
                <p className="mono text-sm font-black" style={{ color: row.best >= 0.85 ? 'var(--go-ink)' : row.best >= 0.6 ? 'var(--star)' : 'var(--bad-ink)' }}>
                  {Math.round(row.best * 100)}% {t('tmBest', 'best')}
                </p>
              </div>
              <p className="mono mt-1 text-xs font-bold" style={{ color: 'var(--muted)' }}>
                {row.receipts.map((r) => `${r.day}: ${r.score}/${r.total}${r.missed?.length ? ` (${r.missed.map(glyphOf).join(' ')})` : ''}`).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

/** The teacher's own lock: the CLASS CODE is the key. A kid poking the
    Teacher tile cannot open the roster or send assignments, and the teacher
    types the code they invented - no extra password to remember. Before a
    class exists the parental gate covers creation instead. */
function CodeLock({ onOpen }) {
  const [val, setVal] = useState('')
  const [wrong, setWrong] = useState(false)
  const tryOpen = () => {
    const c = sanitizeClassCode(val)
    if (Object.keys(loadTeacher().classes).includes(c)) onOpen()
    else setWrong(true)
  }
  return (
    <div className="mt-6 rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{t('tmLockTitle', 'Teacher area')}</h2>
      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
        {t('tmLockBody', 'Enter your class code to open your class.')}
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="text" value={val} maxLength={12}
          onChange={(e) => { setVal(e.target.value); setWrong(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') tryOpen() }}
          placeholder={t('tmCodePh', 'e.g. STMARY1')}
          aria-label={t('tmLockTitle', 'Teacher area')}
          className={`mono w-full rounded-2xl border-2 px-4 py-3 font-black uppercase tracking-wider ${FOCUS}`}
          style={{ background: 'var(--paper)', borderColor: wrong ? 'var(--bad)' : 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
        />
        <button type="button" onClick={tryOpen} disabled={!val.trim()} className={`chunk shrink-0 rounded-2xl px-4 font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', opacity: val.trim() ? 1 : 0.5, outlineColor: 'var(--sky)' }}>
          {t('tmLockOpen', 'Open')}
        </button>
      </div>
      {wrong && (
        <p className="mt-2 text-xs font-bold" style={{ color: 'var(--bad-ink)' }} role="alert">
          {t('tmLockWrong', 'That is not the class code.')}
        </p>
      )}
    </div>
  )
}

export default function TeacherMode({ onBack, onTv, incomingReceipt = null, needsGate = false }) {
  const [open, setOpen] = useState(!needsGate)
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)
  // An opened #receipt= link files itself into the roster. addReceipt dedupes
  // on (student, assignment, class), so a re-render or a twice-opened link
  // cannot double-count; it returns null for a class this device doesn't own.
  const [receipt, setReceipt] = useState(null)
  useEffect(() => {
    if (incomingReceipt) {
      setReceipt({ filed: !!addReceipt(incomingReceipt), data: incomingReceipt })
      refresh()
    }
  }, [incomingReceipt])
  const teacherState = loadTeacher()
  const codes = Object.keys(teacherState.classes)
  const [confirmRemove, setConfirmRemove] = useState(false)
  // One class per device is the common case; the roster model supports more,
  // the UI keeps it simple and shows the first.
  const code = codes[0] || null
  const cls = code ? teacherState.classes[code] : null
  const inviteUrl = useMemo(() => (code ? classUrl({ code, teacher: cls.teacher }, appShareUrl()) : null), [code, cls?.teacher])

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">{t('tmTitle', 'Teacher tools')}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {t('tmSub', 'Class links, assignments, results - no accounts')}
          </p>
        </div>
      </header>

      {!open ? (
        // With a class on the device the CLASS CODE unlocks (the teacher's
        // own key); before that, the parental gate covers class creation.
        codes.length > 0
          ? <CodeLock onOpen={() => setOpen(true)} />
          : <ParentalGate onOpen={() => setOpen(true)} />
      ) : (
      <div className="mt-6 flex flex-col gap-5">
        {/* An opened receipt link lands here with the filing outcome. */}
        {receipt && (
          <div className="rounded-2xl border-2 p-3 text-sm font-black" style={receipt.filed
            ? { background: 'var(--go-soft)', borderColor: 'var(--go)', color: 'var(--go-ink)' }
            : { background: 'var(--bad-soft)', borderColor: 'var(--bad)', color: 'var(--bad-ink)' }} role="status">
            {receipt.filed
              ? t('tmReceiptFiled', 'Result saved: {who} - {score}', { who: receipt.data.student, score: `${receipt.data.score}/${receipt.data.total}` })
              : t('tmReceiptWrongClass', 'This result belongs to a class that is not on this device.')}
          </div>
        )}

        {!code ? (
          <>
            <HowItWorksCard />
            <CreateClassCard onCreated={refresh} />
          </>
        ) : (
          <>
            <TermPlanCard code={code} teacher={cls.teacher} onTv={onTv} onChanged={refresh} />
            <TroubleCard code={code} />
            <SentAssignments code={code} />
            <RosterCard code={code} />

            <SectionCard collapsible defaultOpen={false} icon={<Link2 className="h-4 w-4" aria-hidden="true" />} title={`${t('tmInvite', 'Invite students')} · ${code}`}>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                {t('tmInviteHint', 'A student opens this link (or scans the code) once - their app joins your class. Works over WhatsApp.')}
              </p>
              <div className="mt-3 flex flex-col items-center gap-3">
                {inviteUrl && <QrPanel url={inviteUrl} size={180} />}
                {inviteUrl && <ShareLinkButton url={inviteUrl} text={t('jcShareText', 'Join my Fidel Quest class:')} label={t('tmShareInvite', 'Share invite link')} tone="sky" />}
              </div>
            </SectionCard>

            <AssignmentBuilder code={code} teacher={cls.teacher} onSaved={refresh} />

            <SectionCard collapsible defaultOpen={false} icon={<Tv className="h-4 w-4" aria-hidden="true" />} title={t('tmTv', 'TV display')}>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                {t('tmTvHint', 'Cast or plug this device into a TV: big letters and sound for the whole class, with the join code in the corner.')}
              </p>
              <button type="button" onClick={() => onTv(null)} className={`chunk mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--accent)', boxShadow: '0 3px 0 var(--accent-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
                <Tv className="h-5 w-5" aria-hidden="true" /> {t('tmTvOpen', 'Open TV display')}
              </button>
            </SectionCard>

            <HowItWorksCard defaultOpen={false} />

            <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
              {!confirmRemove ? (
                <button type="button" onClick={() => setConfirmRemove(true)} className={`flex items-center gap-2 text-sm font-extrabold ${FOCUS}`} style={{ color: 'var(--bad-ink)', outlineColor: 'var(--bad)' }}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> {t('tmRemove', 'Remove class and results…')}
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-bold" style={{ color: 'var(--bad-ink)' }}>{t('tmRemoveConfirm', 'Erase this class and all its results from this device?')}</p>
                  <button type="button" onClick={() => { removeClass(code); setConfirmRemove(false); refresh() }} className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--bad)', boxShadow: '0 3px 0 var(--bad-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
                    {t('gpResetYes', 'Yes, erase')}
                  </button>
                  <button type="button" onClick={() => setConfirmRemove(false)} className={`text-xs font-extrabold ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
                    {t('gpResetNo', 'Keep it')}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
      )}
    </div>
  )
}
