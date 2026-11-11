import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [VitePWA({
    manifest: false,
    injectRegister: null,
    workbox: {
      globPatterns: ['**/*.{html,js,css,woff2,webmanifest,png,svg}'],
      navigateFallback: 'index.html',
      cleanupOutdatedCaches: true,
      skipWaiting: false,
      clientsClaim: false
    }
  })]
});
