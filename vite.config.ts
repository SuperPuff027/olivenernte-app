/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

const THEMA_FARBE = '#2e4a1f';

export default defineConfig({
  plugins: [
    preact(),
    basicSsl(),
    VitePWA({
      // Neue Version wird im Hintergrund geladen und sofort aktiviert (Seite lädt neu).
      // Unkritisch, weil jede Eingabe sofort gespeichert wird.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Olivenernte',
        short_name: 'Olivenernte',
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
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
