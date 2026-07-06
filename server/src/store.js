/* ============================================================================
   AGGREGATE FUNNEL STORE (pure, privacy-safe)
   ----------------------------------------------------------------------------
   Counts anonymous funnel events for Fidel Quest. There is deliberately NO
   personal data here: no accounts, no device ids, no IP storage, no per-child
   progress - only how many times each funnel stage happened, per day. That is
   enough to see the viral loop turning (opens -> lessons -> shares -> installs)
   without collecting anything about a child. Pure and unit-testable; the HTTP
   layer is a thin wrapper over this.
   ========================================================================== */

// The funnel stages we accept. Anything else is dropped.
export const FUNNEL = Object.freeze([
  'app_open',
  'lesson_complete',
  'chapter_complete',
  'gift_claim',
  'share',
  'install',
])

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export function createStore() {
  const totals = Object.create(null) // type -> count
  const daily = Object.create(null) // 'YYYY-MM-DD' -> { type -> count }
  let events = 0

  function record(evt) {
    if (!evt || typeof evt.type !== 'string' || !FUNNEL.includes(evt.type)) return false
    const day = typeof evt.day === 'string' && DAY_RE.test(evt.day) ? evt.day : 'unknown'
    totals[evt.type] = (totals[evt.type] || 0) + 1
    if (!daily[day]) daily[day] = Object.create(null)
    daily[day][evt.type] = (daily[day][evt.type] || 0) + 1
    events += 1
    return true
  }

  // Cap batch size so one request cannot flood the store.
  function recordBatch(list, cap = 100) {
    if (!Array.isArray(list)) return 0
    let n = 0
    for (const e of list.slice(0, cap)) if (record(e)) n += 1
    return n
  }

  function snapshot() {
    const funnel = FUNNEL.map((type) => ({ type, count: totals[type] || 0 }))
    // Rough stage-to-stage conversion, guarded against divide-by-zero.
    const conv = funnel.map((s, i) => {
      const prev = i === 0 ? s.count : funnel[i - 1].count
      return { ...s, rateFromPrev: prev ? +(s.count / prev).toFixed(3) : null }
    })
    return { events, totals: { ...totals }, daily: cloneDaily(daily), funnel: conv }
  }

  return { record, recordBatch, snapshot }
}

function cloneDaily(daily) {
  const out = {}
  for (const day of Object.keys(daily)) out[day] = { ...daily[day] }
  return out
}
