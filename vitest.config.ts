import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Config riêng cho test: không nạp plugin PWA / server giả của vite.config.ts.
// Chỉ quét src/ và dev/: trong .kiro/skills/ có file *.test.mjs chạy bằng node:test, không phải vitest.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'dev/**/*.test.ts'],
    environment: 'node',
  },
});
