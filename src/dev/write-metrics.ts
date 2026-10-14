// ============================================================
// Bộ thu số đo hàng đợi ghi object + outbox gửi server (CHỈ dev, spec `dev-panel`, `canvas-outbox`)
// ============================================================
//
// - Gắn vào hàng đợi qua `attachWriteQueueTracer` (api.ts) và lớp gửi qua
//   `attachOutboxTracer` (sync/outbox-runtime.ts). Mỗi sự kiện chỉ đẩy vào
//   mảng + đếm, không render: đo không được làm chậm chính thứ đang đo.
// - Luôn ghi 1 bản "liên tục" từ lúc gắn. Thêm 1 bản "phiên" khi bấm Bắt đầu.
// - Bảng đọc qua `subscribe` + `getVersion` (useSyncExternalStore). Báo đổi tối đa
//   ~4 lần / giây để bảng không render lại mỗi phím gõ.
// - Mô phỏng "gom theo cửa sổ W": tính lại từ giờ các lần đưa vào, không đụng hàng đợi.
// ============================================================

import { attachWriteQueueTracer } from '@/tools/canvas/api';
import type { WriteChannel, WriteQueueTracer } from '@/tools/canvas/lib/write-queue';
import { attachOutboxTracer } from '@/tools/canvas/sync/outbox-runtime';
import type { OutboxSenderTracer } from '@/tools/canvas/sync/outbox-sender';

/** Cửa sổ gom dùng để mô phỏng (ms). 0 = số lô thật đã đo. */
export const SIM_WINDOWS = [0, 300, 1000, 2000] as const;

/** Giữ tối đa bấy nhiêu sự kiện cho bản liên tục; số đếm tổng vẫn đúng. */
const MAX_EVENTS = 20_000;
const NOTIFY_MS = 250;
const LONG_TASK_MS = 50;

interface BatchRecord {
  start: number;
  end: number;
  size: number;
  ok: boolean;
  urgent: boolean;
}

interface Recording {
  label: string;
  startedAt: number;
  stoppedAt: number | null;
  enqueueTimes: number[];
  enqueueText: number;
  enqueueProps: number;
  enqueueDelete: number;
  batches: BatchRecord[];
  batchCount: number;
  /** Mảng bị cắt bớt (chỉ bản liên tục) → mô phỏng chỉ trên phần còn giữ. */
  truncated: boolean;
  longTasks: number[];
  outbox: OutboxRecording;
}

interface OutboxRecording {
  requests: number;
  urgent: number;
  keepalive: number;
  sizes: number[];
  durations: number[];
  bytes: number[];
  errors: number;
  retries: number;
  duplicates: number;
  conflicts: number;
}

export interface OutboxSummary {
  requests: number;
  urgent: number;
  keepalive: number;
  opsSent: number;
  avgOps: number;
  maxOps: number;
  avgMs: number;
  maxMs: number;
  /** Byte body request: tổng, trung bình, lớn nhất. */
  totalBytes: number;
  avgBytes: number;
  maxBytes: number;
  errors: number;
  retries: number;
  duplicates: number;
  conflicts: number;
}

export interface WriteSummary {
  label: string;
  durationMs: number;
  enqueueText: number;
  enqueueProps: number;
  enqueueDelete: number;
  enqueueTotal: number;
  batches: number;
  failedBatches: number;
  urgentBatches: number;
  writtenObjects: number;
  avgBatchSize: number;
  maxBatchSize: number;
  /** 0..1. Phần lần đưa vào bị bản mới hơn của CÙNG id thay (không phải ghi lại). */
  coalesceRatio: number;
  /** 0..1. Phần transaction tiết kiệm so với "mỗi lần đưa vào 1 transaction" (gộp cả khác id). */
  txReduction: number;
  avgWriteMs: number;
  maxWriteMs: number;
  /** null = trình duyệt không hỗ trợ đo long task. */
  longTaskCount: number | null;
  longTaskMaxMs: number | null;
  sim: Array<{ windowMs: number; writes: number }>;
  truncated: boolean;
  running: boolean;
  outbox: OutboxSummary;
}

