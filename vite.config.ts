/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';
import { AKTIVE_KARTENQUELLE } from './src/karte/quelle.ts';

// Nur diese Node-Variable wird gebraucht; spart die Abhängigkeit @types/node.
declare const process: { env: Record<string, string | undefined> };

const THEMA_FARBE = '#2e4a1f';

export default defineConfig({
  // GitHub Pages liefert unter /<repo-name>/ aus; der Workflow setzt BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    preact(),
    basicSsl(),
    VitePWA({
      // Neue Version wird im Hintergrund geladen und sofort aktiviert (Seite lädt neu).
      // Unkritisch, weil jede Eingabe sofort gespeichert wird.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'HRVST',
        short_name: 'HRVST',
        description: 'Offline-Karte für die Olivenernte',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: THEMA_FARBE,
        theme_color: THEMA_FARBE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App-Hülle vollständig vorab speichern, damit sie ohne Netz startet.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Kartenkacheln: aus dem Cache, sonst Netz. Der Offline-Download schreibt in denselben Cache.
            urlPattern: new RegExp('^' + AKTIVE_KARTENQUELLE.kachelUrlPraefix.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')),
            handler: 'CacheFirst',
            options: {
              cacheName: AKTIVE_KARTENQUELLE.cacheName,
              cacheableResponse: { statuses: [200] },
              // Begrenzt nur die beim Herumschauen gecachten Kacheln; vorab geladene zählen nicht mit.
              expiration: { maxEntries: 1000, purgeOnQuotaError: true },
            },
          },
        ],
      },
    }),
  ],
  // Der MapLibre-Worker ist ein ES-Modul.
  worker: { format: 'es' },
  build: {
    // MapLibre allein ist ~1 MB; wird ohnehin vollständig für den Offline-Start vorab gespeichert.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
