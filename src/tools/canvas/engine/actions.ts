// ============================================================
// Canvas — Actions layer
// ============================================================
//
// Actions = mutation entry point từ UI. Mỗi action:
//   1. Cập nhật store (đồng bộ, render ngay)
//   2. Persist qua repository (bất đồng bộ, fire-and-forget)
//   3. Push Command vào history-store để undo-able
//
// Move/Resize khác: cần theo dõi initial state trong lúc drag → có helper
// `commitMove` / `commitResize` gọi ở drag END với snapshot before/after.
// Trong lúc drag, dùng `applyMoveDelta` / `applyResize` (không push history).
// ============================================================

import type { CanvasObject, Geometry } from '../types';
import { MIN_OBJECT_SIZE } from '../types';
import { getCanvasRepository } from '../api';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useHistoryStore } from '../store/history-store';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';

/**
 * Update geometry của 1 object rồi persist snapshot mới ra repo. Gom pattern
 * lặp 6 chỗ trong undo/redo/applyResize/applyMoveDelta. Đọc snapshot LẠI sau
 * mutation (store.getState) để lấy object đã cập nhật, không phải closure cũ.
 */
function mutateGeometryAndPersist(id: string, geometry: Partial<Geometry>): void {
  const s = useObjectsStore.getState();
  if (!s.objects.get(id)) return;
  s.updateGeometry(id, geometry);
  const upd = s.objects.get(id);
  if (upd) void getCanvasRepository().saveObject(upd);
}

// --- Create ---

/**
 * Tạo object bất kỳ type tại vị trí canvas-space (x,y = TÂM object).
 * Lấy defaultGeometry + defaultData từ registry. `dataOverride` cho phép truyền
 * data đã dựng sẵn (Image có blobId, Link có url) thay cho defaultData.
 */
export function createObjectAt(
  type: string,
  canvasX: number,
  canvasY: number,
  boardId: string | null,
  dataOverride?: unknown,
): CanvasObject | null {
  const def = getObjectTypeDefinition(type);
  if (!def) return null;
  const now = new Date().toISOString();
  const { width, height, rotation, zIndex } = def.defaultGeometry;
  const obj: CanvasObject = {
    id: crypto.randomUUID(),
    type,
    boardId,
    geometry: {
      x: canvasX - width / 2,
      y: canvasY - height / 2,
      width,
      height,
      rotation,
      zIndex,
    },
    data: dataOverride !== undefined ? dataOverride : def.defaultData(),
    createdAt: now,
    updatedAt: now,
  };
  const repo = getCanvasRepository();
  useObjectsStore.getState().add(obj);
  useSelectionStore.getState().select(obj.id);
  void repo.saveObject(obj);
  useHistoryStore.getState().push({
    label: 'Create object',
    undo: () => {
      useObjectsStore.getState().remove(obj.id);
      useSelectionStore.getState().clear();
      void repo.deleteObject(obj.id);
    },
    redo: () => {
      useObjectsStore.getState().add(obj);
      useSelectionStore.getState().select(obj.id);
      void repo.saveObject(obj);
    },
  });
  return obj;
}

/** Wrapper tương thích: tạo rect (context menu Phase A vẫn dùng). x,y = tâm. */
export function createRectAt(canvasX: number, canvasY: number, boardId: string | null): CanvasObject | null {
  return createObjectAt('rect', canvasX, canvasY, boardId);
}

// --- Update data (edit inline, undo-able) ---
/** Cập nhật `data` của object + push command. Skip nếu data không đổi (deep-ish qua JSON). */
export function updateObjectData(id: string, nextData: unknown): void {
  const cur = useObjectsStore.getState().objects.get(id);
  if (!cur) return;
  const before = cur.data;
  if (JSON.stringify(before) === JSON.stringify(nextData)) return;
  const repo = getCanvasRepository();

  useObjectsStore.getState().updateData(id, nextData);
  // getState() LẠI để đọc snapshot MỚI sau mutation (biến snapshot cũ giữ Map cũ).
  const updated = useObjectsStore.getState().objects.get(id);
  if (updated) void repo.saveObject(updated);

  useHistoryStore.getState().push({
    label: 'Edit object',
    undo: () => {
      const s = useObjectsStore.getState();
      if (!s.objects.get(id)) return;
      s.updateData(id, before);
      const u = s.objects.get(id);
      if (u) void repo.saveObject(u);
    },
    redo: () => {
      const s = useObjectsStore.getState();
      if (!s.objects.get(id)) return;
      s.updateData(id, nextData);
      const u = s.objects.get(id);
      if (u) void repo.saveObject(u);
    },
  });
}

