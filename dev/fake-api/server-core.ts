// ============================================================
// Server giả cho outbox (CHỈ dev, spec `.kiro/specs/canvas-outbox/`), phần thuần
// ============================================================
//
// - Lưu trong bộ nhớ tiến trình `npm run dev`. Tắt dev là mất (bạn chấp nhận).
// - Áp THEO TRƯỜNG: create ghi nguyên object, patch chỉ ghi trường trong gói
//   (`applyFields`), delete xoá. 2 patch khác trường của cùng object không đè nhau.
// - Patch tới object không có → trả `missingObjectIds`, không ghi nhận mã (client gửi
//   lại dạng create với cùng mã).
// - Bỏ mã gửi đã nhận: gửi lại không áp 2 lần, vẫn tính là "đã nhận" để client xoá mục.
// - Cả request hợp lệ thì mới áp (kiểm dạng trước) → áp cả lô hoặc không gì.
// - Lệch phiên bản: CHỈ đếm, vẫn áp. Xử lý xung đột là việc của chiều nhận về (`canvas-sync`).
// - Lỗi giả: trả 500 theo tỉ lệ, không áp gì, không ghi nhận mã.
// ============================================================

import { applyFields } from '../../src/tools/canvas/sync/object-fields';
import {
  emptyFakeStats,
  parseApplyRequest,
  parseFakeServerConfig,
  type ApplyResponse,
  type FakeServerConfig,
  type FakeServerState,
} from '../../src/tools/canvas/sync/protocol';

export type FakeApplyResult =
  | { status: 200; body: ApplyResponse }
  | { status: 400 | 500; body: { error: string } };

export interface FakeServer {
  /** `bytes`: kích thước body request (để đo, không ảnh hưởng kết quả). */
  apply(input: unknown, bytes?: number): FakeApplyResult;
  getConfig(): FakeServerConfig;
  /** Trả config mới, hoặc null nếu dữ liệu sai dạng. */
  setConfig(input: unknown): FakeServerConfig | null;
  getState(): FakeServerState;
  reset(): void;
}

export function createFakeServer(random: () => number = Math.random): FakeServer {
  const objects = new Map<string, { version: number; object: unknown }>();
  const seenOpIds = new Set<string>();
  let config: FakeServerConfig = { latencyMs: 0, errorRate: 0 };
  let stats = emptyFakeStats();

  return {
    apply(input, bytes = 0) {
      stats.requests++;
      stats.bytes += bytes;
      const req = parseApplyRequest(input);
      if (!req) {
        stats.failed++;
        return { status: 400, body: { error: 'invalid request' } };
      }
      if (config.errorRate > 0 && random() < config.errorRate) {
        stats.failed++;
        return { status: 500, body: { error: 'fake error' } };
      }
      const acceptedOpIds: string[] = [];
      const missingObjectIds: string[] = [];
      let duplicates = 0;
      let versionConflicts = 0;
      for (const op of req.ops) {
        if (seenOpIds.has(op.opId)) {
          acceptedOpIds.push(op.opId);
          duplicates++;
          continue;
        }
        const current = objects.get(op.objectId);
        if (op.kind === 'patch' && !current) {
          missingObjectIds.push(op.objectId);
          stats.missing++;
          continue;
        }
        seenOpIds.add(op.opId);
        acceptedOpIds.push(op.opId);
        // Object mới với server (chưa từng gửi) không tính là lệch.
        if (current && current.version !== op.baseVersion) versionConflicts++;
        if (op.kind === 'create') {
          objects.set(op.objectId, { version: op.version, object: op.object });
          stats.creates++;
        } else if (op.kind === 'patch' && current) {
          const merged = applyFields(current.object, op.patch);
          merged.version = op.version;
          merged.updatedAt = op.updatedAt;
          objects.set(op.objectId, { version: op.version, object: merged });
          stats.patches++;
        } else {
          objects.delete(op.objectId);
          stats.deletes++;
        }
        stats.applied++;
      }
      stats.duplicates += duplicates;
      stats.versionConflicts += versionConflicts;
      return { status: 200, body: { acceptedOpIds, missingObjectIds, duplicates, versionConflicts } };
    },

    getConfig: () => ({ ...config }),

    setConfig(input) {
      const next = parseFakeServerConfig(input);
      if (next) config = next;
      return next;
    },

    getState: () => ({
      config: { ...config },
      stats: { ...stats },
      objects: [...objects].map(([id, o]) => ({ id, version: o.version, object: o.object })),
    }),

    reset() {
      objects.clear();
      seenOpIds.clear();
      stats = emptyFakeStats();
    },
  };
}
