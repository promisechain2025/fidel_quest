/* ============================================================================
   WORD MARKET — pure core (replaces Merkato Market)
   ----------------------------------------------------------------------------
   Anbessa hands the child a shopping list WRITTEN IN FIDEL (no pictures on
   the list). The stall shows PICTURES. The child reads a word and taps the
   item it names - decoding to meaning, the reading step after Build.

   Decoys are chosen so first-letter guessing fails:
     L1  1 word, 3 stall items (any decoys)
     L2  2 words, 4 items; each word gets a decoy STARTING WITH THE SAME
         FIDEL when the word list has one (ሎሚ vs ሎተሪ), else the same family
     L3  3 words, 6 items; decoys from the SAME FAMILY, OTHER VOWEL (ሙዝ vs
         ማር) preferred, then same first fidel. Each line also carries a
         Ge'ez numeral quantity (፩-፫): buy exactly that many (the old
         market's numeral lesson, now inside a reading task)
     L4  like L3, but the list is shown for a peek and then hidden (recall /
         fluency); peeking again is allowed but those lines stop counting as
         first-try
   Unlock on >= 75% of lines bought right first time (platform/roundProgress).
   Missed words are re-dealt first for the next rounds.

   SAFETY: only words whose every character is a real form; a picture used by
   more than one word in the pack never appears (no ambiguous 🌳); no two
   words on one stall sound identical letter-for-letter (sameSound) - the
   list is read, but a word may be sounded out. Pure + seeded.
   ========================================================================== */
import { rngNext, rngShuffle } from './platform/rng'
import { ACTIVE_PACK, INDEXES } from './platform/ethiopic'
import { soundKeyOf } from './platform/sameSound'
import { UNLOCK_ACCURACY, starsFor, applyRound as applyRoundShared } from './platform/roundProgress'
import { MARKET_KEY, marketStore } from './platform/gameStores'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const MarketEvent = Object.freeze({ TAP: 'TAP', SELECT: 'SELECT', PEEK: 'PEEK', HIDE: 'HIDE' })
export const Outcome = Object.freeze({ RIGHT: 'right', DONE: 'done', ENOUGH: 'enough', WRONG: 'wrong' })

export const MARKET_LEVELS = Object.freeze({
  1: { list: 1, stall: 3, decoy: 'any', qty: false, peek: false },
  2: { list: 2, stall: 4, decoy: 'first', qty: false, peek: false },
  3: { list: 3, stall: 6, decoy: 'family', qty: true, peek: false },
  4: { list: 3, stall: 6, decoy: 'family', qty: true, peek: true },
})
export const MAX_LEVEL = 4
export const MAX_QTY = 3
/** Wrong taps on one line before its item glows on the stall. */
export const HINT_AFTER = 2

const familyOf = (key) => INDEXES.byAudioKey.get(key)?.familyId || /^([a-z]+)-/.exec(key)?.[1] || key

/* Pictures that don't name ONE word for a child: greetings and abstractions
   (📞 hello, 🕊️ peace, 🙏 prayer, 🔤 alphabet, 🗓️ Pagume, 🗺️ country, 🏰 Harar,
   📏 line), generic people (🧍 person, 👤 head, 👩 mommy next to 🧕 headscarf,
   🎨 painter next to 🖼️ drawing), two "money" words (💵 ብር / 💰 ገንዘብ), and
   number keycaps (Latin digits on screen). */
export const UNPICTURABLE = new Set(['📞', '🕊️', '🙏', '🔤', '🗓️', '🗺️', '🏰', '📏', '🧍', '👤', '👩', '🎨', '💵', '💰', '✌️', '2️⃣', '3️⃣', '4️⃣', '5️⃣'])

/** The market's word stock: real-form words of 2-4 fidel whose picture is
    unique in the whole list and concrete. `words` items: { latin, geez,
    picture, noAudio }. */
export function marketStock(words) {
  const pics = new Map()
  for (const w of words) if (w.picture) pics.set(w.picture, (pics.get(w.picture) || 0) + 1)
  const seen = new Set()
  const out = []
  for (const w of words) {
    if (!w.picture || pics.get(w.picture) !== 1 || UNPICTURABLE.has(w.picture) || seen.has(w.latin)) continue
    const chars = Array.from(w.geez)
    const keys = chars.map((c) => INDEXES.byChar.get(c)?.audioKey)
    if (chars.length < 2 || chars.length > 4 || keys.some((k) => !k)) continue
    seen.add(w.latin)
    out.push({ id: w.latin, geez: w.geez, picture: w.picture, keys, noAudio: !!w.noAudio, familyIndex: w.familyIndex || 0 })
  }
  return out
}

