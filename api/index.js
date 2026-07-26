import 'dotenv/config'
import config from './config.js'
import { connect } from './store.js'
import { createApp } from './app.js'

const { backend } = await connect()
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  // Without a fixed secret, config.js mints a random one per boot, so every
  // restart/instance silently invalidates all sessions. Refuse to start.
  console.error('FATAL: JWT_SECRET must be set in production (a per-boot random secret logs everyone out on restart).')
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
