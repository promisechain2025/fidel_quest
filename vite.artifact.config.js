import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Artifact build: the whole app inlined into one HTML file, for publishing
// as a Claude Artifact (npm run build:artifact, then scripts/make-artifact).
// This config has no vite-plugin-pwa, so main.jsx's dynamic import of
// virtual:pwa-register must resolve to a no-op stub or Rollup fails the
// whole build at resolve time (the runtime try/catch never gets a chance).
const pwaRegisterStub = {
  name: 'stub-pwa-register',
  resolveId(id) {
    if (id === 'virtual:pwa-register') return '\0stub-pwa-register'
  },
  load(id) {
    if (id === '\0stub-pwa-register') return 'export const registerSW = () => () => {}'
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), pwaRegisterStub],
  build: { target: 'es2020', outDir: 'dist-artifact' },
})
