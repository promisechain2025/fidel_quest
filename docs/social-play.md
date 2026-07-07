# Social play: sharing, challenges, and learning together (even on a call)

How Fidel Quest can grow from a solo game into something kids **share, compete
at over time, and eventually play live with family** — without ever becoming a
place a child can be contacted by a stranger.

This is a design doc, not shipped code. It spans this repo (frontend) and the
optional `server/` (and likely a small new service). It is deliberately phased:
each phase ships value on its own, and we only take on accounts, a backend, and
real-time infrastructure when the phase before it has proven the loop.

---

## Non-negotiable principles (this is a children's product)

Every decision below is subordinate to these. If a feature can't be built
inside these rails, it doesn't get built.

1. **Closed network, never open.** No stranger discovery, no public
   matchmaking, no public chat. A child can only ever interact with people an
   adult has explicitly connected them to (a cousin, a grandparent, a
   classmate a teacher added). "Friends" are established out-of-band by adults,
   not searched for in-app.
2. **Parent-gated by construction.** Anything that leaves the device — a
   leaderboard entry, an invite, a call — is behind the existing "For
   grown-ups" gate and requires a one-time parent action (email confirmation).
   The child-facing UI never asks for personal data.
3. **Data minimization.** Default identity is an **anonymous device key**, not
   a name or email. We store the least that makes the feature work. A parent
   email (Phase 2+) is the only PII, used only for consent + recovery, never
   shown to other users, never required to play solo.
4. **No real names or faces to anyone unapproved.** Display is a chosen
   nickname + Anbessa avatar. Video/audio (Phase 3) is only ever between two
   already-connected, parent-approved contacts — think "call grandma," not
   "meet a player."
5. **Offline-first stays true.** The whole solo game keeps working with no
   network and no account. Social is strictly additive; pulling the plug on
   the backend degrades gracefully to today's app.
6. **Compliance up front.** COPPA (US) and GDPR-K (EU) shape the schema, not a
   later retrofit: verifiable parental consent before any data collection,
   deletion on request, no behavioural ads, no third-party trackers.

---

## Where we are today (Phase 0)

Already shipping the seed of virality, fully client-side:

- **Share Anbessa** (`components/ShareCard.jsx`): renders a card
  (`X / 231 letters learned` + the dressed-up lion) to the Web Share sheet
  (WhatsApp/social), falling back to a PNG. Nothing leaves the device unless
  the parent taps share.
- **Progress + rewards** (`journey.js`, wardrobe) already give us the *content*
  of a shareable identity: letters learned, chapters mastered, earned outfits.

The ladder below turns that one-way share into a two-way loop, then a live one.

---

## Phase 1 — Challenge links (async, still zero-backend)

**Goal:** let a child challenge a friend/relative and compare scores, with no
accounts and no server. Highest safety, lowest cost, ships fast.

**How it works**

- Finishing a round (a boss quiz, a runner, or a new "Daily 10" mode) produces
  a **challenge link**:
  `https://app/challenge#d=<base64url payload>`.
- Payload is small and self-contained: `{ v, mode, seed, letters, score,
  by: nickname }`. No PII, no server — the whole challenge rides in the URL
  fragment (never even sent to the host).
- The recipient opens it, the app reads the fragment, and plays the **exact
  same seeded round** (our machines are already pure functions of
  `(level, seed)` — see the RNG convention in CLAUDE.md, so this is a natural
  fit). At the end it shows **"You: 8 · Selam: 7 — you win!"** and offers a
  rematch link back.
- Parent-gated share, kid-friendly result screen, Anbessa reacts.

**Why it's safe:** it's just a deep link a parent forwards over their own
messaging app. No child-to-child channel exists inside our product; we never
learn who anyone is.

**Work:** frontend only. New `challenge` route/screen, a
`utils/challenge.js` (encode/decode + validate/clamp the payload — treat it as
untrusted input), and a "Challenge a friend" button on result screens. Reuses
existing seeded machines. **This is the recommended first thing to build.**

---

## Phase 2 — Family & Friends (backend-lite: async leaderboards, streaks)

**Goal:** persistent friendly competition over weeks — a private leaderboard
among people you already know, weekly challenges, streaks, and gentle nudges.

**Identity without accounts for kids**

- On first opt-in, the device generates a **keypair**; the public key is the
  user id. Solo play never needs this.
- To connect people, an adult creates or joins a **Family/Friends group** via a
  **short invite code** (or QR) shared out-of-band. Joining a group is the only
  way anyone appears on anyone else's leaderboard. Groups are small and closed.
- **Parent consent gate:** creating/joining a group requires a parent email
  confirmation (double opt-in). Email is stored hashed for recovery + consent
  proof, never exposed to the group.

**What it enables**

- A **private group leaderboard** (nicknames + Anbessa avatars only): letters
  learned this week, streak, best runner score.