/** Words the child can READ: every letter in their learned pool. */
export function readableIds(stock, poolKeys) {
  const pool = new Set(poolKeys)
  return stock.filter((w) => w.keys.every((k) => pool.has(k))).map((w) => w.id)
}

/** A word's sound signature: identical signatures read aloud identically. */
export const soundSig = (w, pack = ACTIVE_PACK) => w.keys.map((k) => soundKeyOf(k, pack)).join('|')

/** For a logged wrong pick: the first letter where a structured decoy (same
    first family) differs from the target, as { heard, picked }; else null. */
export function letterMiss(target, picked) {
  if (!target || !picked || familyOf(target.keys[0]) !== familyOf(picked.keys[0])) return null
  for (let i = 0; i < Math.min(target.keys.length, picked.keys.length); i++) {
    if (target.keys[i] !== picked.keys[i]) return { heard: target.keys[i], picked: picked.keys[i] }
  }
  return null
}

/** Decoy candidates for one target, best first, by level rule. */
function decoysFor(target, stock, rule) {
  const k0 = target.keys[0]
  const f0 = familyOf(k0)
  const sameFirst = stock.filter((w) => w.id !== target.id && w.keys[0] === k0)
  const famOther = stock.filter((w) => w.id !== target.id && w.keys[0] !== k0 && familyOf(w.keys[0]) === f0)
  if (rule === 'first') return [...sameFirst, ...famOther]
  if (rule === 'family') return [...famOther, ...sameFirst]
  return []
}

/**
 * Deal a round.
 *  stock    - marketStock(words)
 *  readable - ids the child can read (targets come only from here)
 *  due      - word ids to re-deal first (at most half the list, rounded up)
 */
export function initMarket(level, seed, { stock, readable, due = [], pack = ACTIVE_PACK }) {
  const cfg = MARKET_LEVELS[level] || MARKET_LEVELS[1]
  let s = (seed >>> 0) | 1
  const byId = new Map(stock.map((w) => [w.id, w]))
  const canRead = readable.filter((id) => byId.has(id))
  let shuffled
  ;[shuffled, s] = rngShuffle(canRead, s)
  const dueFirst = due.filter((id) => canRead.includes(id)).slice(0, Math.ceil(cfg.list / 2))
  const order = [...dueFirst, ...shuffled.filter((id) => !dueFirst.includes(id))]

  const targets = []
  const sigs = new Set()
  for (const id of order) {
    if (targets.length >= cfg.list) break
    const sig = soundSig(byId.get(id), pack)
    if (sigs.has(sig)) continue
    sigs.add(sig)
    targets.push(id)
  }

  // Decoys: one structured decoy per target where the list has one, then any.
  const stall = [...targets]
  const okDecoy = (w) => !stall.includes(w.id) && !sigs.has(soundSig(w, pack))
  for (const id of targets) {
    if (stall.length >= cfg.stall) break
    const cands = decoysFor(byId.get(id), stock, cfg.decoy).filter(okDecoy)
    if (!cands.length) continue
    let r
    ;[r, s] = rngNext(s)
    // keep the best tier (same-first vs same-family) but vary within it
    const k0 = byId.get(id).keys[0]
    const kind = (w) => w.keys[0] === k0
    const tierLen = cands.filter((w) => kind(w) === kind(cands[0])).length
    stall.push(cands[Math.floor(r * tierLen) % tierLen].id)
  }
  let rest
  ;[rest, s] = rngShuffle(stock.filter(okDecoy).map((w) => w.id), s)
  for (const id of rest) {
    if (stall.length >= cfg.stall) break
    if (okDecoy(byId.get(id))) stall.push(id)
  }
  let stallOrder
  ;[stallOrder, s] = rngShuffle(stall, s)

  const list = []
  for (const id of targets) {
    let qty = 1
    if (cfg.qty) {
      let r
      ;[r, s] = rngNext(s)
      qty = 1 + (Math.floor(r * MAX_QTY) % MAX_QTY)
    }
    list.push({ id, qty, got: 0, misses: 0, helped: false, done: false })
  }
  return {
    level, seed, list, stall: stallOrder, current: 0, phase: list.length ? Phase.PLAY : Phase.WIN,
    peek: cfg.peek ? 'show' : null, peeks: 0, streak: 0, bestStreak: 0, hint: null, missed: [], last: null,
  }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })
const firstOpen = (list, from = 0) => {
  for (let i = 0; i < list.length; i++) {
    const j = (from + i) % list.length
    if (!list[j].done) return j
  }
  return -1
}

