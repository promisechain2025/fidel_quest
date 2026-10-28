# eGeez rep-code server

One Lambda (Function URL) + DynamoDB table `egeez-repcodes` (on-demand, TTL `ttl`) + SES (`noreply@easygeez.com`).
Pages: `/admin` (promisechain.net@gmail.com only), `/rep` (each rep sees only their own codes), sign-in by emailed 6-digit code.
API: `POST /api/repcodes/redeem` (single-use, atomic, same-household restore, rate-limited), `GET /api/representatives` (reps marked "Show on website").
Store apps never call redeem (Apple 3.1.1); only the web build sets `VITE_REPCODE_API`.

- Tests: `cd repcodes && npm test`
- Local: `node dev-server.mjs` (memory store, OTP written to /tmp/egr-dev-otp.txt)
- Deploy: `deploy/deploy.sh` after the IAM role in `deploy/iam-role.json` exists. Then set repo variable `REPCODE_API` to the Function URL.
