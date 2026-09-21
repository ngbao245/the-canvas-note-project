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

import type { Board, BoardData, CanvasObject, Geometry } from '../types';
import { MIN_OBJECT_SIZE, boardColorForIndex } from '../types';
import { getCanvasRepository } from '../api';
import { useObjectsStore } from '../store/objects-store';
import { useBoardsStore } from '../store/boards-store';
import { useSelectionStore } from '../store/selection-store';
import { useHistoryStore } from '../store/history-store';
import { useCurrentBoardStore } from '../store/current-board-store';
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

// --- Z-index stacking (canvas object, world-space) ---

/**
 * Quét objects-store lấy max/min zIndex của các object đang HIỂN THỊ trên canvas
 * của 1 board (unsortIndex === null). Object trong Unsort (unsortIndex !== null)
 * bỏ qua vì không nằm trên canvas → không tham gia stacking.
 *
 * Trả 0 nếu board rỗng (object đầu tiên tạo sẽ có zIndex = 0 + 1 = 1, hoặc dùng
 * trực tiếp làm base). Chỉ đọc store (current view) — đủ vì stacking chỉ cần
 * so với object cùng board đang render.
 */
function boardCanvasObjects(boardId: string | null): CanvasObject[] {
  const list: CanvasObject[] = [];
  for (const o of useObjectsStore.getState().objects.values()) {
    if (o.unsortIndex === null && o.boardId === boardId) list.push(o);
  }
  return list;
}

