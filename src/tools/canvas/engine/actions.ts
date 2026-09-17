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

// --- Create ---
export function createRectAt(canvasX: number, canvasY: number, boardId: string | null): CanvasObject {
  const now = new Date().toISOString();
  const obj: CanvasObject = {
    id: crypto.randomUUID(),
    type: 'rect',
    boardId,
    geometry: {
      x: canvasX - 100,
      y: canvasY - 60,
      width: 200,
      height: 120,
      rotation: 0,
      zIndex: 0,
    },
    data: {},
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

// --- Move (live during drag) ---
/** Apply delta trong drag, không push history. Gọi mỗi pointermove. */
export function applyMoveDelta(ids: string[], dx: number, dy: number): void {
  const store = useObjectsStore.getState();
  const repo = getCanvasRepository();
  for (const id of ids) {
    const cur = store.objects.get(id);
    if (!cur) continue;
    store.updateGeometry(id, { x: cur.geometry.x + dx, y: cur.geometry.y + dy });
    const updated = store.objects.get(id);
    if (updated) void repo.saveObject(updated);
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

  const repo = getCanvasRepository();
  const store = useObjectsStore.getState();

  useHistoryStore.getState().push({
    label: 'Move objects',
    undo: () => {
      const s = useObjectsStore.getState();
      for (const [id, pos] of before) {
        const cur = s.objects.get(id);
        if (!cur) continue;
        s.updateGeometry(id, { x: pos.x, y: pos.y });
        const upd = s.objects.get(id);
        if (upd) void repo.saveObject(upd);
      }
    },
    redo: () => {
      const s = useObjectsStore.getState();
      for (const [id, pos] of after) {
        const cur = s.objects.get(id);
        if (!cur) continue;
        s.updateGeometry(id, { x: pos.x, y: pos.y });
        const upd = s.objects.get(id);
        if (upd) void repo.saveObject(upd);
      }
    },
  });
  void store; // giữ reference để tránh unused nếu TS strict
}

// --- Resize (live during drag) ---
/** Apply resize trong drag, không push history. Gọi mỗi pointermove. */
export function applyResize(id: string, geometry: Partial<Geometry>): void {
  const store = useObjectsStore.getState();
  const cur = store.objects.get(id);
  if (!cur) return;
  const next = { ...cur.geometry, ...geometry };
  if (next.width < MIN_OBJECT_SIZE) next.width = MIN_OBJECT_SIZE;
  if (next.height < MIN_OBJECT_SIZE) next.height = MIN_OBJECT_SIZE;
  store.updateGeometry(id, next);
  const updated = store.objects.get(id);
  if (updated) void getCanvasRepository().saveObject(updated);
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
  const repo = getCanvasRepository();

  useHistoryStore.getState().push({
    label: 'Resize object',
    undo: () => {
      const s = useObjectsStore.getState();
      const cur = s.objects.get(id);
      if (!cur) return;
      s.updateGeometry(id, before);
      const upd = s.objects.get(id);
      if (upd) void repo.saveObject(upd);
    },
    redo: () => {
      const s = useObjectsStore.getState();
      const cur = s.objects.get(id);
      if (!cur) return;
      s.updateGeometry(id, after);
      const upd = s.objects.get(id);
      if (upd) void repo.saveObject(upd);
    },
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
