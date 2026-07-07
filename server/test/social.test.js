import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createSocialStore, isoWeek, METRICS } from '../src/social.js'
import { createStore } from '../src/store.js'
import { createApp } from '../src/server.js'

const WEEK = '2026-W28'

/* ── pure store ── */

test('createGroup requires parent consent', () => {
  const s = createSocialStore()
  assert.deepEqual(s.createGroup({ nickname: 'Mom' }), { error: 'consent_required' })
  const ok = s.createGroup({ nickname: 'Mom', consent: true })
  assert.ok(ok.groupId && ok.code && ok.memberId && ok.memberToken)
  assert.match(ok.code, /^[A-Z2-9]{6}$/)
})

test('join by code, and reject a bad code', () => {
  const s = createSocialStore()
  const g = s.createGroup({ nickname: 'Mom', consent: true })
  const j = s.joinGroup({ code: g.code.toLowerCase(), nickname: 'Selam', consent: true })
  assert.equal(j.groupId, g.groupId)
  assert.ok(j.memberId && j.memberToken)
  assert.deepEqual(s.joinGroup({ code: 'ZZZZZZ', nickname: 'x', consent: true }), { error: 'not_found' })
  assert.deepEqual(s.joinGroup({ code: g.code, nickname: 'x' }), { error: 'consent_required' })
})

test('submitScore needs a valid member token', () => {
  const s = createSocialStore()
  const g = s.createGroup({ nickname: 'Mom', consent: true })
  assert.deepEqual(
    s.submitScore({ groupId: g.groupId, memberId: g.memberId, memberToken: 'wrong', metric: 'lettersLearned', value: 10, week: WEEK }),
    { error: 'forbidden' },
  )
  assert.deepEqual(
    s.submitScore({ groupId: g.groupId, memberId: g.memberId, memberToken: g.memberToken, metric: 'nope', value: 1, week: WEEK }),
    { error: 'bad_metric' },
  )
  assert.deepEqual(
    s.submitScore({ groupId: g.groupId, memberId: g.memberId, memberToken: g.memberToken, metric: 'lettersLearned', value: 1, week: 'notaweek' }),
    { error: 'bad_week' },
  )
})

test('scores are monotone (best of the week) and clamped', () => {
  const s = createSocialStore()
  const g = s.createGroup({ nickname: 'Mom', consent: true })
  const args = { groupId: g.groupId, memberId: g.memberId, memberToken: g.memberToken, metric: 'lettersLearned', week: WEEK }
  assert.equal(s.submitScore({ ...args, value: 40 }).value, 40)
  assert.equal(s.submitScore({ ...args, value: 25 }).value, 40) // lower resubmit ignored
  assert.equal(s.submitScore({ ...args, value: 55 }).value, 55)
  assert.equal(s.submitScore({ ...args, value: 10 ** 9 }).value, 100000) // clamped
})

test('board is auth-gated, sorted, marks me, and hides tokens', () => {
  const s = createSocialStore()
  const g = s.createGroup({ nickname: 'Mom', consent: true })
  const j = s.joinGroup({ code: g.code, nickname: 'Selam', consent: true })
  const wk = { metric: 'lettersLearned', week: WEEK }
  s.submitScore({ groupId: g.groupId, memberId: g.memberId, memberToken: g.memberToken, value: 30, ...wk })
  s.submitScore({ groupId: g.groupId, memberId: j.memberId, memberToken: j.memberToken, value: 80, ...wk })

  assert.deepEqual(s.board({ groupId: g.groupId, memberId: g.memberId, memberToken: 'nope', ...wk }), { error: 'forbidden' })

  const b = s.board({ groupId: g.groupId, memberId: g.memberId, memberToken: g.memberToken, ...wk })
  assert.equal(b.memberCount, 2)
  assert.deepEqual(b.rows.map((r) => r.value), [80, 30]) // sorted desc
  assert.deepEqual(b.rows.map((r) => r.nickname), ['Selam', 'Mom'])
  const mine = b.rows.find((r) => r.me)
  assert.equal(mine.nickname, 'Mom')
  assert.ok(!('tokenHash' in b.rows[0])) // never leaks secrets
})

test('nicknames are sanitized and length-capped', () => {
  const s = createSocialStore()
  const g = s.createGroup({ nickname: '  <b>Big</b> Nameeeeeeeeeeeeeee ', consent: true })
  const b = s.board({ groupId: g.groupId, memberId: g.memberId, memberToken: g.memberToken, metric: 'lettersLearned', week: WEEK })
  // Board only lists members with a score this week, so submit one first.
  s.submitScore({ groupId: g.groupId, memberId: g.memberId, memberToken: g.memberToken, metric: 'lettersLearned', value: 1, week: WEEK })
  const b2 = s.board({ groupId: g.groupId, memberId: g.memberId, memberToken: g.memberToken, metric: 'lettersLearned', week: WEEK })
  assert.ok(b2.rows[0].nickname.length <= 16)
  assert.ok(!/[<>]/.test(b2.rows[0].nickname))
  assert.deepEqual(b.rows, []) // empty before any score
})

test('isoWeek formats as YYYY-Www', () => {
  assert.match(isoWeek(new Date('2026-07-07T00:00:00Z')), /^\d{4}-W\d{2}$/)
  assert.equal(isoWeek(new Date('2026-01-01T00:00:00Z')), '2026-W01')
  assert.deepEqual([...METRICS], ['lettersLearned', 'bestStreak', 'runnerBest'])
})

/* ── HTTP layer ── */

let server
let base
before(async () => {
  server = createApp(createStore(), { social: createSocialStore() })
  await new Promise((r) => server.listen(0, r))
  base = `http://localhost:${server.address().port}`
})
after(() => server.close())

const post = (path, body) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

test('HTTP: create -> join -> score -> board round-trip', async () => {
  const create = await (await post('/api/social/groups', { nickname: 'Mom', consent: true })).json()
  assert.equal(create.ok, true)
  const join = await (await post('/api/social/groups/join', { code: create.code, nickname: 'Selam', consent: true })).json()
  assert.equal(join.groupId, create.groupId)

  await post('/api/social/score', { groupId: create.groupId, memberId: create.memberId, memberToken: create.memberToken, metric: 'lettersLearned', value: 12 })
  await post('/api/social/score', { groupId: create.groupId, memberId: join.memberId, memberToken: join.memberToken, metric: 'lettersLearned', value: 40 })

  const q = new URLSearchParams({ groupId: create.groupId, memberId: create.memberId, memberToken: create.memberToken, metric: 'lettersLearned' })
  const board = await (await fetch(`${base}/api/social/board?${q}`)).json()
  assert.equal(board.ok, true)
  assert.deepEqual(board.rows.map((r) => r.value), [40, 12])
})

test('HTTP: consent required (403) and unknown group (404)', async () => {
  assert.equal((await post('/api/social/groups', { nickname: 'Mom' })).status, 403)
  const r = await post('/api/social/score', { groupId: 'nope', memberId: 'x', memberToken: 'y', metric: 'lettersLearned', value: 1 })
  assert.equal(r.status, 404)
})
