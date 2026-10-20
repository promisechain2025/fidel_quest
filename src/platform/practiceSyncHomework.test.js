import { describe, it, expect, beforeEach } from 'vitest'
import { joinClassSync, flushSync, queueHomeworkSync, loadSync } from './practiceSync'

const BASE = 'https://api.test'
function fakeServer(status = 200) {
  const calls = []
  const fetchImpl = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) })
    if (url.endsWith('/join')) return { ok: true, status: 201, json: async () => ({ token: 'stok', className: 'C', goalMin: 30 }) }
    return { ok: status < 400, status, json: async () => ({ ok: true }) }
  }
  return { calls, fetchImpl }
}

describe('homework results for the web teacher dashboard', () => {
  beforeEach(() => localStorage.clear())

  it('does nothing when the device is not in a synced class', () => {
    expect(queueHomeworkSync({ code: 'AB12CD', seed: 5, score: 3, total: 5 })).toBe(false)
  })

  it('queues only for the synced class, clamps, strips order suffixes, and sends once', async () => {
    const srv = fakeServer()
    await joinClassSync('AB12CD', 'Selam', { fetchImpl: srv.fetchImpl, base: BASE })
    expect(queueHomeworkSync({ code: 'OTHER1', seed: 5, score: 3, total: 5 })).toBe(false)
    expect(queueHomeworkSync({ code: 'AB12CD', seed: 77, score: 99, total: 8, missed: ['ha-3', 'ha-1', 'le-2', '<x>'] })).toBe(true)
    expect(loadSync().hw).toEqual([{ seed: 77, total: 8, score: 8, missed: ['ha', 'le'] }])
    await flushSync({ fetchImpl: srv.fetchImpl, base: BASE })
    const sync = srv.calls.find((c) => c.url.endsWith('/sync'))
    expect(sync.body.homework).toEqual([{ seed: 77, total: 8, score: 8, missed: ['ha', 'le'] }])
    expect(JSON.stringify(sync.body)).not.toMatch(/Selam/) // no name in results
    expect(loadSync().hw).toEqual([])
  })

  it('keeps the result queued if the server is down', async () => {
    const ok = fakeServer()
    await joinClassSync('AB12CD', 'Selam', { fetchImpl: ok.fetchImpl, base: BASE })
    queueHomeworkSync({ code: 'AB12CD', seed: 9, score: 1, total: 3 })
    await flushSync({ fetchImpl: fakeServer(500).fetchImpl, base: BASE })
    expect(loadSync().hw.length).toBe(1)
  })
})
