import 'dotenv/config'
import config from './config.js'
import { connect } from './store.js'
import { createApp } from './app.js'

const { backend } = await connect()
if (!process.env.JWT_SECRET && !process.env.ALLOW_EPHEMERAL_JWT_SECRET) {
  // Without a fixed secret, config.js mints a random one per boot, so every
  // restart/instance silently invalidates all sessions. This used to be
  // gated on NODE_ENV === 'production', which several hosts never set -
  // so the unsafe path was the quiet default. Now dev must opt in.
  console.error('FATAL: set JWT_SECRET, or ALLOW_EPHEMERAL_JWT_SECRET=1 for a throwaway dev secret.')
  process.exit(1)
}
if (process.env.STRIPE_SECRET_KEY && !process.env.SITE_URL) {
  // Checkout builds success/cancel URLs from SITE_URL; unset, it defaults to
  // localhost and a paying customer never reaches the page with their code.
  console.error('FATAL: SITE_URL must be set when STRIPE_SECRET_KEY is - checkout would redirect buyers to localhost.')
  process.exit(1)
}
if (process.env.STRIPE_SECRET_KEY && backend === 'memory') {
  // A restart would forget fulfilled orders and re-mint different codes for
  // the same payment. Real money requires a real database.
  const msg = 'STRIPE_SECRET_KEY is set but MONGO_URI is not - orders would not survive a restart.'
  if (process.env.NODE_ENV === 'production') {
    console.error(`FATAL: ${msg}`)
    process.exit(1)
  }
  console.warn(`WARNING: ${msg} Acceptable for local testing only.`)
}
createApp().listen(config.port, () => {
  console.log(`egeez-api listening on :${config.port} (store: ${backend})`)
  if (backend === 'memory') console.log('MONGO_URI not set - using in-memory store (data resets on restart)')
})
