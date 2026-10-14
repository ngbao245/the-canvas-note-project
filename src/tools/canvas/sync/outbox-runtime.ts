// ============================================================
// Outbox chạy trong trình duyệt (spec `.kiro/specs/canvas-outbox/`)
// ============================================================
//
// - Nối lớp gửi thuần (outbox-sender.ts) với IndexedDB (api.ts), fetch tới server giả,
//   khoá giữa tab và BroadcastChannel.
// - 1 tab gửi: tab giữ Web Lock `bibo-canvas-outbox`. Tab đóng → khoá nhả → tab đang
//   chờ khoá nhận việc. Tab không gửi vẫn ghi outbox, báo tab gửi qua BroadcastChannel.
//   Trình duyệt không có Web Locks (mở dev qua IP LAN, không phải secure context) → tab tự gửi.
// - Mất mạng giả (bảng dev): cờ localStorage, mọi tab đọc chung, đổi ở tab nào cũng báo
//   tab gửi qua sự kiện `storage`.
// - Chỉ nạp bằng import() sau cờ DEV (useCanvasPersistence) → bản build không chứa file này.
// ============================================================

import { getOutboxStore } from '../api';
import type { CanvasObject } from '../types';
import { onTabMessage, postTabMessage } from '../lib/tab-channel';
import { setSyncPhase } from '../store/sync-status-store';
import { OUTBOX_RETRY_BASE_MS, OUTBOX_RETRY_MAX_MS, OUTBOX_WINDOW_MS } from './outbox-config';
import { newSyncId } from './outbox-entry';
import {
  createOutboxSender,
  type OutboxSender,
  type OutboxSenderTracer,
  type SyncPhase,
} from './outbox-sender';
import { setOutboxListener } from './outbox-signal';
import {
  FAKE_API_PREFIX,
  parseApplyResponse,
  type ApplyRequest,
  type ApplyResponse,
  type SyncOp,
} from './protocol';

const LOCK_NAME = 'bibo-canvas-outbox';
const FAKE_OFFLINE_KEY = 'bibo-dev-fake-offline';
const clientId = newSyncId();

let sender: OutboxSender | null = null;
let tracer: OutboxSenderTracer | null = null;

// Bảng dev gắn tracer lúc nào cũng được; lớp gửi tạo sớm hơn nên chuyển tiếp qua biến.
const proxyTracer: OutboxSenderTracer = {
  onRequest: (size, info) => tracer?.onRequest(size, info),
  onResponse: (ms, res) => tracer?.onResponse(ms, res),
  onError: (ms) => tracer?.onError(ms),
  onRetry: (delay) => tracer?.onRetry(delay),
  onBytes: (bytes) => tracer?.onBytes?.(bytes),
};

/** Chỉ bảng dev gọi. Truyền null để gỡ. */
export function attachOutboxTracer(next: OutboxSenderTracer | null): void {
  tracer = next;
}

export function isFakeOffline(): boolean {
  try {
    return localStorage.getItem(FAKE_OFFLINE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Bảng dev: giả lập mất mạng phía máy (server không giả được "không tới được"). */
export function setFakeOffline(offline: boolean): void {
  try {
    if (offline) localStorage.setItem(FAKE_OFFLINE_KEY, '1');
    else localStorage.removeItem(FAKE_OFFLINE_KEY);
  } catch {
    // localStorage bị chặn: bỏ qua, công cụ dev.
  }
  sender?.recheckOnline();
}

function isOnline(): boolean {
  return navigator.onLine && !isFakeOffline();
}

async function send(ops: SyncOp<CanvasObject>[], info: { keepalive: boolean }): Promise<ApplyResponse> {
  const payload: ApplyRequest<CanvasObject> = { clientId, ops };
  const body = JSON.stringify(payload);
  if (tracer?.onBytes) tracer.onBytes(new TextEncoder().encode(body).length);
  const res = await fetch(`${FAKE_API_PREFIX}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    // Đóng tab: request vẫn chạy sau khi trang đóng (giới hạn ~64KB body, quá thì trình duyệt từ chối).
    keepalive: info.keepalive,
  });
  if (!res.ok) throw new Error(`[outbox] server trả ${res.status}`);
  const parsed = parseApplyResponse(await res.json());
  if (!parsed) throw new Error('[outbox] server trả sai dạng');
  return parsed;
}

function publishPhase(phase: SyncPhase): void {
  setSyncPhase(phase);
  postTabMessage({ type: 'sync-status', phase });
}

/** Gắn 1 lần ở route canvas. Trả hàm dừng. */
export function startOutbox(): () => void {
  const store = getOutboxStore();
  const abort = new AbortController();
  let releaseLock: (() => void) | null = null;
  let stopped = false;

  const handleChange = (urgent: boolean) => {
    if (!sender) return;
    sender.notify();
    if (urgent) sender.flush();
  };

  setOutboxListener((urgent) => {
    if (sender) handleChange(urgent);
    else postTabMessage({ type: 'outbox', urgent });
  });

  const unsubTab = onTabMessage((msg) => {
    if (msg.type === 'outbox') handleChange(msg.urgent);
    else if (msg.type === 'sync-status' && !sender) setSyncPhase(msg.phase);
  });

  const onOnline = () => sender?.recheckOnline();
  const onStorage = (e: StorageEvent) => {
    if (e.key === FAKE_OFFLINE_KEY) sender?.recheckOnline();
  };
  const onPageHide = () => sender?.beacon();
  window.addEventListener('online', onOnline);
  window.addEventListener('storage', onStorage);
  window.addEventListener('pagehide', onPageHide);

  // Giữ khoá tới khi dừng: promise chỉ xong khi gọi releaseLock.
  const becomeSender = () =>
    new Promise<void>((resolve) => {
      if (stopped) {
        resolve();
        return;
      }
      releaseLock = resolve;
      sender = createOutboxSender<CanvasObject>({
        loadOps: () => store.loadOps(),
        send,
        ack: (res) => store.ack(res),
        isOnline,
        onPhase: publishPhase,
        tracer: proxyTracer,
        windowMs: OUTBOX_WINDOW_MS,
        retryBaseMs: OUTBOX_RETRY_BASE_MS,
        retryMaxMs: OUTBOX_RETRY_MAX_MS,
      });
      // Còn mục từ lần trước (đóng tab giữa chừng, tab gửi cũ vừa đóng) → gửi tiếp.
      void store
        .count()
        .then((n) => {
          if (n > 0) sender?.notify();
        })
        .catch(() => {});
    });

  const locks: LockManager | undefined = navigator.locks;
  if (locks) {
    locks.request(LOCK_NAME, { signal: abort.signal }, becomeSender).catch(() => {
      // Dừng trước khi nhận khoá → AbortError, bình thường.
    });
  } else {
    void becomeSender();
  }

  return () => {
    stopped = true;
    abort.abort();
    sender?.dispose();
    sender = null;
    releaseLock?.();
    releaseLock = null;
    setOutboxListener(null);
    unsubTab();
    window.removeEventListener('online', onOnline);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('pagehide', onPageHide);
  };
}
