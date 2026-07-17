import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['sounds/*.wav', 'icons/*.png', 'favicon.svg'],
      manifest: {
        name: 'Sopa de Knowledge',
        short_name: 'SopaKnowledge',
        description: 'Aprende hip hop mientras encuentras palabras',
        theme_color: '#151225',
        background_color: '#0d0b1a',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['education', 'games', 'music'],
        screenshots: [
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', form_factor: 'narrow', label: 'Gameplay' },
        ],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wav}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ],
})
