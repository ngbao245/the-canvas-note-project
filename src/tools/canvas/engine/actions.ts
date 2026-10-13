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
// Trong lúc drag, dùng `applyMoveDelta` / `previewResize` (chỉ đổi store, không
// ghi, không push history).
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
import { extractParagraphHtml, removeParagraphAt } from '../lib/note-clip';
import { parseNoteData } from '../lib/note-data';

/**
 * Update geometry của 1 object rồi persist snapshot mới ra repo (undo/redo,
 * resize đã chốt). Đọc snapshot LẠI sau mutation (store.getState) để lấy object
 * đã cập nhật, không phải closure cũ.
 */
function mutateGeometryAndPersist(id: string, geometry: Partial<Geometry>): void {
  mutateGeometry(id, geometry);
  persistObject(id);
}

/** Chỉ đổi store, không ghi. Dùng lúc đang kéo / resize: thả tay mới ghi. */
function mutateGeometry(id: string, geometry: Partial<Geometry>): void {
  const s = useObjectsStore.getState();
  if (!s.objects.get(id)) return;
  s.updateGeometry(id, geometry);
}

function persistObject(id: string): void {
  const upd = useObjectsStore.getState().objects.get(id);
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
function boardCanvasObjects(boardId: string): CanvasObject[] {
  const list: CanvasObject[] = [];
  for (const o of useObjectsStore.getState().objects.values()) {
    if (o.unsortIndex === null && o.boardId === boardId) list.push(o);
  }
  return list;
}

/** Max zIndex trong canvas của board. Board rỗng → -1 (để +1 = 0 cho item đầu). */
function getMaxZIndex(boardId: string): number {
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
  boardId: string,
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
    version: 0,
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
export function createRectAt(canvasX: number, canvasY: number, boardId: string): CanvasObject | null {
  return createObjectAt('rect', canvasX, canvasY, boardId);
}

// --- Board create (compound: Board entity + BoardObject atomic) ---

/**
 * Tạo Board entity mới + BoardObject đại diện trên canvas cha. Atomic undo:
 * Ctrl+Z xoá cả hai. Color rotate qua palette theo số sibling trong cùng parent.
 * `parentBoardId` = id board đang xem (Home cũng là id thật).
 */
export function createBoardAt(
  canvasX: number,
  canvasY: number,
  parentBoardId: string,
): { board: Board; object: CanvasObject } | null {
  const def = getObjectTypeDefinition('board');
  if (!def) return null;

  const boardsMap = useBoardsStore.getState().boards;
  const parentId = parentBoardId;

  // Đếm sibling boards trong cùng parent để chọn color index (rotate palette).
  let siblingCount = 0;
  for (const b of boardsMap.values()) {
    if (b.parentId === parentId) siblingCount++;
  }

  const now = new Date().toISOString();
  const board: Board = {
    id: crypto.randomUUID(),
    name: 'New Board',
    parentId,
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
    version: 0,
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

  // Board tile trong cụm: board nó trỏ tới phải đổi cha theo, không thì breadcrumb
  // vẫn chỉ về cha cũ. Chặn đưa board vào chính nó hoặc board con của nó (tạo vòng).
  const linkedIds = linkedBoardIdsOf(snapshots);
  for (const lid of linkedIds) {
    if (lid === targetBoardId || collectDescendantBoardIds(lid).includes(targetBoardId)) return;
  }
  const parentBefore = reparentBoards(linkedIds, targetBoardId);

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
      restoreBoardParents(parentBefore);
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

/** Id các Board mà board tile trong danh sách trỏ tới (bỏ qua object không phải board). */
function linkedBoardIdsOf(objects: CanvasObject[]): string[] {
  const out: string[] = [];
  for (const o of objects) {
    if (o.type !== 'board') continue;
    const lid = (o.data as Partial<BoardData> | null)?.linkedBoardId;
    if (typeof lid === 'string') out.push(lid);
  }
  return out;
}

/** Gán parentId mới cho các board, persist. Trả parentId cũ để undo. */
function reparentBoards(boardIds: string[], parentId: string): Map<string, string | null> {
  const before = new Map<string, string | null>();
  const repo = getCanvasRepository();
  for (const id of boardIds) {
    const cur = useBoardsStore.getState().boards.get(id);
    if (!cur || cur.parentId === parentId) continue;
    before.set(id, cur.parentId);
    useBoardsStore.getState().update(id, { parentId });
    const upd = useBoardsStore.getState().boards.get(id);
    if (upd) void repo.saveBoard(upd);
  }
  return before;
}

function restoreBoardParents(before: Map<string, string | null>): void {
  const repo = getCanvasRepository();
  for (const [id, parentId] of before) {
    useBoardsStore.getState().update(id, { parentId });
    const upd = useBoardsStore.getState().boards.get(id);
    if (upd) void repo.saveBoard(upd);
  }
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
  const boardId = snapshots[0].boardId;
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
export function reorderInUnsort(orderedIds: string[], contextBoardId: string): void {
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

// --- Note tự lưu (spec canvas-note-autosave) ---

/**
 * Ghi chữ note vào store + hàng đợi (kênh `text`), KHÔNG thêm bước undo. Gọi mỗi
 * lần editor đổi nội dung. Gộp vào data hiện tại → giữ màu / heightMode đã đổi
 * trong lúc sửa (VD kéo góc).
 */
export function setNoteBodySilently(id: string, body: string): void {
  const s = useObjectsStore.getState();
  const cur = s.objects.get(id);
  if (!cur) return;
  const data = parseNoteData(cur.data);
  if (data.body === body) return;
  s.updateData(id, { ...data, body });
  const updated = useObjectsStore.getState().objects.get(id);
  if (updated) void getCanvasRepository().saveObject(updated, 'text');
}

/**
 * Kết thúc 1 lần sửa note: đúng 1 bước undo từ chữ lúc vào sửa → chữ cuối.
 * Không đổi gì thì không ghi bước nào. Undo / redo chỉ đổi chữ, không đụng màu.
 */
export function commitNoteBodyEdit(id: string, before: string, after: string): void {
  if (before === after) return;
  if (!useObjectsStore.getState().objects.has(id)) return;
  setNoteBodySilently(id, after);
  useHistoryStore.getState().push({
    label: 'Edit note',
    undo: () => setNoteBodySilently(id, before),
    redo: () => setNoteBodySilently(id, after),
  });
}

/** Khoảng cách note mới khi Ctrl+Enter (canvas-space). Có thể chỉnh sau khi dùng thử. */
const NOTE_BELOW_GAP = 16;

/**
 * Ctrl+Enter: tạo note mới ngay dưới note `id`, cùng cạnh trái, cách cạnh dưới
 * NOTE_BELOW_GAP. Kích thước / màu mặc định như note từ toolbar. 1 bước undo
 * (createObjectAt). Trả note mới để caller cho vào sửa.
 */
export function createNoteBelow(id: string): CanvasObject | null {
  const cur = useObjectsStore.getState().objects.get(id);
  const def = getObjectTypeDefinition('note');
  if (!cur || !def || cur.unsortIndex !== null) return null;
  const { width, height } = def.defaultGeometry;
  // createObjectAt nhận TÂM object.
  const cx = cur.geometry.x + width / 2;
  const cy = cur.geometry.y + cur.geometry.height + NOTE_BELOW_GAP + height / 2;
  return createObjectAt('note', cx, cy, cur.boardId);
}

// --- Move (live during drag) ---
/**
 * Apply delta trong drag: CHỈ đổi store, không ghi, không push history. Gọi mỗi
 * pointermove. Ghi xuống máy lúc thả (`commitMove`); F5 / đóng tab giữa lúc kéo
 * thì object giữ vị trí cũ.
 */
export function applyMoveDelta(ids: string[], dx: number, dy: number): void {
  for (const id of ids) {
    const cur = useObjectsStore.getState().objects.get(id);
    if (!cur) continue;
    mutateGeometry(id, { x: cur.geometry.x + dx, y: cur.geometry.y + dy });
  }
}

/** Commit move sau drag end: ghi vị trí mới + push MoveCommand với snapshot before/after. */
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
  for (const id of after.keys()) persistObject(id);

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
function clampedGeometry(id: string, geometry: Partial<Geometry>): Geometry | null {
  const cur = useObjectsStore.getState().objects.get(id);
  if (!cur) return null;
  const next = { ...cur.geometry, ...geometry };
  if (next.width < MIN_OBJECT_SIZE) next.width = MIN_OBJECT_SIZE;
  if (next.height < MIN_OBJECT_SIZE) next.height = MIN_OBJECT_SIZE;
  return next;
}

/** Đổi kích thước + ghi ngay, không push history (VD note tự cao theo chữ). */
export function applyResize(id: string, geometry: Partial<Geometry>): void {
  const next = clampedGeometry(id, geometry);
  if (next) mutateGeometryAndPersist(id, next);
}

/** Đổi kích thước lúc đang kéo góc: CHỈ đổi store. Thả tay → `commitResize` ghi. */
export function previewResize(id: string, geometry: Partial<Geometry>): void {
  const next = clampedGeometry(id, geometry);
  if (next) mutateGeometry(id, next);
}

/** Commit resize sau drag end: ghi kích thước mới + push ResizeCommand. */
export function commitResize(id: string, before: Geometry, after: Geometry): void {
  if (
    before.x === after.x &&
    before.y === after.y &&
    before.width === after.width &&
    before.height === after.height
  ) {
    return;
  }
  persistObject(id);
  useHistoryStore.getState().push({
    label: 'Resize object',
    undo: () => mutateGeometryAndPersist(id, before),
    redo: () => mutateGeometryAndPersist(id, after),
  });
}

// --- Duplicate / Paste (composite, undo-able) ---
//
// `duplicateObjects` (Ctrl+D) và `pasteObjects` (Ctrl+V) cùng một việc: dịch
// template theo offset rồi chèn qua `insertObjectsComposite` → 1 undo entry
// cho cả cụm, không phải N entry.

/** Bản mẫu để tạo object mới: không có id/boardId/timestamp/unsortIndex.
 *  Dùng chung cho clipboard payload (`lib/clipboard.ts`). */
export interface ObjectTemplate {
  type: string;
  geometry: Geometry;
  data: unknown;
}

function offsetTemplates(templates: ObjectTemplate[], dx: number, dy: number): ObjectTemplate[] {
  return templates.map((t) => ({
    ...t,
    geometry: { ...t.geometry, x: t.geometry.x + dx, y: t.geometry.y + dy },
  }));
}

/**
 * Tạo N object mới từ templates trong 1 composite undo entry. Templates đã
 * được caller tính geometry final (position, size). Auto-assign id mới,
 * boardId = target, unsortIndex = null (luôn canvas), zIndex tăng dần từ
 * max(board) + 1 để cluster nằm trên cùng.
 *
 * Selection sau khi apply = tất cả object mới (replace).
 */
function insertObjectsComposite(
  templates: ObjectTemplate[],
  boardId: string,
  label: string,
): CanvasObject[] {
  if (templates.length === 0) return [];
  const now = new Date().toISOString();
  const baseZ = getMaxZIndex(boardId) + 1;
  const created: CanvasObject[] = templates.map((t, i) => ({
    id: crypto.randomUUID(),
    type: t.type,
    boardId,
    geometry: { ...t.geometry, zIndex: baseZ + i },
    data: t.data,
    unsortIndex: null,
    version: 0,
    createdAt: now,
    updatedAt: now,
  }));

  const repo = getCanvasRepository();
  const apply = () => {
    const s = useObjectsStore.getState();
    for (const obj of created) {
      s.add(obj);
      void repo.saveObject(obj);
    }
    useSelectionStore.getState().replace(created.map((o) => o.id));
  };
  const revert = () => {
    const s = useObjectsStore.getState();
    for (const obj of created) {
      s.remove(obj.id);
      void repo.deleteObject(obj.id);
    }
    useSelectionStore.getState().clear();
  };

  apply();
  useHistoryStore.getState().push({ label, undo: revert, redo: apply });
  return created;
}

/**
 * Duplicate object(s) đang chọn tại offset (dx, dy) canvas-space. Ctrl+D
 * dùng offset (+16, +16) để bản sao không đè hoàn toàn lên gốc — user thấy
 * ngay item mới. Multi-select giữ tương quan geometry giữa các item (offset
 * chung, không collapse).
 */
export function duplicateObjects(
  ids: string[],
  offset: { dx: number; dy: number } = { dx: 16, dy: 16 },
): CanvasObject[] {
  const store = useObjectsStore.getState();
  const originals: CanvasObject[] = [];
  for (const id of ids) {
    const o = store.objects.get(id);
    // Chỉ duplicate object trên canvas (unsortIndex === null). Object trong
    // Unsort không hỗ trợ Ctrl+D — user muốn thì kéo ra canvas trước.
    if (o && o.unsortIndex === null) originals.push(o);
  }
  if (originals.length === 0) return [];

  const templates = originals.map((o) => ({
    type: o.type,
    geometry: o.geometry,
    // Deep clone để bản sao không share reference với gốc. JSON round-trip đủ
    // vì data là plain object.
    data: JSON.parse(JSON.stringify(o.data)) as unknown,
  }));
  const label = originals.length === 1 ? 'Duplicate object' : `Duplicate ${originals.length} objects`;
  return insertObjectsComposite(
    offsetTemplates(templates, offset.dx, offset.dy),
    originals[0].boardId,
    label,
  );
}

/**
 * Paste templates (từ clipboard) dịch theo offset so với vị trí gốc. Offset
 * chung cho cả cụm → tương quan vị trí giữa các item giữ nguyên. Cross-board
 * OK vì boardId do caller truyền (thường = board hiện tại).
 */
export function pasteObjects(
  templates: ObjectTemplate[],
  offset: { dx: number; dy: number },
  boardId: string,
): CanvasObject[] {
  const label = templates.length === 1 ? 'Paste object' : `Paste ${templates.length} objects`;
  return insertObjectsComposite(offsetTemplates(templates, offset.dx, offset.dy), boardId, label);
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


// --- Card Clipper (Milanote parity: tách paragraph khỏi Note thành note mới) ---

/**
 * Tách paragraph tại index của Note gốc thành Note mới tại (canvasX, canvasY).
 * `cut=true` → Note gốc mất paragraph đó (Milanote default). `cut=false` → copy
 * (giữ paragraph gốc, chỉ tạo bản sao). Composite command: 1 undo entry revert
 * cả tạo mới + xoá paragraph gốc.
 *
 * Callers:
 *   - CardClipperButton drag → drop trên canvas.
 *   - Alt+drag = copy, else cut.
 */
export function clipParagraphToNewNote(
  sourceId: string,
  paragraphIndex: number,
  canvasX: number,
  canvasY: number,
  boardId: string,
  cut: boolean,
): CanvasObject | null {
  const source = useObjectsStore.getState().objects.get(sourceId);
  if (!source) return null;

  const parsedData = parseNoteData(source.data);
  const paragraphHtml = extractParagraphHtml(parsedData.body, paragraphIndex);
  if (!paragraphHtml) return null;

  const def = getObjectTypeDefinition('note');
  if (!def) return null;
  const { width, height, rotation } = def.defaultGeometry;
  const zIndex = getMaxZIndex(boardId) + 1;
  const now = new Date().toISOString();

  // New note với body = paragraph vừa clip. Color inherit từ source (Milanote
  // parity — visual continuity giữa note gốc và note tách ra).
  const newObj: CanvasObject = {
    id: crypto.randomUUID(),
    type: 'note',
    boardId,
    geometry: {
      x: canvasX - width / 2,
      y: canvasY - height / 2,
      width,
      height,
      rotation,
      zIndex,
    },
    data: { body: paragraphHtml, color: parsedData.color },
    unsortIndex: null,
    version: 0,
    createdAt: now,
    updatedAt: now,
  };

  const originalSourceData = source.data;
  const nextSourceBody = cut ? removeParagraphAt(parsedData.body, paragraphIndex) : parsedData.body;
  const nextSourceData = { body: nextSourceBody, color: parsedData.color };

  const repo = getCanvasRepository();

  const apply = () => {
    useObjectsStore.getState().add(newObj);
    useSelectionStore.getState().select(newObj.id);
    void repo.saveObject(newObj);
    if (cut) {
      useObjectsStore.getState().updateData(sourceId, nextSourceData);
      const updated = useObjectsStore.getState().objects.get(sourceId);
      if (updated) void repo.saveObject(updated);
    }
  };

  const revert = () => {
    useObjectsStore.getState().remove(newObj.id);
    useSelectionStore.getState().clear();
    void repo.deleteObject(newObj.id);
    if (cut) {
      useObjectsStore.getState().updateData(sourceId, originalSourceData);
      const restored = useObjectsStore.getState().objects.get(sourceId);
      if (restored) void repo.saveObject(restored);
    }
  };

  apply();

  useHistoryStore.getState().push({
    label: cut ? 'Clip paragraph (Cut)' : 'Clip paragraph (Copy)',
    undo: revert,
    redo: apply,
  });

  return newObj;
}
