// ============================================================
// Hàng đợi ghi kiểu Google Docs (pure, không biết IndexedDB)
// ============================================================
//
// - Mỗi lúc chỉ 1 lô đang ghi. Thay đổi mới trong lúc đó gom vào "đang chờ".
//   Cùng 1 id chỉ giữ thao tác mới nhất (put sau đè put trước, delete sau đè put
//   → object đã xoá không bị ghi lại).
// - Lô xong mà còn "đang chờ" thì ghi tiếp ngay. Không debounce.
// - Lô lỗi: dữ liệu giữ lại trong "đang chờ" (trừ khi đã có bản mới hơn) rồi DỪNG.
//   Lần enqueue / flush sau mới thử lại, tránh vòng lặp lỗi. Lỗi không ném ra cho
//   caller (dữ liệu chưa mất, chỉ chưa xuống đĩa); báo qua `onError`.
// - `flush({ urgent: true })` (ẩn / đóng tab): không chờ lô đang ghi xong mà ghi
//   phần đang chờ ngay song song. IndexedDB chạy các transaction ghi cùng store theo
//   thứ tự tạo, nên lô gấp vẫn xuống sau lô trước → thứ tự đúng.
// - Kênh (`text` / `props`) chỉ là nhãn đi kèm. Bây giờ ghi vẫn là cả object;
//   sau này `canvas-sync` / Yjs dùng kênh để biết phần nào cần gửi.
// ============================================================

export type WriteChannel = 'text' | 'props';

export type WriteOp<T> = { kind: 'put'; value: T } | { kind: 'delete' };

export interface WriteBatch<T> {
  puts: Array<{ id: string; value: T; channels: ReadonlySet<WriteChannel> }>;
  deletes: string[];
}

export interface WriteQueue<T> {
  /** Đưa 1 thao tác vào hàng. Promise xong khi lô chứa nó chạy xong (lỗi cũng resolve). */
  enqueue(id: string, op: WriteOp<T>, channel: WriteChannel): Promise<void>;
  /** Chờ phần đang chờ + đang ghi chạy xong. `urgent`: ghi phần đang chờ ngay, không xếp hàng. */
  flush(options?: { urgent?: boolean }): Promise<void>;
  /** Thao tác chưa chắc đã xuống đĩa (đang ghi + đang chờ, mới đè cũ). */
  snapshot(): Map<string, WriteOp<T>>;
}

interface Entry<T> {
  op: WriteOp<T>;
  channels: Set<WriteChannel>;
  waiters: Array<() => void>;
}

type Batch<T> = Map<string, Entry<T>>;

export function createWriteQueue<T>(
  write: (batch: WriteBatch<T>) => Promise<void>,
  onError?: (err: unknown) => void,
): WriteQueue<T> {
  let pending: Batch<T> = new Map();
  /** Lô đang ghi, theo thứ tự bắt đầu (lô thường + lô gấp). */
  const inflight: Array<Batch<T>> = [];
  let draining = false;
  let flushWaiters: Array<() => void> = [];

  function idle(): boolean {
    return inflight.length === 0 && pending.size === 0;
  }

  function notifyIfIdle(): void {
    if (inflight.length > 0) return;
    // Còn "đang chờ" sau lỗi: coi như xong lượt này, không treo người chờ flush.
    const list = flushWaiters;
    flushWaiters = [];
    for (const fn of list) fn();
  }

  /** Ghi 1 lô. Trả false nếu lỗi (dữ liệu đã đưa lại vào "đang chờ"). */
  async function run(batch: Batch<T>): Promise<boolean> {
    inflight.push(batch);
    let ok = true;
    try {
      await write(toBatch(batch));
    } catch (err) {
      ok = false;
      for (const [id, e] of batch) {
        if (!pending.has(id)) pending.set(id, { op: e.op, channels: e.channels, waiters: [] });
      }
      onError?.(err);
    }
    inflight.splice(inflight.indexOf(batch), 1);
    for (const e of batch.values()) for (const w of e.waiters) w();
    return ok;
  }

  function kick(): void {
    if (draining || pending.size === 0) return;
    draining = true;
    void (async () => {
      while (pending.size > 0) {
        const batch = pending;
        pending = new Map();
        if (!(await run(batch))) break;
      }
      draining = false;
      notifyIfIdle();
    })();
  }

  return {
    enqueue(id, op, channel) {
      return new Promise<void>((resolve) => {
        const prev = pending.get(id);
        const channels = new Set(prev?.channels);
        channels.add(channel);
        const waiters = prev ? prev.waiters : [];
        waiters.push(resolve);
        pending.set(id, { op, channels, waiters });
        kick();
      });
    },

    flush(options) {
      if (idle()) return Promise.resolve();
      return new Promise<void>((resolve) => {
        flushWaiters.push(resolve);
        if (options?.urgent && draining && pending.size > 0) {
          const batch = pending;
          pending = new Map();
          void run(batch).then(notifyIfIdle);
        } else {
          kick();
          if (!draining) notifyIfIdle();
        }
      });
    },

    snapshot() {
      const out = new Map<string, WriteOp<T>>();
      for (const batch of inflight) for (const [id, e] of batch) out.set(id, e.op);
      for (const [id, e] of pending) out.set(id, e.op);
      return out;
    },
  };
}

function toBatch<T>(entries: Batch<T>): WriteBatch<T> {
  const batch: WriteBatch<T> = { puts: [], deletes: [] };
  for (const [id, e] of entries) {
    if (e.op.kind === 'put') batch.puts.push({ id, value: e.op.value, channels: e.channels });
    else batch.deletes.push(id);
  }
  return batch;
}
