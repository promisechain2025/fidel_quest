# Web teacher dashboard (gap #1): plan, status, switch-on

## What already existed (before this PR)
- `api/routes/practice.js` + `api/practiceStore.js`: server class sync. Verified teacher accounts create classes with a 6-char join code. A child device joins with code + nickname (16 chars max) and gets a random token (stored only as a SHA-256 hash). It then syncs daily counts (minutes, prayer minutes, sessions, answered/correct, flags). Teachers can read a 7–62 day report.
- `api/routes/auth.js`: teacher sign-in is email + password (scrypt) + JWT, plus an email-verification link (`/verify?token=`). No magic link exists. This PR reuses this; nothing new is added.
- App: `src/platform/practiceSync.js` joins and syncs, but only when the build sets `VITE_API_URL`. `ClassPracticeCard` in Teacher Mode shows the report in the app.

## Status in production: OFF
- The `deploy-app.yml` /app build does not set `VITE_API_URL`, so no child device syncs.
- The live website has no `VITE_API_URL`: forms fall back to mailto, as confirmed on easygeez.com.
- No API host answers (egeez-api.fly.dev and api.easygeez.com do not resolve or respond).
- `api/fly.toml` is ready but was never launched. Nothing was turned on or changed in AWS or Fly by this PR.

## What this PR adds
- **API:** homework set from the dashboard (`/classes/:code/homework`), results arriving with `/sync` (`homework: [{seed, score, total, missed}]`, accepted only for homework the class set, first turn-in wins), and `GET /classes/:code/roster`. The roster gives each student's last active day, week minutes and prayer minutes, accuracy, days at goal, homework done/missing/open, and trouble letters, plus class-wide trouble letters. Deleting a student, homework or class deletes their results.
- **App (no UI change, no new kid text):** when a synced child finishes a homework link, the result (score, total, missed family ids; no name) is queued and sent with the next sync.
- **Website `/classes`** (noindex): sign in or create a teacher account, verify email, create, open and delete classes. Copy the class code and invite link (`#class=` with sync on). Set homework and copy its `#assign=` link. Live roster refreshes every 30 s; students can be removed. Includes a draft parent consent notice and privacy note marked [LEGAL REVIEW]. `/verify` is reopened so the verification email link works.

## Switch-on steps (needs Yosief's OK; none done)
1. **MongoDB Atlas:** M0 free cluster → `MONGO_URI`.
2. **API host:** `cd api && fly launch --copy-config --name egeez-api`, then `fly secrets set MONGO_URI=… JWT_SECRET=$(openssl rand -hex 32) ADMIN_TOKEN=… EMAIL_USER=… EMAIL_PASS=<gmail app password> SITE_URL=https://easygeez.com CORS_ORIGIN=https://easygeez.com TRUST_PROXY=1` and `fly deploy`. Alternatively use AWS (App Runner or Lambda) next to the existing S3/CloudFront.
3. **Website:** rebuild with `VITE_API_URL=https://egeez-api.fly.dev` (`scripts/deploy-aws.sh` already requires it) and invalidate CloudFront.
4. **App:** add `VITE_API_URL` to `deploy-app.yml` for /app; store builds pick it up in the next release.
5. **Legal:** finish the consent notice and privacy policy update (COPPA verifiable parental consent), then announce.
6. **Rollback:** remove `VITE_API_URL` and redeploy. Teacher Mode's link and receipt flow keeps working without a server.

## Cost (estimate)
- **Fly.io** shared-cpu-1x 256 MB with auto-stop: about $0–3/month at this scale. Fly needs a card on file; small usage is often under the free allowance.
- **MongoDB Atlas M0:** $0 (512 MB, plenty for thousands of students).
- **Email:** Gmail app password, $0 (about 500/day limit).
- **Total:** about $0–5/month. Optional custom domain `api.easygeez.com`: $0 (DNS record).