/** Max zIndex trong canvas của board. Board rỗng → -1 (để +1 = 0 cho item đầu). */
function getMaxZIndex(boardId: string | null): number {
  const list = boardCanvasObjects(boardId);
  if (list.length === 0) return -1;
  return list.reduce((max, o) => Math.max(max, o.geometry.zIndex), -Infinity);
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
  const { width, height, rotation } = def.defaultGeometry;
  // Auto-assign zIndex = max của board + 1 → item mới luôn nằm trên cùng
  // (Milanote parity). Bỏ qua zIndex trong defaultGeometry (luôn 0).
  const zIndex = getMaxZIndex(boardId) + 1;
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
    unsortIndex: null,
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

// --- Board create (compound: Board entity + BoardObject atomic) ---

/**
 * Tạo Board entity mới + BoardObject đại diện trên canvas cha. Atomic undo:
 * Ctrl+Z xoá cả hai. Color rotate qua palette theo số sibling trong cùng parent.
 * `parentBoardId` = null nếu tạo trên root board.
 */
export function createBoardAt(
  canvasX: number,
  canvasY: number,
  parentBoardId: string | null,
): { board: Board; object: CanvasObject } | null {
  const def = getObjectTypeDefinition('board');
  if (!def) return null;

  // Đếm sibling boards trong cùng parent để chọn color index (rotate palette).
  const boardsMap = useBoardsStore.getState().boards;
  let siblingCount = 0;
  for (const b of boardsMap.values()) {
    if (b.parentId === parentBoardId) siblingCount++;
  }

  const now = new Date().toISOString();
  const board: Board = {
    id: crypto.randomUUID(),
    name: 'New Board',
    parentId: parentBoardId,
    color: boardColorForIndex(siblingCount),
    camera: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  };

  const { width, height, rotation } = def.defaultGeometry;
  // BoardObject mới cũng lên top của board cha (cùng rule createObjectAt).
  const zIndex = getMaxZIndex(parentBoardId) + 1;
  const object: CanvasObject = {
    id: crypto.randomUUID(),
    type: 'board',
    boardId: parentBoardId,
    geometry: {
      x: canvasX - width / 2,
      y: canvasY - height / 2,
      width,
      height,
      rotation,
      zIndex,
    },
    data: { linkedBoardId: board.id } satisfies BoardData,
    unsortIndex: null,
    createdAt: now,
    updatedAt: now,
  };

  const repo = getCanvasRepository();
  useBoardsStore.getState().add(board);
  useObjectsStore.getState().add(object);
  useSelectionStore.getState().select(object.id);
  void repo.saveBoard(board);
  void repo.saveObject(object);

  useHistoryStore.getState().push({
    label: 'Create board',
    undo: () => {
      useBoardsStore.getState().remove(board.id);
      useObjectsStore.getState().remove(object.id);
      useSelectionStore.getState().clear();
      void repo.deleteBoard(board.id);
      void repo.deleteObject(object.id);
    },
    redo: () => {
      useBoardsStore.getState().add(board);
      useObjectsStore.getState().add(object);
      useSelectionStore.getState().select(object.id);
      void repo.saveBoard(board);
      void repo.saveObject(object);
    },
  });

  return { board, object };
}

// --- Board rename ---

/** Đổi tên Board. Không tự update URL slug — caller (breadcrumb editor) xử lý. */
export function renameBoard(id: string, newName: string): void {
  const cur = useBoardsStore.getState().boards.get(id);
  if (!cur) return;
  const before = cur.name;
  const after = newName.trim() || 'New Board';
  if (before === after) return;
  const repo = getCanvasRepository();

  useBoardsStore.getState().update(id, { name: after });
  const upd = useBoardsStore.getState().boards.get(id);
  if (upd) void repo.saveBoard(upd);

  useHistoryStore.getState().push({
    label: 'Rename board',
    undo: () => {
      useBoardsStore.getState().update(id, { name: before });
      const u = useBoardsStore.getState().boards.get(id);
      if (u) void repo.saveBoard(u);
    },
    redo: () => {
      useBoardsStore.getState().update(id, { name: after });
      const u = useBoardsStore.getState().boards.get(id);
      if (u) void repo.saveBoard(u);
    },
  });
}

// --- Move objects cross-board vào Unsort ---

/**
 * Chuyển objects sang Unsort của board đích. Object biến khỏi current view;
 * user thấy trong Unsort panel của board đó (top). Items cũ trong Unsort đích
 * đẩy xuống (unsortIndex +N với N = số object move).
 *
 * Query IDB để biết Unsort đích đang có bao nhiêu item (objects-store chỉ hold
 * current view). Chấp nhận async — nhưng caller không await (fire-and-forget),
 * store update sync qua hydrate khi user vào board đích lần sau.
 *
 * Undo: restore snapshot cũ (bao gồm boardId + unsortIndex + geometry cũ),
 * revert items khác trong Unsort đích -N.
 */
export function moveObjectsToUnsort(ids: string[], targetBoardId: string): void {
  const store = useObjectsStore.getState();
  const repo = getCanvasRepository();

  // Snapshot object gốc để undo.
  const snapshots: CanvasObject[] = [];
  for (const id of ids) {
    const o = store.objects.get(id);
    if (o) snapshots.push(o);
  }
  if (snapshots.length === 0) return;

  const now = new Date().toISOString();
  const N = snapshots.length;

  // Fire async: query Unsort đích để reindex items cũ +N, insert items mới 0..N-1.
  void (async () => {
    const existing = await repo.loadObjects(targetBoardId);
    const unsortExisting = existing
      .filter((o) => o.unsortIndex !== null)
      .sort((a, b) => (a.unsortIndex ?? 0) - (b.unsortIndex ?? 0));

    // Reindex items cũ trong Unsort đích: unsortIndex += N.
    for (const o of unsortExisting) {
      const updated = { ...o, unsortIndex: (o.unsortIndex ?? 0) + N, updatedAt: now };
      await repo.saveObject(updated);
      // Update store nếu object đó đang trong view (target board = current view).
      const currentView = useCurrentBoardStore.getState().currentBoardId;
      if (o.boardId === currentView) useObjectsStore.getState().add(updated);
    }

    // Insert new items với unsortIndex 0..N-1 theo thứ tự snapshots.
    for (let i = 0; i < N; i++) {
      const src = snapshots[i];
      const moved: CanvasObject = {
        ...src,
        boardId: targetBoardId,
        unsortIndex: i,
        updatedAt: now,
      };
      await repo.saveObject(moved);
      // Nếu target board = current view, add vào store.
      const currentView = useCurrentBoardStore.getState().currentBoardId;
      if (targetBoardId === currentView) {
        useObjectsStore.getState().add(moved);
      } else {
        useObjectsStore.getState().remove(src.id);
      }
    }
  })();

  // Sync UI immediate: remove object khỏi view (nếu view khác target).
  const currentView = useCurrentBoardStore.getState().currentBoardId;
  if (targetBoardId !== currentView) {
    for (const src of snapshots) store.remove(src.id);
  }
  useSelectionStore.getState().clear();

  useHistoryStore.getState().push({
    label: `Move ${N} object${N === 1 ? '' : 's'} to Unsort`,
    undo: () => {
      void (async () => {
        // Restore snapshots (persist + add lại store nếu view match).
        for (const o of snapshots) {
          await repo.saveObject(o);
          const currentView2 = useCurrentBoardStore.getState().currentBoardId;
          if (o.boardId === currentView2) useObjectsStore.getState().add(o);
          else useObjectsStore.getState().remove(o.id);
        }
        // Reindex items cũ trong Unsort đích: unsortIndex -= N.
        const existing = await repo.loadObjects(targetBoardId);
        const unsortExisting = existing
          .filter((o) => o.unsortIndex !== null && (o.unsortIndex ?? 0) >= N)
          .sort((a, b) => (a.unsortIndex ?? 0) - (b.unsortIndex ?? 0));
        for (const o of unsortExisting) {
          if (snapshots.find((s) => s.id === o.id)) continue; // skip object đã restore
          const updated = { ...o, unsortIndex: (o.unsortIndex ?? 0) - N, updatedAt: new Date().toISOString() };
          await repo.saveObject(updated);
          const currentView3 = useCurrentBoardStore.getState().currentBoardId;
          if (o.boardId === currentView3) useObjectsStore.getState().add(updated);
        }
      })();
    },
    redo: () => {
      moveObjectsToUnsort(ids, targetBoardId);
    },
  });
}

// --- Move từ Unsort ra canvas (drag-out) ---

/**
 * Đặt objects đang ở Unsort lên canvas hiện tại: gán unsortIndex=null,
 * geometry.x/y = drop point. Nhiều item drop cùng lúc → cascade offset 20px.
 * Reindex Unsort còn lại (fill hole).
 */
export function moveFromUnsortToCanvas(ids: string[], canvasX: number, canvasY: number): void {
  const store = useObjectsStore.getState();
  const repo = getCanvasRepository();

  const snapshots: CanvasObject[] = [];
  for (const id of ids) {
    const o = store.objects.get(id);
    if (o && o.unsortIndex !== null) snapshots.push(o);
  }
  if (snapshots.length === 0) return;

  // Sort theo unsortIndex để cascade thứ tự đẹp.
  snapshots.sort((a, b) => (a.unsortIndex ?? 0) - (b.unsortIndex ?? 0));

  const now = new Date().toISOString();
  const CASCADE = 20;

  for (let i = 0; i < snapshots.length; i++) {
    const src = snapshots[i];
    const g = src.geometry;
    const updated: CanvasObject = {
      ...src,
      unsortIndex: null,
      geometry: {
        ...g,
        x: canvasX - g.width / 2 + i * CASCADE,
        y: canvasY - g.height / 2 + i * CASCADE,
      },
      updatedAt: now,
    };
    store.add(updated);
    void repo.saveObject(updated);
  }

  // Reindex Unsort còn lại.
  const boardId = snapshots[0]?.boardId ?? null;
  const remaining = Array.from(store.objects.values())
    .filter((o) => o.unsortIndex !== null && o.boardId === boardId && !ids.includes(o.id))
    .sort((a, b) => (a.unsortIndex ?? 0) - (b.unsortIndex ?? 0));
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].unsortIndex === i) continue;
    const updated = { ...remaining[i], unsortIndex: i, updatedAt: now };
    store.add(updated);
    void repo.saveObject(updated);
  }

  useSelectionStore.getState().replace(snapshots.map((s) => s.id));

  useHistoryStore.getState().push({
    label: `Move ${snapshots.length} object${snapshots.length === 1 ? '' : 's'} to canvas`,
    undo: () => {
      for (const s of snapshots) {
        store.add(s);
        void repo.saveObject(s);
      }
      // Reindex Unsort ngược (restore các item đã shift).
      const restored = Array.from(useObjectsStore.getState().objects.values())
        .filter((o) => o.unsortIndex !== null && o.boardId === boardId)
        .sort((a, b) => (a.unsortIndex ?? 0) - (b.unsortIndex ?? 0));
      for (let i = 0; i < restored.length; i++) {
        if (restored[i].unsortIndex === i) continue;
        const updated = { ...restored[i], unsortIndex: i, updatedAt: new Date().toISOString() };
        useObjectsStore.getState().add(updated);
        void repo.saveObject(updated);
      }
    },
    redo: () => {
      moveFromUnsortToCanvas(ids, canvasX, canvasY);
    },
  });
}

