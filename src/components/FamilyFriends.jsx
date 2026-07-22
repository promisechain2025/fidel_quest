/* ============================================================================
   FAMILY & FRIENDS (Phase 2 UI, see docs/social-play.md)
   ----------------------------------------------------------------------------
   A private, closed-group weekly leaderboard. Only shown when the build sets
   VITE_SOCIAL_URL (isSocialEnabled) — otherwise the whole surface is dormant
   and the Backpack entry is hidden. Creating/joining a group requires an
   explicit parent-consent tick; nothing here collects a child's data beyond a
   chosen nickname. Closed by construction: you only appear on a board you
   joined with a code an adult shared out-of-band.
   ========================================================================== */

import { useEffect, useState } from 'react'
import { ChevronLeft, Users, Trophy, Copy, Check } from 'lucide-react'
import { activeMembership, createGroup, joinGroup, submitScore, getBoard, currentWeek } from '../platform/social'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

function Btn({ children, onClick, tone = 'sky', disabled }) {
  const bg = tone === 'go' ? 'var(--go)' : tone === 'card' ? 'var(--card)' : 'var(--sky)'
  const edge = tone === 'go' ? 'var(--go-deep)' : tone === 'card' ? 'var(--line)' : 'var(--sky-deep)'
  const fg = tone === 'card' ? 'var(--ink)' : '#fff'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`chunk w-full rounded-2xl py-3 text-base font-extrabold uppercase tracking-wide disabled:opacity-40 ${FOCUS}`}
      style={{ background: bg, color: fg, boxShadow: `0 4px 0 ${edge}`, '--chunk-depth': '4px', outlineColor: 'var(--accent)' }}
    >
      {children}
    </button>
  )
}

function Field({ label, value, onChange, placeholder, maxLength = 16 }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`mt-1 w-full rounded-2xl border-2 px-4 py-3 font-bold ${FOCUS}`}
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)', outlineColor: 'var(--sky)' }}
      />
    </label>
  )
}

const ERRORS = {
  consent_required: 'Please tick the grown-up consent box first.',
  not_found: 'No group with that code. Check the letters and try again.',
  group_full: 'That group is full.',
  network: 'Could not reach the server. Try again in a moment.',
  disabled: 'Family & Friends is not turned on for this app.',
  no_group: 'Join or create a group first.',
}
const errText = (e) => ERRORS[e] || 'Something went wrong. Please try again.'

export default function FamilyFriends({ onBack, lettersLearned = 0, nickname = '' }) {
  const [membership, setMembership] = useState(() => activeMembership())
  const [tab, setTab] = useState('create') // create | join
  const [name, setName] = useState(nickname)
  const [code, setCode] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => setMembership(activeMembership())

  const doCreate = async () => {
    setBusy(true); setError('')
    const out = await createGroup(name.trim(), consent)
    setBusy(false)
    if (out.error) return setError(errText(out.error))
    refresh()
  }
  const doJoin = async () => {
    setBusy(true); setError('')
    const out = await joinGroup(code.trim(), name.trim(), consent)
    setBusy(false)
    if (out.error) return setError(errText(out.error))
    refresh()
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-7 pb-12 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" style={{ color: 'var(--sky)' }} aria-hidden="true" />
          <h1 className="text-xl font-black leading-tight">Family &amp; Friends</h1>
        </div>
      </header>

      {membership ? (
        <GroupView membership={membership} lettersLearned={lettersLearned} nickname={name || nickname} />
      ) : (
        <div className="flex flex-col gap-5">
          <p className="font-semibold" style={{ color: 'var(--muted)' }}>
            A private weekly leaderboard just for people you know. Make a group and share its code with family, or join one you were given. Only people with the code can see it.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {['create', 'join'].map((tName) => (
              <button
                key={tName}
                type="button"
                onClick={() => { setTab(tName); setError('') }}
                className={`rounded-2xl py-2 text-sm font-black uppercase tracking-wide ${FOCUS}`}
                style={{ background: tab === tName ? 'var(--sky)' : 'var(--card)', color: tab === tName ? '#fff' : 'var(--muted)', border: '2px solid var(--line)', outlineColor: 'var(--accent)' }}
              >
                {tName === 'create' ? 'Make a group' : 'Join a group'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <Field label="Player name" value={name} onChange={setName} placeholder="e.g. Selam" />
            {tab === 'join' && <Field label="Group code" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="e.g. ABC234" />}

            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5" style={{ accentColor: 'var(--sky)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                I am a grown-up and I agree to share only a nickname and weekly scores with this private group. No other information leaves the device.
              </span>
            </label>

            {error && <p className="text-sm font-bold" style={{ color: 'var(--bad)' }}>{error}</p>}

            {tab === 'create' ? (
              <Btn tone="go" onClick={doCreate} disabled={busy || !name.trim() || !consent}>{busy ? 'Working…' : 'Make my group'}</Btn>
            ) : (
              <Btn tone="go" onClick={doJoin} disabled={busy || !name.trim() || !code.trim() || !consent}>{busy ? 'Working…' : 'Join group'}</Btn>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GroupView({ membership, lettersLearned, nickname }) {
  const [board, setBoard] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const week = currentWeek()

  const load = async () => {
    const out = await getBoard('lettersLearned', week)
    if (!out.error) setBoard(out)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setBusy(true); setStatus('')
    const out = await submitScore('lettersLearned', lettersLearned, nickname)
    setBusy(false)
    if (out.error) { setStatus('Could not send your score. Try again.'); return }
    setStatus('Your score is in!')
    load()
  }

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(membership.code); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Group code — share with family</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="mono text-3xl font-black tracking-[0.2em]" style={{ color: 'var(--ink)' }}>{membership.code}</span>
          <button type="button" onClick={copyCode} aria-label="Copy code" className={`chunk flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
            {copied ? <Check className="h-5 w-5 text-white" /> : <Copy className="h-5 w-5 text-white" />}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5" style={{ color: 'var(--star)' }} aria-hidden="true" />
          <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Letters learned · this week</h2>
        </div>
        {board && board.rows.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {board.rows.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: r.me ? 'var(--go-soft)' : 'var(--paper)', border: `2px solid ${r.me ? 'var(--go)' : 'var(--line)'}` }}>
                <span className="flex items-center gap-3">
                  <span className="mono w-6 text-center font-black" style={{ color: 'var(--muted)' }}>{i + 1}</span>
                  <span className="font-black" style={{ color: 'var(--ink)' }}>{r.nickname}{r.me ? ' (you)' : ''}</span>
                </span>
                <span className="mono font-black" style={{ color: 'var(--go-ink)' }}>{r.value}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-semibold" style={{ color: 'var(--muted)' }}>No scores yet this week. Be the first — send yours!</p>
        )}
      </div>

      {status && <p className="text-center text-sm font-bold" style={{ color: 'var(--go-ink)' }}>{status}</p>}
      <Btn tone="go" onClick={send} disabled={busy}>{busy ? 'Sending…' : `Send my score (${lettersLearned} letters)`}</Btn>
      <Btn tone="card" onClick={load}>Refresh</Btn>
    </div>
  )
}
