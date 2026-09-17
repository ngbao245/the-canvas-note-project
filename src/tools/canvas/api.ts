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

// --- Interface ---
export interface CanvasRepository {
  loadBoards(): Promise<Board[]>;
  saveBoard(board: Board): Promise<void>;
  loadObjects(boardId: string | null): Promise<CanvasObject[]>;
  saveObject(obj: CanvasObject): Promise<void>;
  deleteObject(id: string): Promise<void>;
  saveCamera(boardId: string, camera: Camera): Promise<void>;
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

  async loadObjects(boardId: string | null): Promise<CanvasObject[]> {
    const ids = await keys(this.objectsStore);
    const result: CanvasObject[] = [];
    for (const id of ids) {
      const o = await get<CanvasObject>(id, this.objectsStore);
      if (o && o.boardId === boardId) result.push(o);
    }
    return result;
  }

  async saveObject(obj: CanvasObject): Promise<void> {
    await set(obj.id, obj, this.objectsStore);
  }

  async deleteObject(id: string): Promise<void> {
    await del(id, this.objectsStore);
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
