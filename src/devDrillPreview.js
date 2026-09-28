/* Dev-only preview for Grade 1 Word Build, Find-the-fidel, and Echo.
   Open http://localhost:5173/?drill=u01 (lands on Word Build) or
   ?drill=echo (lands on Unit 1 Echo) while `npm run dev` is running.
   It parks a Tigrinya journey on that step, then drops the query so a
   refresh does not rewind. Production builds strip this
   (import.meta.env.DEV is false). It is not a player feature. */

if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    const q = new URLSearchParams(window.location.search)
    const drill = q.get('drill')
    if (drill === 'u01' || drill === 'echo') {
      localStorage.setItem('fq.pack', 'ti')
      localStorage.setItem('fq.onboarded.v1', JSON.stringify({
        lesson: true, runner: true, skylands: true, placeoffer: true,
      }))
      const done = {
        'learn:ha': { stars: 3 },
        'learn:le': { stars: 3 },
        'mix:le': { stars: 3 },
      }
      if (drill === 'echo') {
        done['blend:u01'] = { stars: 3 }
        done['find:u01'] = { stars: 3 }
      }
      localStorage.setItem('fq.journey.v1', JSON.stringify({
        version: 1,
        done,
        collection: { owned: [], worn: {} },
      }))
      q.delete('drill')
      const next = window.location.pathname + (q.toString() ? `?${q}` : '') + window.location.hash
      window.history.replaceState(null, '', next)
    }
  } catch {
    /* preview must never break startup */
  }
}
