// ============================================================
// Canvas — Repository interface + IndexedDB adapter (Phase A)
// ============================================================
//
// Interface tách khỏi implement. UI/store chỉ gọi interface.
// TODO Phase D: viết SupabaseCanvasRepository implement cùng interface,
// đổi 1 chỗ trong getCanvasRepository() là swap được, không đụng UI/store.
// ============================================================

import { createStore, get, set, del, keys, type UseStore } from 'idb-keyval';
import type { Board, CanvasObject, Camera } from './types';

/** Object bản cũ trên Home: giống CanvasObject nhưng `boardId` là null. */
export type LegacyRootObject = Omit<CanvasObject, 'boardId'> & { boardId: null };

// --- Interface ---
export interface CanvasRepository {
  loadBoards(): Promise<Board[]>;
  saveBoard(board: Board): Promise<void>;
  /** Xoá 1 Board record. Không cascade — caller lo xoá objects/children. */
  deleteBoard(id: string): Promise<void>;
  loadObjects(boardId: string): Promise<CanvasObject[]>;
  /** Object lưu theo quy ước cũ (`boardId: null` = Home). Chỉ dùng lúc chuyển đổi. */
  loadLegacyRootObjects(): Promise<LegacyRootObject[]>;
  saveObject(obj: CanvasObject): Promise<void>;
  deleteObject(id: string): Promise<void>;
  /** Batch xoá mọi object có boardId matching. Dùng cho cascade delete Board. */
  deleteObjectsByBoard(boardId: string): Promise<void>;
  saveCamera(boardId: string, camera: Camera): Promise<void>;
  /** Tổng số board + object đang lưu. Dùng cho Cài đặt → Dữ liệu. Board tính cả Home. */
  countAll(): Promise<{ boards: number; objects: number }>;
}

// --- IndexedDB adapter ---
// Dùng 2 kv-store trong DB "bibo-canvas":
//   boards: id -> Board
//   objects: id -> CanvasObject (filter theo boardId khi loadObjects)

class IndexedDbCanvasRepository implements CanvasRepository {
  private boardsStore: UseStore;
  private objectsStore: UseStore;

  constructor() {
    // Tách 2 DB riêng — idb-keyval createStore không tạo được store thứ 2 trong
    // cùng DB (version không bump, upgradeneeded không fire).
    this.boardsStore = createStore('bibo-canvas-boards', 'kv');
    this.objectsStore = createStore('bibo-canvas-objects', 'kv');
  }

  async loadBoards(): Promise<Board[]> {
    const ids = await keys(this.boardsStore);
    const boards: Board[] = [];
    for (const id of ids) {
      const b = await get<Board>(id, this.boardsStore);
      if (b) boards.push(b);
    }
    return boards;
  }

  async saveBoard(board: Board): Promise<void> {
    await set(board.id, board, this.boardsStore);
  }

  async deleteBoard(id: string): Promise<void> {
    await del(id, this.boardsStore);
  }

  async loadObjects(boardId: string): Promise<CanvasObject[]> {
    const ids = await keys(this.objectsStore);
    const result: CanvasObject[] = [];
    for (const id of ids) {
      const o = await get<CanvasObject>(id, this.objectsStore);
      if (o && o.boardId === boardId) result.push(o);
    }
    return result;
  }

  async loadLegacyRootObjects(): Promise<LegacyRootObject[]> {
    const ids = await keys(this.objectsStore);
    const result: LegacyRootObject[] = [];
    for (const id of ids) {
      // Đọc thô: data IDB cũ có thể còn boardId null dù type mới là string.
      const o = await get<CanvasObject | LegacyRootObject>(id, this.objectsStore);
      if (o && o.boardId === null) result.push(o as LegacyRootObject);
    }
    return result;
  }

  async saveObject(obj: CanvasObject): Promise<void> {
    await set(obj.id, obj, this.objectsStore);
  }

  async deleteObject(id: string): Promise<void> {
    await del(id, this.objectsStore);
  }

  async deleteObjectsByBoard(boardId: string): Promise<void> {
    const ids = await keys(this.objectsStore);
    for (const id of ids) {
      const o = await get<CanvasObject>(id, this.objectsStore);
      if (o && o.boardId === boardId) await del(id, this.objectsStore);
    }
  }

  async countAll(): Promise<{ boards: number; objects: number }> {
    // Chỉ đếm key, không đọc value → nhanh kể cả khi nhiều object.
    const [boardKeys, objectKeys] = await Promise.all([
      keys(this.boardsStore),
      keys(this.objectsStore),
    ]);
    return { boards: boardKeys.length, objects: objectKeys.length };
  }

  async saveCamera(boardId: string, camera: Camera): Promise<void> {
    const board = await get<Board>(boardId, this.boardsStore);
    if (!board) return;
    await set(
      boardId,
      { ...board, camera, updatedAt: new Date().toISOString() },
      this.boardsStore,
    );
  }
}

// --- Singleton ---
let repo: CanvasRepository | null = null;

export function getCanvasRepository(): CanvasRepository {
  if (!repo) repo = new IndexedDbCanvasRepository();
  return repo;
}