// --- Reorder trong Unsort ---

/**
 * Gán lại unsortIndex 0..N-1 theo thứ tự orderedIds đưa vào. Chỉ áp dụng
 * cho items có boardId === contextBoardId. Snapshot cũ để undo.
 */
export function reorderInUnsort(orderedIds: string[], contextBoardId: string | null): void {
  const store = useObjectsStore.getState();
  const repo = getCanvasRepository();

  // Snapshot cũ cho undo.
  const oldOrder = new Map<string, number>();
  for (const id of orderedIds) {
    const o = store.objects.get(id);
    if (o && o.unsortIndex !== null) oldOrder.set(id, o.unsortIndex);
  }
  if (oldOrder.size === 0) return;

  const now = new Date().toISOString();
  const changed: { id: string; from: number; to: number }[] = [];
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const o = store.objects.get(id);
    if (!o || o.boardId !== contextBoardId) continue;
    if (o.unsortIndex === i) continue;
    changed.push({ id, from: o.unsortIndex ?? 0, to: i });
    const updated = { ...o, unsortIndex: i, updatedAt: now };
    store.add(updated);
    void repo.saveObject(updated);
  }
  if (changed.length === 0) return;

  useHistoryStore.getState().push({
    label: 'Reorder Unsort',
    undo: () => {
      for (const c of changed) {
        const o = useObjectsStore.getState().objects.get(c.id);
        if (!o) continue;
        const updated = { ...o, unsortIndex: c.from, updatedAt: new Date().toISOString() };
        useObjectsStore.getState().add(updated);
        void repo.saveObject(updated);
      }
    },
    redo: () => {
      for (const c of changed) {
        const o = useObjectsStore.getState().objects.get(c.id);
        if (!o) continue;
        const updated = { ...o, unsortIndex: c.to, updatedAt: new Date().toISOString() };
        useObjectsStore.getState().add(updated);
        void repo.saveObject(updated);
      }
    },
  });
}

