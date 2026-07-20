# eGeez — Six-Pillar UX & Pedagogy Refactor

Architecture plan, unified state model, and deterministic code for the six
structural pillars. Written against the *shipped* code (state shapes below
are real, not aspirational). This is a plan for review and per-pillar
go/no-go — nothing here is merged yet.

## The one architectural move that unlocks five of the six pillars

Today the app has **nine sibling screens** switched by a flat
`screen = { name: 'home' | 'learn' | 'lesson' | 'runner' | 'skylands' | ... }`
and **three unrelated progress blobs** in local storage:

```
fq.learn.v1   = { mastered: [familyId], mixes: [mixId] }   // Letter Steps
fq2.progress  = { ...level stars... }                       // Quiz Levels 1-8
fq3.skylands  = { sessionsCompleted, learnedSessions, ... } // Skylands
```

Letter Steps already *renders a grouped grid of stones*, and quiz levels
already gate on `groupMastered(learn, g)`. The refactor's spine is to make
that implicit ordering **explicit and singular**: one `JOURNEY` array of
typed nodes, one `fq.journey.v1` progress record, and one derived "next
step." Every pillar except P2 (a constant) and P6 (a renderer concern)
hangs off this model.

### The unified node model

```js
// ── §J1  THE JOURNEY (pure, data-derived, deterministic) ──────────────
export const NodeKind = Object.freeze({
  LEARN:  'learn',   // one family, the six-phase Letter Steps lesson
  MIX:    'mix',     // shuffle challenge over families mastered in-chapter
  QUIZ:   'quiz',    // BOSS NODE  -> the audio matching Lesson (level g)
  ARCADE: 'arcade',  // GATEWAY    -> a 3D Runner leg / Skylands island
})

// Four chapters mirror the existing 8/8/8/9 family groups. Each chapter is
// [family, family, mix, family, mix, ... , QUIZ boss, ARCADE gateway].
// A node id is stable and content-derived, so rewards and tests can key on
// it. buildJourney() is a pure function of the fidel data - no wall clock,
// no RNG - exactly like buildStones() today.
export function buildJourney() {
  const nodes = []
  const push = (n) => nodes.push({ ...n, index: nodes.length })
  for (let c = 0; c < 4; c++) {
    const chapter = c + 1
    const fams = FIDEL_FAMILIES.slice(c * 8, c === 3 ? 33 : c * 8 + 8).map((f) => f.id)
    fams.forEach((fid, i) => {
      push({ id: `learn:${fid}`, kind: NodeKind.LEARN, chapter, familyId: fid })
      if (i > 0) push({ id: `mix:${fid}`, kind: NodeKind.MIX, chapter, families: fams.slice(0, i + 1) })
    })
    push({ id: `quiz:${chapter}`,   kind: NodeKind.QUIZ,   chapter, levelId: `level-${chapter}` })
    push({ id: `arcade:${chapter}`, kind: NodeKind.ARCADE, chapter, gateway: ARCADE_GATEWAYS[c] })
  }
  // Second lap: the vowel quiz bosses (levels 5-8) reuse the same families.
  for (let c = 0; c < 4; c++) {
    push({ id: `vowel:${c + 1}`, kind: NodeKind.QUIZ, chapter: 5, levelId: `level-${c + 5}` })
  }
  return nodes.map((n, i) => ({ ...n, reward: REWARD_TABLE[i % REWARD_TABLE.length] })) // P3
}
export const JOURNEY = buildJourney()

const ARCADE_GATEWAYS = [
  { mode: 'runner',   theme: 'lalibela' },
  { mode: 'skylands', island: 1 },
  { mode: 'runner',   theme: 'simien' },
  { mode: 'skylands', island: 4 },
]
```

### The unified progress record + the single "next step"

