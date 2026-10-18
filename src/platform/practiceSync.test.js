import { describe, it, expect, beforeEach } from 'vitest'
import { joinClassSync, flushSync, queueDaySync, loadSync, wireRow, SYNC_KEY } from './practiceSync'
import { savePractice, loadPractice, emptyDay } from './practice'
import { reportPayload, signReport, verifyReport, readReportFromHash, checkCode } from './practiceReport'

const BASE = 'https://api.test'
const row = (day, min) => ({ ...emptyDay(day), activeMs: min * 60000, sessions: 2, items: 30, answered: 20, correct: 15 })

function fakeServer() {
  const calls = []
  let online = true
  let status = 200
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) })
    if (!online) throw new TypeError('Failed to fetch')
    if (url.endsWith('/join')) return { ok: true, status: 201, json: async () => ({ token: 'stok_abc', className: 'Grade 2', goalMin: 60 }) }
    return { ok: status < 400, status, json: async () => ({ ok: true, goalMin: 45 }) }
  }
  return { calls, fetchImpl, setOnline: (v) => { online = v }, setStatus: (s) => { status = s } }
}

describe('class sync (child side)', () => {
  beforeEach(() => localStorage.clear())

  it('join stores the token, backfills recent days, and takes the teacher goal', async () => {
    savePractice({ days: { '2026-10-17': row('2026-10-17', 40) }, goal: null })
    const srv = fakeServer()
    const r = await joinClassSync('ab-12cd', 'Selam', { fetchImpl: srv.fetchImpl, base: BASE })
    expect(r.ok).toBe(true)
    expect(srv.calls[0].body).toEqual({ code: 'AB12CD', name: 'Selam' }) // name + class code only
    expect(loadSync()).toMatchObject({ code: 'AB12CD', token: 'stok_abc', pending: ['2026-10-17'] })
    expect(loadPractice().goal).toBe(60)
  })

  it('rejects bad input and works without a configured API', async () => {
    expect((await joinClassSync('x', 'Selam', { fetchImpl: fakeServer().fetchImpl, base: BASE })).ok).toBe(false)
    expect((await joinClassSync('ABCD12', 'Selam', { base: '' })).error).toBe('offline')
  })

  it('queues while offline and flushes later; payload is numbers only', async () => {
    const srv = fakeServer()
    await joinClassSync('ABCD12', 'Selam', { fetchImpl: srv.fetchImpl, base: BASE })
    savePractice({ days: { '2026-10-18': row('2026-10-18', 61) }, goal: 60 })
    queueDaySync(['2026-10-18'])
    srv.setOnline(false)
    expect((await flushSync({ fetchImpl: srv.fetchImpl, base: BASE })).kept).toBe(1)
    expect(loadSync().pending).toEqual(['2026-10-18'])
    srv.setOnline(true)
    expect((await flushSync({ fetchImpl: srv.fetchImpl, base: BASE })).sent).toBe(1)
    const last = srv.calls[srv.calls.length - 1]
    expect(last.opts.headers.authorization).toBe('Student stok_abc')
    expect(last.body.days[0]).toEqual({ day: '2026-10-18', activeMin: 61, prayerMin: 0, sessions: 2, items: 30, answered: 20, correct: 15, lessons: 0, games: 0, flags: { rapidTap: 0, randomTap: 0, audioLoop: 0 } })
    expect(loadSync().pending).toEqual([])
    expect(loadPractice().goal).toBe(45) // goal changed on the server
  })

  it('server errors keep the queue; a revoked token leaves the class', async () => {
    const srv = fakeServer()
    await joinClassSync('ABCD12', 'Selam', { fetchImpl: srv.fetchImpl, base: BASE })
    queueDaySync(['2026-10-18'])
    savePractice({ days: { '2026-10-18': row('2026-10-18', 5) }, goal: 60 })
    srv.setStatus(503)
    await flushSync({ fetchImpl: srv.fetchImpl, base: BASE })
    expect(loadSync().pending).toContain('2026-10-18')
    srv.setStatus(401)
    expect((await flushSync({ fetchImpl: srv.fetchImpl, base: BASE })).revoked).toBe(true)
    expect(localStorage.getItem(SYNC_KEY)).toBe(null)
  })

  it('queueDaySync is a no-op before joining', () => {
    queueDaySync(['2026-10-18'])
    expect(loadSync()).toBe(null)
    expect(wireRow(row('2026-10-18', 2)).activeMin).toBe(2)
  })
})

describe('tamper-evident report', () => {
  const days = { '2026-10-18': row('2026-10-18', 62), '2026-10-16': row('2026-10-16', 30) }

  it('verifies an untouched link and shows the 7-day table', async () => {
    const token = await signReport(reportPayload({ name: 'Selam', code: 'ABCD12', goal: 60, days, today: '2026-10-18' }))
    const v = await verifyReport(readReportFromHash(`#report=${encodeURIComponent(token)}`))
    expect(v.verified).toBe(true)
    expect(v.report.days).toHaveLength(7)
    expect(v.report.days[6]).toMatchObject({ day: '2026-10-18', minutes: 62 })
    expect(v.check).toMatch(/^.{4}-.{4}$/)
    expect(checkCode(token)).toBe(v.check)
  })

  it('any edit breaks verification', async () => {
    const p = reportPayload({ name: 'Selam', code: 'ABCD12', goal: 60, days, today: '2026-10-18' })
    const token = await signReport(p)
    const sig = token.split('.')[1]
    const forged = { ...p, d: p.d.map((r) => (r[0] === '2026-10-16' ? [r[0], 90, ...r.slice(2)] : r)) }
    const { b64urlEncode } = await import('../utils/challenge')
    const v = await verifyReport(`${b64urlEncode(JSON.stringify(forged))}.${sig}`)
    expect(v.verified).toBe(false)
    expect(v.report.days[4].minutes).toBe(90)
    expect(await verifyReport('garbage')).toBe(null)
  })
})
