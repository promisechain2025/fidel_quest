import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        // Audio clips are optional drop-in assets (see the header comment in
        // src/pages/AmharicFidelGame.jsx); cache them at runtime rather than
        // precaching files that may not exist yet.
        runtimeCaching: [
          {
            urlPattern: /\/audio\/fidel\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fidel-audio',
              expiration: { maxEntries: 300 },
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
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
})
