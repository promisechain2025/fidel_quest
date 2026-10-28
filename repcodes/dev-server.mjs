/* LOCAL ONLY: runs the Lambda app on http://localhost:8787 with the memory
   store. Sign-in codes go to /tmp/egr-dev-otp.txt instead of email. */
import http from 'node:http'
import fs from 'node:fs'
import { makeApp } from './src/app.js'
import { memStore } from './src/store-mem.js'

const app = makeApp({ store: memStore(), sendMail: async (to, otp) => fs.appendFileSync('/tmp/egr-dev-otp.txt', `${to} ${otp}\n`), log: (e, d) => console.log(e, JSON.stringify(d)) })
http.createServer(async (req, res) => {
  let body = ''; for await (const ch of req) body += ch
  const u = new URL(req.url, 'http://localhost')
  const r = await app({
    rawPath: u.pathname, queryStringParameters: Object.fromEntries(u.searchParams),
    requestContext: { http: { method: req.method, sourceIp: req.socket.remoteAddress } },
    headers: req.headers, cookies: (req.headers.cookie || '').split(/;\s*/).filter(Boolean), body: body || undefined,
  })
  res.writeHead(r.statusCode, r.headers); res.end(r.body || '')
}).listen(Number(process.env.PORT || 8787), () => console.log('repcodes dev on :8787'))
