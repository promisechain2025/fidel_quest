/* ============================================================================
   LEARNING TELEMETRY — platform layer
   ----------------------------------------------------------------------------
   An append-only, capped ledger of answer events written at the shell seams
   (the same effects that play feedback sounds) — the machines stay pure and
   never see it. Every event is simply "the child heard K and picked P",
   which is enough to derive mastery, trouble letters, and the confusion
   matrix. All analysis is pure selectors over the ledger, so the Grown-Ups
   dashboard is deterministic and unit-testable with synthetic data.

   Event: { k: heardKey, p: pickedKey, m: mode, d: YYYYMMDD }
   ========================================================================== */

import { progressChanged } from './childModel'
import { srsReview } from './srs'
const KEY = 'fq.telemetry.v1'
const CAP = 600

export function loadLedger() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(data?.events) ? data.events : []
  } catch {
    return []
  }
}

function dayStamp(date = new Date()) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

/** Record one answer. Fire-and-forget; storage failures never surface. */
export function recordAnswer(heardKey, pickedKey, mode) {
  try {
    const events = loadLedger()
    events.push({ k: heardKey, p: pickedKey, m: mode, d: dayStamp() })
    localStorage.setItem(KEY, JSON.stringify({ v: 1, events: events.slice(-CAP) }))
    // The memory schedule outlives the capped ledger: every answer also
    // advances (or resets) the heard form's spaced-repetition entry.
    srsReview(heardKey, pickedKey === heardKey)
    progressChanged()
  } catch {
    /* telemetry must never break gameplay */
  }
}

export function clearLedger() {
  try {
    localStorage.removeItem(KEY)
    progressChanged()
  } catch {
    /* ignore */
  }
}

/* ── pure selectors ── */

/** Per-letter stats: Map key -> { seen, correct, wrong, lastDay }. */
export function letterStats(events) {
  const stats = new Map()
  for (const e of events) {
    const s = stats.get(e.k) || { seen: 0, correct: 0, wrong: 0, lastDay: 0 }
    s.seen += 1
    if (e.p === e.k) s.correct += 1
    else s.wrong += 1
    s.lastDay = Math.max(s.lastDay, e.d)
    stats.set(e.k, s)
  }
  return stats
}

/**
 * Trouble letters: seen at least `minSeen` times with a wrong rate above
 * `minRate`, worst first. Rate uses Laplace smoothing so two misses out of
 * three attempts outranks twenty misses out of a hundred.
 */
export function troubleLetters(events, { minSeen = 3, minRate = 0.3, limit = 3 } = {}) {
  const out = []
  for (const [key, s] of letterStats(events)) {
    if (s.seen < minSeen) continue
    const rate = (s.wrong + 1) / (s.seen + 2)
    if (s.wrong / s.seen >= minRate) out.push({ key, ...s, rate })
  }
  return out.sort((a, b) => b.rate - a.rate).slice(0, limit)
}

/** Confusion pairs: heard K but picked P, counted, strongest first. */
export function confusions(events, { minCount = 2, limit = 3 } = {}) {
  const pairs = new Map()
  for (const e of events) {
    if (e.p === e.k) continue
    const id = `${e.k}>${e.p}`
    pairs.set(id, (pairs.get(id) || 0) + 1)
  }
  return [...pairs.entries()]
    .map(([id, count]) => {
      const [heard, picked] = id.split('>')
      return { heard, picked, count }
    })
    .filter((c) => c.count >= minCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * An actionable practice tip for a trouble letter, in parent language.
 * `lookup` gives family metadata; `levelOf` maps a family index to the
 * lesson level that practices it.
 */
export function tipFor(troubleKey, allConfusions, formOf, levelOf) {
  const form = formOf(troubleKey)
  if (!form) return null
  const confusion = allConfusions.find((c) => c.heard === troubleKey)
  const level = levelOf(form)
  const lines = []
  if (confusion) {
    const other = formOf(confusion.picked)
    if (other) {
      lines.push(
        `Often picks ${other.char} ("${other.sound}") when hearing ${form.char} ("${form.sound}").`,
      )
    }
  }
  lines.push(
    `Listen together in Letter Explorer (the ${form.familyName} family), then replay Level ${level}.`,
  )
  return { text: lines.join(' '), familyId: form.familyId, level }
}

/** Overall accuracy for a mode filter (or all), null when no data. */
export function accuracyOf(events, mode = null) {
  const relevant = mode ? events.filter((e) => e.m === mode) : events
  if (!relevant.length) return null
  return Math.round((relevant.filter((e) => e.p === e.k).length / relevant.length) * 100)
}
