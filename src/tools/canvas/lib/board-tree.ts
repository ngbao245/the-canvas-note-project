import type { Board, CanvasObject } from '../types';
import type { LegacyRootObject } from '../api';

/**
 * Sửa dữ liệu board cũ lúc tải:
 *   - Bản cũ tạo board trên root với `parentId: null` (lấy theo `boardId` của
 *     object root là null) → nhiều board cùng null, breadcrumb mất cấp, bootstrap
 *     có thể chọn nhầm root.
 *   - Root = board `parentId: null` tạo sớm nhất. Root luôn được tạo trước mọi
 *     board khác (bootstrap tạo khi chưa có gì), nên chọn vậy là chắc.
 *   - Board `null` còn lại đều được tạo trên root (board lồng đã lưu id cha thật)
 *     → gán `parentId = root.id`.
 *
 * Pure. Trả root, danh sách board đã sửa, và các board cần lưu lại.
 */
export function normalizeBoards(boards: Board[]): {
  root: Board | null;
  boards: Board[];
  changed: Board[];
} {
  const orphans = boards.filter((b) => b.parentId === null);
  if (orphans.length === 0) return { root: null, boards, changed: [] };

  const root = orphans.reduce((a, b) => (b.createdAt < a.createdAt ? b : a));
  const changed: Board[] = [];

  const next = boards.map((b) => {
    // Root: nếu bản fix trước (2026-10-02) lỡ đổi "Home" → "Board" thì trả lại
    // "Home". Giữ các tên khác (nhỡ sau này root cho đổi tên).
    if (b.id === root.id) {
      if (b.name !== 'Board') return b;
      const fixed = { ...b, name: 'Home' };
      changed.push(fixed);
      return fixed;
    }
    // Board `null` không phải root → gán cha là root.
    if (b.parentId !== null) return b;
    const fixed = { ...b, parentId: root.id };
    changed.push(fixed);
    return fixed;
  });

  const fixedRoot = next.find((b) => b.id === root.id) ?? root;
  return { root: fixedRoot, boards: next, changed };
}

/**
 * Chuyển object bản cũ trên Home (`boardId: null`) sang id thật của Home.
 * Pure. Bootstrap gọi 1 lần, lưu lại kết quả → lần sau danh sách vào rỗng.
 */
export function migrateRootObjects(legacy: LegacyRootObject[], rootId: string): CanvasObject[] {
  return legacy.map((o) => ({ ...o, boardId: rootId }));
}
