// ============================================================
// Lớp bọc IndexedDB nhỏ, tự viết (không thư viện).
// ============================================================
//
// Chỉ 3 việc: mở database (tạo store khi nâng phiên bản), đổi request /
// transaction thành promise, xoá database. Không giấu transaction: caller tự mở
// transaction trên 1 hoặc nhiều store, để sau này outbox ghi CÙNG transaction
// với object (`canvas-sync`).
// ============================================================

/** Promise xong khi request xong. */
export function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Promise xong khi transaction commit. Abort / lỗi → reject. */
export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));
  });
}

/**
 * Mở database. `upgrade` chạy khi database mới hoặc phiên bản cũ hơn.
 * Tab khác nâng phiên bản → đóng kết nối ở tab này để không chặn tab kia.
 */
export function openDatabase(
  name: string,
  version: number,
  upgrade: (db: IDBDatabase, oldVersion: number) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (e) => upgrade(req.result, e.oldVersion);
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    // Phiên bản trên máy mới hơn (VersionError), hết dung lượng, chế độ riêng tư chặn.
    req.onerror = () => reject(req.error);
  });
}

/**
 * Xoá database, không chờ khi bị chặn (tab bản cũ còn giữ kết nối): request vẫn
 * chạy nền, xong khi tab kia đóng. Không có database đó thì cũng xong ngay.
 */
export function deleteDatabaseInBackground(name: string): void {
  try {
    const req = indexedDB.deleteDatabase(name);
    req.onerror = () => {
      console.warn('[canvas] xoá database cũ lỗi', name, req.error);
    };
  } catch (err) {
    console.warn('[canvas] xoá database cũ lỗi', name, err);
  }
}
