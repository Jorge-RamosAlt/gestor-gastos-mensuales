import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      // Archivos a pre-cachear (shell de la app)
      includeAssets: ['favicon.ico', 'vite.svg'],

      manifest: {
        name: 'Gestor de Gastos',
        short_name: 'Gastos',
        description: 'Gestor de gastos mensuales con sincronización en tiempo real',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      // Workbox: estrategia de cache para la app
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        // Firebase y Google APIs siempre se piden a la red (no cachear tokens)
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],

  optimizeDeps: {
    exclude: ['pdfjs-dist', 'tesseract.js'],
  },

  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-pdf':       ['pdfjs-dist'],
          'vendor-exceljs':   ['exceljs'],
          'vendor-jszip':     ['jszip'],
          'vendor-tesseract': ['tesseract.js'],
        },
      },
    },
  },
})
