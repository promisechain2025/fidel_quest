# Architecture review — must-dos, current state, refactor verdict

Written after the "global state" gap was found (progress lived in eleven
separate storage keys with no app-level view). This asks the bigger
question: what MUST an app like this get right, how do we score today,
and what actually deserves refactoring.

The standing rule this document exists to enforce: **before building
anything, ask "is there a better and easier way?"** — and prefer the
boring answer.

---

## 1. The must-do list for this kind of app

"This kind of app" = a kids' learning game: offline-first PWA + store
builds, pre-reader audience, low-end Android devices, 8 languages, paid
with a free trial, no backend, no accounts.

In priority order:

1. **One child model.** Everything the app does FOR the child (what to
   teach next, what to review, what to quiz, what to celebrate) must be
   derived from one coherent picture of their progress — never from a
   feature's private stash. If two features disagree about what the child
   knows, the app is broken in the worst possible way: it teaches wrong.
2. **Never lose progress.** Durable storage, versioned keys, migrations
   on load, and a way OUT (export/transfer). A family that loses three
   months of a child's stars deletes the app.
3. **Content correctness.** A wrong character in the fidel table is worse
   than any crash. The character data must have one validated source of
   truth and exhaustive tests.
4. **Offline is the normal case, not the fallback.** Target users have
   intermittent connectivity. No feature may hard-depend on the network,
   an mp3 existing, or a server being up.
5. **Deterministic, testable game logic.** Game loops as pure seeded
   machines; UI as a thin shell. This is what makes 300+ tests possible
   without a browser.
6. **Low-end performance.** The cheapest Android phone in a church
   basement is the reference device. 3D must degrade to 2D; the bundle
   must lazy-load; animations must respect reduced motion.
7. **Kid safety and privacy.** No accounts, no PII, nothing leaves the
   device without an explicit adult share. Adult surfaces behind gates.
   This is also the cheapest possible COPPA/GDPR-K posture.
8. **Audio-first, pre-reader UX.** Big targets, one obvious next action,
   voice on everything, never punish, never block.
9. **Complete localization.** A single English string leaking into an
   Amharic UI breaks trust. Every key exists in every pack, audited by
   script, not by eyeball.
10. **Honest monetization that never blocks a child mid-task.** Trial →
    ask → narrow to a free taste. The ask targets the adult; the child
    keeps what they earned.
11. **Update hygiene.** A PWA that serves a stale service-worker build
    "still shows the old bug" and burns tester trust. Updates must be
    visible and promptly applied.
12. **Opt-in learning telemetry.** To improve teaching we need to know
    what letters kids miss — locally always (the ledger), remotely only
    when a URL is configured.

## 2. Scorecard — where the app stands today

Facts: ~22k lines of src. `FidelQuestApp.jsx` is 4.6k (deliberate
single-file mode). 73 direct localStorage touches, but almost all inside
`src/platform/*` modules — only two screens bypass the platform layer
(`ArcadeFallback`, `AmharicFidelGame`). 322 tests. Pure seeded machines
throughout. An invariant suite runs at module load.