// --- Move to Unsort của board hiện tại (Ctrl+Shift+U) ---

/**
 * Chuyển objects đang ở canvas hiện tại vào Unsort cùng board. Object giữ
 * boardId nguyên (không cross-board), chỉ đổi unsortIndex từ null → 0..N-1.
 * Items cũ trong Unsort đẩy xuống +N.
 */
export function moveToUnsortHere(ids: string[]): void {
  const store = useObjectsStore.getState();
  const repo = getCanvasRepository();

  const snapshots: CanvasObject[] = [];
  for (const id of ids) {
    const o = store.objects.get(id);
    if (o && o.unsortIndex === null) snapshots.push(o);
  }
  if (snapshots.length === 0) return;

  const N = snapshots.length;
  const boardId = snapshots[0].boardId;
  const now = new Date().toISOString();

  // Reindex items cũ trong Unsort cùng board: +N.
  const oldUnsort = Array.from(store.objects.values())
    .filter((o) => o.unsortIndex !== null && o.boardId === boardId)
    .sort((a, b) => (a.unsortIndex ?? 0) - (b.unsortIndex ?? 0));
  for (const o of oldUnsort) {
    const updated = { ...o, unsortIndex: (o.unsortIndex ?? 0) + N, updatedAt: now };
    store.add(updated);
    void repo.saveObject(updated);
  }

  // Gán snapshot mới 0..N-1.
  for (let i = 0; i < N; i++) {
    const updated = { ...snapshots[i], unsortIndex: i, updatedAt: now };
    store.add(updated);
    void repo.saveObject(updated);
  }
  useSelectionStore.getState().clear();

  useHistoryStore.getState().push({
    label: `Move ${N} to Unsort`,
    undo: () => {
      // Restore snapshots (unsortIndex null + geometry cũ).
      for (const s of snapshots) {
        useObjectsStore.getState().add(s);
        void repo.saveObject(s);
      }
      // Reindex items cũ -N.
      const nowU = new Date().toISOString();
      for (const o of oldUnsort) {
        const cur = useObjectsStore.getState().objects.get(o.id);
        if (!cur) continue;
        const updated = { ...cur, unsortIndex: (cur.unsortIndex ?? 0) - N, updatedAt: nowU };
        useObjectsStore.getState().add(updated);
        void repo.saveObject(updated);
      }
    },
    redo: () => {
      moveToUnsortHere(ids);
    },
  });
}

