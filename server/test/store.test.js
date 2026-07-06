import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createStore, FUNNEL } from '../src/store.js'

test('counts accepted funnel events per type and per day', () => {
  const s = createStore()
  s.record({ type: 'app_open', day: '2026-07-06' })
  s.record({ type: 'app_open', day: '2026-07-06' })
  s.record({ type: 'share', day: '2026-07-06' })
  s.record({ type: 'install', day: '2026-07-07' })
  const snap = s.snapshot()
  assert.equal(snap.events, 4)
  assert.equal(snap.totals.app_open, 2)
  assert.equal(snap.totals.share, 1)
  assert.equal(snap.daily['2026-07-06'].app_open, 2)
  assert.equal(snap.daily['2026-07-07'].install, 1)
})

test('drops unknown types and malformed events (no PII smuggling)', () => {
  const s = createStore()
  assert.equal(s.record({ type: 'evil_pii', day: '2026-07-06' }), false)
  assert.equal(s.record({ type: 'app_open', childName: 'Abel' }), true) // extra fields ignored
  assert.equal(s.record(null), false)
  assert.equal(s.record({}), false)
  const snap = s.snapshot()
  assert.equal(snap.events, 1)
  assert.equal(snap.totals.childName, undefined) // never stored
  assert.equal(snap.daily.unknown.app_open, 1) // bad day -> 'unknown'
})

test('recordBatch caps the batch size', () => {
  const s = createStore()
  const many = Array.from({ length: 500 }, () => ({ type: 'app_open', day: '2026-07-06' }))
  const accepted = s.recordBatch(many, 100)
  assert.equal(accepted, 100)
  assert.equal(s.snapshot().events, 100)
})

test('snapshot exposes the full funnel with stage conversions', () => {
  const s = createStore()
  for (let i = 0; i < 10; i++) s.record({ type: 'app_open', day: '2026-07-06' })
  for (let i = 0; i < 4; i++) s.record({ type: 'share', day: '2026-07-06' })
  for (let i = 0; i < 2; i++) s.record({ type: 'install', day: '2026-07-06' })
  const funnel = s.snapshot().funnel
  assert.deepEqual(funnel.map((f) => f.type), FUNNEL)
  const share = funnel.find((f) => f.type === 'share')
  assert.equal(share.count, 4)
  const install = funnel.find((f) => f.type === 'install')
  assert.equal(install.rateFromPrev, 0.5) // 2 installs / 4 shares
})
