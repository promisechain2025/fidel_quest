/* Express app factory (no listen) so tests run it via supertest. */
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import config from './config.js'
import authRoutes from './routes/auth.js'
import formRoutes from './routes/forms.js'
import childrenRoutes from './routes/children.js'
import introRoutes from './routes/intros.js'
import payRoutes, { webhookHandler, setStripeClient } from './routes/pay.js'
import { store } from './store.js'

export function createApp({ stripeClient } = {}) {
  if (stripeClient) setStripeClient(stripeClient)
  const app = express()
  // Only when the deploy really sits behind a proxy - see config.trustProxy.
  if (config.trustProxy) {
    const n = Number(config.trustProxy)
    app.set('trust proxy', Number.isFinite(n) && String(n) === config.trustProxy ? n : config.trustProxy)
  }
  // The owner panel is a single inline-scripted page, so it gets helmet with
  // a CSP that permits its own inline script - rather than (as before) being
  // mounted ahead of helmet, which left the one page that handles the admin
  // token with no CSP, no frame protection and a leaked X-Powered-By.
  app.get('/admin', helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: { scriptSrc: ["'unsafe-inline'"], frameAncestors: ["'none'"], upgradeInsecureRequests: null },
    },
  }), async (_req, res) => {
    const { ADMIN_HTML } = await import('./adminPage.js')
    res.type('html').send(ADMIN_HTML)
  })
  app.use(helmet())
  app.use(cors({ origin: config.corsOrigin.includes('*') ? true : config.corsOrigin }))
  // Stripe webhook MUST see the raw body for signature verification, so it
  // mounts BEFORE express.json and never moves into the /api router below.
  app.post('/api/pay/webhook', ...webhookHandler())
  app.use(express.json({ limit: '32kb' }))

  app.get('/healthz', (_req, res) => res.json({ ok: true, backend: store.backend }))
  app.use('/api/auth', authRoutes)
  app.use('/api', childrenRoutes)
  app.use('/api', introRoutes)
  app.use('/api', payRoutes)
  app.use('/api', formRoutes)

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // express.json rejects malformed/oversized bodies with err.status set.
    // Reporting those as 500 both misleads the client and buries real
    // server faults in the error log.
    const status = err.status || err.statusCode || 500
    if (status >= 500) console.error('[api:error]', err.message)
    const msg = status === 413 ? 'Request body too large'
      : status === 400 ? 'Malformed request body'
      : 'Something went wrong'
    res.status(status).json({ error: msg })
  })
  return app
}
