/* ============================================================================
   TEACHER MODE — run a class with links, no accounts, no server
   ----------------------------------------------------------------------------
   For community and church teachers (docs/community-teacher.md). Everything
   rides on the link + receipt rails in platform/classroom.js:

   - CREATE a class on this device (fq.teacher.v1), then INVITE students with
     a QR / share link (#class=...). A student who opens it once is "in".
   - ASSIGN homework as a link (#assign=...): chosen families, question
     count, due date, and a seed - every student gets the SAME questions.
   - RESULTS come back as receipt links (#receipt=...) the student shares
     over WhatsApp; opening one on this device files it into the roster.
   - TV DISPLAY hands off to the full-screen chant board (TvClass.jsx).

   Reached from Grown-ups (behind the parental gate - teachers are adults).
   No child data ever leaves any device except inside a link a person
   chooses to send; the receipt is the whole "sync protocol".
   ========================================================================== */

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Link2, Tv, Users, ClipboardList, Share2, Trash2, Check } from 'lucide-react'
import QRCode from 'qrcode'
import { t } from '../platform/i18n'
import { FIDEL_FAMILIES } from '../platform/ethiopic'
import { sanitizeName } from '../utils/challenge'
import { addDays } from '../platform/coach'
import { dayStamp } from '../platform/streak'
import { appShareUrl } from './ShareCard'
import { isNativePlatform } from '../platform/native'
import { track } from '../platform/analytics'
import {
  sanitizeClassCode, classUrl, assignmentUrl,
  loadTeacher, createClass, removeClass, addReceipt, rosterByStudent,
} from '../platform/classroom'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

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
function ShareLinkButton({ url, text, label, tone = 'go' }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
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
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }
  const colors = tone === 'go'
    ? { background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)' }
    : { background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)' }
  return (
    <button type="button" onClick={share} className={`chunk flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-white ${FOCUS}`} style={{ ...colors, '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
      <Share2 className="h-5 w-5" aria-hidden="true" />
      {copied ? t('linkCopied', 'Link copied!') : label}
    </button>
  )
}

function SectionCard({ icon, title, children }) {
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {icon} {title}
      </h2>
      {children}
    </section>
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

/** Build an assignment link: families, question count, due date. */
function AssignmentBuilder({ code, teacher }) {
  const [picked, setPicked] = useState([])
  const [count, setCount] = useState(8)
  const [due, setDue] = useState(() => addDays(dayStamp(), 7))
  const [made, setMade] = useState(null) // { url }
  const toggle = (id) => {
    setMade(null)
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }
  const make = () => {
    const seed = (Date.now() % 1000000) | 1
    const url = assignmentUrl({ code, teacher, familyIds: picked, count, due, seed }, appShareUrl())
    if (url) { setMade({ url }); track('teacher_assignment') }
  }
  return (
    <SectionCard icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />} title={t('tmNewAssign', 'New assignment')}>
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

function RosterCard({ code }) {
  const roster = rosterByStudent(code)
  return (
    <SectionCard icon={<Check className="h-4 w-4" aria-hidden="true" />} title={t('tmRoster', 'Results')}>
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
                {row.receipts.map((r) => `${r.day}: ${r.score}/${r.total}`).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

export default function TeacherMode({ onBack, onTv, incomingReceipt = null }) {
  const [, bump] = useState(0)
  // An opened #receipt= link files itself into the roster. addReceipt dedupes
  // on (student, assignment, class), so a re-render or a twice-opened link
  // cannot double-count; it returns null for a class this device doesn't own.
  const [receipt, setReceipt] = useState(null)
  useEffect(() => {
    if (incomingReceipt) {
      setReceipt({ filed: !!addReceipt(incomingReceipt), data: incomingReceipt })
      bump((n) => n + 1)
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
          <CreateClassCard onCreated={() => bump((n) => n + 1)} />
        ) : (
          <>
            <SectionCard icon={<Link2 className="h-4 w-4" aria-hidden="true" />} title={`${t('tmInvite', 'Invite students')} · ${code}`}>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                {t('tmInviteHint', 'A student opens this link (or scans the code) once - their app joins your class. Works over WhatsApp.')}
              </p>
              <div className="mt-3 flex flex-col items-center gap-3">
                {inviteUrl && <QrPanel url={inviteUrl} size={180} />}
                {inviteUrl && <ShareLinkButton url={inviteUrl} text={t('jcShareText', 'Join my Fidel Quest class:')} label={t('tmShareInvite', 'Share invite link')} tone="sky" />}
              </div>
            </SectionCard>

            <AssignmentBuilder code={code} teacher={cls.teacher} />
            <RosterCard code={code} />

            <SectionCard icon={<Tv className="h-4 w-4" aria-hidden="true" />} title={t('tmTv', 'TV display')}>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                {t('tmTvHint', 'Cast or plug this device into a TV: big letters and sound for the whole class, with the join code in the corner.')}
              </p>
              <button type="button" onClick={onTv} className={`chunk mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--accent)', boxShadow: '0 3px 0 var(--accent-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
                <Tv className="h-5 w-5" aria-hidden="true" /> {t('tmTvOpen', 'Open TV display')}
              </button>
            </SectionCard>

            <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
              {!confirmRemove ? (
                <button type="button" onClick={() => setConfirmRemove(true)} className={`flex items-center gap-2 text-sm font-extrabold ${FOCUS}`} style={{ color: 'var(--bad-ink)', outlineColor: 'var(--bad)' }}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> {t('tmRemove', 'Remove class and results…')}
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-bold" style={{ color: 'var(--bad-ink)' }}>{t('tmRemoveConfirm', 'Erase this class and all its results from this device?')}</p>
                  <button type="button" onClick={() => { removeClass(code); setConfirmRemove(false); bump((n) => n + 1) }} className={`chunk rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${FOCUS}`} style={{ background: 'var(--bad)', boxShadow: '0 3px 0 var(--bad-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
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
    </div>
  )
}
