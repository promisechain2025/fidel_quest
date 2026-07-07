# Deploying Fidel Quest

Two independent pieces:

1. **The app** — a static PWA (`dist/` after `npm run build`). Host it on any
   static host. This is all you need to put the game in kids' hands.
2. **The server** (`server/`) — optional. A tiny, dependency-free Node service
   for the growth loop: anonymous funnel analytics, the A/B dashboard, and a
   rich share-landing page. The app works completely without it.

You can ship #1 today and add #2 whenever you want to measure the loop.

---

## 1. Deploy the app (the PWA)

### Build

```bash
npm ci
VITE_APP_URL="https://YOUR-APP-DOMAIN" \
VITE_ANALYTICS_URL="https://YOUR-SERVER-DOMAIN/api/events" \
npm run build
# → dist/  (static files, service worker, PWA manifest)
```

- `VITE_APP_URL` — your public app URL. Bakes correct Open Graph tags into
  `index.html` so a shared link previews with a card (WhatsApp/social). Set it.
- `VITE_ANALYTICS_URL` — **optional**. Omit it and the app sends nothing and
  stays 100% offline. Set it (to your server's `/api/events`) to measure the
  funnel.
- `VITE_SHOP_URL` — **optional**. The storefront the Tee Shop's "Order a real
  shirt" button opens (the earned design id is appended as `?design=<id>`, so
  a print-on-demand store — Printful/Printify/Gelato — or even a Google Form
  can preselect it). Leave it unset and "Order" gracefully falls back to
  saving the print-ready PNG, which a parent can take to any local printer.
  This is the app's opt-in income lever: kids unlock a new shirt design each
  chapter, parents buy.

### Host

Upload `dist/` to any static host — **Netlify, Vercel, Cloudflare Pages, GitHub
Pages, S3+CloudFront**, anything. There is **no router**, so you need **no SPA
rewrite rules** — every screen is one URL. Serve over **HTTPS** (required for
PWA install + the service worker).

- Netlify: drag `dist/` into the dashboard, or `netlify deploy --prod --dir dist`.
- Vercel: `vercel deploy dist --prod` (framework preset: Other).
- Cloudflare Pages: connect the repo; build command `npm run build`, output
  `dist`, and add the two `VITE_*` env vars.

### Verify

- Open on a phone → **Add to Home Screen** works, launches full-screen.
- Turn on airplane mode after first load → the app still runs (offline PWA).
- Paste your URL into a WhatsApp chat → a preview card appears.

---

## 2. Deploy the server (analytics + share landing)

Stateless and in-memory (aggregate counts only — no PII, no database). One
small machine is plenty; it can scale to zero when idle.

### Option A — Fly.io

```bash
cd server
fly launch --no-deploy                 # edit app name/region in fly.toml
fly secrets set OWNER_TOKEN="$(openssl rand -hex 16)" \
                APP_URL="https://YOUR-APP-DOMAIN" \
                OG_IMAGE="https://YOUR-APP-DOMAIN/icon-512.png"
fly deploy
```

### Option B — Render

Push this repo, then **New → Blueprint** (it reads `render.yaml`). `OWNER_TOKEN`
is generated for you; set `APP_URL` and `OG_IMAGE` in the dashboard.

### Option C — any Docker host / bare Node

```bash
cd server
docker build -t fidel-quest-server .
docker run -p 8080:8080 \
  -e OWNER_TOKEN=$(openssl rand -hex 16) \
  -e APP_URL=https://YOUR-APP-DOMAIN \
  -e OG_IMAGE=https://YOUR-APP-DOMAIN/icon-512.png \
  fidel-quest-server
# or, with Node ≥18 and no Docker:  OWNER_TOKEN=... node src/index.js
```

### Env

| Var           | Purpose                                                    |
| ------------- | ---------------------------------------------------------- |
| `PORT`        | listen port (default 8787; Docker image uses 8080)         |
| `APP_URL`     | where the share landing bounces to (your app)              |
| `OG_IMAGE`    | absolute URL of the share preview image                    |
| `OWNER_TOKEN` | secret required to read `/api/stats` and the dashboard     |

### Verify

```bash
curl https://YOUR-SERVER/healthz                 # {"ok":true}
curl -X POST https://YOUR-SERVER/api/events \
  -H 'content-type: text/plain' -d '[{"type":"app_open","day":"2026-07-06"}]'
open https://YOUR-SERVER/dashboard               # enter OWNER_TOKEN
```

---

## 3. Wire them together

1. Build the app with `VITE_ANALYTICS_URL = https://YOUR-SERVER/api/events`.
2. (Optional, for the best previews) share your **server root** as the link —
   it renders the richest OG card, then bounces to the app. The in-app share
   sheet uses `VITE_APP_URL`, whose `index.html` OG tags already preview well.
3. Watch the funnel at `https://YOUR-SERVER/dashboard` (token-gated).

---

## 4. Read the funnel & run your first A/B test

- The dashboard charts `app_open → lesson_complete → chapter_complete →
  gift_claim → share → install` with share/install rates.
- An experiment is already wired: **`share_cta`** (share-button copy
  *"Share Anbessa"* vs *"Show everyone!"*). Let real traffic split, then read
  the winner (starred row) in the dashboard's **A/B experiments** table.
- To run the next test: in `src/platform/experiments.js`, add it to
  `EXPERIMENTS`, point `ACTIVE` at its key, use `variantOf('key')` in the UI
  you're testing, rebuild. Ship the winner by making it the default.

---

## 5. Launch checklist

**Ship-blockers (do these before a public launch):**

- [x] **Letter + word audio is real human voice** for Amharic (all 33
      families, 25 words). Tigrinya reuses these and adds four distinct human
      consonants (ሐ/ኀ/ኸ/ዐ) under `public/audio/fidel/letters/ti/`. The one
      remaining chant on the synth fallback is ጨ (chhe); the Tigrinya word
      list is not recorded yet.
- [ ] **Native-speaker review** of: the Amharic UI strings
      (`src/platform/i18n.js`); the Tigrinya pack sounds/words
      (`src/packs/ti.js`); and confirmation that the twin-audio inferences
      (ኸ→ከ, ሠ→ሰ) match the intended Amharic pronunciation.
- [ ] **HTTPS** on both hosts (PWA + secure context).
- [ ] **Icons present**: `public/icon-192.png`, `icon-512.png`,
      `apple-touch-icon.png`, `icon.svg` (already in the repo — confirm they
      look right).

**Strongly recommended:**

- [ ] Playtest with a few real 3–6 year-olds (trace difficulty, round length).
- [ ] Verify install + offline on a low-end Android phone (the target device),
      and that a 3D mode degrades to the 2D fallback there.
- [ ] Decide analytics on/off. Off = omit `VITE_ANALYTICS_URL` (nothing sent).
- [ ] Set a real `primary_region` (Fly) or region (Render) near your users.

**Nice to have:**

- [ ] Point a custom domain at each host.
- [ ] Publish the native shells (Capacitor scaffold is in the repo) to the app
      stores once the web version is validated.

---

## Privacy note

The server stores only aggregate counts (`{type, day}`, plus an A/B variant
label). No accounts, names, ids, IPs, or per-child progress. Analytics are
opt-in at build time. This keeps it appropriate for a children's product — keep
it that way if you extend the backend.
