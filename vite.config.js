import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // Split the heavy engines so app-code changes don't bust their cache.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three'],
          'r3f-vendor': ['@react-three/fiber', '@react-three/drei', '@react-spring/three'],
          'motion-vendor': ['framer-motion'],
        },
      },
    },
  },
  plugins: [
    // Fill the share-preview tags with VITE_APP_URL, or blank them cleanly
    // when it is unset (so a no-env build never ships a broken __APP_URL__).
    {
      name: 'fidel-app-url',
      transformIndexHtml(html) {
        return html.replaceAll('__APP_URL__', process.env.VITE_APP_URL || '')
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a new build shows a tap-to-update toast (main.jsx) instead
      // of silently activating on some later visit - testers kept seeing
      // stale builds with autoUpdate.
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      workbox: {
        // Precache the shell + the self-hosted Ethiopic fonts (woff2) so Ge'ez
        // renders offline from first launch. Audio stays runtime-cached (below).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        // The generated SW registers an SPA navigation fallback (every
        // navigation resolves to index.html). The /review page is a SEPARATE
        // static document, not part of the SPA, so it must be exempt — without
        // this the SW serves the game shell for /review after the first visit
        // (it "loads once, then stops"). Let those navigations hit the real
        // precached page / network instead.
        navigateFallbackDenylist: [/^\/review\/?/],
        // Audio clips are optional drop-in assets (see the header comment in
        // src/pages/AmharicFidelGame.jsx); cache them at runtime rather than
        // precaching files that may not exist yet.
        runtimeCaching: [
          {
            // Letter/word audio: once a clip is cached, serve it from cache with
            // NO further network — a replay makes zero requests, which keeps the
            // app light at scale. Rollout of a re-recorded clip is handled by
            // bumping the versioned cacheName below (which orphans the old cache
            // so every clip is re-fetched fresh once), not by per-play refetch.
            urlPattern: /\/audio\/fidel\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fidel-audio-v5',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'Fidel Quest',
        short_name: 'Fidel Quest',
        description: 'An Amharic alphabet (Fidel) learning game for kids.',
        lang: 'am',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fffbeb',
        theme_color: '#f59e0b',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
