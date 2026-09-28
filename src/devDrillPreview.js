/* Dev-only preview for the Grade 1 Word Build and Find-the-fidel steps.
   Open http://localhost:5173/?drill=u01 while `npm run dev` is running.
   It parks a Tigrinya journey just before Unit 1 Word Build, then drops
   the query so a refresh does not rewind. Production builds strip this
   (import.meta.env.DEV is false). It is not a player feature. */

if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.get('drill') === 'u01') {
      localStorage.setItem('fq.pack', 'ti')
      localStorage.setItem('fq.onboarded.v1', JSON.stringify({
        lesson: true, runner: true, skylands: true, placeoffer: true,
      }))
      localStorage.setItem('fq.journey.v1', JSON.stringify({
        version: 1,
        done: {
          'learn:ha': { stars: 3 },
          'learn:le': { stars: 3 },
          'mix:le': { stars: 3 },
        },
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
