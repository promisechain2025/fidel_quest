/* ============================================================================
   FAMILY & FRIENDS STORE (Phase 2, see the app's docs/social-play.md)
   ----------------------------------------------------------------------------
   Private, closed-group leaderboards. The threat model is deliberately small:
   people only ever appear on a board they JOINED with a code shared out-of-band
   by an adult. There is no discovery, no public board, no chat.

   Privacy: the only things stored are a chosen nickname (moderated) and numeric
   weekly scores. No email, no IP, no per-question data, no child PII. Each
   membership gets a server-issued secret token; we store only its SHA-256 hash,
   so a dump of this store cannot impersonate anyone. Writes must present the
   token, so one member cannot post as another and outsiders cannot post at all.

   Pure and unit-testable (the HTTP layer is a thin wrapper). `week` is supplied
   by the caller (the HTTP layer stamps the current ISO week) so scores cannot
   be backdated and tests stay deterministic.
   ========================================================================== */

import { randomBytes, createHash } from 'node:crypto'

const NAME_MAX = 16
// Unambiguous code alphabet: no I/L/O/0/1 so a parent can read it aloud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const METRICS = Object.freeze(['lettersLearned', 'bestStreak', 'runnerBest'])
const MAX_MEMBERS = 30
const MAX_VALUE = 100000
const WEEK_RE = /^\d{4}-W\d{2}$/

const sanitizeName = (raw) =>
  String(raw == null ? '' : raw)
    .replace(/[\u0000-\u001f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)

const sha = (s) => createHash('sha256').update(String(s)).digest('hex')
const token = () => randomBytes(24).toString('base64url')
const id = () => randomBytes(9).toString('base64url')

function makeCode(n = 6) {
  const bytes = randomBytes(n)
  let out = ''
  for (let i = 0; i < n; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return out
}

export function createSocialStore({ maxGroups = 100000 } = {}) {
  const groups = new Map() // groupId -> { id, code, members:Map, scores:Map }
  const byCode = new Map() // CODE -> groupId

  function addMember(group, nickname) {
    const memberId = id()
    const tk = token()
    group.members.set(memberId, { nickname: sanitizeName(nickname), tokenHash: sha(tk) })
    return { memberId, memberToken: tk }
  }

  function createGroup({ nickname, consent } = {}) {
    // Parent consent is required to create anything that leaves the device.
    if (consent !== true) return { error: 'consent_required' }
    if (groups.size >= maxGroups) return { error: 'capacity' }
    let code = makeCode()
    let guard = 0
    while (byCode.has(code) && guard++ < 25) code = makeCode()
    if (byCode.has(code)) return { error: 'capacity' }
    const group = { id: id(), code, members: new Map(), scores: new Map() }
    const me = addMember(group, nickname)
    groups.set(group.id, group)
    byCode.set(code, group.id)
    return { groupId: group.id, code, ...me }
  }

  function joinGroup({ code, nickname, consent } = {}) {
    if (consent !== true) return { error: 'consent_required' }
    const gid = byCode.get(String(code || '').toUpperCase().trim())
    const group = gid && groups.get(gid)
    if (!group) return { error: 'not_found' }
    if (group.members.size >= MAX_MEMBERS) return { error: 'group_full' }
    return { groupId: group.id, ...addMember(group, nickname) }
  }

  function auth(group, memberId, memberToken) {
    const m = group && group.members.get(memberId)
    if (!m || !memberToken || m.tokenHash !== sha(memberToken)) return null
    return m
  }

  function submitScore({ groupId, memberId, memberToken, metric, value, week, nickname } = {}) {
    const group = groups.get(groupId)
    if (!group) return { error: 'not_found' }
    const m = auth(group, memberId, memberToken)
    if (!m) return { error: 'forbidden' }
    if (!METRICS.includes(metric)) return { error: 'bad_metric' }
    if (!WEEK_RE.test(String(week))) return { error: 'bad_week' }
    if (nickname != null) m.nickname = sanitizeName(nickname) // members may rename themselves
    const v = Math.max(0, Math.min(MAX_VALUE, Math.round(Number(value) || 0)))
    if (!group.scores.has(week)) group.scores.set(week, new Map())
    const wk = group.scores.get(week)
    const key = `${memberId}:${metric}`
    const prev = wk.get(key)
    // Monotone: a week's score only ever climbs; a stale/lower resubmit is kept out.
    wk.set(key, { memberId, metric, value: prev ? Math.max(prev.value, v) : v })
    return { ok: true, value: wk.get(key).value }
  }

  function board({ groupId, memberId, memberToken, metric, week } = {}) {
    const group = groups.get(groupId)
    if (!group) return { error: 'not_found' }
    if (!auth(group, memberId, memberToken)) return { error: 'forbidden' }
    if (!METRICS.includes(metric)) return { error: 'bad_metric' }
    if (!WEEK_RE.test(String(week))) return { error: 'bad_week' }
    const wk = group.scores.get(week) || new Map()
    const rows = []
    for (const [, s] of wk) {
      if (s.metric !== metric) continue
      const mem = group.members.get(s.memberId)
      rows.push({ nickname: (mem && mem.nickname) || 'A friend', value: s.value, me: s.memberId === memberId })
    }
    rows.sort((a, b) => b.value - a.value || (a.nickname < b.nickname ? -1 : 1))
    return { week, metric, memberCount: group.members.size, rows }
  }

  return { createGroup, joinGroup, submitScore, board, _size: () => groups.size }
}

/** ISO week key, e.g. 2026-W28. Server-side stamp so scores can't be backdated. */
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
