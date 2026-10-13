// ============================================================
// Canvas — Repository interface + IndexedDB adapter
// ============================================================
//
// Interface tách khỏi implement. UI/store chỉ gọi interface.
// TODO canvas-sync: thêm outbox vào cùng database, ghi cùng transaction với object.
// ============================================================

import { deleteDatabaseInBackground, openDatabase, requestToPromise, transactionDone } from './lib/idb';
import type { Board, CanvasObject, Camera } from './types';
import { trackSave } from './store/save-status-store';
import {
  createWriteQueue,
  type WriteBatch,
  type WriteChannel,
  type WriteOp,
} from './lib/write-queue';
import { postTabMessage } from './lib/tab-channel';

// --- Interface ---
export interface CanvasRepository {
  loadBoards(): Promise<Board[]>;
  /** Lưu thông tin board. KHÔNG ghi camera (camera có store riêng, xem `saveCamera`). */
  saveBoard(board: Board): Promise<void>;
  /** Xoá 1 Board record + camera của nó. Không cascade — caller lo xoá objects/children. */
  deleteBoard(id: string): Promise<void>;
  loadObjects(boardId: string): Promise<CanvasObject[]>;
  /** 1 object theo id (tính cả phần chưa ghi xuống). Dùng khi tab khác báo đã đổi. */
  loadObject(id: string): Promise<CanvasObject | null>;
  /** Tab này còn thay đổi chưa ghi xuống cho object đó (bản trong store mới hơn đĩa). */
  hasPendingWrite(id: string): boolean;
  /**
   * Ghi object qua hàng đợi. `channel` mặc định `props`; nội dung chữ note dùng `text`.
   * Promise xong khi lô chứa object chạy xong. Ghi lỗi không reject: dữ liệu giữ lại
   * trong hàng để thử lại, lỗi hiện qua trạng thái lưu ("Lưu lỗi").
   */
  saveObject(obj: CanvasObject, channel?: WriteChannel): Promise<void>;
  deleteObject(id: string): Promise<void>;
  /** Batch xoá mọi object có boardId matching. Dùng cho cascade delete Board. */
  deleteObjectsByBoard(boardId: string): Promise<void>;
  saveCamera(boardId: string, camera: Camera): Promise<void>;
  /** Tổng số board + object đang lưu. Dùng cho Cài đặt → Dữ liệu. Board tính cả Home. */
  countAll(): Promise<{ boards: number; objects: number }>;
  /**
   * Chờ phần object đang chờ ghi xuống xong (kể cả lỗi thì vẫn resolve).
   * `urgent` (ẩn / đóng tab): ghi ngay song song, không chờ lô đang chạy.
   */
  flush(options?: { urgent?: boolean }): Promise<void>;
}

// --- IndexedDB adapter ---
// 1 database "bibo-canvas", 3 store:
//   boards  (keyPath id)                 → Board không có camera
//   objects (keyPath id, chỉ mục boardId) → CanvasObject
//   cameras (keyPath boardId)             → camera từng board (UI state, ghi liên tục khi pan)
// Camera tách riêng để lưu board (đổi tên, màu) và lưu camera không đè nhau.
//
// Phiên bản 2 (không phải 1): bản rất cũ có thể đã tạo "bibo-canvas" phiên bản 1
// với store khác. Nâng từ < 2 thì xoá hết store cũ, tạo lại. Dữ liệu cũ bỏ (bạn chốt
// 2026-10-11), 2 database idb-keyval cũ cũng xoá.

const DB_NAME = 'bibo-canvas';
const DB_VERSION = 2;
const LEGACY_DB_NAMES = ['bibo-canvas-boards', 'bibo-canvas-objects'];
const BOARDS = 'boards';
const OBJECTS = 'objects';
const CAMERAS = 'cameras';
const BY_BOARD = 'boardId';

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

type StoredBoard = Omit<Board, 'camera'>;
type StoredCamera = Camera & { boardId: string };

function upgradeCanvasDb(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 2) {
    for (const name of Array.from(db.objectStoreNames)) db.deleteObjectStore(name);
    db.createObjectStore(BOARDS, { keyPath: 'id' });
    const objects = db.createObjectStore(OBJECTS, { keyPath: 'id' });
    objects.createIndex(BY_BOARD, 'boardId', { unique: false });
    db.createObjectStore(CAMERAS, { keyPath: 'boardId' });
  }
}

