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

export function createApp(store, { appUrl, ownerToken, ogImage } = {}) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname

    if (req.method === 'OPTIONS') return send(res, 204, '')

    if (req.method === 'GET' && path === '/healthz') return send(res, 200, { ok: true })

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

    if (req.method === 'GET' && (path === '/' || path === '/share')) {
      return send(res, 200, landingHtml({ appUrl, ogImage }))
    }

    return send(res, 404, { ok: false, error: 'not_found' })
  })
}
