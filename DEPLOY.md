# Deploying eGeez

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
- `VITE_SOCIAL_URL` — **optional**. Turns on **Family & Friends** (Phase 2:
  private weekly leaderboards). Point it at your server (the same one below).
  Leave it unset and the whole surface stays dormant — the Backpack entry is
  hidden and nothing hits the network, so the game stays 100% offline. See
  section 7 for the endpoints and the safety model.

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

## 6. Reviewer guide & feedback page (`/review`)

A self-contained page ships at **`https://YOUR-APP-DOMAIN/review`**
(`public/review/index.html`). It is a feature-by-feature walkthrough with an
honest verdict on each part, followed by a **feedback form** so testers — kids
or grown-ups — can score the app and leave notes. Share this URL with anyone
reviewing the app.

It is deliberately outside the game: no router entry, `noindex`, and precached
so it also works offline. It is the only place in the project that makes a
network call, and only when someone submits a review.

**Where the reviews go — Netlify Forms (zero backend):**

- The form (`name="fidel-review"`) uses Netlify's built-in form handling. On a
  **Netlify** deploy, submissions are captured automatically — no server, no
  env vars.
- Read them in **Netlify dashboard → your site → Forms → `fidel-review`**.
  Turn on **email notifications** there (Forms → Settings & usage →
  notifications) to get each review in your inbox, and use **Export as CSV** to
  consolidate them in a spreadsheet.
- Netlify's free tier includes 100 submissions/month; that is plenty for a test
  round. Make sure **Form detection** is enabled (Site settings → Forms) — it
  is on by default. Fields are detected from the static HTML at deploy time, so
  a fresh deploy after any form change is what registers new fields.

**It never loses a review, even off Netlify:**

- Every submission is also saved to the tester's device (`localStorage`,
  `fq.reviews.v1`) as a backup, and the form offers **"Download a copy"**.
- If the site is hosted somewhere **other than Netlify** (Cloudflare Pages,
  S3, etc.), the POST simply fails gracefully: the review is still saved on the
  device and the tester is prompted to download it and email it to you.
- Running a test session on **one shared tablet**? Every review sent from that
  device accumulates locally; the **"Download all reviews saved on this
  device"** link exports them as one JSON file to consolidate.

No child's game progress, name, or voice is ever included in a review — only
what the tester types into the form.

---

## 7. Family & Friends (Phase 2 private leaderboards)

Private, closed-group weekly leaderboards among people a family already knows.
It lives on the **same server** as the analytics/landing (section 2) — the
routes are already wired; you just point the app at it.

**Turn it on:**

1. Deploy the server (section 2). Family & Friends is active whenever the
   server runs — no extra env on the server side.
2. Build the app with `VITE_SOCIAL_URL=https://YOUR-SERVER` (its root, not a
   sub-path). Without it, the feature is dormant and hidden.

**Endpoints** (JSON, CORS-open; membership is authorized by a server-issued
secret token, not the origin):

| Method + path                  | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `POST /api/social/groups`      | Create a group `{nickname, consent:true}` -> `{groupId, code, memberId, memberToken}` |
| `POST /api/social/groups/join` | Join by code `{code, nickname, consent:true}`       |
| `POST /api/social/score`       | Submit this week's score `{groupId, memberId, memberToken, metric, value}` |
| `GET  /api/social/board`       | Read a week's board `?groupId=&memberId=&memberToken=&metric=&week=` |

**Safety model** (see `docs/social-play.md`):

- **Closed network.** You only appear on a board you joined with a **code**
  shared out-of-band by an adult. No discovery, no public boards, no chat.
- **Parent consent** is required (`consent:true`) to create or join — the app
  collects it with a grown-up tick behind the Backpack. (A production build
  should back this with real email double-opt-in; that is the one piece left
  as a deploy step.)
- **Data minimization.** The server stores only a moderated **nickname** and
  numeric weekly **scores** — no email, no IP, no per-question data, no other
  PII. Each membership's secret token is stored **hashed**, so a dump cannot
  impersonate anyone; writes must present the token.
- **Caps:** 30 members/group, metric allow-list, values clamped, scores are
  monotone per week (only climb).

**What is intentionally NOT built yet** (future hardening): full public-key
(Ed25519) score signing instead of a per-member token, and email-verified
parental consent. The current token model is safe within a small known group;
the doc's Phase 3 (live co-play/calls) is unchanged and still future work.

**Read/verify:**

```bash
curl -X POST https://YOUR-SERVER/api/social/groups \
  -H 'content-type: application/json' -d '{"nickname":"Mom","consent":true}'
# -> {"ok":true,"groupId":"...","code":"ABC234","memberId":"...","memberToken":"..."}
```

---

## Privacy note

The server stores only aggregate counts (`{type, day}`, plus an A/B variant
label). No accounts, names, ids, IPs, or per-child progress. Analytics are
opt-in at build time. This keeps it appropriate for a children's product — keep
it that way if you extend the backend.
