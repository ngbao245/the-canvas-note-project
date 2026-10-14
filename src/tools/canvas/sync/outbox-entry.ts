// ============================================================
// Mục outbox (thuần): gộp thay đổi + đổi sang gói gửi
// ============================================================
//
// - Mỗi object tối đa 1 mục. Sửa nhiều lần trước khi gửi → gộp vào mục cũ:
//   giữ `baseVersion` (version lúc bắt đầu chuỗi sửa), hợp các trường đã đổi,
//   tăng `rev`, đổi `opId`.
// - `opId` đổi theo mỗi lần gộp: server bỏ mã đã nhận, client chỉ xoá mục có mã
//   khớp lúc xác nhận → sửa tiếp trong lúc request đang bay không bị xoá nhầm.
// - `isNew`: server chưa có object (vừa tạo, hoặc server báo thiếu) → gửi create.
//   Gộp thêm vẫn giữ `isNew` tới khi gửi được.
// - Không chép nội dung object: lúc gửi đọc object từ store `objects` cùng transaction,
//   rồi chỉ lấy các trường đã đổi (`pickFields`).
// ============================================================

import type { WriteChannel } from '../lib/write-queue';
import { pickFields } from './object-fields';
import type { SyncOp } from './protocol';

export type OutboxEntryKind = 'put' | 'delete';

export interface OutboxEntry {
  objectId: string;
  kind: OutboxEntryKind;
  /** Server chưa có object → gửi nguyên object (create). */
  isNew: boolean;
  /** Trường đã đổi kể từ lần gửi được gần nhất (xem `object-fields.ts`). */
  fields: string[];
  channels: WriteChannel[];
  baseVersion: number;
  rev: number;
  opId: string;
  groupId: string;
  createdAt: number;
}

export interface OutboxChange {
  objectId: string;
  kind: OutboxEntryKind;
  /** Trên máy chưa có bản cũ (object vừa tạo, hoặc tạo lại sau khi xoá). */
  isNew: boolean;
  fields: Iterable<string>;
  channels: Iterable<WriteChannel>;
  /** Version object trước thay đổi này (chỉ dùng khi chưa có mục). */
  baseVersion: number;
  groupId: string;
  now: number;
}

export function mergeOutboxEntry(
  prev: OutboxEntry | null,
  change: OutboxChange,
  newOpId: () => string,
): OutboxEntry {
  // Sau xoá mà ghi lại (undo xoá): server đã / sẽ xoá → coi như tạo mới.
  const revived = prev?.kind === 'delete' && change.kind === 'put';
  const fields = new Set<string>(revived ? [] : prev?.fields);
  for (const f of change.fields) fields.add(f);
  const channels = new Set<WriteChannel>(prev?.channels);
  for (const c of change.channels) channels.add(c);
  return {
    objectId: change.objectId,
    kind: change.kind,
    isNew: revived || change.isNew || (prev?.isNew ?? false),
    fields: [...fields].sort(),
    channels: [...channels].sort(),
    baseVersion: prev ? prev.baseVersion : change.baseVersion,
    rev: (prev?.rev ?? 0) + 1,
    opId: newOpId(),
    groupId: change.groupId,
    createdAt: prev ? prev.createdAt : change.now,
  };
}

/** Server báo thiếu object → lượt sau gửi nguyên object. Mã gửi giữ nguyên (server chưa ghi nhận). */
export function markEntryNew(entry: OutboxEntry): OutboxEntry {
  return { ...entry, isNew: true };
}

/** Mục `put` mà object đã mất (không nên xảy ra: ghi cùng transaction) → gửi như xoá. */
export function toSyncOp<T extends { version: number; updatedAt: string }>(
  entry: OutboxEntry,
  object: T | null,
): SyncOp<T> {
  const base = {
    opId: entry.opId,
    objectId: entry.objectId,
    baseVersion: entry.baseVersion,
    groupId: entry.groupId,
  };
  if (entry.kind === 'delete' || object === null) return { ...base, kind: 'delete' };
  if (entry.isNew) return { ...base, kind: 'create', version: object.version, object };
  return {
    ...base,
    kind: 'patch',
    version: object.version,
    updatedAt: object.updatedAt,
    patch: pickFields(object, entry.fields),
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === 'string');
}

/** Đọc mục từ IndexedDB (unknown). Sai dạng → null (coi như chưa có mục). */
export function parseOutboxEntry(value: unknown): OutboxEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.objectId !== 'string' || typeof v.opId !== 'string' || typeof v.groupId !== 'string') return null;
  if (v.kind !== 'put' && v.kind !== 'delete') return null;
  if (typeof v.baseVersion !== 'number' || typeof v.rev !== 'number' || typeof v.createdAt !== 'number') return null;
  if (!Array.isArray(v.channels)) return null;
  const channels = v.channels.filter((c): c is WriteChannel => c === 'text' || c === 'props');
  // Mục ghi trước khi có patch (chưa có `fields` / `isNew`) → gửi nguyên object cho chắc.
  const legacy = !isStringArray(v.fields) || typeof v.isNew !== 'boolean';
  return {
    objectId: v.objectId,
    kind: v.kind,
    isNew: legacy ? true : v.isNew === true,
    fields: isStringArray(v.fields) ? v.fields : [],
    channels,
    baseVersion: v.baseVersion,
    rev: v.rev,
    opId: v.opId,
    groupId: v.groupId,
    createdAt: v.createdAt,
  };
}

/** Mã ngẫu nhiên. `randomUUID` chỉ có trong secure context: mở dev qua IP mạng LAN thì không có. */
export function newSyncId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
