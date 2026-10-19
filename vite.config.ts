import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';
import { fakeApiPlugin } from './dev/fake-api/plugin';

export default defineConfig({
  plugins: [
    react(),
    // Server giả cho outbox (spec `canvas-outbox`). Chỉ chạy ở `npm run dev`.
    fakeApiPlugin(),
    // Service worker để mở app khi offline (spec `app-offline`). Chỉ bản build app:
    // dev không bật (devOptions mặc định tắt), landing build bằng config khác.
    VitePWA({
      // Bản mới chờ người dùng bấm "Tải lại", không tự tải lại giữa lúc gõ.
      registerType: 'prompt',
      // Tự đăng ký trong `src/lib/pwa/` qua module ảo, không chèn script vào HTML.
      injectRegister: false,
      // Cài như app (manifest + icon) để sau.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,ico,woff2}'],
        // Mọi đường dẫn điều hướng trả index.html → link board sâu mở được khi offline.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 3000,
    host: true,
    open: false,
  },

  build: {
    target: 'es2022',

    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // lucide-react KHÔNG gom vào đây: popup icon board (spec canvas-board-icon)
          // import cả bộ icon trong chunk lazy. Gom vào vendor (tải ngay) thì vendor
          // phình ~700 KB. Để Rollup tự chia: icon dùng sẵn đi theo chunk dùng nó.
          vendor: [
            'zustand',
            '@tanstack/react-query',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
          ],
        },
      },
    },
  },
});