// --- Trạng thái module ---
let attached = false;
let live: Recording = newRecording('live');
let session: Recording | null = null;
let results: WriteSummary[] = [];
/** batchId → giờ bắt đầu + kích thước, chờ lô xong. */
const openBatches = new Map<number, { start: number; size: number; urgent: boolean }>();
let longTaskSupported = false;

let version = 0;
const listeners = new Set<() => void>();
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

function newRecording(label: string): Recording {
  return {
    label,
    startedAt: performance.now(),
    stoppedAt: null,
    enqueueTimes: [],
    enqueueText: 0,
    enqueueProps: 0,
    enqueueDelete: 0,
    batches: [],
    batchCount: 0,
    truncated: false,
    longTasks: [],
    outbox: {
      requests: 0,
      urgent: 0,
      keepalive: 0,
      sizes: [],
      durations: [],
      bytes: [],
      errors: 0,
      retries: 0,
      duplicates: 0,
      conflicts: 0,
    },
  };
}

function targets(): Recording[] {
  return session ? [live, session] : [live];
}

function scheduleNotify(): void {
  if (notifyTimer) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    bump();
  }, NOTIFY_MS);
}

function bump(): void {
  version++;
  for (const fn of listeners) fn();
}

function pushCapped<T>(rec: Recording, list: T[], item: T): void {
  list.push(item);
  if (list.length > MAX_EVENTS) {
    list.splice(0, list.length - MAX_EVENTS);
    rec.truncated = true;
  }
}

const tracer: WriteQueueTracer = {
  onEnqueue(channel: WriteChannel, kind) {
    const t = performance.now();
    for (const rec of targets()) {
      pushCapped(rec, rec.enqueueTimes, t);
      if (kind === 'delete') rec.enqueueDelete++;
      else if (channel === 'text') rec.enqueueText++;
      else rec.enqueueProps++;
    }
    scheduleNotify();
  },
  onBatchStart(batchId, size, urgent) {
    openBatches.set(batchId, { start: performance.now(), size, urgent });
  },
  onBatchEnd(batchId, ok) {
    const open = openBatches.get(batchId);
    if (!open) return;
    openBatches.delete(batchId);
    const record: BatchRecord = { ...open, end: performance.now(), ok };
    // Lô bắt đầu trước khi bấm Bắt đầu vẫn tính cho phiên nếu xong trong phiên: số nhỏ, chấp nhận.
    for (const rec of targets()) {
      rec.batchCount++;
      pushCapped(rec, rec.batches, record);
    }
    scheduleNotify();
  },
};

const outboxTracer: OutboxSenderTracer = {
  onRequest(size, { urgent, keepalive }) {
    for (const rec of targets()) {
      const o = rec.outbox;
      o.requests++;
      if (urgent) o.urgent++;
      if (keepalive) o.keepalive++;
      pushCapped(rec, o.sizes, size);
    }
    scheduleNotify();
  },
  onResponse(ms, res) {
    for (const rec of targets()) {
      pushCapped(rec, rec.outbox.durations, ms);
      rec.outbox.duplicates += res.duplicates;
      rec.outbox.conflicts += res.versionConflicts;
    }
    scheduleNotify();
  },
  onError(ms) {
    for (const rec of targets()) {
      pushCapped(rec, rec.outbox.durations, ms);
      rec.outbox.errors++;
    }
    scheduleNotify();
  },
  onRetry() {
    for (const rec of targets()) rec.outbox.retries++;
    scheduleNotify();
  },
  onBytes(bytes) {
    for (const rec of targets()) pushCapped(rec, rec.outbox.bytes, bytes);
    scheduleNotify();
  },
};

function observeLongTasks(): void {
  const types = typeof PerformanceObserver !== 'undefined' ? PerformanceObserver.supportedEntryTypes : [];
  longTaskSupported = Array.isArray(types) && types.includes('longtask');
  if (!longTaskSupported) return;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration < LONG_TASK_MS) continue;
      for (const rec of targets()) pushCapped(rec, rec.longTasks, entry.duration);
    }
    scheduleNotify();
  });
  observer.observe({ type: 'longtask', buffered: false });
}

