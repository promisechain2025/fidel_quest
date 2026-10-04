/* ============================================================================
   PROFILE PICKER - "Who is playing?" (kid-facing)
   ----------------------------------------------------------------------------
   One full-screen surface for the whole child-profile flow:
     pick    big avatar cards, each with that child's own stars and steps;
             tapping another child switches (platform/profiles.js parks the
             current child and reloads); "+" adds a child (up to MAX_PROFILES)
     add     name + avatar (+ optional age / grade); the new child starts fresh
     locked  a 2nd+ child needs the Family Pack: a kid-safe "ask a grown-up"
             screen (no price, no Buy button), then the parental gate, then
             the grown-up-facing FamilyPackOffer (Buy / Restore purchases)
     gate    the shared ParentalGate (hold two seconds, then answer a sum on the keypad)
     manage  edit or delete any child - only reachable through the gate
     confirm "Delete <name>?" with Keep as the big default
   The first child is included; adding a 2nd-6th child needs the Family Pack
   (platform/familyPack.js) and the purchase sits behind the parental gate.
   Once the pack is owned, adding is not gated (it never touches another
   child's progress, and the cap is six); editing and deleting always are. Everything stays on this device:
   no account, no network, nothing collected.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Lock, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import ProfileAvatar from './ProfileAvatar'
import { avatarName } from './avatarNames'
import ParentalGate from './ParentalGate'
import FamilyPackOffer from './FamilyPackOffer'
import { t } from '../platform/i18n'
import { getActivePackId } from '../platform/ethiopic'
import {
  loadProfiles, switchProfile, addProfile, updateProfile, deleteProfile, profileLabel, profileStats,
  markWhoPicked, nextFreeAvatar, AVATARS, AGES, GRADES, MAX_PROFILES, MAX_NAME,
} from '../platform/profiles'
import { needsFamilyPack } from '../platform/familyPack'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

/* A Ge'ez line under the English heading, in the language the child is
   learning (Tigrinya by default, Amharic on the Amharic pack). */
const GEEZ = {
  who: { ti: 'መን እዩ ዝጻወት ዘሎ?', am: 'ማን ነው የሚጫወተው?' },
  add: { ti: 'ሓድሽ ተጻዋታይ', am: 'አዲስ ተጫዋች' },
  friend: { ti: 'ናተይ ዓርኪ', am: 'የኔ ጓደኛ' },
  name: { ti: 'ስም', am: 'ስም' },
  age: { ti: 'ዕድመ', am: 'ዕድሜ' },
  grade: { ti: 'ክፍሊ', am: 'ክፍል' },
  pack: { ti: 'ናይ ስድራ ጥቕሊ', am: 'የቤተሰብ ጥቅል' },
  ask: { ti: 'ንዓቢ ሰብ ሕተት', am: 'ትልቅ ሰው ጠይቅ' },
}
function Geez({ k, className = '' }) {
  const pack = getActivePackId()
  const s = GEEZ[k]?.[pack] || GEEZ[k]?.ti
  return s ? <span lang={pack === 'am' ? 'am' : 'ti'} className={`geez block font-black ${className}`} style={{ color: 'var(--muted)' }}>{s}</span> : null
}

const chunk = (bg, deep, extra = {}) => ({ background: bg, boxShadow: `0 4px 0 ${deep}`, '--chunk-depth': '4px', outlineColor: 'var(--sky)', ...extra })
const ghost = { background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }

const childLabel = (p) => profileLabel(p, t('gpChild', 'Child'))

function infoLine(p) {
  const bits = []
  if (p.age) bits.push(t('kpAgeN', 'Age {n}', { n: p.age }))
  if (p.grade) bits.push(p.grade === 'KG' ? t('kpGradeKG', 'KG') : t('kpGradeN', 'Grade {n}', { n: p.grade }))
  return bits.join(' · ')
}

