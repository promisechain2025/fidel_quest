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
        // Precache the SHELL + the self-hosted Ethiopic fonts + the small JSON
        // (coverage manifest) only - a light (~1MB) atomic install. The voice
        // (~4.7MB of mp3s) is deliberately NOT in the atomic precache: on the
        // flaky 2G/3G networks this app targets, gating offline-shell readiness
        // behind one uninterrupted 4.7MB download meant the app never became
        // offline-capable until that whole set landed in a single pass. The
        // voice still works offline via the runtime CacheFirst rule below
        // (clips cache as they play), and a background warm (main.jsx ->
        // warmAudioCache) fills the rest incrementally when online - so the
        // shell is offline-ready after a short first session, and the voice
        // follows, instead of all-or-nothing. A not-yet-cached clip falls back
        // to the Web Audio chime (audio is optional by contract).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2,json}'],
        // ...but NOT the optional per-page story narration: those are long
        // full-sentence clips for many stories x pages x packs, which would
        // bloat the up-front install on the slow devices this app targets.
        // The runtime CacheFirst rule below still caches them after first play,
        // and offline reading degrades to word-by-word audio.
        // ...and NOT the three.js bundle (~519KB raw / ~129KB gzip). It is
        // already lazy at runtime, but the glob above swept it into the ATOMIC
        // precache, so every user - including the low-end phones that are
        // routed to the 2D arcade and will never mount WebGL - had to finish
        // downloading a 3D engine before the app became offline-ready. Same
        // all-or-nothing trap as the voice set above. The runtime rule below
        // caches it on first actual 3D use instead.
        globIgnores: ['**/audio/fidel/stories/**', '**/assets/three-vendor-*.js'],
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
              // Hold the whole voice set (letters + words, ~400 clips) now that
              // it caches at runtime rather than via the atomic precache.
              expiration: { maxEntries: 700, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            // The 3D engine, excluded from the atomic precache above. A device
            // that actually enters a 3D arcade caches it on first fetch and is
            // then offline-capable for 3D too; a device that never does pays
            // nothing. Content-hashed filename, so no expiry games needed.
            urlPattern: /\/assets\/three-vendor-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'three-vendor-v1',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 180 },
            },
          },
        ],
      },
      manifest: {
        name: 'eGeez: Easy Geez',
        short_name: 'eGeez',
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
