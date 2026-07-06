import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createStore } from '../src/store.js'
import { createApp } from '../src/server.js'

let server
let base

before(async () => {
  const store = createStore()
  server = createApp(store, { appUrl: 'https://example.test', ownerToken: 'secret' })
  await new Promise((r) => server.listen(0, r))
  base = `http://localhost:${server.address().port}`
})
after(() => server.close())

test('GET /healthz is ok', async () => {
  const res = await fetch(`${base}/healthz`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
})

test('POST /api/events records a batch and reports how many were accepted', async () => {
  const res = await fetch(`${base}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ type: 'app_open', day: '2026-07-06' }, { type: 'nope' }, { type: 'share', day: '2026-07-06' }]),
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.ok, true)
  assert.equal(body.accepted, 2) // 'nope' dropped
})

test('GET /api/stats is forbidden without the owner token, allowed with it', async () => {
  const forbidden = await fetch(`${base}/api/stats`)
  assert.equal(forbidden.status, 403)
  const ok = await fetch(`${base}/api/stats`, { headers: { 'x-owner-token': 'secret' } })
  assert.equal(ok.status, 200)
  const snap = await ok.json()
  assert.equal(snap.totals.app_open, 1) // from the previous test's batch
})

test('GET / serves an Open Graph landing that bounces to the app', async () => {
  const res = await fetch(`${base}/`)
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /og:title/)
  assert.match(html, /og:image/)
  assert.match(html, /https:\/\/example\.test/)
})

test('rejects an oversized body', async () => {
  const big = JSON.stringify(Array.from({ length: 5000 }, () => ({ type: 'app_open', day: '2026-07-06' })))
  const res = await fetch(`${base}/api/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: big })
  assert.equal(res.status, 413)
})