```js
// ── §J2  PROGRESS  (fq.journey.v1) ────────────────────────────────────
const JOURNEY_KEY = 'fq.journey.v1'

export function loadJourney() {
  try {
    const raw = JSON.parse(localStorage.getItem(JOURNEY_KEY))
    if (raw?.version === 1) return raw
  } catch { /* fall through to migration */ }
  return migrateLegacyProgress()   // one-time, see "Migration" below
}
function saveJourney(p) {
  try { localStorage.setItem(JOURNEY_KEY, JSON.stringify(p)) } catch { /* session-only */ }
}

// progress shape:
//   { version: 1, done: { [nodeId]: { stars } }, collection: {...} }   // P3 rides along

/** Strict prefix unlock, identical in spirit to today's stoneUnlocked. */
export const nodeUnlocked = (p, index) =>
  JOURNEY.slice(0, index).every((n) => p.done[n.id])

/** THE single obvious next step. This is what the home screen renders big. */
export function nextNode(p) {
  return JOURNEY.find((n) => !p.done[n.id]) ?? null
}
export const journeyComplete = (p) => JOURNEY.every((n) => p.done[n.id])
```

`groupMastered(learn, g)` and the current stone/level gates become thin
adapters over `p.done`, so no downstream caller breaks during the cutover.

---

## PILLAR 1 — Linearize the home screen

**Design.** Replace the nine-card `Home` with a **single vertical winding
path** of `JOURNEY` nodes. Exactly one node is "current" (the first
unlocked-incomplete node from `nextNode`); it pulses and auto-scrolls into
view. Everything before it is gold; everything after is locked. Boss and
gateway nodes are visually larger and shaped differently (a hexagon for
QUIZ, a rounded-diamond portal for ARCADE) so a child reads "something
special" without reading a word.

Explorer, Classic, and Grown-Ups leave the main surface entirely. They move
behind a **Backpack** button (top-right) whose contents are the two
reference toys; Grown-Ups stays behind its existing press-and-hold + number
gate inside the backpack.

```jsx
// The home screen is now ~one component. Node -> screen routing is the
// SAME setScreen you already have; only the chooser changes.
function JourneyPath({ progress, onOpen, onBackpack }) {
  const current = nextNode(progress)
  return (
    <div className="journey" role="list">
      <BackpackButton onClick={onBackpack} />          {/* Explorer/Classic/Parents */}
      {JOURNEY.map((node, i) => {
        const done     = !!progress.done[node.id]
        const isNext   = node.id === current?.id
        const unlocked = isNext || done
        return (
          <PathNode key={node.id} node={node} done={done} unlocked={unlocked}
            highlight={isNext}                          // the ONE obvious step
            onClick={unlocked ? () => onOpen(node) : undefined}
            aria-current={isNext ? 'step' : undefined} />
        )
      })}
    </div>
  )
}

// Node -> existing screen. No new game code; we already have every target.
function openNode(node, setScreen) {
  switch (node.kind) {
    case NodeKind.LEARN:  return setScreen({ name: 'learn',  nodeId: node.id, familyId: node.familyId })
    case NodeKind.MIX:    return setScreen({ name: 'learn',  nodeId: node.id, mix: node.families })
    case NodeKind.QUIZ:   return setScreen({ name: 'lesson', nodeId: node.id, levelId: node.levelId })
    case NodeKind.ARCADE: return setScreen({ name: node.gateway.mode, nodeId: node.id, gateway: node.gateway })
  }
}
```

On completion, each screen calls one shared sink instead of its own bespoke
finisher:

```js
function completeNode(nodeId, stars = 3) {
  setProgress((p) => {
    const next = { ...p, done: { ...p.done, [nodeId]: { stars } } }
    grantReward(next, nodeId)      // P3
    saveJourney(next)
    return next
  })
  setScreen({ name: 'home' })      // returns to the path; nextNode now points one further
}
```

**Net effect:** the child always lands on a path with one pulsing node.
3D games are no longer a always-available dopamine shortcut — they are
*earned* gateway nodes at the end of each chapter.

---

## PILLAR 2 — Cut the repetition grind

This one is a **constant change plus test updates**, not architecture. Today:

```js
export const ECHO_ROUNDS = 5
export const SHUFFLE_ROUNDS = 5     // 33 families x (5+5) = 330 mini-games to clear base
```

Change to:

```js
export const ECHO_ROUNDS = 3
export const SHUFFLE_ROUNDS = 3     // 33 x (3+3) = 198 mini-games  (-40%)
export const MIX_ROUNDS = 4         // was 6; mixes are pure reinforcement, trim too
```

Reinforcement is not lost — it moves downstream to systems built for it:
adaptive **Star Practice** (surfaces exactly the letters a child misses) and
the **cumulative Skylands boss** (Jibby re-tests old letters every island).
Front-loading is what fatigues a pre-reader; spaced re-exposure is what
encodes. The machine, phase order, and twin-safety are untouched.

