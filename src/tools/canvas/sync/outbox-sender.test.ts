import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOutboxSender, type SyncPhase } from './outbox-sender';
import type { SyncOp } from './protocol';

/**
 * Outbox giả trong bộ nhớ: mỗi object 1 mục, sửa lại thì đổi mã gửi (giống outbox thật).
 * Đồng hồ giả của vitest điều khiển cửa sổ gom và thời gian chờ thử lại.
 */
function setup(opts: { sendDelayMs?: number } = {}) {
  const entries = new Map<string, string>();
  let rev = 0;
  const starts: Array<{ ops: SyncOp[]; keepalive: boolean }> = [];
  const phases: SyncPhase[] = [];
  const retries: number[] = [];
  const env = { fail: false, online: true };

  const sender = createOutboxSender({
    loadOps: async (): Promise<SyncOp[]> =>
      [...entries].map(([objectId, opId]) => ({
        opId,
        objectId,
        kind: 'patch' as const,
        baseVersion: 0,
        version: 1,
        updatedAt: 't',
        groupId: 'g',
        patch: { set: { geometry: {} }, unset: [] },
      })),
    send: async (ops, { keepalive }) => {
      starts.push({ ops, keepalive });
      if (opts.sendDelayMs) await new Promise((r) => setTimeout(r, opts.sendDelayMs));
      if (env.fail) throw new Error('500');
      return { acceptedOpIds: ops.map((o) => o.opId), missingObjectIds: [], duplicates: 0, versionConflicts: 0 };
    },
    ack: async ({ acceptedOpIds }) => {
      const set = new Set(acceptedOpIds);
      for (const [id, opId] of entries) if (set.has(opId)) entries.delete(id);
      return entries.size;
    },
    isOnline: () => env.online,
    onPhase: (p) => phases.push(p),
    tracer: {
      onRequest: () => {},
      onResponse: () => {},
      onError: () => {},
      onRetry: (ms) => retries.push(ms),
    },
    windowMs: 1000,
    retryBaseMs: 1000,
    retryMaxMs: 30_000,
  });

  const write = (id: string) => {
    entries.set(id, `${id}#${++rev}`);
    sender.notify();
  };

  return { sender, entries, starts, phases, retries, env, write };
}

const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('gom theo cửa sổ 1s', () => {
  it('5 thay đổi trong 1s → đúng 1 request lúc hết cửa sổ', async () => {
    const t = setup();
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      t.write(id);
      await tick(100);
    }
    await tick(499);
    expect(t.starts).toHaveLength(0);
    await tick(1);
    expect(t.starts).toHaveLength(1);
    expect(t.starts[0].ops).toHaveLength(5);
    expect(t.entries.size).toBe(0);
    expect(t.phases.at(-1)).toBe('synced');
  });

  it('cửa sổ tính từ thay đổi đầu, không gia hạn khi có thay đổi mới', async () => {
    const t = setup();
    t.write('a');
    await tick(900);
    t.write('b');
    await tick(100);
    expect(t.starts).toHaveLength(1);
    expect(t.starts[0].ops).toHaveLength(2);
  });

  it('gõ liên tục 10s (mỗi 100ms) → khoảng 10 request, không phải 100', async () => {
    const t = setup();
    for (let i = 0; i < 100; i++) {
      t.write('note');
      await tick(100);
    }
    await tick(1000);
    expect(t.starts.length).toBeGreaterThanOrEqual(8);
    expect(t.starts.length).toBeLessThanOrEqual(11);
    expect(t.entries.size).toBe(0);
  });
});

describe('gửi gấp', () => {
  it('đang gom → gửi ngay, không chờ hết cửa sổ', async () => {
    const t = setup();
    t.write('a');
    t.sender.flush();
    await tick(0);
    expect(t.starts).toHaveLength(1);
  });

  it('đang bay → gửi lượt sau ngay khi request đang bay xong', async () => {
    const t = setup({ sendDelayMs: 500 });
    t.write('a');
    await tick(1000);
    expect(t.starts).toHaveLength(1);
    t.write('b');
    t.sender.flush();
    await tick(500);
    expect(t.starts).toHaveLength(2);
    expect(t.starts[1].ops.map((o) => o.objectId)).toEqual(['b']);
  });

  it('đang chờ thử lại sau lỗi → không phá nhịp chờ', async () => {
    const t = setup();
    t.env.fail = true;
    t.write('a');
    await tick(1000);
    expect(t.starts).toHaveLength(1);
    t.sender.flush();
    await tick(0);
    expect(t.starts).toHaveLength(1);
  });
});

describe('lỗi và thử lại', () => {
  it('lỗi → giữ mục, chờ 1s, 2s, 4s…; hết lỗi thì gửi được và xoá mục', async () => {
    const t = setup();
    t.env.fail = true;
    t.write('a');
    await tick(1000); // lần 1
    await tick(1000); // lần 2 (chờ 1s)
    await tick(2000); // lần 3 (chờ 2s)
    await tick(4000); // lần 4 (chờ 4s)
    expect(t.starts).toHaveLength(4);
    expect(t.entries.size).toBe(1);
    expect(t.phases.at(-1)).toBe('unsynced');
    t.env.fail = false;
    await tick(8000);
    expect(t.starts).toHaveLength(5);
    expect(t.entries.size).toBe(0);
    expect(t.phases.at(-1)).toBe('synced');
  });

  it('thời gian chờ tối đa 30s', async () => {
    const t = setup();
    t.env.fail = true;
    t.write('a');
    await tick(1000);
    for (let i = 0; i < 7; i++) await tick(30_000);
    expect(t.retries.slice(0, 7)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });

  it('sửa tiếp trong lúc request đang bay → mục không bị xoá nhầm, lượt sau gửi bản mới', async () => {
    const t = setup({ sendDelayMs: 500 });
    t.write('a');
    await tick(1000);
    const firstOpId = t.starts[0].ops[0].opId;
    t.write('a'); // đổi mã gửi
    await tick(500);
    expect(t.entries.size).toBe(1);
    await tick(1000);
    expect(t.starts).toHaveLength(2);
    expect(t.starts[1].ops[0].opId).not.toBe(firstOpId);
    await tick(500);
    expect(t.entries.size).toBe(0);
  });
});

describe('mất mạng', () => {
  it('offline → không gửi; có mạng lại → gửi ngay phần đã dồn', async () => {
    const t = setup();
    t.env.online = false;
    t.write('a');
    t.write('b');
    await tick(5000);
    expect(t.starts).toHaveLength(0);
    expect(t.phases.at(-1)).toBe('unsynced');
    t.env.online = true;
    t.sender.recheckOnline();
    await tick(0);
    expect(t.starts).toHaveLength(1);
    expect(t.starts[0].ops).toHaveLength(2);
  });
});

describe('đóng tab', () => {
  it('beacon gửi kiểu keepalive, không xoá mục (lần sau gửi lại, server bỏ trùng)', async () => {
    const t = setup();
    t.write('a');
    t.sender.beacon();
    await tick(0);
    expect(t.starts).toEqual([expect.objectContaining({ keepalive: true })]);
    expect(t.entries.size).toBe(1);
  });
});