// Adapter thô: ghi thẳng IndexedDB, không hàng đợi. Chỉ dùng qua `withWriteQueue`.
class IndexedDbCanvasRepository {
  /** Version đã ghi gần nhất theo id, để version tăng đều kể cả khi store giữ bản cũ (undo). */
  private writtenVersions = new Map<string, number>();
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      for (const name of LEGACY_DB_NAMES) deleteDatabaseInBackground(name);
      this.dbPromise = openDatabase(DB_NAME, DB_VERSION, upgradeCanvasDb);
      // Mở lỗi thì lần gọi sau thử mở lại, không giữ promise lỗi mãi.
      this.dbPromise.catch(() => {
        this.dbPromise = null;
      });
    }
    return this.dbPromise;
  }

  async loadBoards(): Promise<Board[]> {
    const tx = (await this.db()).transaction([BOARDS, CAMERAS], 'readonly');
    const [boards, cameras] = await Promise.all([
      requestToPromise<StoredBoard[]>(tx.objectStore(BOARDS).getAll()),
      requestToPromise<StoredCamera[]>(tx.objectStore(CAMERAS).getAll()),
    ]);
    const cameraById = new Map(cameras.map((c) => [c.boardId, c]));
    return boards.map((b) => {
      const c = cameraById.get(b.id);
      return { ...b, camera: c ? { x: c.x, y: c.y, zoom: c.zoom } : { ...DEFAULT_CAMERA } };
    });
  }

  async saveBoard(board: Board): Promise<void> {
    // Bỏ camera: board trong store có thể giữ camera cũ từ lúc tải, ghi vào sẽ đè camera mới.
    const { camera: _camera, ...stored } = board;
    void _camera;
    const tx = (await this.db()).transaction(BOARDS, 'readwrite');
    tx.objectStore(BOARDS).put(stored);
    await transactionDone(tx);
  }

  async deleteBoard(id: string): Promise<void> {
    const tx = (await this.db()).transaction([BOARDS, CAMERAS], 'readwrite');
    tx.objectStore(BOARDS).delete(id);
    tx.objectStore(CAMERAS).delete(id);
    await transactionDone(tx);
  }

  async loadObjects(boardId: string): Promise<CanvasObject[]> {
    const tx = (await this.db()).transaction(OBJECTS, 'readonly');
    return requestToPromise<CanvasObject[]>(
      tx.objectStore(OBJECTS).index(BY_BOARD).getAll(IDBKeyRange.only(boardId)),
    );
  }

  /** Ghi cả lô trong 1 transaction: hoặc xuống hết, hoặc không gì. Đóng dấu version lúc ghi. */
  async writeObjects(batch: WriteBatch<CanvasObject>): Promise<void> {
    // Ghi nhận version lúc đóng dấu (trước khi xuống đĩa) để lô gấp chạy song song
    // không đóng trùng số. Lô lỗi thì bỏ qua 1 số, vẫn tăng đều.
    const stamped = batch.puts.map(({ id, value }) => {
      const next = Math.max(value.version, this.writtenVersions.get(id) ?? 0) + 1;
      this.writtenVersions.set(id, next);
      return { ...value, version: next };
    });
    const tx = (await this.db()).transaction(OBJECTS, 'readwrite');
    const store = tx.objectStore(OBJECTS);
    for (const o of stamped) store.put(o);
    for (const id of batch.deletes) store.delete(id);
    await transactionDone(tx);
  }

  async loadObject(id: string): Promise<CanvasObject | null> {
    const tx = (await this.db()).transaction(OBJECTS, 'readonly');
    const o = await requestToPromise<CanvasObject | undefined>(tx.objectStore(OBJECTS).get(id));
    return o ?? null;
  }

  async countAll(): Promise<{ boards: number; objects: number }> {
    // count() không đọc nội dung → nhanh kể cả khi nhiều object.
    const tx = (await this.db()).transaction([BOARDS, OBJECTS], 'readonly');
    const [boards, objects] = await Promise.all([
      requestToPromise(tx.objectStore(BOARDS).count()),
      requestToPromise(tx.objectStore(OBJECTS).count()),
    ]);
    return { boards, objects };
  }

  async saveCamera(boardId: string, camera: Camera): Promise<void> {
    const record: StoredCamera = { boardId, x: camera.x, y: camera.y, zoom: camera.zoom };
    const tx = (await this.db()).transaction(CAMERAS, 'readwrite');
    tx.objectStore(CAMERAS).put(record);
    await transactionDone(tx);
  }
}