// --- Delete Board cascade ---

/** Collect id của toàn bộ Board con của `rootId` (recursive, exclude root). */
function collectDescendantBoardIds(rootId: string): string[] {
  const boards = useBoardsStore.getState().boards;
  const acc = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const b of boards.values()) {
      if (b.parentId === cur && !acc.has(b.id)) {
        acc.add(b.id);
        stack.push(b.id);
      }
    }
  }
  return Array.from(acc);
}

/**
 * Async: đếm tổng số object + board trong subtree (không tính chính rootBoardId).
 * Query IDB trực tiếp vì objects-store chỉ hold current view, không toàn bộ.
 * Chấp nhận O(B) load — trade cheap cho MVP.
 */
export async function countBoardTreeSize(rootBoardId: string): Promise<{
  boards: number;
  objects: number;
}> {
  const descendants = collectDescendantBoardIds(rootBoardId);
  const all = [rootBoardId, ...descendants];
  const repo = getCanvasRepository();
  let total = 0;
  for (const bid of all) {
    const objs = await repo.loadObjects(bid);
    total += objs.length;
  }
  return { boards: descendants.length, objects: total };
}

/**
 * Xoá Board + toàn bộ content descendants. Snapshot đầy đủ cho undo.
 * `boardObjectId` là CanvasObject type='board' trên canvas cha. Từ nó suy ra
 * linkedBoardId, walk cây con, xoá objects + boards, cuối cùng xoá BoardObject.
 */
