// Central env config (PROMISECHAIN_BE pattern). Everything is optional in dev:
// no MONGO_URI -> in-memory store; no SMTP creds -> emails log to console;
// no JWT_SECRET -> a random per-boot secret (tokens die on restart - fine for
// dev, set it in production).
import crypto from 'node:crypto'

export default {
  port: Number(process.env.PORT || 8788),
  mongoURI: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminToken: process.env.ADMIN_TOKEN || '',
  corsOrigin: (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()),
  // How many proxy hops to trust for req.ip. EMPTY = trust none, which is
  // the safe default: with 'trust proxy' on and no proxy actually in front,
  // any client can set X-Forwarded-For and hand itself a fresh rate-limit
  // bucket per request. Set this ONLY to match your real deployment (e.g.
  // TRUST_PROXY=1 behind exactly one reverse proxy, or a specific address).
  trustProxy: process.env.TRUST_PROXY || '',
  email: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    notifyTo: process.env.NOTIFY_EMAIL || process.env.EMAIL_USER || '',
  },
}
