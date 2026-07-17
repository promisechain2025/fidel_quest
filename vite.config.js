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
        // Function form on purpose: the object form also pulled SHARED
        // helper deps (tslib, zustand, ...) into the 3D chunks, which gave
        // the entry a static import of r3f-vendor and preloaded the whole
        // three.js stack on the home path. Here only the 3D packages
        // themselves are pinned; shared helpers stay with their importers,
        // so the 3D chunks load strictly behind the lazy arcade imports.
        manualChunks(id) {
          // Vite's preload helper is shared by every lazy chunk; left to
          // Rollup it can land inside three-vendor and staticly chain the
          // entry to the 3D stack. Pin it to the always-loaded react chunk.
          if (id.includes('vite/preload-helper')) return 'react-vendor'
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](three|@react-three|@react-spring)[\\/]/.test(id)) return 'three-vendor'
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return 'motion-vendor'
          return undefined
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
        // Precache the shell, the self-hosted Ethiopic fonts (woff2) AND the
        // whole voice set (~3.6MB of mp3s + the coverage manifest). The voice
        // IS the product for a pre-reader: a device that installs the app and
        // then goes offline must still speak every letter. Runtime caching
        // below stays as a safety net for anything outside the precache.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2,mp3,json}'],
        // The generated SW registers an SPA navigation fallback (every
        // navigation resolves to index.html). The /review page is a SEPARATE
        // static document, not part of the SPA, so it must be exempt — without
        // this the SW serves the game shell for /review after the first visit
        // (it "loads once, then stops"). Let those navigations hit the real
        // precached page / network instead.
        // ...and any URL that looks like a FILE (has an extension) or lives
        // under /audio/ - typing a clip URL into the address bar must return
        // the clip (or an honest 404), never silently render the app shell.
        // This masked "are the voice files deployed?" checks on real phones.
        navigateFallbackDenylist: [/^\/review\/?/, /^\/audio\//, /\.[a-z0-9]{2,5}$/i],
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
              cacheName: 'fidel-audio-v7',
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
