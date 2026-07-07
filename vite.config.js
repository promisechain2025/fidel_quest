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
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      workbox: {
        // Audio clips are optional drop-in assets (see the header comment in
        // src/pages/AmharicFidelGame.jsx); cache them at runtime rather than
        // precaching files that may not exist yet.
        runtimeCaching: [
          {
            // Letter/word audio: serve instantly from cache but refresh in the
            // background, so a re-recorded clip (same filename) rolls out on the
            // next play instead of being pinned forever (CacheFirst's trap). The
            // versioned cache name also orphans any older cache on deploy.
            urlPattern: /\/audio\/fidel\/.*\.mp3$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fidel-audio-v2',
              expiration: { maxEntries: 320 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            // Ethiopic font files: immutable + versioned URLs, cache hard so
            // Ge'ez renders correctly and works offline after first load.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
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
