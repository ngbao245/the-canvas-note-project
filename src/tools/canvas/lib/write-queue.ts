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
// - `tracer` (tuỳ chọn): báo sự kiện cho bảng đo lúc dev (`src/dev/`). Không truyền
//   thì hàng đợi chạy như cũ. Tracer không được ném lỗi vào luồng ghi.
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
  /** Id này còn thao tác chưa chắc đã xuống đĩa không. Như `snapshot().has(id)`, không dựng Map. */
  has(id: string): boolean;
}

/** Theo dõi hàng đợi để đo (chỉ dùng lúc dev). `batchId` nối lô bắt đầu với lô xong. */
export interface WriteQueueTracer {
  onEnqueue(channel: WriteChannel, kind: WriteOp<unknown>['kind']): void;
  onBatchStart(batchId: number, size: number, urgent: boolean): void;
  onBatchEnd(batchId: number, ok: boolean): void;
}

interface Entry<T> {
  op: WriteOp<T>;
  channels: Set<WriteChannel>;
  waiters: Array<() => void>;
  /** Số thứ tự lúc vào hàng. Lô lỗi chỉ đưa lại nếu vẫn là bản mới nhất của id. */
  seq: number;
}

type Batch<T> = Map<string, Entry<T>>;

export function createWriteQueue<T>(
  write: (batch: WriteBatch<T>) => Promise<void>,
  onError?: (err: unknown) => void,
  tracer?: WriteQueueTracer,
): WriteQueue<T> {
  let pending: Batch<T> = new Map();
  let batchSeq = 0;
  /** Lô đang ghi, theo thứ tự bắt đầu (lô thường + lô gấp). */
  const inflight: Array<Batch<T>> = [];
  let draining = false;
  let flushWaiters: Array<() => void> = [];
  /** id → seq của bản mới nhất từng vào hàng. */
  const latest = new Map<string, number>();
  let seq = 0;

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
  async function run(batch: Batch<T>, urgent = false): Promise<boolean> {
    inflight.push(batch);
    const batchId = ++batchSeq;
    tracer?.onBatchStart(batchId, batch.size, urgent);
    let ok = true;
    try {
      await write(toBatch(batch));
    } catch (err) {
      ok = false;
      // Lô gấp chạy song song có thể đã ghi bản mới hơn: chỉ đưa lại bản mới nhất,
      // không thì lần ghi sau đè bản cũ lên đĩa.
      for (const [id, e] of batch) {
        if (latest.get(id) === e.seq && !pending.has(id)) {
          pending.set(id, { ...e, waiters: [] });
        }
      }
      onError?.(err);
    }
    tracer?.onBatchEnd(batchId, ok);
    inflight.splice(inflight.indexOf(batch), 1);
    for (const [id, e] of batch) {
      for (const w of e.waiters) w();
      // Đã xuống đĩa (hoặc bị bản mới thay): không giữ seq nữa cho map khỏi phình.
      if (latest.get(id) === e.seq && !pending.has(id)) latest.delete(id);
    }
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
        const entrySeq = ++seq;
        latest.set(id, entrySeq);
        pending.set(id, { op, channels, waiters, seq: entrySeq });
        tracer?.onEnqueue(channel, op.kind);
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
          void run(batch, true).then(notifyIfIdle);
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

    has(id) {
      return pending.has(id) || inflight.some((batch) => batch.has(id));
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
