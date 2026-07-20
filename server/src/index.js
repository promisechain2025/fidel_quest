/* Entry point. Wires the pure store to the HTTP layer and listens.
   Config via env (all optional):
     PORT          - listen port (default 8787)
     APP_URL       - where the share landing bounces to (the deployed PWA)
     OG_IMAGE      - absolute URL of the Open Graph preview image
     OWNER_TOKEN   - shared secret required to read GET /api/stats
   In-memory by design: aggregate counts are cheap to lose and carry no PII.
   Front a persistent store later only if you need history across restarts. */

import { createStore } from './store.js'
import { createSocialStore } from './social.js'
import { createApp } from './server.js'

const PORT = Number(process.env.PORT) || 8787
const store = createStore()
// Family & Friends (Phase 2) is on whenever the server runs; the FRONTEND stays
// dormant until VITE_SOCIAL_URL points at this server, so it never affects the
// offline-first game by default.
const social = createSocialStore()
const app = createApp(store, {
  appUrl: process.env.APP_URL || 'https://fidelquest.app',
  ogImage: process.env.OG_IMAGE,
  ownerToken: process.env.OWNER_TOKEN,
  social,
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`eGeez analytics + share landing on :${PORT}`)
})
