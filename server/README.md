# eGeez — server

A tiny, **privacy-first** backend for the growth loop. Two jobs:

1. **Aggregate funnel analytics** — anonymous counts of `app_open →
   lesson_complete → chapter_complete → gift_claim → share → install`, so you
   can see whether the viral loop is turning.
2. **Open Graph share landing** — a shared link that renders a rich preview
   card in WhatsApp / social (far higher click-through than a bare URL), then
   bounces the visitor into the app.

## What it never stores

No accounts, no child names, no per-child progress, no device ids, no IPs.
Each accepted event is only `{ type, day }` — one of six fixed funnel stages
plus a calendar day. Unknown event types and extra fields are dropped
server-side (see `test/store.test.js`). This keeps it appropriate for a
children's product.

## Run

Zero runtime dependencies — Node's built-in `http` + test runner (Node ≥ 18).

```bash
cd server
npm start          # listens on :8787 (PORT to override)
npm test           # node --test
```

### Environment (all optional)

| Var           | Purpose                                                        |
| ------------- | -------------------------------------------------------------- |
| `PORT`        | listen port (default `8787`)                                   |
| `APP_URL`     | where the share landing bounces to (your deployed PWA)         |
| `OG_IMAGE`    | absolute URL of the Open Graph preview image                   |
| `OWNER_TOKEN` | shared secret required to read `GET /api/stats` (else 403)     |

## Endpoints

| Method + path      | Notes                                                        |
| ------------------ | ------------------------------------------------------------ |
| `GET /healthz`     | liveness                                                     |
| `POST /api/events` | body: `[{type,day},…]` or `{events:[…]}`; returns `accepted` |
| `GET /api/stats`   | owner-gated snapshot (`x-owner-token`)                       |
| `GET /dashboard`   | owner funnel dashboard (charts `/api/stats`; token in-page)  |
| `GET /` `/share`   | Open Graph landing HTML                                      |

## Connect the app

The frontend only sends analytics when `VITE_ANALYTICS_URL` is set at build
time; unset (the default) means the PWA stays 100% offline and sends nothing.

```bash
# in the app root
VITE_ANALYTICS_URL="https://your-server/api/events" npm run build
```

Point your share URL (`APP_URL`/the link parents share) at this server's `/`
so every shared link gets the rich preview.

## Notes

- **In-memory by design.** Aggregate counts are cheap to lose and carry no
  PII; restarts reset them. Add a persistent store only if you want history.
- `src/store.js` is pure and holds all the counting logic — the HTTP layer is
  a thin wrapper, so the important behavior is unit-tested without a socket.
