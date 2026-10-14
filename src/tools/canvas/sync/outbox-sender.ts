// ============================================================
// Lớp gửi outbox (thuần: không biết IndexedDB, fetch hay tab)
// ============================================================
//
// Trạng thái (design.md của spec `canvas-outbox`):
//   idle       — không có mục chờ
//   collecting — đã có mục, chờ hết cửa sổ (tính từ mục đầu, KHÔNG gia hạn khi có mục mới)
//   sending    — 1 request đang bay. Mục mới trong lúc này đợi lượt sau
//   retry      — sau lỗi, chờ 1s, 2s, 4s… tối đa trần rồi thử lại
//   offline    — mất mạng, chờ có mạng lại
//
// - Mỗi lần gửi đọc HẾT outbox → 1 request (mọi object). Không gửi từng thay đổi.
// - Xác nhận: chỉ xoá mục có mã gửi khớp (`ack` lo). Còn mục → mở cửa sổ mới.
// - Gửi gấp (`flush`): bỏ phần còn lại của cửa sổ. Đang bay → gửi ngay khi xong.
//   Đang chờ thử lại thì KHÔNG phá nhịp chờ (tránh dội server đang lỗi).
// - `beacon` (đóng tab): gửi phần đang chờ, không chờ trả lời, không xoá mục. Lần mở
//   sau gửi lại, server bỏ trùng theo mã gửi.
// ============================================================

import type { ApplyResponse, SyncOp } from './protocol';

export type SenderState = 'idle' | 'collecting' | 'sending' | 'retry' | 'offline';
export type SyncPhase = 'local' | 'synced' | 'unsynced';

/** Theo dõi để đo (bảng dev). Không được ném lỗi. */
export interface OutboxSenderTracer {
  onRequest(size: number, info: { urgent: boolean; keepalive: boolean }): void;
  onResponse(ms: number, res: ApplyResponse): void;
  onError(ms: number): void;
  onRetry(delayMs: number): void;
  /** Kích thước body request (byte). Lớp gửi thật báo, lớp thuần không biết. */
  onBytes?(bytes: number): void;
}

export interface OutboxSenderDeps<T> {
  loadOps(): Promise<SyncOp<T>[]>;
  /** Ném lỗi khi server lỗi hoặc không tới được. */
  send(ops: SyncOp<T>[], info: { keepalive: boolean }): Promise<ApplyResponse>;
  /** Xoá mục có mã khớp, chuyển mục server báo thiếu sang create. Trả số mục còn lại. */
  ack(res: ApplyResponse): Promise<number>;
  isOnline(): boolean;
  onPhase?(phase: SyncPhase): void;
  tracer?: OutboxSenderTracer;
  windowMs: number;
  retryBaseMs: number;
  retryMaxMs: number;
}

export interface OutboxSender {
  /** Có mục mới trong outbox. */
  notify(): void;
  /** Gửi ngay phần đang chờ (thoát sửa, đổi board, ẩn tab). */
  flush(): void;
  /** Gọi khi trạng thái mạng có thể đã đổi. */
  recheckOnline(): void;
  /** Đóng tab: cố gửi, không chờ trả lời. */
  beacon(): void;
  dispose(): void;
  getState(): SenderState;
}

export function createOutboxSender<T>(deps: OutboxSenderDeps<T>): OutboxSender {
  let state: SenderState = 'idle';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  /** Có mục mới kể từ lúc lượt gửi hiện tại đọc outbox. */
  let dirty = false;
  let urgentAfter = false;
  let disposed = false;

  const phase = (p: SyncPhase) => deps.onPhase?.(p);

  function clearTimer(): void {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  }

  function schedule(ms: number): void {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      void run(false);
    }, ms);
  }

  function retryLater(): void {
    failures++;
    const delay = Math.min(deps.retryBaseMs * 2 ** (failures - 1), deps.retryMaxMs);
    state = 'retry';
    phase('unsynced');
    deps.tracer?.onRetry(delay);
    schedule(delay);
  }

  async function run(urgent: boolean): Promise<void> {
    if (disposed) return;
    if (!deps.isOnline()) {
      state = 'offline';
      phase('unsynced');
      return;
    }
    state = 'sending';
    dirty = false;
    let remaining = 0;
    try {
      const ops = await deps.loadOps();
      if (disposed) return;
      if (ops.length > 0) {
        deps.tracer?.onRequest(ops.length, { urgent, keepalive: false });
        const t0 = performance.now();
        let res: ApplyResponse;
        try {
          res = await deps.send(ops, { keepalive: false });
        } catch (err) {
          deps.tracer?.onError(performance.now() - t0);
          throw err;
        }
        deps.tracer?.onResponse(performance.now() - t0, res);
        remaining = await deps.ack(res);
      }
    } catch {
      if (!disposed) retryLater();
      return;
    }
    if (disposed) return;
    failures = 0;
    if (remaining > 0 || dirty) {
      if (urgentAfter) {
        urgentAfter = false;
        return run(true);
      }
      state = 'collecting';
      phase('local');
      schedule(deps.windowMs);
      return;
    }
    urgentAfter = false;
    state = 'idle';
    phase('synced');
  }

  return {
    notify() {
      if (disposed) return;
      dirty = true;
      if (state !== 'idle') return;
      state = 'collecting';
      phase(deps.isOnline() ? 'local' : 'unsynced');
      schedule(deps.windowMs);
    },

    flush() {
      if (disposed) return;
      if (state === 'collecting') {
        clearTimer();
        void run(true);
      } else if (state === 'sending') {
        urgentAfter = true;
      }
    },

    recheckOnline() {
      if (disposed) return;
      if (state === 'offline' && deps.isOnline()) void run(true);
    },

    beacon() {
      if (disposed || !deps.isOnline()) return;
      void deps
        .loadOps()
        .then((ops) => {
          if (ops.length === 0) return;
          deps.tracer?.onRequest(ops.length, { urgent: true, keepalive: true });
          return deps.send(ops, { keepalive: true });
        })
        .catch(() => {
          // Chỉ là cố gắng: mục còn trong outbox, lần mở sau gửi lại.
        });
    },

    dispose() {
      disposed = true;
      clearTimer();
    },

    getState: () => state,
  };
}
