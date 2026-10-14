// ============================================================
// Canvas — Repository interface + IndexedDB adapter
// ============================================================
//
// Interface tách khỏi implement. UI/store chỉ gọi interface.
// Outbox (spec `canvas-outbox`): khi bật, mỗi lô ghi object ghi kèm mục outbox CÙNG
// transaction. Lớp gửi (sync/outbox-runtime.ts) đọc / xác nhận qua `getOutboxStore()`.
// ============================================================

import { deleteDatabaseInBackground, openDatabase, requestToPromise, transactionDone } from './lib/idb';
import type { Board, CanvasObject, Camera } from './types';
import { trackSave } from './store/save-status-store';
import {
  createWriteQueue,
  type WriteBatch,
  type WriteChannel,
  type WriteOp,
  type WriteQueueTracer,
} from './lib/write-queue';
import { postTabMessage } from './lib/tab-channel';
import { OUTBOX_ENABLED } from './sync/outbox-config';
import {
  markEntryNew,
  mergeOutboxEntry,
  newSyncId,
  parseOutboxEntry,
  toSyncOp,
  type OutboxChange,
} from './sync/outbox-entry';
import { diffObjectFields } from './sync/object-fields';
import { signalOutbox } from './sync/outbox-signal';
import type { ApplyResponse, SyncOp } from './sync/protocol';

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
   * Outbox bật: ghi xong thì báo lớp gửi gửi ngay (không chờ cửa sổ gom).
   */
  flush(options?: { urgent?: boolean }): Promise<void>;
}

/** Outbox trên máy, cho lớp gửi + bảng dev. Không dùng từ UI / store. */
export interface OutboxStore {
  /** Mọi mục kèm nội dung object, đọc cùng 1 transaction. */
  loadOps(): Promise<SyncOp<CanvasObject>[]>;
  /**
   * Xoá mục có mã gửi được nhận (mục đã sửa tiếp thì mã khác → giữ). Mục server báo thiếu
   * object → chuyển sang gửi nguyên object. Trả số mục còn lại.
   */
  ack(res: ApplyResponse): Promise<number>;
  count(): Promise<number>;
  /** Mọi object + id đang có mục chờ (bảng dev so với server). */
  snapshot(): Promise<{ objects: CanvasObject[]; pendingIds: string[] }>;
}

// --- IndexedDB adapter ---
// 1 database "bibo-canvas", 3 store:
//   boards  (keyPath id)                 → Board không có camera
//   objects (keyPath id, chỉ mục boardId) → CanvasObject
//   cameras (keyPath boardId)             → camera từng board (UI state, ghi liên tục khi pan)
// Camera tách riêng để lưu board (đổi tên, màu) và lưu camera không đè nhau.
//
//   outbox  (keyPath objectId)            → mục chờ gửi server, mỗi object tối đa 1 mục
//                                           (phiên bản 3, spec `canvas-outbox`)
//
// Phiên bản 2 (không phải 1): bản rất cũ có thể đã tạo "bibo-canvas" phiên bản 1
// với store khác. Nâng từ < 2 thì xoá hết store cũ, tạo lại. Dữ liệu cũ bỏ (bạn chốt
// 2026-10-11), 2 database idb-keyval cũ cũng xoá. Nâng 2 → 3 chỉ thêm store outbox.

const DB_NAME = 'bibo-canvas';
const DB_VERSION = 3;
const OUTBOX = 'outbox';
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
  if (oldVersion < 3) db.createObjectStore(OUTBOX, { keyPath: 'objectId' });
}

function readVersion(value: unknown): number | null {
  if (typeof value !== 'object' || value === null || !('version' in value)) return null;
  return typeof value.version === 'number' ? value.version : null;
}

// Adapter thô: ghi thẳng IndexedDB, không hàng đợi. Chỉ dùng qua `withWriteQueue`.
class IndexedDbCanvasRepository {
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

