import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Artifact build: the whole app inlined into one HTML file, for publishing
// as a Claude Artifact (npm run build:artifact, then scripts/make-artifact).
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { target: 'es2020', outDir: 'dist-artifact' },
})
