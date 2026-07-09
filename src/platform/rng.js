/* ============================================================================
   DETERMINISTIC RNG — platform layer
   ----------------------------------------------------------------------------
   The one threaded mulberry32 the whole app shares, so every seeded machine
   (lessons, runner, Skylands, the Daily Hunt) is a pure function of its seed
   against the SAME audited generator. State is threaded explicitly:

     const [value, next] = rngNext(state)
     const [shuffled, next] = rngShuffle(items, state)

   Do not fork this implementation - a drifted copy silently desynchronizes
   replays and tests from the rest of the app.
   ========================================================================== */

export function rngNext(state) {
  let t = (state + 0x6d2b79f5) | 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t]
}

export function rngShuffle(items, rngState) {
  const out = items.slice()
  let state = rngState
  for (let i = out.length - 1; i > 0; i--) {
    let value
    ;[value, state] = rngNext(state)
    const j = Math.floor(value * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, state]
}
