import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The website is an independent static site (no imports from the app in ../src).
// Deployed beside the PWA; the app's URL is configured in src/config.js.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
