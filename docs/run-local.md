# Run the whole stack locally

Three pieces, three terminals. Everything runs with zero configuration -
no database, no keys - and upgrades to real services via env vars.

```bash
git fetch origin claude/session-other-tab-98amyl
git checkout claude/session-other-tab-98amyl
```

## Terminal 1 - hub API (forms + payments)

```bash
cd api
npm install
ADMIN_TOKEN=dev npm start          # http://localhost:8788, in-memory store
```

Check it: `curl localhost:8788/healthz`. Form submissions land in memory;
list them with `curl localhost:8788/api/admin/waitlist -H 'x-admin-token: dev'`.
Payment endpoints answer `503 {dormant:true}` until Stripe keys exist -
that is the intended state.

## Terminal 2 - the website, wired to the local API

```bash
cd website
npm install
VITE_API_URL=http://localhost:8788 npm run dev    # vite prints the port (5173+)
```

What to check: every page in light + dark + phone width; the Tigrinya
waitlist and teacher forms (they store rows in the API - see the curl
above); `/pricing` - the buy buttons ask the API and show the coming-soon
state while Stripe is dormant. Without `VITE_API_URL` the forms fall back
to mailto and pricing shows coming-soon on its own.

## Terminal 3 - the app

```bash
npm install
npm run dev                                        # free mode (default, ships today)

# paid-model preview (trial + buy dialog + code redemption):
VITE_MONETIZE=true npm run dev
```

In paid mode: to see the after-trial dialog immediately, open devtools and run
`localStorage.setItem('fq.license.v1', JSON.stringify({startDay:'2026-01-01'}))`
then reload. Pass the hold-to-open grown-up gate; you get Buy ($12.99),
Restore, and the "Have a code?" input. Mint yourself a test code with:

```bash
node scripts/gen-app-codes.mjs 3    # EGZ app codes
node scripts/gen-family-codes.mjs 3 # FAM Family Pack codes (Grown-ups corner)
```

## Optional: real payment test (Stripe TEST mode)

```bash
# api/.env
STRIPE_SECRET_KEY=sk_test_...
SITE_URL=http://localhost:5173

# separate terminal - forwards webhooks and prints the secret:
stripe listen --forward-to localhost:8788/api/pay/webhook
# put the printed whsec_... into api/.env as STRIPE_WEBHOOK_SECRET, restart api
```

Buy on `/pricing` with test card `4242 4242 4242 4242` (any future date/CVC).
The success page shows the minted EGZ/FAM code; redeem it in the app.
Note: with no MONGO_URI orders reset when the API restarts (fine for tests;
production refuses to sell without Mongo).