- A **weekly group challenge**: everyone plays the same seed; results roll up
  Sunday. (Server only stores `{groupId, userPubKey, nickname, metric, week,
  seed}` — aggregate scores, no per-question data, no PII.)
- **Streak nudges** via the existing optional notification rails (opt-in,
  parent-controlled), e.g. "3 friends practised today."

**Architecture**

- Extend `server/` (already stateless, aggregate-only) or stand up a small
  service. Endpoints: create/join group, submit signed score, read group
  board. Writes are **signed by the device key** so scores can't be forged for
  someone else. Rate-limit and clamp everything.
- Storage: a real datastore this time (groups, memberships, weekly scores).
  Still no chat, still no free-text beyond a moderated nickname.
- **Nickname moderation:** allow-list of safe words / emoji, or a profanity +
  PII filter (block anything that looks like a phone number, address, or full
  name). Nicknames are the only user-authored text in the system — keep it that
  way.

**Cost/effort:** medium. This is where "challenge each other online long term"
actually lives. Design the schema now (in this doc / a follow-up), build after
Phase 1 validates that kids share at all.

---

## Phase 3 — Live play and calls (real-time, approved contacts only)

**Goal:** the "even with calls" ask — a child and an **already-connected,
parent-approved** contact (grandparent, cousin, classmate) **learn together
live**: a shared board, take-turns quiz, and optional audio/video so it feels
like sitting side by side. Framed as **co-play with someone you love**, not
competitive matchmaking.

**Strict gating (all must hold):**

- Both users are in the **same Family/Friends group** from Phase 2 (already
  parent-approved on both sides).
- A live session is **invited and accepted** in the moment (no always-on
  presence to strangers; you can't be "called" by anyone outside the group).
- **Parent switch per child**: live calls off by default; a parent enables them
  per contact. A visible session timer and an easy end/mute/report.

**How it works**

- **Real-time transport: WebRTC**, peer-to-peer, so audio/video and game state
  go directly between the two devices (privacy + low cost). We host only:
  - a **signaling** endpoint (exchange connection offers — tiny, on the Phase 2
    service), and
  - a **TURN relay** for the ~15% of networks that block P2P (the one real
    running cost; use a managed TURN or coturn).
- **Shared game state** rides a WebRTC data channel: a take-turns "Which letter
  says…?" or a co-op runner where two kids feed Anbessa together. Reuse the
  pure machines; one peer is authoritative for the seed.
- **Video/audio is optional and secondary** — many families will want
  audio-only, or none (just the shared board + Anbessa reactions). Default to
  the lightest that still feels together.

**Safety rails specific to live/video**

- Only within an approved 1:1 (or small family) link — **never** open rooms.
- Parent consent recorded specifically for live calls (separate from Phase 2
  consent). Clear in-call controls: mute, camera off, end, and a
  parent-reachable report.
- No recording. No storing media. Ephemeral by construction (WebRTC media never
  touches our servers; only relayed bytes when TURN is needed, not persisted).
- Consider limiting to **grown-up-initiated** sessions for the youngest ages
  (a parent/grandparent starts it), which sidesteps most risk.

**Cost/effort:** high, and the highest-scrutiny surface. Only after Phase 2 has
a real, safe group graph to build on. TURN + signaling are the new infra; the
game layer is mostly reuse.

---

## Long-term: a challenge ladder that lasts

Once the group graph (Phase 2) exists, "challenge each other long term" grows
naturally and safely:

- **Seasons & weekly cups** within a group (fresh seed each week, gentle,
  reset-able — no permanent losers; it's for kids).
- **Co-op goals**: "Our family learned 500 letters this month" → unlock a group
  wearable / a special share card. Cooperation reads better than pure ranking
  for this age.
- **Teacher / classroom mode**: a teacher is the adult who forms the group; a
  class board + assignable weekly challenge. Same closed-network rails, just the
  adult is a teacher instead of a parent. Strong for schools in the diaspora.
- **Milestone duels**: async Phase-1 challenges auto-suggested against a group
  friend at a similar level.

---

## What we deliberately will NOT build

- Public/global leaderboards with identifiable kids.
- Stranger matchmaking or "find a player."
- Open chat or free-text messaging between children (nicknames only, moderated).
- Anything that makes a child reachable by someone an adult didn't connect.
- Ad networks or third-party analytics/trackers in a child session.

---

## Recommended sequence

1. **Now:** Phase 1 challenge links — client-only, safe, viral, reuses the
   seeded machines. Small, high-leverage. (Say the word and this can be the
   next thing implemented.)
2. **Next:** finalize the Phase 2 schema (groups, signed scores, consent), then
   extend `server/` and build private group leaderboards + weekly challenge.
3. **Later, with care:** Phase 3 live co-play (data channel first, audio/video
   opt-in), gated on the Phase 2 group graph and a dedicated safety review.

Each phase is worth shipping alone; none requires the next to exist.
