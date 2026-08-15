import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // ── Registration strategy ─────────────────────────────────────────────
      // 'autoUpdate': service worker updates silently in the background.
      // The new SW activates on the next page load/refresh automatically.
      registerType: 'autoUpdate',

      // Include these files from /public in the SW precache manifest
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
      ],

      // ── Web App Manifest ──────────────────────────────────────────────────
      manifest: {
        name: 'Tebu.Co - Smart Sugarcane Logistics',
        short_name: 'Tebu.Co',
        description: 'Platform logistik tebu pintar — monitoring armada, SPTA digital, dan analitik kualitas nira realtime.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'id',
        categories: ['agriculture', 'productivity', 'utilities'],

        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            // Maskable variant for Android adaptive icons
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],

        // Android shortcut — deep-link to the QR Ticket tab
        shortcuts: [
          {
            name: 'Scan QR Ticket',
            short_name: 'Scan QR',
            description: 'Buka scanner SPTA digital',
            url: '/?tab=ticket',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },

      // ── Workbox caching strategies ────────────────────────────────────────
      workbox: {
        // Precache all Vite-built assets (JS chunks, CSS, index.html)
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}'],

        // Runtime caching rules (applied to non-precached network requests)
        runtimeCaching: [
          // ── Google Fonts stylesheets ──
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Google Fonts files (woff2) ──
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── External images (satellite map, avatar) ──
          {
            urlPattern: /^https:\/\/lh3\.googleusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'remote-images',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Supabase REST API — NetworkFirst so data stays fresh ──
          // Falls back to cached response when offline (shows last-known fleet state)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }, // 5 min cache
              cacheableResponse: { statuses: [0, 200] },
            },
          }
        ],
        // Automatically serve the precached index.html for all navigation requests (SPA routing offline)
        navigateFallback: '/index.html',
      },

      // ── Dev mode: inject SW in development too ────────────────────────────
      // Set to true to test PWA behaviour in `npm run dev`
      devOptions: {
        enabled: false,   // flip to true to debug SW in dev
        type: 'module',
      },
    }),
  ],

  server: {
    port: 5173,
    open: false,
  },
});
