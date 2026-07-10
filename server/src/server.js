/* ============================================================================
   HTTP layer (Node built-in http, zero dependencies)
   ----------------------------------------------------------------------------
   Routes:
     GET  /healthz          -> liveness
     POST /api/events       -> record a batch of anonymous funnel events
     GET  /api/stats        -> aggregate snapshot (owner-token gated)
     GET  /  and  /share    -> Open Graph share landing (bounces to the app)
   CORS is open for /api/events (it is only anonymous counts). /api/stats is
   locked behind OWNER_TOKEN so aggregate numbers are not world-readable.
   ========================================================================== */

import { createServer } from 'node:http'
import { landingHtml } from './landing.js'
import { dashboardHtml } from './dashboard.js'
import { isoWeek } from './social.js'

const MAX_BODY = 16 * 1024 // 16 KB cap on request bodies

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-owner-token',
    'Content-Type': typeof body === 'string' ? 'text/html; charset=utf-8' : 'application/json',
    ...headers,
  })
  res.end(payload)
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = ''
    let tooBig = false
    req.on('data', (chunk) => {
      if (tooBig) return // keep draining but stop buffering to bound memory
      data += chunk
      if (data.length > MAX_BODY) {
        tooBig = true
        data = ''
      }
    })
    req.on('end', () => {
      if (tooBig) return resolve({ error: 'too_large' })
      try {
        resolve({ value: JSON.parse(data || '{}') })
      } catch {
        resolve({ error: 'bad_json' })
      }
    })
    req.on('error', () => resolve({ error: 'read_error' }))
  })
}

function socialError(res, err) {
  const status = err === 'not_found' ? 404 : err === 'forbidden' || err === 'consent_required' ? 403 : 400
  return send(res, status, { ok: false, error: err })
}

export function createApp(store, { appUrl, ownerToken, ogImage, social } = {}) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname

    if (req.method === 'OPTIONS') return send(res, 204, '')

    if (req.method === 'GET' && path === '/healthz') return send(res, 200, { ok: true })

    // ── Family & Friends (Phase 2). Dormant unless a social store is wired in. ──
    if (social && path.startsWith('/api/social/')) {
      if (req.method === 'POST' && path === '/api/social/groups') {
        const { value, error } = await readJson(req)
        if (error) return send(res, error === 'too_large' ? 413 : 400, { ok: false, error })
        const out = social.createGroup({ nickname: value?.nickname, consent: value?.consent })
        return out.error ? socialError(res, out.error) : send(res, 200, { ok: true, ...out })
      }
      if (req.method === 'POST' && path === '/api/social/groups/join') {
        const { value, error } = await readJson(req)
        if (error) return send(res, error === 'too_large' ? 413 : 400, { ok: false, error })
        const out = social.joinGroup({ code: value?.code, nickname: value?.nickname, consent: value?.consent })
        return out.error ? socialError(res, out.error) : send(res, 200, { ok: true, ...out })
      }
      if (req.method === 'POST' && path === '/api/social/score') {
        const { value, error } = await readJson(req)
        if (error) return send(res, error === 'too_large' ? 413 : 400, { ok: false, error })
        const out = social.submitScore({
          groupId: value?.groupId,
          memberId: value?.memberId,
          memberToken: value?.memberToken,
          metric: value?.metric,
          value: value?.value,
          nickname: value?.nickname,
          week: isoWeek(),
        })
        return out.error ? socialError(res, out.error) : send(res, 200, { ok: true, ...out })
      }
      if (req.method === 'GET' && path === '/api/social/board') {
        const out = social.board({
          groupId: url.searchParams.get('groupId'),
          memberId: url.searchParams.get('memberId'),
          memberToken: url.searchParams.get('memberToken'),
          metric: url.searchParams.get('metric'),
          week: url.searchParams.get('week') || isoWeek(),
        })
        return out.error ? socialError(res, out.error) : send(res, 200, { ok: true, ...out })
      }
      return send(res, 404, { ok: false, error: 'not_found' })
    }

    if (req.method === 'POST' && path === '/api/events') {
      const { value, error } = await readJson(req)
      if (error) return send(res, error === 'too_large' ? 413 : 400, { ok: false, error })
      const list = Array.isArray(value) ? value : Array.isArray(value?.events) ? value.events : []
      const accepted = store.recordBatch(list)
      return send(res, 200, { ok: true, accepted })
    }

    if (req.method === 'GET' && path === '/api/stats') {
      // Owner-gated: without a configured token the endpoint is closed.
      if (!ownerToken || req.headers['x-owner-token'] !== ownerToken) {
        return send(res, 403, { ok: false, error: 'forbidden' })
      }
      return send(res, 200, store.snapshot())
    }

    if (req.method === 'GET' && path === '/dashboard') {
      // The page itself is public; the numbers behind it require the token.
      return send(res, 200, dashboardHtml())
    }

    if (req.method === 'GET' && (path === '/' || path === '/share')) {
      return send(res, 200, landingHtml({ appUrl, ogImage }))
    }

    return send(res, 404, { ok: false, error: 'not_found' })
  })
}