| Must-do | State | Notes |
| --- | --- | --- |
| 1. One child model | **B-** | Persistence now unified (`platform/progress.js` registry) and selectors exist (`learnedFamilyIds`, `progressStats`, ledger stats, coach). But the model is not *reactive*: screens re-read storage on mount, and cross-feature updates lean on manual `forceRefresh` bumps (7 sites) and `dayKey` effects. Stale-until-navigation is possible. This was the root of the "state miss". |
| 2. Never lose progress | **A-** | Versioned keys, legacy migration on load, and now snapshot export/import ("Move to another phone"). Missing: an auto-backup nudge. |
| 3. Content correctness | **A** | `fidelGameData.js` validated by exhaustive tests; embedded literals are generated, never hand-edited; invariant suite asserts 231 unique in-block chars. |
| 4. Offline-first | **A** | PWA precache; audio falls back to synthesized chimes; zero network dependencies; classroom rails are links, not servers. |
| 5. Deterministic logic | **A** | Table-driven reducers, threaded mulberry32, no `Math.random` in logic, ill-timed events rejected. |
| 6. Low-end perf | **A-** | FPS probe routes to 2D fallbacks and the verdict persists; modes lazy-load. Watch: the single-file modes make accidental bundle growth easy to miss. |
| 7. Kid safety | **A** | No accounts/PII; hold+number parental gate; teacher area code-locked; shares are explicit adult actions. |
| 8. Pre-reader UX | **A-** | One pulsing next step, audio everywhere, never-block philosophy. Recent device passes keep finding small papercuts — normal, keep testing. |
| 9. Localization | **A** | 8 packs, script-audited to zero missing keys. Native review of machine-assisted packs still pending (user task). |
| 10. Monetization | **B+** | Trial + one-time feedback grace + free taste + gift-by-family all live. Honor-system unlock is a known, accepted limitation of no-backend. |
| 11. Update hygiene | **C** | `generateSW` auto-updates silently on second visit — testers repeatedly saw stale builds this week. No "new version, tap to refresh" prompt. Weakest point in the table. |
| 12. Telemetry | **B+** | Local ledger always; remote strictly opt-in via env. |

## 3. Refactor verdict

**No rewrite. Two surgical investments, one habit.**

The foundations (pure machines, platform modules, validated data, tests)
are exactly what this app needs and better than most codebases of this
size. The gaps are specific:

### 3a. Make the child model reactive (the real fix behind the state miss)

One tiny store, no new dependency:

    // platform/childModel.js (sketch)
    let version = 0
    const listeners = new Set()
    export const progressChanged = () => { version++; listeners.forEach((l) => l()) }
    export const useChildModel = () => useSyncExternalStore(
      (l) => (listeners.add(l), () => listeners.delete(l)),
      () => version,
    )

Writers (`completeNode`, ledger `recordAnswer`, hunt/warm-up marks,
license changes) call `progressChanged()`. Screens that today re-read on
mount or take a `forceRefresh` bump instead consume `useChildModel()` and
re-derive from the existing pure selectors. Storage stays the source of
truth; the store only carries the *invalidations*. Roughly a day of work,
removes the whole class of stale-read bugs, and every future feature
("serve the kid based on their progress") plugs into one hook.

Explicitly rejected as NOT better-and-easier: Redux/zustand (a dependency
and a second state world for what one hook does), moving progress into
React context (loses non-React access for pure logic/tests), TypeScript
migration (valuable someday, not this month, and CLAUDE.md already rules
it out without a plan).

### 3b. Service-worker update prompt

Switch vite-plugin-pwa to `registerType: 'prompt'` + a small "New version
— tap to update" toast. Small change; kills the recurring "my phone still
shows the old build" cost that has already burned several test cycles.

### 3c. The habit: the before-building checklist

Added to CLAUDE.md alongside this review:

1. Is there a better and easier way? (Prefer the boring answer.)
2. Which existing platform module owns this state? (Never a new ad-hoc
   localStorage key without registering it in `platform/progress.js` if
   it is child progress.)
3. Does it work offline, on a low-end device, in all 8 languages?
4. Is the logic pure and seeded so it can be tested headless?
5. Does anything here block a child? (It must not.)

### Watch-list (fine today, revisit if they grow)

- `FidelQuestApp.jsx` at 4.6k lines is a deliberate trade (single-file
  modes bundle as standalone artifacts). Hold the line: pure logic keeps
  moving to `platform/`, and any §-section touched by 3+ features gets
  extracted.
- Two screens still touch localStorage directly (`ArcadeFallback`,
  `AmharicFidelGame`); migrate them to platform modules opportunistically.
- Day-rollover logic (`dayKey` effects) is scattered; the child-model
  store is the natural place to centralize it when 3a lands.