**Test impact:** `LearnLetters.test.jsx` asserts the ECHO/SHUFFLE round
counts in its machine-walk; those literals update to 3. The determinism and
twin-safety invariants are round-count-agnostic and stay green.

---

## PILLAR 3 — Narrative reward loop (sticker book / Anbessa wardrobe)

**Design.** Every node grants a **specific, authored, deterministic**
collectible (no RNG at play time — the reward is a pure property of the
node, assigned at `buildJourney` time, see `REWARD_TABLE` above). Rewards
are wearables for Anbessa (hat, scarf, cape) and props for a **customizable
den** the child can decorate. Collectibles are the visible win; stars still
exist but recede to a small corner detail for the Grown-Ups view.

```js
// ── §P3  COLLECTION  (persisted inside fq.journey.v1) ─────────────────
export const REWARD_TABLE = [
  // ordered so early nodes give instantly-wearable items (fast dopamine),
  // later nodes give rarer den props. Curated, not random.
  { id: 'hat-straw',   slot: 'hat',   name: 'Straw Hat' },
  { id: 'scarf-red',   slot: 'scarf', name: 'Red Scarf' },
  { id: 'den-rug',     slot: 'den',   name: 'Woven Rug' },
  { id: 'hat-crown',   slot: 'hat',   name: 'Gold Crown' },
  { id: 'den-lamp',    slot: 'den',   name: 'Clay Lamp' },
  { id: 'cape-star',   slot: 'cape',  name: 'Star Cape' },
  { id: 'den-plant',   slot: 'den',   name: 'Coffee Plant' },
  // ...enough entries that JOURNEY nodes map to a satisfying spread
]

function grantReward(progress, nodeId) {
  const node = JOURNEY.find((n) => n.id === nodeId)
  if (!node?.reward) return
  const c = progress.collection ?? { owned: [], worn: {}, den: [] }
  if (!c.owned.includes(node.reward.id)) c.owned = [...c.owned, node.reward.id]
  // auto-equip the first item of each wearable slot so the reward is
  // instantly visible on Anbessa; den props drop into the den.
  if (node.reward.slot === 'den') { if (!c.den.includes(node.reward.id)) c.den = [...c.den, node.reward.id] }
  else if (c.worn[node.reward.slot] == null) c.worn[node.reward.slot] = node.reward.id
  progress.collection = c
}
```

**Render.** Anbessa is already a code-drawn sprite (`drawAnbessa`). Wearables
are additional draw layers keyed by `slot`, composited over the base in the
same canvas draw-function — no image assets, consistent with the "art is
drawn in code" rule. The **reward moment** replaces the abstract star burst:
on node completion the item flies onto Anbessa (reuse the existing
cookie-fly animation) and a "New!" chip appears on the Backpack.

**Schema migration is additive** — `collection` simply defaults to empty for
existing players and fills as they replay nodes.

---

## PILLAR 4 — Directional, dynamically-toleranced tracing

**Honest constraint first.** There is **no public canonical stroke-order
dataset for Ge'ez** (unlike Han/Kana). We cannot assert "correct" stroke
order without a source, and inventing one and grading kids against it would
be worse than today's scrubbing. So the plan is a two-layer engine:

1. **A deterministic, zero-data heuristic** that works for all 33 letters
   out of the box: derive the *expected origin* and *dominant direction*
   from the glyph's own pixel mask (top-most then left-most inked pixel =
   conventional pen start for a top-to-bottom, left-to-right script; primary
   axis from the mask's vertical extent). This needs no authoring and stays
   fully offline/self-contained.
2. **An optional authored override** — a 33-entry `STROKE_HINTS` content map
   (like the char table, test-verified) that a literate Amharic writer can
   correct letter-by-letter later. The engine prefers an override when
   present, else falls back to the heuristic.

