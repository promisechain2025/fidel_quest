/* Express app factory (no listen) so tests run it via supertest. */
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import config from './config.js'
import authRoutes from './routes/auth.js'
import formRoutes from './routes/forms.js'
import childrenRoutes from './routes/children.js'
import payRoutes, { webhookHandler, setStripeClient } from './routes/pay.js'
import { store } from './store.js'

export function createApp({ stripeClient } = {}) {
  if (stripeClient) setStripeClient(stripeClient)
  const app = express()
  app.set('trust proxy', 1)
  // The owner panel is a single inline-scripted page; it registers BEFORE
  // helmet so the default CSP (script-src 'self') does not blank it. The
  // page holds no data - every fetch inside it still needs the admin token.
  app.get('/admin', async (_req, res) => {
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
  app.use('/api', payRoutes)
  app.use('/api', formRoutes)

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[api:error]', err.message)
    res.status(500).json({ error: 'Something went wrong' })
  })
  return app
}