  /**
   * Ghi cả lô trong 1 transaction: hoặc xuống hết, hoặc không gì. Đóng dấu version lúc ghi.
   * `withOutbox`: ghi / gộp mục outbox trong CÙNG transaction (object xuống thì mục xuống).
   */
  async writeObjects(batch: WriteBatch<CanvasObject>, withOutbox: boolean): Promise<void> {
    const tx = (await this.db()).transaction(withOutbox ? [OBJECTS, OUTBOX] : [OBJECTS], 'readwrite');
    const store = tx.objectStore(OBJECTS);
    const outbox = withOutbox ? tx.objectStore(OUTBOX) : null;
    const groupId = withOutbox ? newSyncId() : '';
    const now = Date.now();
    // Đọc mục cũ rồi gộp, ngay trong callback để transaction còn mở.
    const addChange = (change: Omit<OutboxChange, 'groupId' | 'now'>) => {
      if (!outbox) return;
      const prev = outbox.get(change.objectId);
      prev.onsuccess = () => {
        outbox.put(mergeOutboxEntry(parseOutboxEntry(prev.result), { ...change, groupId, now }, newSyncId));
      };
    };
    for (const { id, value, channels } of batch.puts) {
      // Đóng dấu version theo bản TRÊN ĐĨA, đọc trong chính transaction này: transaction ghi
      // cùng store chạy lần lượt, nên tab khác / lô gấp song song đã ghi xong trước thì ở đây
      // thấy số mới nhất. Bản ghi mang số cũ (undo, tab khác) vẫn ra số lớn hơn → không lùi, không trùng.
      const before = store.get(id);
      before.onsuccess = () => {
        const prev: unknown = before.result;
        const prevVersion = readVersion(prev);
        const o: CanvasObject = { ...value, version: Math.max(value.version, prevVersion ?? 0) + 1 };
        // Bản cũ cũng cho biết trường nào đổi để gửi patch.
        addChange({
          objectId: id,
          kind: 'put',
          isNew: prev === undefined,
          fields: prev === undefined ? [] : diffObjectFields(prev, o),
          channels,
          baseVersion: prevVersion ?? o.version - 1,
        });
        store.put(o);
      };
    }
    for (const id of batch.deletes) {
      if (outbox) {
        // Đọc version trước khi xoá (request chạy theo thứ tự) làm phiên bản gốc của mục xoá.
        const before = store.get(id);
        before.onsuccess = () => {
          const baseVersion = readVersion(before.result) ?? 0;
          addChange({ objectId: id, kind: 'delete', isNew: false, fields: [], channels: ['props'], baseVersion });
        };
      }
      store.delete(id);
    }
    await transactionDone(tx);
  }

  async loadOutboxOps(): Promise<SyncOp<CanvasObject>[]> {
    const tx = (await this.db()).transaction([OUTBOX, OBJECTS], 'readonly');
    const objects = tx.objectStore(OBJECTS);
    const ops: SyncOp<CanvasObject>[] = [];
    const all = tx.objectStore(OUTBOX).getAll();
    all.onsuccess = () => {
      for (const raw of all.result) {
        const entry = parseOutboxEntry(raw);
        if (!entry) continue;
        if (entry.kind === 'delete') {
          ops.push(toSyncOp<CanvasObject>(entry, null));
          continue;
        }
        const obj = objects.get(entry.objectId);
        obj.onsuccess = () => {
          ops.push(toSyncOp(entry, (obj.result as CanvasObject | undefined) ?? null));
        };
      }
    };
    await transactionDone(tx);
    return ops;
  }

  /**
   * Xoá mục có mã khớp (đã sửa tiếp thì mã khác → giữ). Mục server báo thiếu object →
   * chuyển sang create, lượt sau gửi nguyên object.
   */
  async ackOutbox(acceptedOpIds: readonly string[], missingObjectIds: readonly string[]): Promise<number> {
    const accepted = new Set(acceptedOpIds);
    const missing = new Set(missingObjectIds);
    const tx = (await this.db()).transaction(OUTBOX, 'readwrite');
    const store = tx.objectStore(OUTBOX);
    let left = 0;
    const all = store.getAll();
    all.onsuccess = () => {
      for (const raw of all.result) {
        const entry = parseOutboxEntry(raw);
        if (entry && accepted.has(entry.opId)) {
          store.delete(entry.objectId);
          continue;
        }
        if (entry && missing.has(entry.objectId) && !entry.isNew) store.put(markEntryNew(entry));
        left++;
      }
    };
    await transactionDone(tx);
    return left;
  }

