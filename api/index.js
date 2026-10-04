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
createApp().listen(config.port, () => {
  console.log(`egeez-api listening on :${config.port} (store: ${backend})`)
  if (backend === 'memory') console.log('MONGO_URI not set - using in-memory store (data resets on restart)')
})