/** Pure transition. */
export function marketTransition(ctx, event) {
  const { type, payload = {} } = event
  if (ctx.phase !== Phase.PLAY) return rej(ctx)

  if (type === MarketEvent.HIDE) return ctx.peek === 'show' ? ok({ ...ctx, peek: 'hidden', last: null }) : rej(ctx)
  if (type === MarketEvent.PEEK) {
    if (ctx.peek !== 'hidden') return rej(ctx)
    const list = ctx.list.map((l) => (l.done ? l : { ...l, helped: true }))
    return ok({ ...ctx, list, peek: 'show', peeks: ctx.peeks + 1, last: null })
  }
  if (type === MarketEvent.SELECT) {
    const i = payload.index
    if (!ctx.list[i] || ctx.list[i].done) return rej(ctx)
    return ok({ ...ctx, current: i, hint: ctx.list[i].misses >= HINT_AFTER ? ctx.list[i].id : null, last: null })
  }
  if (type !== MarketEvent.TAP || ctx.peek === 'show') return rej(ctx)

  const id = payload.id
  if (!ctx.stall.includes(id)) return rej(ctx)
  let cur = ctx.list[ctx.current]?.done ? firstOpen(ctx.list, ctx.current) : ctx.current
  // Reading ANOTHER open line is still right: switch to it.
  const other = ctx.list.findIndex((l) => l.id === id && !l.done)
  if (other >= 0) cur = other
  const line = ctx.list[cur]

  if (line.id === id) {
    const got = line.got + 1
    const done = got >= line.qty
    const clean = line.misses === 0 && !line.helped
    const log = line.got === 0 && line.misses === 0 ? { heard: line.id, picked: id } : null
    const list = ctx.list.map((l, i) => (i === cur ? { ...l, got, done } : l))
    const streak = done ? (clean ? ctx.streak + 1 : ctx.streak) : ctx.streak
    const nextCur = done ? firstOpen(list, cur) : cur
    const win = nextCur < 0
    return ok({
      ...ctx, list, current: win ? cur : nextCur, streak, bestStreak: Math.max(ctx.bestStreak, streak),
      hint: !win && done && list[nextCur].misses >= HINT_AFTER ? list[nextCur].id : done ? null : ctx.hint,
      phase: win ? Phase.WIN : Phase.PLAY,
      last: { outcome: done ? Outcome.DONE : Outcome.RIGHT, id, line: cur, got, qty: line.qty, log },
    })
  }
  const doneLine = ctx.list.find((l) => l.id === id && l.done)
  if (doneLine) return ok({ ...ctx, last: { outcome: Outcome.ENOUGH, id, line: cur, log: null } })

  const log = line.got === 0 && line.misses === 0 ? { heard: line.id, picked: id } : null
  const misses = line.misses + 1
  const list = ctx.list.map((l, i) => (i === cur ? { ...l, misses } : l))
  return ok({
    ...ctx, list, current: cur, streak: 0,
    missed: ctx.missed.includes(line.id) ? ctx.missed : [...ctx.missed, line.id],
    hint: misses >= HINT_AFTER ? line.id : null,
    last: { outcome: Outcome.WRONG, id, line: cur, want: line.id, log },
  })
}

/** Round summary: words bought right first time / to practise. Pure. */
export function marketSummary(ctx) {
  const dealt = ctx.list.map((l) => l.id)
  const mastered = ctx.list.filter((l) => l.done && l.misses === 0 && !l.helped).map((l) => l.id)
  const practice = dealt.filter((id) => !mastered.includes(id))
  const accuracy = dealt.length ? mastered.length / dealt.length : 0
  return {
    dealt, mastered, practice, missed: dealt.filter((id) => ctx.missed.includes(id)),
    accuracy, stars: starsFor(accuracy), passed: ctx.phase === Phase.WIN && accuracy >= UNLOCK_ACCURACY, bestStreak: ctx.bestStreak,
  }
}

/** Highest level this pool can fill (0 = none). A level needs readable words
    for 1.5x its list (so rounds vary) - at least 2 - and enough stock for
    the stall. */
export function maxPlayableLevel(stock, readable, pack = ACTIVE_PACK) {
  const byId = new Map(stock.map((w) => [w.id, w]))
  const readSigs = new Set(readable.filter((id) => byId.has(id)).map((id) => soundSig(byId.get(id), pack)))
  const stockSigs = new Set(stock.map((w) => soundSig(w, pack)))
  let best = 0
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const cfg = MARKET_LEVELS[lv]
    if (readSigs.size >= Math.max(2, Math.ceil(cfg.list * 1.5)) && stockSigs.size >= cfg.stall) best = lv
  }
  return best
}

export { MARKET_KEY }
export const loadMarket = () => marketStore.load()
export const saveMarket = (state) => marketStore.save(state)
export const applyRound = (state, level, summary) => applyRoundShared(state, level, summary, MAX_LEVEL)
