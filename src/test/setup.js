import '@testing-library/jest-dom/vitest'

// The app-data tests assert the Amharic pack's specifics (family set, twin
// pairs, word audio keys). Production first-run now defaults to Tigrinya, so
// pin the Amharic pack here BEFORE any module computes its frozen family data,
// keeping the Amharic suite deterministic. (The Tigrinya pack has its own
// CI-enforced validatePack contract.)
try { localStorage.setItem('fq.pack', 'am') } catch { /* no storage */ }

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  try { localStorage.setItem('fq.pack', 'am') } catch { /* no storage */ }
})
