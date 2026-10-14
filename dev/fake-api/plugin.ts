// Plugin Vite gắn server giả vào `npm run dev` (spec `canvas-outbox`).
// `apply: 'serve'` → bản build không có plugin, không có đường dẫn `/__fake-api`.
// KHÔNG có đăng nhập / phân quyền: chỉ dùng trên máy dev. `server.host: true` mở dev ra
// mạng LAN → máy khác cùng mạng gọi được, dữ liệu chỉ nằm trong bộ nhớ, tắt dev là mất.

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { FAKE_API_PREFIX } from '../../src/tools/canvas/sync/protocol';
import { createFakeServer, type FakeServer } from './server-core';

const MAX_BODY_BYTES = 20 * 1024 * 1024;

export function fakeApiPlugin(): Plugin {
  const core = createFakeServer();
  return {
    name: 'bibo-fake-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(FAKE_API_PREFIX, (req, res) => {
        handle(core, req, res).catch((err: unknown) => {
          sendJson(res, 500, { error: err instanceof Error ? err.message : 'error' });
        });
      });
    },
  };
}

async function handle(core: FakeServer, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const path = (req.url ?? '/').split('?')[0];
  if (req.method === 'POST' && path === '/apply') {
    const { value, bytes } = await readJson(req);
    await sleep(core.getConfig().latencyMs);
    const result = core.apply(value, bytes);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'GET' && path === '/state') {
    sendJson(res, 200, core.getState());
    return;
  }
  if (req.method === 'POST' && path === '/config') {
    const next = core.setConfig((await readJson(req)).value);
    sendJson(res, next ? 200 : 400, next ?? { error: 'invalid config' });
    return;
  }
  if (req.method === 'POST' && path === '/reset') {
    core.reset();
    sendJson(res, 200, { ok: true });
    return;
  }
  sendJson(res, 404, { error: 'not found' });
}

/** Body JSON + số byte. Sai JSON / quá lớn → value undefined (server-core trả 400). */
async function readJson(req: IncomingMessage): Promise<{ value: unknown; bytes: number }> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buf.length;
    if (size > MAX_BODY_BYTES) return { value: undefined, bytes: size };
    chunks.push(buf);
  }
  try {
    return { value: JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown, bytes: size };
  } catch {
    return { value: undefined, bytes: size };
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}
