import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Build landing riêng (domain landing), tách khỏi app (domain app.).
 * App vẫn build bằng vite.config.ts như cũ, file đó không đổi.
 *
 *   npm run dev:landing    → http://localhost:3001
 *   npm run build:landing  → dist-landing/index.html
 *
 * Link "Mở bản đầy đủ" đọc VITE_APP_URL (vd https://app.canvasnote.xxx).
 */

/** Entry tên landing.html (index.html đã là của app). Dev: phục vụ ở `/`. Build: đổi thành index.html. */
function landingHtml(): Plugin {
  return {
    name: 'landing-html',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url?.startsWith('/?')) req.url = '/landing.html';
        next();
      });
    },
    // Vite sinh HTML ở cuối pha bundle, nên đổi tên sau khi đã ghi xuống đĩa.
    writeBundle(options) {
      const dir = options.dir ?? path.resolve(__dirname, 'dist-landing');
      const from = path.join(dir, 'landing.html');
      if (fs.existsSync(from)) fs.renameSync(from, path.join(dir, 'index.html'));
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_');
  if (command === 'build' && !env.VITE_APP_URL) {
    console.warn('[landing] Thiếu VITE_APP_URL: link sang app sẽ trỏ http://localhost:3000.');
  }

  return {
    plugins: [react(), landingHtml()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: { port: 3001, host: true, open: false },
    preview: { port: 3001 },
    build: {
      target: 'es2022',
      outDir: 'dist-landing',
      rollupOptions: {
        input: path.resolve(__dirname, 'landing.html'),
      },
    },
  };
});
