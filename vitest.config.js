import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    // The frontend suite lives under src/. server/ has its own node:test suite
    // (run with `npm test` inside server/), which vitest must not pick up.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx'],
      // A RATCHET, not a target. CI already produced a coverage report and
      // then ignored it, so coverage could fall to single digits with the
      // build still green. These are pinned a point under the real numbers at
      // the time of writing (36.66 / 37.00 / 38.52 / 37.51) - low enough not
      // to flake on a small refactor, high enough that deleting tests or
      // landing a large untested surface fails the build. Raise them when
      // coverage genuinely climbs; never lower them to make a build pass.
      thresholds: {
        statements: 36,
        branches: 36,
        functions: 38,
        lines: 37,
      },
    },
  },
})
