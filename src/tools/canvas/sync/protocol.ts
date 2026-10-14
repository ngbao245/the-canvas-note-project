// ============================================================
// Hợp đồng gửi outbox lên server (spec `.kiro/specs/canvas-outbox/`)
// ============================================================
//
// Dùng chung cho client (src/tools/canvas/sync/) và server giả (dev/fake-api/).
// Chỉ type, hằng số và hàm kiểm dạng thuần: không dùng API trình duyệt hay Node.
// Khi nối Supabase (`canvas-sync`), RPC `apply_ops` nhận cùng dạng gói này.
//
// Gửi THEO TRƯỜNG (note kiến trúc mục 2.1, 2.5):
//   create — object server chưa có: gửi nguyên object.
//   patch  — chỉ các trường đã đổi (`object-fields.ts`) + version + updatedAt.
//            2 thay đổi khác trường của cùng object không đè nhau.
//   delete — chỉ id.
// Patch tới object server không có (server khởi động lại, object có từ trước khi
// bật outbox) → server trả trong `missingObjectIds`, client gửi lại dạng create.
// ============================================================

import { isFieldPatch, type FieldPatch } from './object-fields';

/** Đường dẫn server giả trong `npm run dev`. Bản build không có. */
export const FAKE_API_PREFIX = '/__fake-api';

export type SyncOpKind = 'create' | 'patch' | 'delete';

interface SyncOpBase {
  /** Mã gửi, đổi mỗi lần mục được gộp thêm. Server bỏ mã đã nhận (gửi lại không áp 2 lần). */
  opId: string;
  objectId: string;
  /** Version object lúc bắt đầu chuỗi sửa chưa gửi. Server so để phát hiện xung đột. */
  baseVersion: number;
  /** Các object ghi cùng 1 lô hàng đợi chung mã nhóm. Để dành cho lúc phải cắt request. */
  groupId: string;
}

export type SyncOp<T = unknown> =
  | (SyncOpBase & { kind: 'create'; version: number; object: T })
  | (SyncOpBase & { kind: 'patch'; version: number; updatedAt: string; patch: FieldPatch })
  | (SyncOpBase & { kind: 'delete' });

export interface ApplyRequest<T = unknown> {
  clientId: string;
  ops: SyncOp<T>[];
}

export interface ApplyResponse {
  /** Mã đã nhận, gồm cả mã bị bỏ vì trùng. Client chỉ xoá mục có mã khớp. */
  acceptedOpIds: string[];
  /** Patch tới object server không có. Client chuyển mục sang create, gửi lượt sau. */
  missingObjectIds: string[];
  duplicates: number;
  versionConflicts: number;
}

export interface FakeServerConfig {
  latencyMs: number;
  /** 0..1. Tỉ lệ request trả lỗi 500, không áp gì. */
  errorRate: number;
}

export interface FakeServerStats {
  requests: number;
  failed: number;
  applied: number;
  creates: number;
  patches: number;
  deletes: number;
  missing: number;
  duplicates: number;
  versionConflicts: number;
  /** Tổng byte body request /apply server đã nhận. */
  bytes: number;
}

export interface FakeServerState {
  config: FakeServerConfig;
  stats: FakeServerStats;
  objects: Array<{ id: string; version: number; object: unknown }>;
}

// --- Kiểm dạng (dữ liệu đi qua mạng là unknown) ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === 'string');
}

export function parseSyncOp(value: unknown): SyncOp | null {
  if (!isRecord(value)) return null;
  const { opId, objectId, kind, baseVersion, groupId } = value;
  if (typeof opId !== 'string' || typeof objectId !== 'string') return null;
  if (!isFiniteNumber(baseVersion) || typeof groupId !== 'string') return null;
  const base = { opId, objectId, baseVersion, groupId };
  if (kind === 'delete') return { ...base, kind };
  if (!isFiniteNumber(value.version)) return null;
  if (kind === 'create') {
    if (!isRecord(value.object)) return null;
    return { ...base, kind, version: value.version, object: value.object };
  }
  if (kind === 'patch') {
    if (typeof value.updatedAt !== 'string' || !isFieldPatch(value.patch)) return null;
    return { ...base, kind, version: value.version, updatedAt: value.updatedAt, patch: value.patch };
  }
  return null;
}

export function parseApplyRequest(value: unknown): ApplyRequest | null {
  if (!isRecord(value) || typeof value.clientId !== 'string' || !Array.isArray(value.ops)) return null;
  const ops: SyncOp[] = [];
  for (const raw of value.ops) {
    const op = parseSyncOp(raw);
    if (!op) return null;
    ops.push(op);
  }
  return { clientId: value.clientId, ops };
}

export function parseApplyResponse(value: unknown): ApplyResponse | null {
  if (!isRecord(value)) return null;
  const { acceptedOpIds, missingObjectIds, duplicates, versionConflicts } = value;
  if (!isStringArray(acceptedOpIds) || !isStringArray(missingObjectIds)) return null;
  if (!isFiniteNumber(duplicates) || !isFiniteNumber(versionConflicts)) return null;
  return { acceptedOpIds, missingObjectIds, duplicates, versionConflicts };
}

export function parseFakeServerConfig(value: unknown): FakeServerConfig | null {
  if (!isRecord(value)) return null;
  const { latencyMs, errorRate } = value;
  if (!isFiniteNumber(latencyMs) || latencyMs < 0 || latencyMs > 60_000) return null;
  if (!isFiniteNumber(errorRate) || errorRate < 0 || errorRate > 1) return null;
  return { latencyMs, errorRate };
}

const STAT_KEYS = [
  'requests',
  'failed',
  'applied',
  'creates',
  'patches',
  'deletes',
  'missing',
  'duplicates',
  'versionConflicts',
  'bytes',
] as const satisfies ReadonlyArray<keyof FakeServerStats>;

export function emptyFakeStats(): FakeServerStats {
  return {
    requests: 0,
    failed: 0,
    applied: 0,
    creates: 0,
    patches: 0,
    deletes: 0,
    missing: 0,
    duplicates: 0,
    versionConflicts: 0,
    bytes: 0,
  };
}

export function parseFakeServerState(value: unknown): FakeServerState | null {
  if (!isRecord(value) || !Array.isArray(value.objects) || !isRecord(value.stats)) return null;
  const config = parseFakeServerConfig(value.config);
  if (!config) return null;
  const raw = value.stats;
  const stats = emptyFakeStats();
  for (const k of STAT_KEYS) {
    const v = raw[k];
    if (!isFiniteNumber(v)) return null;
    stats[k] = v;
  }
  const objects: FakeServerState['objects'] = [];
  for (const o of value.objects) {
    if (!isRecord(o) || typeof o.id !== 'string' || !isFiniteNumber(o.version)) return null;
    objects.push({ id: o.id, version: o.version, object: o.object });
  }
  return { config, stats, objects };
}