// --- Hàng đợi ghi + trạng thái lưu ---
// Mọi lệnh ghi / xoá object đi qua 1 hàng đợi (lib/write-queue.ts): 1 lô đang ghi,
// phần mới gom chờ, cùng object giữ bản mới nhất. Kéo object ghi mỗi pointermove
// giờ tự gộp còn vài lô.
// Đọc object phải tính cả phần chưa xuống đĩa (`overlay`), không thì vừa ghi xong
// đọc lại ra bản cũ (VD moveObjectsToUnsort ghi rồi loadObjects ngay).
// Trạng thái lưu ("Đang lưu… / Đã lưu / Lưu lỗi") đo theo từng lô ghi. Board vẫn
// ghi thẳng (ít, không nằm trên đường gõ / kéo). saveCamera KHÔNG tính: pan/zoom
// lưu liên tục, báo "Đã lưu" mỗi lần kéo canvas là nhiễu.
// Ghi xong 1 lô thì báo tab khác (lib/tab-channel.ts) để chúng đọc lại object.
function withWriteQueue(inner: IndexedDbCanvasRepository): CanvasRepository {
  const queue = createWriteQueue<CanvasObject>(
    async (batch) => {
      await trackSave(inner.writeObjects(batch));
      postTabMessage({ type: 'objects', puts: batch.puts.map((p) => p.id), deletes: batch.deletes });
    },
    (err) => {
      console.warn('[canvas] ghi IndexedDB lỗi, giữ lại để thử lại', err);
    },
  );

  async function loadObjects(boardId: string): Promise<CanvasObject[]> {
    // Chụp trước + sau khi đọc: lô xong giữa chừng lúc đọc vẫn không bị lấy bản cũ.
    const before = queue.snapshot();
    const base = await inner.loadObjects(boardId);
    const ops = new Map([...before, ...queue.snapshot()]);
    return overlay(base, ops, boardId);
  }

  return {
    loadBoards: () => inner.loadBoards(),
    saveBoard: (board) => trackSave(inner.saveBoard(board)),
    deleteBoard: (id) => trackSave(inner.deleteBoard(id)),
    loadObjects,
    loadObject: async (id) => {
      const before = queue.snapshot().get(id);
      const base = await inner.loadObject(id);
      const op = queue.snapshot().get(id) ?? before;
      if (!op) return base;
      return op.kind === 'put' ? op.value : null;
    },
    hasPendingWrite: (id) => queue.has(id),
    saveObject: (obj, channel = 'props') => queue.enqueue(obj.id, { kind: 'put', value: obj }, channel),
    deleteObject: (id) => queue.enqueue(id, { kind: 'delete' }, 'props'),
    deleteObjectsByBoard: async (boardId) => {
      // Xoá qua hàng đợi từng object để đứng sau mọi lệnh ghi cùng object đã vào trước.
      const objs = await loadObjects(boardId);
      await Promise.all(objs.map((o) => queue.enqueue(o.id, { kind: 'delete' }, 'props')));
    },
    saveCamera: (boardId, camera) => inner.saveCamera(boardId, camera),
    countAll: async () => {
      await queue.flush();
      return inner.countAll();
    },
    flush: (options) => queue.flush(options),
  };
}

function overlay(
  base: CanvasObject[],
  ops: Map<string, WriteOp<CanvasObject>>,
  boardId: string,
): CanvasObject[] {
  const byId = new Map(base.map((o) => [o.id, o]));
  for (const [id, op] of ops) {
    if (op.kind === 'put' && op.value.boardId === boardId) byId.set(id, op.value);
    else byId.delete(id); // đã xoá, hoặc đã chuyển sang board khác
  }
  return [...byId.values()];
}

// --- Singleton ---
let repo: CanvasRepository | null = null;

export function getCanvasRepository(): CanvasRepository {
  if (!repo) repo = withWriteQueue(new IndexedDbCanvasRepository());
  return repo;
}