/** Gắn bộ thu 1 lần (bảng dev gọi lúc mount). Gọi lại không làm gì. */
export function ensureWriteMetrics(): void {
  if (attached) return;
  attached = true;
  live = newRecording('live');
  attachWriteQueueTracer(tracer);
  attachOutboxTracer(outboxTracer);
  observeLongTasks();
  // Xem nhanh trong console: __writeMetrics.live()
  (window as unknown as { __writeMetrics?: unknown }).__writeMetrics = {
    live: getLiveSummary,
    results: getSessionResults,
  };
}

// --- Đọc cho bảng ---
export function subscribeWriteMetrics(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getWriteMetricsVersion(): number {
  return version;
}

export function getLiveSummary(): WriteSummary {
  return summarize(live);
}

export function getSessionResults(): readonly WriteSummary[] {
  return results;
}

/** Phiên đang chạy (để hiện số tạm), null nếu không đo. */
export function getRunningSession(): WriteSummary | null {
  return session ? summarize(session) : null;
}

// --- Điều khiển ---
export function startSession(label: string): void {
  session = newRecording(label);
  bump();
}

export function stopSession(): void {
  if (!session) return;
  session.stoppedAt = performance.now();
  results = [summarize(session), ...results];
  session = null;
  bump();
}

export function clearSessionResults(): void {
  results = [];
  bump();
}

export function resetLive(): void {
  live = newRecording('live');
  bump();
}

export function isLongTaskSupported(): boolean {
  return longTaskSupported;
}

// --- Tính số ---
function summarize(rec: Recording): WriteSummary {
  const end = rec.stoppedAt ?? performance.now();
  const sizes = rec.batches.map((b) => b.size);
  const writtenObjects = sizes.reduce((a, b) => a + b, 0);
  const durations = rec.batches.map((b) => b.end - b.start);
  const enqueueTotal = rec.enqueueText + rec.enqueueProps + rec.enqueueDelete;
  return {
    label: rec.label,
    durationMs: end - rec.startedAt,
    enqueueText: rec.enqueueText,
    enqueueProps: rec.enqueueProps,
    enqueueDelete: rec.enqueueDelete,
    enqueueTotal,
    batches: rec.batchCount,
    failedBatches: rec.batches.filter((b) => !b.ok).length,
    urgentBatches: rec.batches.filter((b) => b.urgent).length,
    writtenObjects,
    avgBatchSize: sizes.length ? writtenObjects / sizes.length : 0,
    maxBatchSize: sizes.length ? Math.max(...sizes) : 0,
    // Lô lỗi rồi ghi lại có thể làm số object ghi > số đưa vào → kẹp về 0.
    coalesceRatio: enqueueTotal ? Math.max(0, 1 - writtenObjects / enqueueTotal) : 0,
    txReduction: enqueueTotal ? Math.max(0, 1 - rec.batchCount / enqueueTotal) : 0,
    avgWriteMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    maxWriteMs: durations.length ? Math.max(...durations) : 0,
    longTaskCount: longTaskSupported ? rec.longTasks.length : null,
    longTaskMaxMs: longTaskSupported && rec.longTasks.length ? Math.max(...rec.longTasks) : null,
    sim: SIM_WINDOWS.map((w) => ({
      windowMs: w,
      writes: w === 0 ? rec.batchCount : simulateWindow(rec.enqueueTimes, w),
    })),
    truncated: rec.truncated,
    running: rec.stoppedAt === null && rec !== live,
    outbox: summarizeOutbox(rec.outbox),
  };
}

function summarizeOutbox(o: OutboxRecording): OutboxSummary {
  const opsSent = o.sizes.reduce((a, b) => a + b, 0);
  return {
    requests: o.requests,
    urgent: o.urgent,
    keepalive: o.keepalive,
    opsSent,
    avgOps: o.sizes.length ? opsSent / o.sizes.length : 0,
    maxOps: o.sizes.length ? Math.max(...o.sizes) : 0,
    avgMs: o.durations.length ? o.durations.reduce((a, b) => a + b, 0) / o.durations.length : 0,
    maxMs: o.durations.length ? Math.max(...o.durations) : 0,
    totalBytes: o.bytes.reduce((a, b) => a + b, 0),
    avgBytes: o.bytes.length ? o.bytes.reduce((a, b) => a + b, 0) / o.bytes.length : 0,
    maxBytes: o.bytes.length ? Math.max(...o.bytes) : 0,
    errors: o.errors,
    retries: o.retries,
    duplicates: o.duplicates,
    conflicts: o.conflicts,
  };
}

/**
 * Gom có trần: lần đưa vào đầu mở cửa sổ W ms, mọi lần đưa vào trong cửa sổ (mọi id)
 * gộp chung 1 lần ghi. Hết cửa sổ thì lần kế mở cửa sổ mới. Không phải debounce chờ ngừng gõ.
 */
function simulateWindow(times: readonly number[], windowMs: number): number {
  let writes = 0;
  let windowEnd = -Infinity;
  for (const t of times) {
    if (t > windowEnd) {
      writes++;
      windowEnd = t + windowMs;
    }
  }
  return writes;
}

// --- Dựng chữ để Copy ---
export function formatSummaries(list: readonly WriteSummary[], context: string): string {
  const lines = [`[bibo dev] write queue + outbox — ${context}`];
  for (const s of list) {
    lines.push('');
    lines.push(`== ${s.label} (${(s.durationMs / 1000).toFixed(1)}s)${s.truncated ? ' [cắt bớt sự kiện cũ]' : ''}`);
    lines.push(
      `enqueue: ${s.enqueueTotal} (text ${s.enqueueText}, props ${s.enqueueProps}, delete ${s.enqueueDelete})`,
    );
    lines.push(
      `batches: ${s.batches} (lỗi ${s.failedBatches}, gấp ${s.urgentBatches}) | object/lô: tb ${s.avgBatchSize.toFixed(1)}, max ${s.maxBatchSize}`,
    );
    lines.push(
      `transaction giảm: ${(s.txReduction * 100).toFixed(0)}% | gộp cùng id: ${(s.coalesceRatio * 100).toFixed(0)}%`,
    );
    lines.push(`ghi ms: tb ${s.avgWriteMs.toFixed(1)}, max ${s.maxWriteMs.toFixed(1)}`);
    lines.push(
      s.longTaskCount === null
        ? 'long task: không hỗ trợ'
        : `long task >${LONG_TASK_MS}ms: ${s.longTaskCount}${s.longTaskMaxMs !== null ? `, max ${s.longTaskMaxMs.toFixed(0)}ms` : ''}`,
    );
    lines.push(`mô phỏng gom: ${s.sim.map((x) => `${formatWindow(x.windowMs)}=${x.writes}`).join(' | ')}`);
    const o = s.outbox;
    lines.push(
      `outbox: ${o.requests} request (gấp ${o.urgent}, keepalive ${o.keepalive}) | object/request: tb ${o.avgOps.toFixed(1)}, max ${o.maxOps} | tổng ${o.opsSent}`,
    );
    lines.push(
      `outbox ms: tb ${o.avgMs.toFixed(0)}, max ${o.maxMs.toFixed(0)} | lỗi ${o.errors}, thử lại ${o.retries} | server bỏ trùng ${o.duplicates}, lệch version ${o.conflicts}`,
    );
    lines.push(
      `outbox byte: tổng ${formatBytes(o.totalBytes)} | tb ${formatBytes(o.avgBytes)}, max ${formatBytes(o.maxBytes)} / request`,
    );
  }
  return lines.join('\n');
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)}B`;
  return `${(n / 1024).toFixed(1)}KB`;
}

export function formatWindow(ms: number): string {
  if (ms === 0) return 'hiện tại';
  return ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`;
}
