# eGeez — hub API

The backend for the eGeez learning-hub **website** (`../website`): accounts and
the three public forms. It is separate from `../server` (the zero-dependency,
no-PII analytics/OG service) on purpose — this one holds accounts, so it has a
database and secrets.

## What it does

- **Accounts base** — `POST /api/auth/register`, `POST /api/auth/login`,
  `GET /api/auth/me` (Bearer JWT, bcrypt, roles `parent` | `teacher`). The
  foundation the teacher directory and booking will build on.
- **Teacher applications** — `POST /api/teachers/apply`
- **Language waitlist** — `POST /api/waitlist` (defaults to `ti` Tigrinya)
- **Contact** — `POST /api/contact`
- Each submission is stored and (when SMTP is configured) emailed to you.
- **Owner lists** — `GET /api/admin/{teachers|waitlist|contact}` with
  `x-admin-token: $ADMIN_TOKEN`.

## Run

```bash
cd api
npm install
npm start        # :8788; in-memory store until MONGO_URI is set
npm test         # node --test + supertest (no services needed)
```

Copy `.env.example` to `.env` for production: MongoDB Atlas URI, a real
`JWT_SECRET`, gmail app password for notifications, an `ADMIN_TOKEN`, and the
website origin in `CORS_ORIGIN`.

## Design notes

- `store.js` is the only file that knows about persistence: Mongo (mongoose)
  when `MONGO_URI` is set, in-memory otherwise — dev and CI need zero services.
- Middleware (`middleware.js`) is trimmed from `PROMISECHAIN_BE`: Bearer-JWT
  auth, shared-secret admin gate, in-memory sliding-window rate limits
  (auth 10 / forms 20 per 15 min per IP).
- Email (`mailer.js`) follows the PROMISECHAIN_BE gmail-service transporter;
  failures never fail the request.
- The **app never talks to this API** — it stays fully offline. Only the
  website does.

## Next phases (designed-for, not built)

Teacher profiles + directory (approve an application → public profile),
booking/scheduling, parent dashboards. All hang off the existing `User` model
and admin gate.
