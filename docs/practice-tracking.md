# Verified practice tracking (teacher goal, parent report, class view)

Requested by Yosief (Oct 2026): "if I ask my students to study 1 hour I need to
see how many times they practice and time spent ... and make sure they don't
trick us by opening the app without interacting." Includes class-view sync.

## 1. What counts as practice

`src/platform/practice.js` is a pure, clock-free reducer (`step(state, event)`),
fully unit-tested (`practice.test.js`).

* **Active time.** Every real interaction opens a 30 s activity window:
  a tap/keypress, an answer in any game (`telemetry.recordAnswer` hook), a
  trace (answers with mode `trace`), or a voice clip played to its end
  (`audioEngine` `onended` hook). Time is credited only while a window is open
  **and** the app is visible. Idle > 30 s stops the clock. A hidden tab, a
  backgrounded app and a locked screen all fire `visibilitychange`/`pagehide`
  and close the window at once. Coming back does not count as an interaction.
  Time that spans midnight is split between the two days.
* **Sessions.** A new session starts after a 5+ minute gap or on a new day.
* **Items / accuracy.** Each answer or trace is one practiced item. Accuracy
  is correct/answered.
* **Lessons / games finished.** Journey node completed (ARCADE nodes count as a
  game, the rest as lessons), Daily Hunt finished (game), homework receipt sent
  (lesson).
* **Streak.** The number of consecutive days with at least one active minute.

### 1b. Prayer pages: only in PRACTICE MODE (Yosief, Oct 2026)

Kids memorize prayers by reading along and listening, so prayer pages have their
own rules. **They apply only inside practice mode**, which is a homework or
practice session. Casually opening the prayer book earns **no tracked time**
(normal tap time still follows section 1, like anywhere in the app).

**Inside practice mode:**
* Time counts while a prayer page is open and visible, or a prayer recording is
  playing, with no tap needed.
* It stops when the app is backgrounded, the tab is hidden, the screen is
  locked, the page closes, or practice mode ends.
* **10-minute safety cap** (`PRAYER_CAP_MS`): with no page turn, tap, or
  recording starting or stopping, the clock pauses. While a counted recording
  plays, the cap doesn't apply.
* **One prayer per play:** the recording plays only the current prayer (ጸሎት),
  meaning the units from one `s: 1` section start up to the next, and then it
  **stops**. There is no auto-advance, no continuous playback and no loop.
  Playing it again takes a tap.
* **Replay limit:** plays of the same prayer after the 3rd (`LOOP_FREE`) earn
  nothing. The tap that starts one gets only the normal 30-second window. A page
  turn or a different prayer resets the count. The 6th play (`LOOP_RUN`) raises
  one `audioLoop` flag.
* Prayer minutes are stored as `prayerMs`, are included in the total, and are
  shown separately in the parent report (book icon), the teacher dashboard
  (book icon), the sync and signed reports.

**Contract: `src/platform/prayerPractice.js`**
* The file is byte-identical on PR #57 and PR #58 and has no imports. It sends
  `window` CustomEvent `fq:practice`, and `practiceTracker` listens.
* With PR #57 alone, nobody listens and the calls do nothing.

| Call | Meaning |
|---|---|
| `startPractice(source)` / `endPractice()` | Practice session on or off. Source is `'button'`, `'class'`, `'assignment'` or `'goal'` |
| `isPracticeMode()`, `subscribePracticeMode(fn)` | Read and observe the mode |
| `prayerOpen()` / `prayerClose()` | The prayer page mounts or unmounts |
| `prayerPage()` | A page turn |
| `prayerAudio(playing, prayerKey)` | A recording starts or stops. `prayerKey` is the index of the prayer's first unit, so replays of the same prayer are recognized |
| `playCurrentPrayerOnly(units, i)` | The next recorded unit inside the same prayer, or `-1` (stop) |

**Wiring in PR #57 (`PrayerBook.jsx`), pushed on `feat/prayer-reading-marks`:**
* A practice-mode icon button in the header (a target icon, aria-label
  ልምምድ, no English). It is highlighted, with a pulsing dot, while on. Leaving
  the book ends practice mode.
* `prayerOpen()` on mount and `prayerClose()` on unmount, `prayerPage()` on
  every page change.
* `prayerAudio(true, key)` when a unit starts playing, `prayerAudio(false)` on
  pause, stop or the end of the prayer.