// --- Move (live during drag) ---
/** Apply delta trong drag, không push history. Gọi mỗi pointermove. */
export function applyMoveDelta(ids: string[], dx: number, dy: number): void {
  for (const id of ids) {
    const cur = useObjectsStore.getState().objects.get(id);
    if (!cur) continue;
    mutateGeometryAndPersist(id, { x: cur.geometry.x + dx, y: cur.geometry.y + dy });
  }
}

/** Commit move sau drag end: push MoveCommand với snapshot before/after. */
export function commitMove(
  before: Map<string, { x: number; y: number }>,
  after: Map<string, { x: number; y: number }>,
): void {
  // Skip nếu không di chuyển thật (drag chưa vượt threshold).
  let moved = false;
  for (const [id, b] of before) {
    const a = after.get(id);
    if (!a) continue;
    if (a.x !== b.x || a.y !== b.y) {
      moved = true;
      break;
    }
  }
  if (!moved) return;

  useHistoryStore.getState().push({
    label: 'Move objects',
    undo: () => {
      for (const [id, pos] of before) mutateGeometryAndPersist(id, { x: pos.x, y: pos.y });
    },
    redo: () => {
      for (const [id, pos] of after) mutateGeometryAndPersist(id, { x: pos.x, y: pos.y });
    },
  });
}

// --- Resize (live during drag) ---
/** Apply resize trong drag, không push history. Gọi mỗi pointermove. */
export function applyResize(id: string, geometry: Partial<Geometry>): void {
  const cur = useObjectsStore.getState().objects.get(id);
  if (!cur) return;
  const next = { ...cur.geometry, ...geometry };
  if (next.width < MIN_OBJECT_SIZE) next.width = MIN_OBJECT_SIZE;
  if (next.height < MIN_OBJECT_SIZE) next.height = MIN_OBJECT_SIZE;
  mutateGeometryAndPersist(id, next);
}

/** Commit resize sau drag end: push ResizeCommand. */
export function commitResize(id: string, before: Geometry, after: Geometry): void {
  if (
    before.x === after.x &&
    before.y === after.y &&
    before.width === after.width &&
    before.height === after.height
  ) {
    return;
  }
  useHistoryStore.getState().push({
    label: 'Resize object',
    undo: () => mutateGeometryAndPersist(id, before),
    redo: () => mutateGeometryAndPersist(id, after),
  });
}

// --- Delete ---
export function deleteObjects(ids: string[]): void {
  const store = useObjectsStore.getState();
  const repo = getCanvasRepository();

  // Snapshot object trước khi xoá để undo restore đủ.
  const snapshot: CanvasObject[] = [];
  for (const id of ids) {
    const o = store.objects.get(id);
    if (o) snapshot.push(o);
  }
  if (snapshot.length === 0) return;

  store.removeMany(ids);
  useSelectionStore.getState().clear();
  for (const id of ids) void repo.deleteObject(id);

  useHistoryStore.getState().push({
    label: snapshot.length === 1 ? 'Delete object' : `Delete ${snapshot.length} objects`,
    undo: () => {
      const s = useObjectsStore.getState();
      for (const o of snapshot) {
        s.add(o);
        void repo.saveObject(o);
      }
      useSelectionStore.getState().replace(snapshot.map((o) => o.id));
    },
    redo: () => {
      const s = useObjectsStore.getState();
      s.removeMany(snapshot.map((o) => o.id));
      useSelectionStore.getState().clear();
      for (const o of snapshot) void repo.deleteObject(o.id);
    },
  });
}