  async countOutbox(): Promise<number> {
    const tx = (await this.db()).transaction(OUTBOX, 'readonly');
    return requestToPromise(tx.objectStore(OUTBOX).count());
  }

  async syncSnapshot(): Promise<{ objects: CanvasObject[]; pendingIds: string[] }> {
    const tx = (await this.db()).transaction([OBJECTS, OUTBOX], 'readonly');
    const [objects, keys] = await Promise.all([
      requestToPromise<CanvasObject[]>(tx.objectStore(OBJECTS).getAll()),
      requestToPromise(tx.objectStore(OUTBOX).getAllKeys()),
    ]);
    return { objects, pendingIds: keys.filter((k): k is string => typeof k === 'string') };
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
// phần mới gom chờ, cùng object giữ bản mới nhất. Kéo object chỉ ghi lúc thả
// (`commitMove`), nên gom chỉ có tác dụng khi thay đổi dồn dập (gõ note, kéo nhiều item).
// Đọc object phải tính cả phần chưa xuống đĩa (`overlay`), không thì vừa ghi xong
// đọc lại ra bản cũ (VD moveObjectsToUnsort ghi rồi loadObjects ngay).
// Trạng thái lưu ("Đang lưu… / Đã lưu / Lưu lỗi") đo theo từng lô ghi. Board vẫn
// ghi thẳng (ít, không nằm trên đường gõ / kéo). saveCamera KHÔNG tính: pan/zoom
// lưu liên tục, báo "Đã lưu" mỗi lần kéo canvas là nhiễu.
// Ghi xong 1 lô thì báo tab khác (lib/tab-channel.ts) để chúng đọc lại object.
function withWriteQueue(inner: IndexedDbCanvasRepository): CanvasRepository {
  const queue = createWriteQueue<CanvasObject>(
    async (batch) => {
      await trackSave(inner.writeObjects(batch, OUTBOX_ENABLED));
      postTabMessage({ type: 'objects', puts: batch.puts.map((p) => p.id), deletes: batch.deletes });
      if (OUTBOX_ENABLED) signalOutbox(false);
    },
    (err) => {
      console.warn('[canvas] ghi IndexedDB lỗi, giữ lại để thử lại', err);
    },
    // Bản build: DEV = false → không truyền gì, hàng đợi không báo sự kiện.
    import.meta.env.DEV ? devTracer : undefined,
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
    flush: async (options) => {
      await queue.flush(options);
      // Thoát sửa note, đổi board, ẩn tab: gửi ngay, không chờ hết cửa sổ gom.
      if (OUTBOX_ENABLED) signalOutbox(true);
    },
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

// --- Đo hàng đợi (chỉ dev) ---
// Bảng dev (`src/dev/`) gắn bộ thu vào đây. Hàng đợi tạo sớm hơn bảng nên chuyển tiếp
// qua biến, bảng gắn lúc nào cũng nhận được từ lúc đó.
let attachedTracer: WriteQueueTracer | null = null;

const devTracer: WriteQueueTracer = {
  onEnqueue: (channel, kind) => attachedTracer?.onEnqueue(channel, kind),
  onBatchStart: (batchId, size, urgent) => attachedTracer?.onBatchStart(batchId, size, urgent),
  onBatchEnd: (batchId, ok) => attachedTracer?.onBatchEnd(batchId, ok),
};

/** Chỉ bảng dev gọi. Truyền null để gỡ. */
export function attachWriteQueueTracer(tracer: WriteQueueTracer | null): void {
  attachedTracer = tracer;
}

// --- Singleton ---
// Repository và outbox dùng chung 1 adapter (chung kết nối database).
let rawRepo: IndexedDbCanvasRepository | null = null;
let repo: CanvasRepository | null = null;

function getInner(): IndexedDbCanvasRepository {
  if (!rawRepo) rawRepo = new IndexedDbCanvasRepository();
  return rawRepo;
}

export function getCanvasRepository(): CanvasRepository {
  if (!repo) repo = withWriteQueue(getInner());
  return repo;
}

export function getOutboxStore(): OutboxStore {
  const db = getInner();
  return {
    loadOps: () => db.loadOutboxOps(),
    ack: (res) => db.ackOutbox(res.acceptedOpIds, res.missingObjectIds),
    count: () => db.countOutbox(),
    snapshot: () => db.syncSnapshot(),
  };
}
