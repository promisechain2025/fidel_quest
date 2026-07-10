/* Family & Friends client (Phase 2, see docs/social-play.md).

   Talks to the optional social server (server/src/social.js). Entirely DORMANT
   unless VITE_SOCIAL_URL is set at build time — with no URL every call returns
   { error: 'disabled' } and nothing touches the network, so the offline-first
   game is unaffected by default (same opt-in pattern as analytics/shop).

   The only things stored locally are, per joined group, the group code and this
   device's server-issued { memberId, memberToken } — the token authorizes this
   member's writes. No child PII beyond a chosen nickname the parent set. */

const KEY = 'fq.social.v1'

export function socialBaseUrl() {
  const url = import.meta.env?.VITE_SOCIAL_URL
  return typeof url === 'string' && url ? url.replace(/\/+$/, '') : ''
}
export const isSocialEnabled = () => !!socialBaseUrl()

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '') || { active: null, groups: {} }
  } catch {
    return { active: null, groups: {} }
  }
}
function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage blocked; membership just won't persist */
  }
}

/** The group this device is currently showing, or null. */
export function activeMembership() {
  const s = load()
  return s.active && s.groups[s.active] ? { groupId: s.active, ...s.groups[s.active] } : null
}
export function myGroups() {
  const s = load()
  return Object.entries(s.groups).map(([groupId, g]) => ({ groupId, ...g }))
}
export function setActiveGroup(groupId) {
  const s = load()
  if (s.groups[groupId]) {
    s.active = groupId
    save(s)
  }
}

function remember(groupId, membership) {
  const s = load()
  s.groups[groupId] = { ...(s.groups[groupId] || {}), ...membership }
  s.active = groupId
  save(s)
}

async function api(path, { method = 'GET', body } = {}) {
  const base = socialBaseUrl()
  if (!base) return { error: 'disabled' }
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error || `http_${res.status}` }
    return data
  } catch {
    return { error: 'network' }
  }
}

/** Client ISO week key (matches the server's isoWeek). Not game logic, so a
   real clock is fine here. */
export function currentWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export async function createGroup(nickname, consent) {
  const out = await api('/api/social/groups', { method: 'POST', body: { nickname, consent } })
  if (!out.error) remember(out.groupId, { code: out.code, memberId: out.memberId, memberToken: out.memberToken, nickname })
  return out
}

export async function joinGroup(code, nickname, consent) {
  const out = await api('/api/social/groups/join', { method: 'POST', body: { code, nickname, consent } })
  if (!out.error) remember(out.groupId, { code: String(code || '').toUpperCase().trim(), memberId: out.memberId, memberToken: out.memberToken, nickname })
  return out
}

export async function submitScore(metric, value, nickname) {
  const m = activeMembership()
  if (!m) return { error: 'no_group' }
  return api('/api/social/score', {
    method: 'POST',
    body: { groupId: m.groupId, memberId: m.memberId, memberToken: m.memberToken, metric, value, nickname },
  })
}

export async function getBoard(metric, week = currentWeek()) {
  const m = activeMembership()
  if (!m) return { error: 'no_group' }
  const q = new URLSearchParams({ groupId: m.groupId, memberId: m.memberId, memberToken: m.memberToken, metric, week })
  return api(`/api/social/board?${q}`)
}