**Dynamic tolerance by chapter** (P4's "wide box early, tight box late"):

```js
// ── §P4  TRACE v2  (replaces computeTraceResult; old one kept for Classic) ──
const TRACE_TOLERANCE = {           // by chapter 1..4
  1: { cover: 18, stray: 40, origin: 90, needDir: false },  // very forgiving
  2: { cover: 16, stray: 34, origin: 70, needDir: false },
  3: { cover: 14, stray: 28, origin: 55, needDir: true  },  // direction starts to matter
  4: { cover: 12, stray: 22, origin: 42, needDir: true  },  // tight box, directional
}

/** Expected start point + primary direction, from override or mask. */
export function strokeSpec(familyId, maskPoints) {
  const hint = STROKE_HINTS[familyId]                 // optional authored data
  if (hint) return hint                               // { origin:[x,y], dir:'TB'|'LR' }
  // Heuristic: origin = topmost-then-leftmost inked point; dir = TB if the
  // glyph is taller than wide across its inked extent, else LR.
  let top = maskPoints[0]
  for (const p of maskPoints) if (p[1] < top[1] || (p[1] === top[1] && p[0] < top[0])) top = p
  const xs = maskPoints.map((p) => p[0]), ys = maskPoints.map((p) => p[1])
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys)
  return { origin: top, dir: h >= w ? 'TB' : 'LR' }
}

/** Directional, tolerance-scaled scoring. Pure; deterministic. */
export function computeTraceResultV2(maskPoints, drawnPoints, chapter) {
  const tol = TRACE_TOLERANCE[chapter] ?? TRACE_TOLERANCE[1]
  const base = computeTraceResult(maskPoints, drawnPoints, { coverRadius: tol.cover, strayRadius: tol.stray })
  if (drawnPoints.length < 2) return { ...base, originOk: false, dirOk: false, cue: 'origin' }

  const spec = strokeSpec(/* familyId threaded in */ null, maskPoints)
  const start = drawnPoints[0]
  const originErr = Math.hypot(start[0] - spec.origin[0], start[1] - spec.origin[1])
  const originOk = originErr <= tol.origin

  const end = drawnPoints[drawnPoints.length - 1]
  const netY = end[1] - start[1], netX = end[0] - start[0]
  const dirOk = spec.dir === 'TB' ? netY >= 0 : netX >= 0    // TB=downward, LR=rightward

  // Soft-cue policy: never a failure. Below chapter 3, direction is advisory
  // only (a hint), it does not gate the star.
  let cue = null
  if (!originOk) cue = 'origin'                       // "start at the top!" + pulse origin dot
  else if (tol.needDir && !dirOk) cue = 'direction'  // "go this way" + animate an arrow
  const pass = base.coverage >= 0.5 && originOk && (!tol.needDir || dirOk || base.stars >= 2)
  return { ...base, originOk, dirOk, cue, pass }
}
```

**Interaction.** When `cue === 'origin'`, the pad pulses a glowing dot at
`spec.origin` and Kokeb says a short "start here" chirp, then lets the child
retry — the finger is *guided back*, never blocked. `cue === 'direction'`
animates a ghost arrow along the expected axis. The existing pad already
captures ordered `drawnPoints`, so origin and net-direction come for free;
this is a scoring change plus two small overlays, not a rewrite.

---

## PILLAR 5 — Twin-letter visual differentiation in First Words

**The rule stays:** audio-only matching quizzes (Lessons, Skylands, Runner)
keep near-twins apart, so a child is never marked wrong for an answer that
sounds right. The controlled exposure happens in **First Words**, where the
*picture and word give the correct glyph its context* — so the choice is
visual, not phonetic.

Today `buildWordQueue` asks "hear the word -> pick the picture" (options are
word pictures). We add a second, twin-aware question type to the same queue:
**"hear the word -> pick the letter it starts with,"** and for a
twin-bearing word we *deliberately* seat the twin sibling glyph as a
distractor:

```js
// ── §P5  WORD QUEUE v2  (twin-aware glyph rounds interleaved) ─────────
// FIDEL_FAMILIES already carries `word` and `twinOf`. A word whose family
// has a twin (or is a twin) is a "differentiation word".
export function buildWordQueue(seed, count = 6) {
  let s = seed, shuffled
  ;[shuffled, s] = rngShuffle(WORDS, s)
  return shuffled.slice(0, count).map((target) => {
    const fam = FIDEL_FAMILIES[target.familyIndex]
    const twin = fam.twinOf && FIDEL_FAMILIES.find((f) => f.name === fam.twinOf)
    const twinChild = FIDEL_FAMILIES.find((f) => f.twinOf === fam.name)
    const sibling = twin || twinChild                 // the look-alike, if any

    if (sibling) {
      // GLYPH round: same sound as a distractor is intentional here, because
      // the picture disambiguates. This is the ONLY place twins co-occur.
      const correct = formOf(`${fam.id}-1`)?.char
      let others; [others, s] = rngShuffle(
        FIDEL_FAMILIES.filter((f) => f.id !== fam.id && f.id !== sibling.id), s)
      let options; [options, s] = rngShuffle(
        [correct, formOf(`${sibling.id}-1`)?.char, formOf(`${others[0].id}-1`)?.char], s)
      return { type: 'glyph', word: target, picture: target.picture, target: correct, options }
    }
    // PICTURE round: unchanged behaviour for non-twin words.
    let others; [others, s] = rngShuffle(
      WORDS.filter((w) => w.latin !== target.latin && w.picture !== target.picture), s)
    let options; [options, s] = rngShuffle([target.latin, ...others.slice(0, 2).map((w) => w.latin)], s)
    return { type: 'picture', target: target.latin, options }
  })
}
```

`WordMatch` renders `type === 'glyph'` rounds by showing the word's picture
+ speaking the word, with big **letter** tiles as options (ሀ vs ሐ). The
child bonds the *distinct visual glyph* to a concrete word — "the ሐ in
ሐመር (ship)" — which is exactly how Ethiopian schools disambiguate twins
via nickname words. Determinism is preserved: same seed, same interleave.

**Invariant to add:** twins may co-occur **only** in `type: 'glyph'` word
rounds and **never** in any audio matching queue. This becomes a tested
assertion so a future edit can't leak a twin into a Lesson.

---

## PILLAR 6 — FPS-driven degradation to 2D fallbacks

**What exists:** a *static* `isLowEnd()` heuristic (cores/memory) that only
tunes pixel-ratio and shadows. What's missing is P6's ask: measure *actual*
frames and, if a device stutters, **stop mounting WebGL** and swap in a 2D
game that plays identically.

Because gameplay is renderer-agnostic (the Runner and Skylands machines are
pure and already separate from their draw layers), the fallback is a
*different view over the same machine* — no gameplay divergence, determinism
intact.

```js
// ── §P6  PERF PROBE  (platform/quality.js) ────────────────────────────
const PERF_KEY = 'fq.perf.v1'
export const loadPerf = () => { try { return localStorage.getItem(PERF_KEY) } catch { return null } }
const savePerf = (v) => { try { localStorage.setItem(PERF_KEY, v) } catch { /* ignore */ } }

/** Sample rAF for windowMs; median FPS < minFps => persist 'low' once. */
export function usePerfDegrade({ windowMs = 5000, minFps = 30 } = {}) {
  const [degraded, setDegraded] = useState(loadPerf() === 'low')
  useEffect(() => {
    if (degraded || loadPerf()) return                // decided already; never re-probe mid-journey
    let raf, prev = performance.now(), frames = []
    const start = prev
    const tick = (now) => {
      frames.push(1000 / (now - prev)); prev = now
      if (now - start >= windowMs) {
        const sorted = frames.slice().sort((a, b) => a - b)
        const median = sorted[sorted.length >> 1] ?? 60
        if (median < minFps) { savePerf('low'); setDegraded(true) }
        else savePerf('ok')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [degraded, windowMs, minFps])
  return degraded
}
```

Routing at the ARCADE node — **the WebGL module is never imported when
degraded**, so a weak phone pays zero WebGL cost:

```jsx
function ArcadeGateway({ node, onDone }) {
  const degraded = loadPerf() === 'low'
  if (node.gateway.mode === 'runner')
    return degraded ? <Runner2D  node={node} onDone={onDone} />   // shared runner machine, canvas lanes
                    : <Runner3D  node={node} onDone={onDone} onProbe />
  return   degraded ? <Skylands2D node={node} onDone={onDone} />   // shared quiz machine, 2D grid
                    : <Skylands3D node={node} onDone={onDone} onProbe />
}
```

- **Runner2D** drives the *same* runner reducer (`FEED` / `FEED_DONE` /
  `BOSS_DONE`); lanes and gates are drawn on a 2D `<canvas>`/DOM — the
  original pre-3D runner lineage, reintroduced as the fallback.
- **Skylands2D** is the *same* cumulative quiz + Jibby boss rendered as the
  existing 2D matching grid (essentially the Lesson UI with the island's
  cumulative pool). Zero new game logic.
- First 5s probe runs inside the *first* 3D node a device sees; the verdict
  persists, so P6's "bypass WebGL for the next node" is automatic. A hidden
  Grown-Ups toggle can force `ok`/`low` for testing (mirrors `fq.quality`).

---

## Migration (returning children keep their progress)

`loadJourney()` synthesizes `fq.journey.v1` once from the legacy blobs so no
child is reset:

```js
function migrateLegacyProgress() {
  const learn = safeParse('fq.learn.v1', { mastered: [], mixes: [] })
  const done = {}
  for (const fid of learn.mastered) done[`learn:${fid}`] = { stars: 3 }
  for (const mid of learn.mixes)    done[`mix:${mid.replace(/^mix-/, '')}`] = { stars: 3 }
  const levels = safeParse('fq2.progress', {})
  for (const [levelId, rec] of Object.entries(levels))
    if (rec?.stars) done[`quiz:${levelId.split('-')[1]}`] = { stars: rec.stars }
  const p = { version: 1, done, collection: { owned: [], worn: {}, den: [] } }
  saveJourney(p)
  return p
}
```

Legacy keys are left in place (read-only) for one release as a safety net.

---

## Testing additions (keep the invariant suite exhaustive)

- **Journey monotonicity:** `nodeUnlocked` is a strict prefix; `nextNode`
  advances by exactly one per `completeNode`; `JOURNEY` covers all 33
  families + 8 levels + 4 gateways with no gaps or dupes.
- **Reward determinism:** `buildJourney()` assigns a stable reward per node
  across seeds/runs; `grantReward` is idempotent (replaying a node never
  dupes a sticker).
- **Round caps:** machine-walk expects ECHO/SHUFFLE = 3.
- **Trace v2:** origin/direction scoring is pure; chapter-4 tolerance is
  strictly tighter than chapter-1; a reversed stroke sets `cue:'direction'`
  but never hard-fails below chapter 3.
- **Twin gate (P5):** twins co-occur **only** in `type:'glyph'` word rounds;
  a property test over 25 seeds asserts no audio queue ever pairs twins.
- **Migration:** a fixture of legacy blobs produces the expected `done` map.

---

## Sequencing, risk, and what I need decided

I recommend shipping in this order — each phase is independently valuable
and testable, and the early ones are low-risk:

| Phase | Pillar | Risk | Notes |
|------|--------|------|-------|
| 1 | **P2** round caps | trivial | one constant + test edit; ship first, measure retention |
| 2 | **P1** linear path + Backpack | medium | pure re-chrome over existing screens; the unified model lands here |
| 3 | **P3** sticker/wardrobe | medium | additive schema; new draw layers on Anbessa |
| 4 | **P6** perf probe + 2D fallbacks | medium-high | needs the Runner2D/Skylands2D views built + device testing |
| 5 | **P5** twin word rounds | low | contained to `buildWordQueue` + `WordMatch` |
| 6 | **P4** directional trace | high | heuristic ships day one; authored `STROKE_HINTS` is a follow-up content pass |

**Decisions I need from you before I start cutting code:**

1. **P1 — do the 3D games leave the home surface entirely?** My plan makes
   them earned gateway nodes (one per chapter, 4 total). That's the whole
   point of the pillar, but it means a child can't freely re-play the
   Runner until they reach its node. OK, or do you want a "free play" copy
   of unlocked gateways living in the Backpack?
2. **P4 — authored stroke order.** The heuristic works with zero data, but
   real orthographic correctness needs a literate writer to author (or
   correct) up to 33 `STROKE_HINTS`. Do you want to source that, or ship the
   heuristic-only version and treat direction as advisory everywhere?
3. **P3 — wardrobe vs. den.** Both, or start with just Anbessa wearables
   (simpler, faster to feel good) and add the decorable den later?
4. **P6 — fallback scope.** Build both Runner2D *and* Skylands2D, or start
   with Runner2D (Skylands' 2D fallback is nearly the existing Lesson UI and
   cheaper) and gate Skylands to 3D-capable devices only?
5. **P2 — round count.** I propose 3/3 (echo/shuffle) and mix 6→4. Comfortable,
   or do you want to A/B 3 vs 4 before committing?

Give me the five answers (or "your call" on any) and I'll implement
phase by phase, each as its own tested, pushed change.