export async function deleteBoardCascade(boardObjectId: string): Promise<void> {
  const boardObj = useObjectsStore.getState().objects.get(boardObjectId);
  if (!boardObj || boardObj.type !== 'board') return;
  const data = boardObj.data as BoardData;
  const rootId = data?.linkedBoardId;
  if (!rootId) return;
  const boardsMap = useBoardsStore.getState().boards;
  if (!boardsMap.has(rootId)) return;

  const descendants = collectDescendantBoardIds(rootId);
  const allBoardIds = [rootId, ...descendants];

  // Snapshot boards + objects toàn cây (đọc IDB vì objects-store chỉ hold view).
  const repo = getCanvasRepository();
  const boardSnapshots: Board[] = [];
  for (const bid of allBoardIds) {
    const b = boardsMap.get(bid);
    if (b) boardSnapshots.push(b);
  }
  const objectSnapshots: CanvasObject[] = [];
  for (const bid of allBoardIds) {
    const objs = await repo.loadObjects(bid);
    objectSnapshots.push(...objs);
  }
  const parentBoardObjSnapshot = boardObj;

  // Apply delete: objects trước, boards sau, cuối cùng BoardObject trên cha.
  for (const bid of allBoardIds) {
    await repo.deleteObjectsByBoard(bid);
    await repo.deleteBoard(bid);
  }
  useBoardsStore.getState().removeMany(allBoardIds);
  useObjectsStore.getState().remove(boardObjectId);
  await repo.deleteObject(boardObjectId);
  useSelectionStore.getState().clear();

  useHistoryStore.getState().push({
    label: 'Delete board',
    undo: () => {
      // Restore boards vào store + IDB.
      for (const b of boardSnapshots) {
        useBoardsStore.getState().add(b);
        void repo.saveBoard(b);
      }
      // Restore objects: tất cả về IDB, chỉ những object thuộc current view thì add store.
      const currentView = useCurrentBoardStore.getState().currentBoardId;
      for (const o of objectSnapshots) {
        void repo.saveObject(o);
        if (o.boardId === currentView) useObjectsStore.getState().add(o);
      }
      // Restore BoardObject trên parent view.
      void repo.saveObject(parentBoardObjSnapshot);
      if (parentBoardObjSnapshot.boardId === currentView) {
        useObjectsStore.getState().add(parentBoardObjSnapshot);
      }
    },
    redo: () => {
      void (async () => {
        for (const bid of allBoardIds) {
          await repo.deleteObjectsByBoard(bid);
          await repo.deleteBoard(bid);
        }
      })();
      useBoardsStore.getState().removeMany(allBoardIds);
      useObjectsStore.getState().remove(boardObjectId);
      void repo.deleteObject(boardObjectId);
    },
  });
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

// --- Z-index stacking actions (bring/send front/back) ---
//
// Layer 1 (canvas object stacking): đổi CanvasObject.geometry.zIndex để item
// chồng item trong board. Khác Layer 2 (screen overlay z-index CSS — xem
// `.kiro/notes/z-index-tiers.md`). Mọi action undo-able qua history-store.

/** Push command đổi zIndex 1 object từ `from` → `to`. Skip nếu bằng nhau. */
function pushZIndexChange(id: string, from: number, to: number, label: string): void {
  if (from === to) return;
  mutateGeometryAndPersist(id, { zIndex: to });
  useHistoryStore.getState().push({
    label,
    undo: () => mutateGeometryAndPersist(id, { zIndex: from }),
    redo: () => mutateGeometryAndPersist(id, { zIndex: to }),
  });
}

/**
 * Đưa object lên trên cùng: zIndex = max của board + 1. Bỏ qua nếu object đã
 * là item duy nhất ở top (zIndex === max và không ai khác cùng max).
 */
export function bringToFront(id: string): void {
  const o = useObjectsStore.getState().objects.get(id);
  if (!o || o.unsortIndex !== null) return;
  const others = boardCanvasObjects(o.boardId).filter((x) => x.id !== id);
  if (others.length === 0) return; // 1 object → luôn top rồi
  const max = others.reduce((m, x) => Math.max(m, x.geometry.zIndex), -Infinity);
  const target = max + 1;
  if (o.geometry.zIndex === target) return;
  pushZIndexChange(id, o.geometry.zIndex, target, 'Bring to front');
}

/** Đưa object xuống dưới cùng: zIndex = min của board - 1. */
export function sendToBack(id: string): void {
  const o = useObjectsStore.getState().objects.get(id);
  if (!o || o.unsortIndex !== null) return;
  const others = boardCanvasObjects(o.boardId).filter((x) => x.id !== id);
  if (others.length === 0) return;
  const min = others.reduce((m, x) => Math.min(m, x.geometry.zIndex), Infinity);
  const target = min - 1;
  if (o.geometry.zIndex === target) return;
  pushZIndexChange(id, o.geometry.zIndex, target, 'Send to back');
}

/**
 * Nâng 1 nấc: swap zIndex với object có zIndex kế cận TRÊN (nhỏ nhất trong các
 * zIndex > current). Không có ai trên → đã top, skip. Swap = 2 mutation, gộp
 * vào 1 undo entry.
 */
export function bringForward(id: string): void {
  const o = useObjectsStore.getState().objects.get(id);
  if (!o || o.unsortIndex !== null) return;
  const cur = o.geometry.zIndex;
  const above = boardCanvasObjects(o.boardId)
    .filter((x) => x.id !== id && x.geometry.zIndex > cur)
    .sort((a, b) => a.geometry.zIndex - b.geometry.zIndex)[0];
  if (!above) return; // đã top
  swapZIndex(id, cur, above.id, above.geometry.zIndex, 'Bring forward');
}

/** Hạ 1 nấc: swap với object có zIndex kế cận DƯỚI (lớn nhất trong zIndex < current). */
export function sendBackward(id: string): void {
  const o = useObjectsStore.getState().objects.get(id);
  if (!o || o.unsortIndex !== null) return;
  const cur = o.geometry.zIndex;
  const below = boardCanvasObjects(o.boardId)
    .filter((x) => x.id !== id && x.geometry.zIndex < cur)
    .sort((a, b) => b.geometry.zIndex - a.geometry.zIndex)[0];
  if (!below) return; // đã bottom
  swapZIndex(id, cur, below.id, below.geometry.zIndex, 'Send backward');
}

/** Swap zIndex 2 object, gộp 1 undo entry. */
function swapZIndex(idA: string, zA: number, idB: string, zB: number, label: string): void {
  if (zA === zB) return;
  mutateGeometryAndPersist(idA, { zIndex: zB });
  mutateGeometryAndPersist(idB, { zIndex: zA });
  useHistoryStore.getState().push({
    label,
    undo: () => {
      mutateGeometryAndPersist(idA, { zIndex: zA });
      mutateGeometryAndPersist(idB, { zIndex: zB });
    },
    redo: () => {
      mutateGeometryAndPersist(idA, { zIndex: zB });
      mutateGeometryAndPersist(idB, { zIndex: zA });
    },
  });
}
