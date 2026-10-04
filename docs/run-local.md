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

## Terminal 2 - the website, wired to the local API

```bash
cd website
npm install
VITE_API_URL=http://localhost:8788 npm run dev    # vite prints the port (5173+)
```

What to check: every page in light + dark + phone width; the Tigrinya
waitlist and teacher forms (they store rows in the API - see the curl
above); `/pricing` - one $12.99 card with App Store / Google Play buttons
(the site sells nothing itself). Without `VITE_API_URL` the forms fall back
to mailto.

## Terminal 3 - the app

```bash
npm install
npm run dev
```

Every learning path is unlocked in every build (eGeez 1.3.1+ is paid upfront
in the stores: no trial, no codes). The only in-app purchases are extra kids
profiles (1 included; `profile_slot_2..6` through the store, native builds
only). For local multi-profile testing in a browser, run
`localStorage.setItem('fq.profileslots.v1', JSON.stringify({ owned: ['profile_slot_2','profile_slot_3','profile_slot_4','profile_slot_5','profile_slot_6'] }))`
in the console. Use `?unlock` in the URL to jump
past the learning progression while testing.
