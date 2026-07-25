import 'dotenv/config'
import config from './config.js'
import { connect } from './store.js'
import { createApp } from './app.js'

const { backend } = await connect()
createApp().listen(config.port, () => {
  console.log(`egeez-api listening on :${config.port} (store: ${backend})`)
  if (backend === 'memory') console.log('MONGO_URI not set - using in-memory store (data resets on restart)')
})
