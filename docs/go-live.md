# Go-live runbook (marketplace + payments)

The code is tested; this is the gap between "green tests" and "real families
and teachers onboarding." Work top to bottom. The app (offline PWA) can ship
to the stores independently of all of this - it needs none of the backend.

Legend: **[blocker]** = onboarding silently breaks without it.

## 1. Provision infrastructure

- **[blocker] MongoDB.** A real database. Without `MONGO_URI` the API runs in
  memory and loses everything on restart. Use a disposable copy first for the
  smoke test in step 4.
- **[blocker] Transactional email (SMTP).** The mailer *silently skips* when
  unset (logs `[mail:skipped]` and returns ok). That means verification links
  and introduction notifications never arrive and the whole loop dead-ends
  while looking healthy. Configure a real sender and send one test message.
- **Stripe** account (only if selling on the web at launch), test + live keys,
  and a webhook endpoint (step 3).
- **Hosting**: API on Render (`render.yaml` now defines the `egeez-hub-api`
  service alongside the analytics `fidel-quest-server` - `JWT_SECRET` and
  `ADMIN_TOKEN` are generated for you, the rest are set in the dashboard) or
  any Node host; website on Netlify (`netlify.toml`). DNS for `egeez.app`
  pointed at both.

## 2. Environment variables

### API (Express, `api/`)

| Var | Required | Purpose |
|---|---|---|
| `MONGO_URI` | **yes (prod)** | Persistent store. Unset = in-memory (data lost on restart). |
| `JWT_SECRET` | **yes (prod)** | Session signing. The server refuses to boot in production without it. |
| `ADMIN_TOKEN` | **yes** | Owner panel (`/admin`) - approving teachers, moderating reviews. |
| `EMAIL_USER` / `EMAIL_PASS` | **yes** | SMTP sender (Gmail-service transporter). No email = broken verification/intros. |
| `NOTIFY_EMAIL` | recommended | Where owner notifications go (defaults to `EMAIL_USER`). |
| `SITE_URL` | **yes** | Public site origin, e.g. `https://egeez.app`. Used in emailed links and Stripe redirects. |
| `CORS_ORIGIN` | recommended | The website origin(s), comma-separated. Defaults to `*`. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | if selling on web | Payments. Absent = pay endpoints return 503 (dormant, safe). |
| `JWT_EXPIRES_IN` | optional | Session length (default `7d`). |
| `PORT` | optional | Default `8788`. |
| `NODE_ENV` | **yes** | Set to `production`. |

### Website (Vite, `website/`)

| Var | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | **yes** | Base URL of the deployed API. Empty = forms fall back to mailto and accounts/board are disabled. |
| `VITE_APP_URL` | recommended | "Open the app" links. Default `https://egeez.app`. |
| `VITE_CONTACT_EMAIL` | recommended | Shown on legal pages and contact. |

## 3. Stripe webhook (if selling on web)

1. Create a webhook endpoint pointing at `POST {API}/api/pay/webhook`, event
   `checkout.session.completed`.
2. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Verify with a Stripe test-mode purchase that an order + unlock code is minted
   exactly once (the poll fallback at `/api/pay/order/:id` covers a missed
   webhook).

## 4. Run the Mongo smoke test against staging

The whole automated suite runs in-memory; the Mongoose code path is only
exercised by one test, and only when you point it at a disposable database:

```
cd api
TEST_MONGO_URI="mongodb://.../egeez_smoke" npm test
```

It runs the real onboarding chain (verify -> approve -> intro -> link ->
snapshots -> progress) and the exactly-once money path on Mongo, then drops
the database. Do this before every go-live - it is the check that would have
caught the Mongoose `rawResult` bug. **`TEST_MONGO_URI` must be throwaway.**

## 5. Complete the legal pages

`/privacy` and `/terms` are written to match what the code actually does, but
contain bracketed placeholders that MUST be filled before launch:

- `[operator legal entity]` and address
- `[governing jurisdiction]`
- `[hosting region / provider]`
- `[refund policy / window]`

Because the service touches children's data, have both reviewed by counsel.
Both app stores also **require a public privacy-policy URL** for submission -
`{SITE_URL}/privacy` satisfies that.

## 6. Set the owner operations

- Decide who reviews teacher applications and how (the approval gate is manual
  by design). Approve via the `/admin` panel with `ADMIN_TOKEN`.
- Confirm the "we vet applications, not backgrounds" language on `/teachers`
  matches your actual process. If you add real checks later, upgrade the copy.

## 6b. Optional: seed a demo board

To populate the board with a demo teacher + three linked families (ratings,
progress badge, family count) for screenshots or a quick sanity check:

```
cd api
MONGO_URI="mongodb://.../egeez_staging" npm run seed
```

Idempotent (keyed on the demo teacher's email); demo accounts use
`*.demo@egeez.app` and a shared demo password printed on completion. This is
a convenience, NOT a substitute for the real rehearsal below - the rehearsal
is what proves email and the live DB actually work.

## 7. One real end-to-end rehearsal (do not skip)

On staging, with real email and the real DB, walk the whole flow once as if you
were a user:

1. Apply as a teacher on `/teachers`.
2. Approve yourself in `/admin`.
3. Register a teacher account with the same email; click the emailed
   confirmation link (`/verify`).
4. In another browser, register a parent, add a child.
5. Request an introduction to the teacher; accept it in `/teach`; confirm both
   sides receive the contact email.
6. As the parent, link the child to the teacher; submit a rating.
7. Open the app, produce a Progress Card, save it on `/progress` to the child.
8. (If selling on web) buy in Stripe test mode; confirm the code redeems in the
   app.

If every step works with real infrastructure, you are ready to onboard.

## Store submission (the app, independent of the above)

- Privacy-policy URL: `{SITE_URL}/privacy`.
- Enroll in the reduced-commission programs (Apple Small Business, Google Play
  reduced service fee) - 15% instead of 30% under ~$1M/yr.
- IAP scaffold (RevenueCat) is in place but dormant until keys; web-bought
  EGZ/FAM codes already redeem in-app for the cross-platform "never pay twice"
  path.