* In practice mode, `onended` advances with `playCurrentPrayerOnly`
  (stopping at the prayer's end) instead of `nextRecorded`. Outside practice
  mode, playback is unchanged.
* Homework entry: an assignment or class screen can call
  `startPractice('assignment' | 'class')` before opening the book. The book
  shows the same indicator.

### 1c. Kid study timer

There's a small clock button in the home HUD (`StudyTimer.jsx`). It is
**hidden by default**: one tap shows today's study time as h:mm, with the goal
ring when a goal is set and a star when the goal is met. Another tap hides it.
The choice is remembered per child in `fq.studyTimer.v1` (in `SWAP_KEYS`). It
uses only icons and digits, with no words.

### Anti-cheat flags (they inform the teacher and never block the child)

| Flag | Rule | Effect on minutes |
|---|---|---|
| `rapidTap` | 8+ taps within 24 px of each other, each less than 250 ms apart (an autoclicker, or a finger drumming one spot) | Taps in the run stop extending the window, so an autoclicker earns about 30 s, not an hour |
| `randomTap` | Over the last 12 answers: accuracy below 30% and an average of under 1.5 s per answer | Counted, but flagged |
| `audioLoop` | 6+ completed listens with no other input in between | Listens after the 3rd stop extending the window |

Each flag is counted once per episode, not once per tap. All thresholds are
exported constants.

## 2. Storage (per child)

* `fq.practice.v1` = `{v:1, days:{YYYY-MM-DD: row}, goal}`, keeping 90 days. It is
  registered in `PROGRESS_KEYS`, so it swaps with the child profile and goes
  into backups.
* `fq.classSync.v1` = the class-view join (code, name, sync token, pending
  days). It is in `SWAP_KEYS` only: per child, but **not** in backups, so a
  forwarded backup can't carry the token.
* `fq.teacherAuth.v1` is the teacher's sign-in on this device. It's a device
  key, not a child key.

## 3. Goal from the teacher, plus the child's ring

* Teacher Mode, Invite students: a **Daily practice goal** picker (15–90 min).
  The goal rides in the class link as `g`. Old links without `g` decode the
  same as before.
* A class-view link also carries `y:1`. Opening it joins the class **and**
  turns on sync with the child's nickname.
* The child sees the goal ring inside the study timer (section 1c) once they
  tap to show it.

## 4. Parent report and tamper-evident share

Go to Parents (behind the gate), then **Practice report**. It shows today's ring
and the streak, a 7-day bar chart with the goal line, and a 7-day table (minutes
vs goal, sessions, items, accuracy, finished, flags). It also has the goal picker
and **Make report link**.

The link is `#report=<payload>.<sig>`, where `sig` = HMAC-SHA256 truncated to
12 bytes. The page also shows a QR code and a check code (the first 8 characters
of the signature). The teacher's device opens the link in `ReportViewer`, which
shows **Verified** or **Not verified, edited after it was made**.

**Honest limit:** the HMAC key ships inside the app. This stops casual editing
of a forwarded link, not a determined adult who extracts the key. The strong
path is the class view, where rows are written with a per-student server token.

## 5. Class-view sync (reuses the existing hub API, `api/`)

There was already a backend (Express in `api/`, JWT teacher accounts with
email verification, Mongo or in-memory). The class view is added there rather
than standing up a new AWS stack.

* `api/routes/practice.js` and `api/practiceStore.js` (Mongo collections
  `practiceclasses`, `practicestudents`, `practicedays`, with an in-memory
  twin for tests).
* **Teacher (Bearer JWT, role teacher, verified email):**
  * `POST/GET /api/practice/classes`
  * `PATCH/DELETE /api/practice/classes/:code`
  * `GET /api/practice/classes/:code/report?from&to` (up to 62 days, default 7)
  * `DELETE /api/practice/classes/:code/students/:id`
* **Child (no account):**
  * `POST /api/practice/join {code, name}` returns `{token, className, goalMin}`.
  * `POST /api/practice/sync` with `Authorization: Student <token>` and `{days}` returns `{goalMin}`.
* **Join codes:** 6 characters, with no 0/O/1/I. Classes are capped at 60
  students and teachers at 20 classes. Join, sync and teacher calls are
  rate-limited.
* **Student tokens:** 32 random bytes, returned once and stored only as SHA-256.
  A token can write only its own rows. Rows are clamped (at most 1440 min a
  day, correct no higher than answered, no rows older than 62 days or later
  than tomorrow). Re-syncing a day overwrites it.
* **Privacy:** the only data stored is the child's first name or nickname, the
  class code, and per-day numbers. There are no device IDs, letters or audio.
  Removing a student or class deletes their rows, and the device leaves the
  class on its next sync (401/410).
* **App side** (`practiceSync.js`): sync is offline-first. A queue flushes on
  `online`, on `pageshow`, every 60 s and right after joining. A failure keeps
  the queue. When the teacher changes the goal, it lands on the child's next
  sync.
* **Teacher dashboard** (`ClassPractice.jsx`, in Teacher Mode):
  * sign in with the existing teacher account
  * create a class and show its join code and QR (the `#class=` link with
    `y:1` and `g`)
  * goal picker
  * **Week** view: one cell per day, green when the goal is met, the total
    minutes, days the goal was met out of 7, accuracy and flags
  * **Day** view: minutes vs goal, sessions, practice count, accuracy and
    flags

**Network stance:** the app is otherwise offline. These calls happen only when
a build sets `VITE_API_URL` **and** a grown-up joins a class (or a teacher signs
in). The current `deploy-app.yml` build does **not** set `VITE_API_URL`, so
merging this PR activates no network calls. The class view stays dormant
(`ptNoServer` message) until the deploy steps below are done.

## 6. Deploy steps (none of this has been done; it needs Yosief's approval)

1. **Mongo:** create a MongoDB Atlas cluster (free tier is enough) and copy the
   `MONGO_URI`. The collections are created automatically.
2. **Deploy the API** (the existing `egeez-hub-api` in `render.yaml`, or Fly via
   `api/fly.toml`):
   * Render: New Blueprint from `render.yaml`. In service `egeez-hub-api`, set
     `MONGO_URI`, the SMTP vars (`EMAIL_USER`/`EMAIL_PASS`/`NOTIFY_EMAIL`,
     **required**, because teachers must confirm their email), and
     `SITE_URL=https://easygeez.com`.
   * Set `CORS_ORIGIN=https://easygeez.com,capacitor://localhost,https://localhost`.
     The last two are for the iOS/Android app shells.
   * Or with Fly: `cd api && fly launch --copy-config --name egeez-api && fly secrets set MONGO_URI=... JWT_SECRET=$(openssl rand -hex 32) CORS_ORIGIN=... EMAIL_USER=... EMAIL_PASS=... SITE_URL=https://easygeez.com && fly deploy`
3. **Smoke test:**
   * `curl https://<api>/healthz` should return `{"ok":true,"backend":"mongo"}`.
   * Register a teacher on the website and confirm the email.
   * Create a class in Teacher Mode, join it from a second device, play for 2
     minutes, and check the dashboard.
4. **Turn it on in the app:** add `VITE_API_URL=https://<api>` to the
   `npm run build` step in `.github/workflows/deploy-app.yml` (web) and to the
   native build env (Android/iOS). Merging to main auto-deploys the web app,
   so do this only after step 3 passes.
5. **Rollback:** remove `VITE_API_URL` and redeploy the app. Local tracking, the
   ring and share links keep working without a server.

**Optional AWS alternative:** if the hub API should not run on Render or Fly,
the same routes can be wrapped for API Gateway + Lambda with
`serverless-http` (`export const handler = serverless(createApp())`) behind an
HTTP API, keeping Mongo Atlas (the store is Mongo-shaped). This is not built
because a backend already exists. Ask if you want it.

## 7. Tests

* `src/platform/practice.test.js` covers active time, idle, hidden, midnight,
  sessions, the three flags (including false-positive guards), streak, goal,
  storage and per-child registration.
* `src/platform/practiceSync.test.js` covers join, the offline queue, flush,
  server errors, revocation, the numbers-only payload, and HMAC verify vs
  tamper.
* `src/components/PracticeTracking.test.jsx` covers the ring (no Latin text),
  the tracker runtime, the parent report and share, and the dashboard rows,
  table and report viewer.
* `api/__tests__/practice.test.js` covers teacher-only and verified-only access,
  join, sync, overwrite, clamping, teacher scoping, revocation, the report
  totals and goal propagation.