function TopBar({ title, geez, onBack, onClose, backLabel }) {
  return (
    <div className="flex items-start gap-2">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label={backLabel || t('kpBack', 'Back')} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${FOCUS}`} style={ghost}>
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </button>
      ) : <span className="h-12 w-12 shrink-0" aria-hidden="true" />}
      <h2 className="min-w-0 flex-1 pt-1 text-center leading-tight">
        <span className="block text-2xl font-black">{title}</span>
        {geez && <Geez k={geez} className="text-lg" />}
      </h2>
      {onClose ? (
        <button type="button" onClick={onClose} aria-label={t('kpClose', 'Close')} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${FOCUS}`} style={ghost}>
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      ) : <span className="h-12 w-12 shrink-0" aria-hidden="true" />}
    </div>
  )
}

/** Name + avatar + optional age/grade. Shared by add and edit (and the
    Grown-Ups card). onSave({ name, avatar, age, grade }). */
export function ProfileForm({ initial = null, takenAvatars = [], saveLabel, onSave, onCancel = null }) {
  const [name, setName] = useState(initial?.name || '')
  const [avatar, setAvatar] = useState(initial?.avatar || nextFreeAvatar(takenAvatars.map((a) => ({ avatar: a }))))
  const [age, setAge] = useState(initial?.age ?? null)
  const [grade, setGrade] = useState(initial?.grade ?? null)
  const clean = name.replace(/[<>]/g, '').trim()
  const chip = (on) => (on ? chunk('var(--sky)', 'var(--sky-deep)', { color: '#fff' }) : ghost)
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (clean) onSave({ name: clean, avatar, age, grade })
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <ProfileAvatar avatar={avatar} size={112} ring="var(--go)" />
      </div>
      <label className="block">
        <span className="flex items-baseline justify-between gap-2 text-sm font-black uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          {t('kpName', 'Name')}
          <Geez k="name" className="text-base normal-case" />
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.replace(/[<>]/g, '').slice(0, MAX_NAME))}
          maxLength={MAX_NAME}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t('kpNamePh', 'e.g. Selam')}
          className={`mt-1.5 h-16 w-full rounded-2xl border-2 px-4 text-2xl font-black ${FOCUS}`}
          style={{ background: 'var(--card)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
        />
      </label>
      <fieldset>
        <legend className="flex w-full items-baseline justify-between gap-2 text-sm font-black uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          {t('kpPickFriend', 'Pick a friend')}
          <Geez k="friend" className="text-base normal-case" />
        </legend>
        <div className="mt-2 grid grid-cols-4 gap-2.5">
          {AVATARS.map((a) => {
            const on = a === avatar
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                aria-pressed={on}
                aria-label={avatarName(a)}
                className={`chunk relative flex aspect-square items-center justify-center rounded-2xl ${FOCUS}`}
                style={on ? chunk('var(--go)', 'var(--go-deep)') : ghost}
              >
                <ProfileAvatar avatar={a} size={60} />
                {on && (
                  <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: 'var(--go-deep)', border: '2px solid var(--paper)' }} aria-hidden="true">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="flex w-full items-baseline justify-between gap-2 text-sm font-black uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          <span>{t('kpAge', 'Age')} <span className="normal-case font-bold">{t('kpOptional', '(optional)')}</span></span>
          <Geez k="age" className="text-base normal-case" />
        </legend>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {AGES.map((n) => (
            <button key={n} type="button" aria-pressed={age === n} aria-label={t('kpAgeN', 'Age {n}', { n })} onClick={() => setAge(age === n ? null : n)} className={`chunk mono h-12 min-w-12 rounded-2xl px-3 text-lg font-black ${FOCUS}`} style={chip(age === n)}>
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="flex w-full items-baseline justify-between gap-2 text-sm font-black uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          <span>{t('kpGrade', 'Grade')} <span className="normal-case font-bold">{t('kpOptional', '(optional)')}</span></span>
          <Geez k="grade" className="text-base normal-case" />
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GRADES.map((g) => (
            <button key={g} type="button" aria-pressed={grade === g} aria-label={g === 'KG' ? t('kpGradeKG', 'KG') : t('kpGradeN', 'Grade {n}', { n: g })} onClick={() => setGrade(grade === g ? null : g)} className={`chunk h-12 min-w-12 rounded-2xl px-3 text-lg font-black ${FOCUS}`} style={chip(grade === g)}>
              {g === 'KG' ? t('kpGradeKG', 'KG') : g}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2.5 pb-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className={`chunk min-h-[60px] flex-1 rounded-2xl px-4 text-lg font-black ${FOCUS}`} style={ghost}>
            {t('gpCancel', 'Cancel')}
          </button>
        )}
        <button type="submit" disabled={!clean} className={`chunk min-h-[60px] flex-[2] rounded-2xl px-4 text-xl font-black text-white disabled:opacity-45 ${FOCUS}`} style={chunk('var(--go)', 'var(--go-deep)')}>
          {saveLabel || t('kpSave', 'Save')}
        </button>
      </div>
    </form>
  )
}

/**
 * The picker. `onClose()` is called when the child keeps playing as the
 * current profile. `reload` is injectable for tests (switching, adding and
 * deleting the active child all reload - every screen holds that child's state).
 */
export default function ProfilePicker({ onClose, reload = () => window.location.reload() }) {
  const [reg, setReg] = useState(loadProfiles)
  const [view, setView] = useState({ name: 'pick' })
  const refresh = () => setReg(loadProfiles())
  // Move focus into the dialog on open and on every view change, and keep
  // the scroll at the top of each new view.
  const rootRef = useRef(null)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    el.scrollTop = 0
    if (!el.contains(document.activeElement) || view.name !== 'confirm') el.focus({ preventScroll: true })
  }, [view.name])
  const full = reg.list.length >= MAX_PROFILES
  const locked = !full && needsFamilyPack(reg.list.length)

  const pick = (p) => {
    markWhoPicked()
    if (p.id === reg.active) { onClose?.(); return }
    if (switchProfile(p.id)) reload()
  }
  const close = () => { markWhoPicked(); onClose?.() }

  let body
  if (view.name === 'locked') {
    body = (
      <div className="flex flex-col items-center gap-3 text-center" data-testid="pack-locked">
        <div className="self-stretch"><TopBar title={t('kpPackTitle', 'More players')} geez="pack" onBack={() => setView({ name: 'pick' })} /></div>
        <span className="mt-4 flex h-28 w-28 items-center justify-center rounded-full" style={{ background: 'var(--card)', border: '3px solid var(--line)' }}>
          <Lock className="h-12 w-12" style={{ color: 'var(--accent-deep)' }} aria-hidden="true" />
        </span>
        <p className="max-w-xs text-lg font-black">{t('kpPackBody', 'A new player needs the Family Pack. Ask a grown-up to help.')}</p>
        <Geez k="ask" className="text-base" />
        <button type="button" onClick={() => setView({ name: 'packGate' })} className={`chunk mt-2 min-h-[60px] w-full max-w-xs rounded-2xl px-4 text-xl font-black text-white ${FOCUS}`} style={chunk('var(--sky)', 'var(--sky-deep)')}>
          {t('kpPackAsk', "I'm a grown-up")}
        </button>
        <button type="button" onClick={() => setView({ name: 'pick' })} className={`chunk min-h-[52px] w-full max-w-xs rounded-2xl px-4 text-lg font-black ${FOCUS}`} style={ghost}>
          {t('kpPackBack', 'Back to players')}
        </button>
      </div>
    )
  } else if (view.name === 'packGate') {
    body = (
      <>
        <TopBar title={t('kpGrownups', 'Grown-ups')} onBack={() => setView({ name: 'locked' })} />
        <ParentalGate intro={t('kpPackGateIntro', 'Grown-ups only: the Family Pack is a purchase. Hold the button, then answer the question.')} onOpen={() => setView({ name: 'pack' })} />
      </>
    )
  } else if (view.name === 'pack') {
    body = (
      <>
        <TopBar title={t('fpTitle', 'Family Pack')} onBack={() => setView({ name: 'pick' })} />
        <div className="mt-4">
          <FamilyPackOffer onUnlocked={() => { refresh(); setView({ name: 'add' }) }} />
        </div>
      </>
    )
  } else if (view.name === 'add') {
    body = (
      <>
        <TopBar title={t('kpAddTitle', 'New player')} geez="add" onBack={() => setView({ name: 'pick' })} />
        <div className="mt-4">
          <ProfileForm
            takenAvatars={reg.list.map((p) => p.avatar)}
            saveLabel={t('kpAddGo', "Let's play!")}
            onSave={(f) => {
              if (addProfile(f.name, f)) { markWhoPicked(); reload() }
            }}
          />
        </div>
      </>
    )
  } else if (view.name === 'gate') {
    body = (
      <>
        <TopBar title={t('kpGrownups', 'Grown-ups')} onBack={() => setView({ name: 'pick' })} />
        <ParentalGate intro={t('kpGateIntro', 'Grown-ups only: change or delete a child. Hold the button, then answer the question.')} onOpen={() => setView({ name: 'manage' })} />
      </>
    )
  } else if (view.name === 'manage') {
    body = (
      <>
        <TopBar title={t('kpManageTitle', 'Edit children')} onBack={() => setView({ name: 'pick' })} />
        <ul className="mt-4 space-y-2.5">
          {reg.list.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-3xl border-2 p-3" style={{ background: 'var(--card)', borderColor: p.id === reg.active ? 'var(--go)' : 'var(--line)' }}>
              <ProfileAvatar avatar={p.avatar} size={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black">{childLabel(p)}</p>
                {infoLine(p) && <p className="truncate text-sm font-bold" style={{ color: 'var(--muted)' }}>{infoLine(p)}</p>}
              </div>
              <button type="button" onClick={() => setView({ name: 'edit', id: p.id })} aria-label={t('kpEditChild', 'Edit {name}', { name: childLabel(p) })} className={`chunk flex h-12 w-12 items-center justify-center rounded-2xl text-white ${FOCUS}`} style={chunk('var(--sky)', 'var(--sky-deep)')}>
                <Pencil className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={reg.list.length < 2}
                onClick={() => setView({ name: 'confirm', id: p.id })}
                aria-label={t('kpDeleteChild', 'Delete {name}', { name: childLabel(p) })}
                className={`chunk flex h-12 w-12 items-center justify-center rounded-2xl disabled:opacity-35 ${FOCUS}`}
                style={{ ...ghost, color: 'var(--bad-ink)' }}
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {reg.list.length < 2 && (
          <p className="mt-3 text-center text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('kpLastChild', 'The only child on this device cannot be deleted.')}</p>
        )}
        <p className="mt-4 text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          {t('kpLocalOnly', 'Profiles live only on this device. Nothing is sent anywhere.')}
        </p>
      </>
    )
  } else if (view.name === 'edit') {
    const p = reg.list.find((x) => x.id === view.id)
    body = p ? (
      <>
        <TopBar title={t('kpEditTitle', 'Edit child')} onBack={() => setView({ name: 'manage' })} />
        <div className="mt-4">
          <ProfileForm
            initial={p}
            onCancel={() => setView({ name: 'manage' })}
            onSave={(f) => {
              updateProfile(p.id, f)
              refresh()
              setView({ name: 'manage' })
            }}
          />
        </div>
      </>
    ) : null
  } else if (view.name === 'confirm') {
    const p = reg.list.find((x) => x.id === view.id)
    body = p ? (
      <div role="alertdialog" aria-labelledby="kp-del-title" className="flex flex-col items-center gap-4 pt-6 text-center">
        <ProfileAvatar avatar={p.avatar} size={112} ring="var(--bad)" />
        <h2 id="kp-del-title" className="text-2xl font-black">{t('kpDeleteQ', 'Delete {name}?', { name: childLabel(p) })}</h2>
        <p className="max-w-xs font-bold" style={{ color: 'var(--muted)' }}>
          {t('kpDeleteBody', "All of {name}'s stars, steps and rewards on this device will be removed. This cannot be undone.", { name: childLabel(p) })}
        </p>
        <button type="button" autoFocus onClick={() => setView({ name: 'manage' })} className={`chunk mt-2 min-h-[60px] w-full max-w-xs rounded-2xl px-4 text-xl font-black text-white ${FOCUS}`} style={chunk('var(--go)', 'var(--go-deep)')}>
          {t('kpKeep', 'Keep {name}', { name: childLabel(p) })}
        </button>
        <button
          type="button"
          onClick={() => {
            const wasActive = p.id === reg.active
            if (deleteProfile(p.id, { allowActive: true })) {
              if (wasActive) { reload(); return }
              refresh()
              setView({ name: 'manage' })
            }
          }}
          className={`chunk min-h-[52px] w-full max-w-xs rounded-2xl px-4 text-lg font-black ${FOCUS}`}
          style={{ ...ghost, color: 'var(--bad-ink)', borderColor: 'var(--bad)' }}
        >
          {t('kpDeleteYes', 'Delete forever')}
        </button>
      </div>
    ) : null
  } else {
    body = (
      <>
        <TopBar title={t('whoTitle', 'Who is playing?')} geez="who" onClose={close} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          {reg.list.map((p) => {
            const active = p.id === reg.active
            const st = profileStats(p.id, reg)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                aria-label={active ? t('kpKeepPlaying', '{name} - keep playing', { name: childLabel(p) }) : t('kpPlayAs', 'Play as {name}', { name: childLabel(p) })}
                className={`chunk flex min-h-[180px] flex-col items-center justify-center gap-1.5 rounded-3xl p-3 ${FOCUS}`}
                style={active ? { ...ghost, borderColor: 'var(--go)', borderWidth: 3, boxShadow: '0 4px 0 var(--go-deep)' } : ghost}
              >
                <ProfileAvatar avatar={p.avatar} size={84} ring={active ? 'var(--go)' : null} />
                <span className="w-full truncate text-xl font-black">{childLabel(p)}</span>
                <span className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--muted)' }}>
                  <span className="flex items-center gap-0.5" style={{ color: 'var(--ink)' }}>
                    <Star className="h-4 w-4" fill="var(--star)" stroke="var(--accent-deep)" aria-hidden="true" />
                    <span className="mono">{st.stars}</span>
                  </span>
                  <span className="mono">{st.steps === 1 ? t('kpStepOne', '1 step') : t('kpSteps', '{n} steps', { n: st.steps })}</span>
                </span>
                {active && (
                  <span className="rounded-lg px-2 py-0.5 text-[11px] font-black uppercase text-white" style={{ background: 'var(--go-deep)' }}>
                    {t('gpActiveNow', 'Playing')}
                  </span>
                )}
              </button>
            )
          })}
          {!full && (
            <button
              type="button"
              onClick={() => setView({ name: locked ? 'locked' : 'add' })}
              aria-label={locked ? t('kpAddChildLocked', 'Add a child (needs the Family Pack)') : undefined}
              className={`chunk flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl border-[3px] border-dashed p-3 ${FOCUS}`}
              style={{ background: 'transparent', borderColor: 'var(--line)', outlineColor: 'var(--sky)' }}
            >
              <span className="relative flex h-[84px] w-[84px] items-center justify-center rounded-full text-white" style={{ background: locked ? 'var(--muted)' : 'var(--go)', boxShadow: `0 4px 0 ${locked ? 'var(--line)' : 'var(--go-deep)'}` }}>
                <Plus className="h-10 w-10" aria-hidden="true" />
                {locked && (
                  <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--accent)', border: '3px solid var(--card)' }}>
                    <Lock className="h-4 w-4" style={{ color: '#241a05' }} aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className="text-xl font-black">{t('kpAddChild', 'Add a child')}</span>
            </button>
          )}
        </div>
        {full && (
          <p className="mt-3 text-center text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('kpFull', 'Six children is the most one device can hold.')}</p>
        )}
        <button type="button" onClick={() => setView({ name: 'gate' })} className={`chunk mx-auto mt-6 flex min-h-[52px] items-center gap-2 rounded-2xl px-5 text-base font-black ${FOCUS}`} style={{ ...ghost, color: 'var(--muted)' }}>
          <Lock className="h-4 w-4" aria-hidden="true" />
          {t('kpEditDelete', 'Grown-ups: edit or delete')}
        </button>
      </>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('whoTitle', 'Who is playing?')}
      ref={rootRef}
      tabIndex={-1}
      className="fixed inset-0 z-[80] overflow-y-auto outline-none"
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      <div className="mx-auto w-full max-w-md px-5 pb-10" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        {body}
      </div>
    </div>
  )
}
